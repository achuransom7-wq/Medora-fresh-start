/**
 * Medora Local AI (v2)
 * --------------------
 * A fully offline medical consultation engine. Drop-in replacement for
 * services/ai.js — exports the exact same function signatures
 * (getConsultationResponse, generateTitle, generateCareSummary).
 *
 * WHAT'S NEW IN V2 (vs. the first hand-written version):
 *  - Real disease data. Backed by a genuine, widely-used open dataset of 41
 *    diseases x 132 symptoms with official descriptions and precautions
 *    (data/diseases.js), instead of ~25 hand-typed condition entries.
 *  - Proper differential diagnosis. localDifferential.js does weighted
 *    symptom-vector matching (cosine similarity + coverage gating), the same
 *    core technique used in real symptom-checker research — not simple
 *    keyword counting. It always returns a TOP-3 differential, never a
 *    single confident "diagnosis".
 *  - Negation-aware NLU. "no fever" / "I don't have chest pain" correctly
 *    excludes that symptom instead of matching it.
 *  - Self-learning. Every suggestion is logged, and if you wire up the
 *    optional feedback endpoint, confirmed/corrected outcomes nudge future
 *    scoring for that disease (localLearning.js). Fully local, fully
 *    transparent, capped so it can't run away in either direction.
 *  - Still layered under the same hard safety net: triage.js's red-flag
 *    phrase list is checked first and always wins, exactly as before.
 *
 * WHAT'S HONEST ABOUT ITS LIMITS (please keep telling users this):
 *  - 41 diseases is a lot more than 25 hand-typed entries, but it is still
 *    nowhere near a clinician's breadth. Outside this dataset,
 *    the agent says so rather than guessing.
 *  - It performs pattern matching against known disease-symptom
 *    associations, not full clinical reasoning — it can't account for a
 *    specific patient's full history, labs, exam findings, or rare
 *    presentations the way a clinician can.
 *  - "Self-learning" here means reweighting among the same 41 reviewed
 *    diseases based on feedback — it does not learn new diseases, new
 *    symptoms, or medical facts beyond what's in the dataset.
 *  - No live web search and no image/vision analysis by default — see
 *    localResearch.js and the OLLAMA_VISION_MODEL option for optional help.
 */

const { checkRedFlags, escalate } = require('./triage');
const fileStorage = require('./fileStorage');
const { runDifferential } = require('./localDifferential');
const { logShown, getLearningMultipliers } = require('./localLearning');
const { classifyIntent, respondToIntent } = require('./localIntent');
const { answerKnowledgeQuestion, findDiseaseMatch, findTopicMatch, resolveContextFromHistory } = require('./localKnowledgeQA');
const llm = require('./llm'); // provider router: free LLM -> Ollama -> built-in engine
const { buildSystemPrompt, parseReply } = require('./assistantLlm');
const { serializeHealthProfile } = require('../utils/serializeUser');

const DISCLAIMER =
  "This is general guidance from Medora's offline assistant, based on pattern-matching against a limited local dataset. It is not a diagnosis. If anything feels wrong or gets worse, please see a doctor.";

const TITLE_STOPWORDS = new Set(['i', 'a', 'an', 'the', 'my', 'is', 'am', 'have', 'has', 'had', 'been', 'being', 'it', 'im', 'ive', 'me', 'and', 'with', 'for', 'to', 'of', 'in', 'on', 'since', 'that', 'this']);

const GENERIC_CLARIFYING_QUESTIONS = [
  "Could you tell me more about what you're feeling, and how long it's been going on?",
  'Are there any other symptoms alongside this, such as fever, pain, nausea, or anything else unusual?',
  'On a scale of 1 to 10, how would you rate how you feel right now?',
];

/** Build a short, honest note about any image attachments (no local vision by default) */
async function describeAttachments(attachments) {
  if (!attachments?.length) return { note: '', base64Images: [] };
  const images = attachments.filter((a) => a.mime_type?.startsWith('image/'));
  if (!images.length) return { note: '', base64Images: [] };

  if (llm.supportsVision()) {
    const base64Images = await Promise.all(
      images.map(async (image) => ({
        data: (await fileStorage.readFile(image.file_path)).toString('base64'),
        mediaType: image.mime_type === 'image/jpg' ? 'image/jpeg' : image.mime_type,
      }))
    );
    return { note: '', base64Images };
  }

  return {
    note: `\n\n(The patient attached ${images.length} photo${images.length > 1 ? 's' : ''}. Local mode can't visually analyze images. Acknowledge the photo, and ask the patient to describe what it looks like: color, size, texture, and location.)`,
    base64Images: [],
  };
}

