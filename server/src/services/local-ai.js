const { checkRedFlags, escalate } = require('./triage');

const SYMPTOM_PATTERNS = [
  ['headache', /head ?ache|migraine|head pain|my head hurts/i],
  ['fever', /fever|hot body|temperature|burning up|feeling hot/i],
  ['cough', /cough(?:ing)?|dry throat/i],
  ['sore throat', /sore throat|throat pain|painful throat/i],
  ['breathing difficulty', /shortness of breath|difficulty breathing|breathless|can't breathe/i],
  ['chest pain', /chest pain|pain in my chest|chest pressure/i],
  ['stomach pain', /stomach pain|belly pain|abdominal pain|tummy hurts|gut pain/i],
  ['nausea', /nausea|feel sick|feeling like vomiting/i],
  ['vomiting', /vomit(?:ing)?|throwing up/i],
  ['diarrhea', /diarrhea|frequent loose stool|running stomach/i],
  ['rash', /rash|skin bumps|itchy skin|spots on my skin/i],
  ['dizziness', /dizz(?:y|iness)|lightheaded|room is spinning/i],
  ['swelling', /swollen|swelling|puffy/i],
  ['pain', /pain|ache|hurts|sore|burning sensation/i],
];

const DURATION_PATTERNS = [
  [/for (?:about )?(\d+)\s*(hour|hours|day|days|week|weeks)/i, (_, amount, unit) => `${amount} ${unit}`],
  [/for (?:the )?last (\d+)\s*(hour|hours|day|days|week|weeks)/i, (_, amount, unit) => `${amount} ${unit}`],
  [/since (yesterday|today|this morning|last night)/i, (_, value) => value],
  [/started (yesterday|today|this morning|last night)/i, (_, value) => value],
];

const SELF_CARE_GUIDANCE = {
  headache: ['Rest somewhere quiet and drink fluids if you can.', 'Reduce bright screens and strong noise for a while.', 'Seek care if it becomes severe, follows a head injury, or keeps returning.'],
  fever: ['Rest and drink fluids regularly if you can keep them down.', 'Use light clothing and keep the room comfortably cool.', 'Seek care promptly for a high or persistent fever, confusion, stiff neck, or worsening weakness.'],
  cough: ['Drink warm fluids and avoid smoke, dust, and other irritants.', 'Rest and monitor whether breathing becomes difficult.', 'Arrange medical care if it persists, worsens, or comes with chest pain or coughing blood.'],
  'sore throat': ['Drink warm fluids and rest your voice.', 'Avoid smoke and other throat irritants.', 'Seek care if swallowing or breathing becomes difficult, or symptoms persist.'],
  'stomach pain': ['Rest and take small sips of water or oral rehydration fluid.', 'Choose light foods only if you feel able to eat.', 'Seek care for severe or worsening pain, repeated vomiting, black or bloody stool, or a rigid abdomen.'],
  nausea: ['Take small sips of fluid rather than drinking a large amount at once.', 'Avoid greasy foods and strong smells temporarily.', 'Seek care if you cannot keep fluids down, feel faint, or develop severe pain.'],
  vomiting: ['Take small, frequent sips of water or oral rehydration fluid.', 'Rest and return to light foods gradually when vomiting settles.', 'Seek care for blood, severe pain, confusion, or signs of dehydration such as very little urine.'],
  diarrhea: ['Drink fluids and oral rehydration solution if available.', 'Eat simple foods when able and wash hands carefully.', 'Seek care for blood, severe weakness, high fever, or diarrhea that continues.'],
  rash: ['Avoid scratching and stop any new skin product that may have triggered it.', 'Keep the area clean and dry, and note whether it is spreading.', 'Seek urgent care for face or throat swelling, breathing trouble, blistering, or a rapidly spreading rash.'],
  dizziness: ['Sit or lie down until the feeling passes and rise slowly.', 'Drink fluids if you can and avoid driving while dizzy.', 'Seek care for fainting, new weakness, trouble speaking, chest pain, or severe headache.'],
  swelling: ['Rest and avoid pressure on the swollen area.', 'Note whether it is painful, red, hot, or spreading.', 'Seek urgent care for facial or throat swelling, breathing trouble, or sudden one-sided leg swelling.'],
  pain: ['Rest the affected area and avoid activities that clearly worsen it.', 'Track the location, severity, and changes in the pain.', 'Arrange care if it is moderate, persistent, worsening, or limiting normal activity.'],
};

function normalizeInput(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(text) {
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(text)) return 'greeting';
  if (/\b(thank you|thanks|okay|ok|alright)\b/i.test(text) && text.length < 80) return 'acknowledgement';
  if (/what (is|does)|meaning of|explain|tell me about|difference between/i.test(text)) return 'health_question';
  if (/what should i do|advice|help me|can you help|how do i/i.test(text)) return 'guidance';
  if (/better|worse|same|improving|improved|not improving/i.test(text)) return 'follow_up';
  return 'symptom_report';
}

function extractFacts(text, history) {
  const combined = [...history.filter((message) => message.role === 'user').map((message) => message.content), text].join(' ');
  const symptoms = SYMPTOM_PATTERNS.filter(([, pattern]) => pattern.test(combined)).map(([name]) => name);
  if (symptoms.length > 1 && symptoms.includes('pain')) symptoms.splice(symptoms.indexOf('pain'), 1);
  const duration = DURATION_PATTERNS.reduce((result, [pattern, format]) => {
    if (result) return result;
    const match = combined.match(pattern);
    return match ? format(...match) : null;
  }, null);
  const severityMatch = combined.match(/(?:pain|severity|level)\D{0,15}(?:is\s*)?(10|[1-9])\s*(?:\/\s*10)?/i);
  const hasFever = /fever|hot body|temperature/i.test(combined);
  const worsening = /worsen(?:ing|ed)|getting worse|more painful|spreading|not improving/i.test(combined);
  const improving = /better|improving|improved|less painful/i.test(combined);
  return {
    symptoms: [...new Set(symptoms)],
    duration,
    painScore: severityMatch ? Number(severityMatch[1]) : null,
    hasFever,
    worsening,
    improving,
  };
}

function chooseSeverity(text, facts, redFlagHit) {
  if (redFlagHit) return 'urgent';
  if (facts.painScore >= 8 || facts.worsening && (facts.hasFever || facts.symptoms.includes('swelling'))) return 'see_doctor';
  if (facts.symptoms.includes('breathing difficulty') || facts.symptoms.includes('chest pain')) return 'urgent';
  if (facts.duration && /week/i.test(facts.duration)) return 'see_doctor';
  if (facts.worsening || facts.hasFever || facts.symptoms.length > 1) return 'monitor';
  if (facts.improving && facts.painScore && facts.painScore <= 3) return 'self_care';
  return 'monitor';
}

function formatSymptomList(symptoms) {
  if (!symptoms.length) return 'the concern you described';
  if (symptoms.length === 1) return symptoms[0];
  return `${symptoms.slice(0, -1).join(', ')}, and ${symptoms[symptoms.length - 1]}`;
}

function buildLocalResponse(userMessage, history = [], preferences = {}, attachments = [], healthProfile = null, memories = []) {
  const normalized = normalizeInput(userMessage);
  const redFlagHit = checkRedFlags(normalized);
  const facts = extractFacts(normalized, history);
  const intent = detectIntent(normalized);
  const severity = chooseSeverity(normalized, facts, redFlagHit);
  const attachmentNote = attachments.length
    ? '\n\n> I received your attachment, but the offline assistant cannot inspect images or documents yet.'
    : '';
  const contextItems = [];
  if (healthProfile?.allergies) contextItems.push('your recorded allergies');
  if (healthProfile?.chronic_conditions) contextItems.push('your recorded health conditions');
  if (healthProfile?.current_medications) contextItems.push('your recorded medications');
  if (memories.length) contextItems.push('relevant details from earlier visits');
  const contextNote = contextItems.length
    ? `\n\nI am also taking into account ${contextItems.join(', ')}. Tell me if any of that information is outdated.`
    : '';

  if (redFlagHit) {
    return {
      text: `## Please seek urgent care now\n\nThis message includes a warning sign that should be assessed in person. Go to the nearest hospital or call local emergency services now. Do not wait for this chat to decide what to do.\n\nIf you can, stay with someone and avoid driving yourself.`,
      severity,
      redFlagOverride: true,
      facts,
    };
  }

  if (intent === 'greeting') {
    return {
      text: `Hello. I am Medora's offline health assistant. I can help you organize symptoms and decide what level of care may be appropriate.\n\nTell me:\n- What are you feeling and where?\n- When did it start?\n- How severe is it from 1 to 10?\n- Is it getting better, worse, or staying the same?`,
      severity: 'monitor',
      redFlagOverride: false,
      facts,
    };
  }

  if (intent === 'acknowledgement') {
    return {
      text: `You are welcome. Keep watching the symptoms we discussed. If they worsen or a warning sign appears, seek in-person care promptly.`,
      severity: 'monitor',
      redFlagOverride: false,
      facts,
    };
  }

  if (!normalized || normalized === '(see attached)') {
    return {
      text: `## Tell me a little more\n\nPlease describe the main symptom, where it is, when it started, and whether it is improving or worsening. I will use those details to give more relevant general guidance.`,
      severity: 'monitor',
      redFlagOverride: false,
      facts,
    };
  }

  if (intent === 'health_question') {
    return {
      text: `I can explain general health information, but I need the specific topic or symptom. Please include who it affects, how long it has been happening, and whether there are warning signs such as trouble breathing, severe pain, confusion, or heavy bleeding.`,
      severity: 'monitor',
      redFlagOverride: false,
      facts,
    };
  }

  const primarySymptom = facts.symptoms[0];
  const guidance = SELF_CARE_GUIDANCE[primarySymptom] || SELF_CARE_GUIDANCE.pain;
  const durationText = facts.duration ? ` for about ${facts.duration}${/^\d+ day$/i.test(facts.duration) ? 's' : ''}` : '';
  const summary = `You described ${formatSymptomList(facts.symptoms)}${durationText}${facts.painScore ? `, with a severity of ${facts.painScore}/10` : ''}.${contextNote}`;
  const nextQuestion = facts.duration && facts.painScore
    ? 'Have you had any fever, new medication, injury, pregnancy, or medical condition that could be related?'
    : 'How long has this been happening, and how severe is it from 1 to 10?';

  return {
    text: `## What I understand\n\n${summary}\n\n## General steps for now\n\n${guidance.map((item) => `- ${item}`).join('\n')}\n\n## One useful follow-up\n\n${nextQuestion}\n\nThis is general information, not a diagnosis. A clinician should assess symptoms that are severe, persistent, unusual for you, or getting worse.${attachmentNote}`,
    severity,
    redFlagOverride: false,
    facts,
  };
}

async function getLocalResponse(userMessage, history, preferences, attachments, healthProfile, memories) {
  return buildLocalResponse(userMessage, history, preferences, attachments, healthProfile, memories);
}

async function getOllamaResponse(userMessage, history, preferences, attachments) {
  const endpoint = process.env.LOCAL_LLM_URL || 'http://127.0.0.1:11434/api/chat';
  const model = process.env.LOCAL_LLM_MODEL || 'llama3.2';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: 'system',
          content: 'You are Medora, a careful local health assistant. Respond in Markdown with short headings and bullets. Never diagnose with certainty, never give prescription drug dosages, and always recommend urgent in-person care for emergency warning signs. End with exactly one line in the format [SEVERITY: self_care], [SEVERITY: monitor], [SEVERITY: see_doctor], or [SEVERITY: urgent]. Ask one or two focused follow-up questions when information is missing. Be warm and concise.',
        },
        ...history.slice(-12).map((message) => ({ role: message.role, content: message.content })),
        { role: 'user', content: `${userMessage}${attachments.length ? '\n[Attachments are present but may not be available to this local model.]' : ''}` },
      ],
      options: { temperature: 0.2 },
    }),
  });
  if (!response.ok) throw new Error(`Local model returned ${response.status}`);
  const payload = await response.json();
  if (!payload.message?.content) throw new Error('Local model returned no message');
  return payload.message.content;
}

module.exports = { getLocalResponse, getOllamaResponse, buildLocalResponse, normalizeInput, extractFacts };
