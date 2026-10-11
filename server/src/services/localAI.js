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
 *    nowhere near a real doctor's or Claude's breadth. Outside this dataset,
 *    the agent says so rather than guessing.
 *  - It performs pattern matching against known disease-symptom
 *    associations, not full clinical reasoning — it can't account for a
 *    specific patient's full history, labs, exam findings, or rare
 *    presentations the way a clinician (or Claude) can.
 *  - "Self-learning" here means reweighting among the same 41 reviewed
 *    diseases based on feedback — it does not learn new diseases, new
 *    symptoms, or medical facts beyond what's in the dataset.
 *  - No live web search and no image/vision analysis by default — see
 *    localResearch.js and the OLLAMA_VISION_MODEL option for optional help.
 */

const { checkRedFlags, escalate } = require('./triage');
const { runDifferential } = require('./localDifferential');
const { logShown, getLearningMultiplier } = require('./localLearning');
const { classifyIntent, respondToIntent } = require('./localIntent');
const { answerKnowledgeQuestion } = require('./localKnowledgeQA');
const ollama = require('./ollamaClient');
const { PUNCTUATION_RULE } = require('./promptStyle');

const STYLE_INSTRUCTIONS = {
  simple: 'Use very plain, everyday language. Short sentences. Avoid medical jargon entirely.',
  standard: 'Use clear, everyday language with light medical terminology where it aids precision, briefly explained.',
  clinical: 'You may use standard clinical terminology (still avoiding definitive diagnosis or specific prescriptions).',
};

const LANGUAGE_NOTE = {
  en: 'Respond in English.',
  fr: 'Respond in French.',
  pidgin: 'Respond in Cameroonian Pidgin English, kept simple and warm.',
};

const DISCLAIMER =
  "This is general guidance from Medora's offline assistant, based on pattern-matching against a limited local dataset. It is not a diagnosis. If anything feels wrong or gets worse, please see a doctor.";

const TITLE_STOPWORDS = new Set(['i', 'a', 'an', 'the', 'my', 'is', 'am', 'have', 'has', 'had', 'been', 'being', 'it', 'im', 'ive', 'me', 'and', 'with', 'for', 'to', 'of', 'in', 'on', 'since', 'that', 'this']);

const GENERIC_CLARIFYING_QUESTIONS = [
  "Could you tell me more about what you're feeling, and how long it's been going on?",
  'Are there any other symptoms alongside this, such as fever, pain, nausea, or anything else unusual?',
  'On a scale of 1 to 10, how would you rate how you feel right now?',
];