/** Pick the overall severity to report from a set of differential candidates */
function severityFromCandidates(candidates) {
  const order = ['self_care', 'monitor', 'see_doctor', 'urgent'];
  let worst = 'self_care';
  for (const c of candidates) {
    if (order.indexOf(c.severityTier) > order.indexOf(worst)) worst = c.severityTier;
  }
  return worst;
}

/**
 * Build a template response describing the differential, without an LLM.
 */
function buildTemplateResponse({ candidates, isFollowUp, attachmentNote }) {
  if (candidates.length === 0) {
    const q = GENERIC_CLARIFYING_QUESTIONS[isFollowUp ? 1 : 0];
    return {
      text: `Thanks for sharing that. ${q}${attachmentNote}\n\nIf anything feels severe or is rapidly worsening, please seek in-person care rather than waiting on guidance here.`,
      severity: 'monitor',
    };
  }

  if (!isFollowUp && candidates[0].confidencePct < 55) {
    // Not confident enough yet on the first pass — ask a targeted follow-up
    // instead of presenting a shaky differential. Mention up to 2 leading
    // possibilities (not just candidates[0]) so early low-confidence ties
    // don't misleadingly anchor on a single name.
    //
    // IMPORTANT: severity here is still severityFromCandidates(candidates),
    // NOT a hardcoded 'monitor' — if one of the possibilities (even a
    // low-confidence one) warrants "see_doctor" or worse, that must still be
    // reflected. Being unsure WHICH condition it is is never a reason to
    // understate how seriously it should be treated.
    const names = candidates.slice(0, 2).map((c) => c.name.toLowerCase());
    const namesText = names.length > 1 ? `${names[0]} or ${names[1]}` : names[0];
    return {
      text: `Thanks for sharing that. What you're describing could be consistent with a few different things, including ${namesText}. Could you tell me more? How long has this been going on, and has anything changed in the last day or two?${attachmentNote}`,
      severity: severityFromCandidates(candidates),
    };
  }

  const severity = severityFromCandidates(candidates);
  const lines = candidates.map((c, i) => {
    const precautionText = c.precautions.length ? c.precautions.join('; ') : 'general rest and hydration';
    return `${i + 1}. **${c.name}** (${c.confidencePct}% relative match, matched: ${c.matchedSymptoms.join(', ')})\n   ${c.description}\n   Suggested precautions: ${precautionText}.`;
  });

  const severityNote =
    severity === 'urgent'
      ? "\n\nOne or more of these possibilities can be serious. Please seek immediate in-person care."
      : severity === 'see_doctor'
      ? '\n\nThese possibilities are usually best confirmed by a doctor with an exam and/or tests, rather than managed from guesswork at home.'
      : '';

  return {
    text: `Based on what you've described, here's how it lines up against Medora's local reference data (this is a differential, not a diagnosis):\n\n${lines.join('\n\n')}${severityNote}${attachmentNote}\n\n${DISCLAIMER}`,
    severity,
  };
}

const FALLBACK_SUGGESTIONS = {
  intro: ['I have a headache', 'Check my symptoms', 'Tips for better sleep'],
  symptom: ['What can I do at home?', 'What warning signs should I watch for?', 'Should I see a doctor?'],
  knowledge: ['What are the symptoms?', 'How can I prevent it?', 'When should I see a doctor?'],
};

const IDENTITY_PATTERN = /\b(who are you|what are you|what'?s your name|what is your name|your name|what (is|are) your (goal|purpose|job|aim)|what do you do|what can you do|how can you help|introduce yourself|are you (a )?(real|human|robot|bot|ai|doctor|person)|qui es[- ]tu|tu es qui|c'?est quoi ton)\b/i;
const HOW_ARE_YOU_PATTERN = /^\s*(hi+|hello|hey)?[\s,!.]*(how are you|how r u|how are u|how('?s| is) it going|how do you do|how are you doing|ça va|comment vas[- ]tu|how you dey|how body)\b/i;
const JOKE_PATTERN = /\b(joke|funny|make me laugh|blague)\b/i;
const PROFILE_QUESTION_PATTERN = /\b(my|do i have any|did i (save|add|list))\b[^.?!]*\b(allerg\w*|medications?|medicines?|conditions?|blood type|emergency contact)\b|\b(what|which)\b[^.?!]*\b(allerg\w*|medications?|medicines?|conditions?)\b[^.?!]*\b(am i|do i|have i)\b/i;

const JOKES = [
  "Why did the doctor carry a red pen? In case they needed to draw blood. I'll stick to the health advice, I think.",
  'What do you call a doctor who fixes websites? A URL-ologist. Okay, I will leave the comedy to the professionals.',
];

function answerFromProfile(userMessage, healthProfile) {
  const profile = serializeHealthProfile(healthProfile);
  const lower = userMessage.toLowerCase();
  const pick = (label, list) =>
    list.length
      ? `Your profile lists these ${label}: **${list.join(', ')}**.`
      : `You haven't saved any ${label} yet. You can add them on your Profile page, and I'll keep them in mind.`;
  const parts = [];
  if (/allerg/.test(lower)) parts.push(pick('allergies', profile.allergies));
  if (/medic/.test(lower)) parts.push(pick('medications', profile.currentMedications));
  if (/condition/.test(lower)) parts.push(pick('chronic conditions', profile.chronicConditions));
  if (/blood type/.test(lower)) parts.push(profile.bloodType ? `Your saved blood type is **${profile.bloodType}**.` : "You haven't saved a blood type yet. You can add it on your Profile page.");
  if (/emergency contact/.test(lower)) {
    parts.push(profile.emergencyContactName ? `Your emergency contact is **${profile.emergencyContactName}**${profile.emergencyContactPhone ? ` (${profile.emergencyContactPhone})` : ''}.` : "You haven't saved an emergency contact yet. You can add one on your Profile page.");
  }
  return parts.length ? parts.join('\n\n') : null;
}

/** Symptom turns from earlier in the conversation, so short replies like "3 days now" keep their context */
function symptomContext(history, userMessage) {
  const priorSymptomTurns = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === 'user' && classifyIntent(m.content, history.slice(0, i)) === 'symptom') {
      priorSymptomTurns.push(m.content);
    }
  }
  return { combinedText: [...priorSymptomTurns, userMessage].join('. '), isFollowUp: priorSymptomTurns.length > 0 };
}

function differentialNote(candidates) {
  if (!candidates.length) {
    return "\n\nThe reference symptom dataset has no confident match. Ask one or two focused questions or give cautious general guidance. Do not guess a diagnosis.";
  }
  return `\n\nREFERENCE DIFFERENTIAL from Medora's reviewed dataset (a weighted symptom match, not a diagnosis). Use it as a starting point alongside sound general medical knowledge. Never suggest less urgency than the highest tier listed:\n${candidates
    .map((c) => `* ${c.name} (${c.confidencePct}% relative match; matched: ${c.matchedSymptoms.join(', ')}): ${c.description} Precautions: ${c.precautions.join('; ')}. Suggested severity: ${c.severityTier}.`)
    .join('\n')}\nPresent a few possibilities, never one certain diagnosis.`;
}

function knowledgeNote(userMessage, history) {
  const disease = findDiseaseMatch(userMessage);
  if (disease) {
    const precautions = disease.precautions?.length ? ` Precautions: ${disease.precautions.join('; ')}.` : '';
    return `\n\nREVIEWED REFERENCE (prefer this over memory where they differ): ${disease.name}: ${disease.description}${precautions}`;
  }
  const topic = findTopicMatch(userMessage);
  if (topic) return `\n\nREVIEWED REFERENCE (prefer this over memory where they differ): ${topic.topic}: ${topic.content}`;
  const context = resolveContextFromHistory(history);
  if (context.disease) return `\n\nREVIEWED REFERENCE for the topic under discussion: ${context.disease.name}: ${context.disease.description}`;
  if (context.topic) return `\n\nREVIEWED REFERENCE for the topic under discussion: ${context.topic.topic}: ${context.topic.content}`;
  return '';
}

function emergencyBanner(text) {
  if (/immediate|emergency|nearest hospital|right away/i.test(text)) return text;
  return `**This may be an emergency. Please get medical care at the nearest hospital or emergency service right away, and ask someone nearby to help you.**\n\n${text}`;
}