/** Build a short, honest note about any image attachments (no local vision by default) */
function describeAttachments(attachments) {
  if (!attachments?.length) return { note: '', base64Images: [] };
  const images = attachments.filter((a) => a.mime_type?.startsWith('image/'));
  if (!images.length) return { note: '', base64Images: [] };

  if (ollama.VISION_MODEL) {
    const fs = require('fs');
    const base64Images = images
      .map((img) => {
        try {
          return fs.readFileSync(img.file_path).toString('base64');
        } catch {
          return null;
        }
      })
      .filter(Boolean);
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

/**
 * Get a consultation response. Same signature as ai.js's getConsultationResponse.
 */
async function getConsultationResponse(history, userMessage, opts = {}) {
  const { memories = [], attachments = [], preferences = null, userId = null, conversationId = null } = opts;

  const redFlagHit = checkRedFlags(userMessage);

  // Intent gate: don't force greetings/thanks/farewells/off-topic messages
  // through the symptom differential flow. A red-flag hit always overrides
  // this (safety first), and attachments always mean there's something to
  // actually look at, so both skip straight to the normal medical flow below.
  let intent = 'symptom';
  if (!redFlagHit && !attachments?.length) {
    intent = classifyIntent(userMessage, history);
    if (intent === 'greeting' || intent === 'gratitude' || intent === 'farewell' || intent === 'small_talk' || intent === 'wellness_ok' || intent === 'off_topic') {
      return { text: respondToIntent(intent, userMessage), severity: null, redFlagOverride: false, differential: [] };
    }
    if (intent === 'knowledge_question') {
      const answer = await answerKnowledgeQuestion(userMessage, { preferences, history });
      return { text: answer, severity: null, redFlagOverride: false, differential: [] };
    }
  }

  // Only feed genuinely symptom-report turns into the differential engine's
  // context. Without this, an earlier factual question like "what are the
  // symptoms of fever?" would get scanned for symptom keywords too, wrongly
  // making it look like the patient reported having a fever themselves.
  // Classified sequentially (growing the history slice as we go) so a short
  // reply like "3 days now" is correctly recognized as continuing whatever
  // it followed, exactly as it would have been classified live.
  const priorSymptomTurns = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === 'user' && classifyIntent(m.content, history.slice(0, i)) === 'symptom') {
      priorSymptomTurns.push(m.content);
    }
  }
  const combinedText = [...priorSymptomTurns, userMessage].join('. ');
  const isFollowUp = priorSymptomTurns.length > 0;
  const { note: attachmentNote, base64Images } = describeAttachments(attachments);

  const { candidates } = runDifferential(combinedText, { getLearningMultiplier });
  if (candidates.length) logShown({ userId, conversationId, candidates });

  let severity;
  let text;

  // Try the local LLM first (if enabled), grounded in the differential candidates
  if (ollama.isEnabled()) {
    const memoryNote = memories.length
      ? `\n\nThings to remember about this patient: ${memories.map((m) => m.content).join('; ')}.`
      : '';

    const groundingNote = candidates.length
      ? `\n\nLocal differential (from a reviewed 41-disease dataset, weighted by symptom match; treat as reference facts, do NOT contradict them, but phrase naturally and don't just copy verbatim):\n${candidates
          .map((c) => `- ${c.name} (${c.confidencePct}% relative match, matched: ${c.matchedSymptoms.join(', ')}): ${c.description} Precautions: ${c.precautions.join('; ')}. Suggested severity: ${c.severityTier}.`)
          .join('\n')}\n\nPresent this as a differential (a few possibilities), never as a single certain diagnosis.`
      : '\n\nNo confident match found in the local dataset. Ask a clarifying question or give very general, cautious guidance rather than guessing.';

    const style = STYLE_INSTRUCTIONS[preferences?.communication_style] || STYLE_INSTRUCTIONS.standard;
    const language = LANGUAGE_NOTE[preferences?.language] || LANGUAGE_NOTE.en;

    const systemPrompt = `You are Medora, a compassionate offline AI health assistant. You are NOT a doctor and never diagnose with certainty. Ask short clarifying questions when you need more information; otherwise present a brief differential (a few possibilities, not one certain answer) grounded in the reference data you're given. Never name specific prescription drugs or dosages; general categories only (e.g. "an over-the-counter pain reliever"). Keep replies short (3-6 short paragraphs max, or a short numbered list for a differential). Always end your substantive reply on a new line with exactly one tag: [SEVERITY: self_care] or [SEVERITY: monitor] or [SEVERITY: see_doctor] or [SEVERITY: urgent].\n\n${PUNCTUATION_RULE}\n\nCOMMUNICATION STYLE: ${style}\nLANGUAGE: ${language}${memoryNote}${groundingNote}`;

    const llmMessages = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userMessage }];
    const reply = await ollama.chat(systemPrompt, llmMessages, base64Images);

    if (reply) {
      const tagMatch = reply.match(/\[SEVERITY:\s*(self_care|monitor|see_doctor|urgent)\]/i);
      severity = tagMatch ? tagMatch[1].toLowerCase() : candidates.length ? severityFromCandidates(candidates) : 'monitor';
      text = reply.replace(/\[SEVERITY:\s*(self_care|monitor|see_doctor|urgent)\]/i, '').trim();
    }
  }

  // Fall back to the template engine if Ollama is off, unreachable, or returned nothing
  if (!text) {
    const built = buildTemplateResponse({ candidates, isFollowUp, attachmentNote });
    text = built.text;
    severity = built.severity;
  }

  if (redFlagHit) {
    severity = escalate(severity, 'urgent');
  } else if (!severity) {
    severity = 'monitor';
  }

  return { text, severity, redFlagOverride: redFlagHit, differential: candidates };
}

/** Generate a short conversation title without needing an LLM call */
async function generateTitle(firstMessage) {
  const intent = classifyIntent(firstMessage);
  if (intent === 'knowledge_question') {
    const { findDiseaseMatch, findTopicMatch } = require('./localKnowledgeQA');
    const disease = findDiseaseMatch(firstMessage);
    if (disease) return `About ${disease.name}`;
    const topic = findTopicMatch(firstMessage);
    if (topic) return topic.topic;
    return 'General question';
  }
  if (intent !== 'symptom') return 'New conversation';
  const { candidates } = runDifferential(firstMessage, { getLearningMultiplier });
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
  const { candidates } = runDifferential(combinedText, { getLearningMultiplier });

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