/** The language-model path: the model holds the conversation, safety rules wrap around it. */
async function respondWithLlm(history, userMessage, opts, redFlagHit) {
  const { memories = [], attachments = [], preferences = null, userId = null, conversationId = null, healthProfile = null, patient = null } = opts;

  const intent = redFlagHit || attachments.length ? 'symptom' : classifyIntent(userMessage, history);
  const isSymptomTurn = intent === 'symptom';

  let candidates = [];
  let grounding = '';
  if (isSymptomTurn) {
    const { combinedText } = symptomContext(history, userMessage);
    const learningMultipliers = await getLearningMultipliers();
    ({ candidates } = runDifferential(combinedText, { getLearningMultiplier: (name) => learningMultipliers.get(name) ?? 1 }));
    if (candidates.length) await logShown({ userId, conversationId, candidates });
    grounding = differentialNote(candidates);
  } else if (intent === 'knowledge_question') {
    grounding = knowledgeNote(userMessage, history);
  }

  const { base64Images } = await describeAttachments(attachments);
  const systemPrompt = buildSystemPrompt({ preferences, patient, healthProfile, memories, grounding, redFlagHit });
  const messages = [...history.slice(-20).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }];

  const raw = await llm.chat(systemPrompt, messages, base64Images);
  if (!raw) return null;
  const parsed = parseReply(raw);
  if (!parsed.text) return null;

  // The model can raise urgency but never lower it below what the reviewed dataset and red-flag check require.
  let severity = parsed.severity;
  if (isSymptomTurn) {
    const floor = candidates.length ? severityFromCandidates(candidates) : 'monitor';
    severity = escalate(severity || floor, floor);
  }
  let text = parsed.text;
  if (redFlagHit) {
    severity = escalate(severity || 'urgent', 'urgent');
    text = emergencyBanner(text);
  }

  return { text, severity, redFlagOverride: redFlagHit, differential: candidates, suggestions: parsed.suggestions };
}

/** The offline path: used when no model is configured or the model is unreachable. */
async function respondWithBuiltInEngine(history, userMessage, opts, redFlagHit) {
  const { attachments = [], preferences = null, userId = null, conversationId = null, healthProfile = null } = opts;
  const plain = (text, suggestions = []) => ({ text, severity: null, redFlagOverride: false, differential: [], suggestions });

  if (!redFlagHit && !attachments.length) {
    if (healthProfile && PROFILE_QUESTION_PATTERN.test(userMessage)) {
      const fromProfile = answerFromProfile(userMessage, healthProfile);
      if (fromProfile) return plain(fromProfile, ['Update my profile', 'What should I know about my allergies?']);
    }
    if (HOW_ARE_YOU_PATTERN.test(userMessage)) {
      return plain("I'm doing well, thank you for asking! More importantly, how are you feeling today? If something is bothering you, tell me about it and we can work through it together.", FALLBACK_SUGGESTIONS.intro);
    }
    if (IDENTITY_PATTERN.test(userMessage)) {
      return plain(
        "I'm **Medora**, an AI health assistant made for people in Cameroon. I'm not a doctor, but I can help you:\n\n* Describe symptoms and understand how urgent they are\n* Learn about common conditions, prevention and healthy habits\n* Keep your health profile, vitals and notes in one place\n* Get ready for a doctor's visit\n\nMy goal is to give you clear, calm guidance and help you decide when to seek care. What's on your mind today?",
        FALLBACK_SUGGESTIONS.intro
      );
    }
    if (JOKE_PATTERN.test(userMessage)) {
      return plain(`${JOKES[Math.floor(Math.random() * JOKES.length)]}\n\nIs there anything about your health I can help with today?`, FALLBACK_SUGGESTIONS.intro);
    }
  }

  let intent = 'symptom';
  if (!redFlagHit && !attachments.length) {
    intent = classifyIntent(userMessage, history);
    if (['greeting', 'gratitude', 'farewell', 'small_talk', 'wellness_ok', 'off_topic'].includes(intent)) {
      return plain(respondToIntent(intent, userMessage), FALLBACK_SUGGESTIONS.intro);
    }
    if (intent === 'knowledge_question') {
      const answer = await answerKnowledgeQuestion(userMessage, { preferences, history });
      return plain(answer, FALLBACK_SUGGESTIONS.knowledge);
    }
  }

  const { combinedText, isFollowUp } = symptomContext(history, userMessage);
  const { note: attachmentNote } = await describeAttachments(attachments);
  const learningMultipliers = await getLearningMultipliers();
  const { candidates } = runDifferential(combinedText, { getLearningMultiplier: (name) => learningMultipliers.get(name) ?? 1 });
  if (candidates.length) await logShown({ userId, conversationId, candidates });

  const built = buildTemplateResponse({ candidates, isFollowUp, attachmentNote });
  let text = built.text;
  let severity = built.severity;
  if (redFlagHit) {
    severity = escalate(severity, 'urgent');
    text = emergencyBanner(text);
  } else if (!severity) {
    severity = 'monitor';
  }
  return { text, severity, redFlagOverride: redFlagHit, differential: candidates, suggestions: FALLBACK_SUGGESTIONS.symptom };
}

/**
 * Get a consultation response. A configured language model holds the conversation; the offline
 * engine takes over automatically if none is configured or the model cannot be reached.
 */
async function getConsultationResponse(history, userMessage, opts = {}) {
  const redFlagHit = checkRedFlags(userMessage);
  if (llm.isEnabled()) {
    const viaLlm = await respondWithLlm(history, userMessage, opts, redFlagHit);
    if (viaLlm) return viaLlm;
  }
  return respondWithBuiltInEngine(history, userMessage, opts, redFlagHit);
}

/** Generate a short conversation title without needing an LLM call */
async function generateTitle(firstMessage, assistantReply = '') {
  // With a language model available, ask it for a short, meaningful title (one tiny extra call, first message only).
  if (llm.isEnabled()) {
    const raw = await llm.chat(
      'You write short titles for health chat conversations. Reply with only a title of 2 to 5 words in the same language as the conversation. No quotes, no punctuation at the end, no dashes.',
      [{ role: 'user', content: `Patient: ${firstMessage.slice(0, 300)}\nAssistant: ${assistantReply.slice(0, 300)}\n\nTitle:` }]
    );
    const title = raw?.replace(/<think>[\s\S]*?<\/think>/gi, '').split('\n')[0].replace(/^["'\s]+|["'.\s]+$/g, '').trim();
    if (title && title.length >= 3 && title.length <= 60) return title;
  }
  const intent = classifyIntent(firstMessage);
  if (intent === 'knowledge_question') {
    const { findDiseaseMatch, findTopicMatch } = require('./localKnowledgeQA');
    const disease = findDiseaseMatch(firstMessage);
    if (disease) return `About ${disease.name}`;
    const topic = findTopicMatch(firstMessage);
    if (topic) return topic.topic;
    return 'General question';
  }
  if (intent !== 'symptom') return 'Quick chat';
  const learningMultipliers = await getLearningMultipliers();
  const { candidates } = runDifferential(firstMessage, {
    getLearningMultiplier: (name) => learningMultipliers.get(name) ?? 1,
  });
  if (candidates.length) return candidates[0].name;
  const words = firstMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter((w) => w && !TITLE_STOPWORDS.has(w))
    .slice(0, 4);
  if (!words.length) return 'New consultation';
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

const SEVERITY_LABEL = {
  self_care: 'Self-care: manageable at home',
  monitor: 'Monitor: keep watch, seek care if it worsens',
  see_doctor: 'See a doctor soon (within 24–48 hours)',
  urgent: 'Urgent: seek immediate in-person care',
};

/** Build a downloadable visit summary without needing an LLM call (template-based) */
async function generateCareSummary(history, { patientName, latestSeverity } = {}) {
  const userMessages = history.filter((m) => m.role === 'user').map((m) => m.content);
  const symptomTurns = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === 'user' && classifyIntent(m.content, history.slice(0, i)) === 'symptom') {
      symptomTurns.push(m.content);
    }
  }
  const combinedText = symptomTurns.join('. ');
  const learningMultipliers = await getLearningMultipliers();
  const { candidates } = runDifferential(combinedText, {
    getLearningMultiplier: (name) => learningMultipliers.get(name) ?? 1,
  });

  const symptomBullets = userMessages.length ? userMessages.map((m) => `- ${m}`).join('\n') : '- Not specified';

  const assessment = candidates.length
    ? `The reported symptoms most closely match, in order: ${candidates.map((c) => `${c.name} (${c.confidencePct}%)`).join(', ')}. This is a differential from Medora's offline assistant's local dataset, not a diagnosis. Please confirm with a clinician.`
    : "Medora's offline assistant did not find a confident match in its local dataset for these symptoms. A clinician's assessment is recommended.";

  const nextSteps = candidates.length
    ? candidates.flatMap((c) => c.precautions).slice(0, 6).map((p) => `- ${p}`).join('\n')
    : '- Please consult a healthcare professional for a full assessment.\n- Note down when symptoms started and anything that makes them better or worse.';

  const severityLabel = SEVERITY_LABEL[latestSeverity] || 'Not determined';

  return `# Visit Summary
**Date:** ${new Date().toISOString().slice(0, 10)}
**Patient:** ${patientName || 'Not specified'}
**Generated by:** Medora Local Assistant (offline mode, v2, 41-disease reference dataset)

## Reported Symptoms
${symptomBullets}

## Discussion Summary
The patient described the symptoms above over the course of this conversation.

## Medora's Assessment (Differential)
${assessment}

## Severity Level
${severityLabel}

## Recommended Next Steps
${nextSteps}

## Important Note
${DISCLAIMER} This summary was generated entirely offline by Medora's local, pattern-matching assistant rather than the full AI model, so treat it as a starting point for a conversation with a clinician rather than a complete clinical assessment.
`;
}

module.exports = { getConsultationResponse, generateTitle, generateCareSummary };
