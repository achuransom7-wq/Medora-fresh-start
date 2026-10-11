/**
 * Medora Local Knowledge Q&A
 * --------------------------
 * Handles casual, informational medical questions — "what are the symptoms
 * of malaria?", "how do you treat typhoid?", "how much water should I
 * drink?" — as distinct from a personal symptom report. This is what makes
 * the agent capable of a normal back-and-forth medical conversation instead
 * of only doing symptom-triage.
 *
 * Two knowledge sources, both real and reviewed (never fabricated):
 *  - data/diseases.js: the 41-disease dataset, for "tell me about X" /
 *    "symptoms of X" / "how is X treated" style questions naming a disease.
 *  - data/healthTopics.js: ~28 general wellness topics not tied to one
 *    disease (hydration, sleep, blood pressure, exercise, etc.).
 *
 * If Ollama is enabled, it's used to phrase the answer more naturally and
 * to have a real shot at genuinely open-ended questions this covers only
 * loosely — but it's explicitly instructed never to go beyond, or
 * contradict, the reference material it's given, and never to name a
 * specific prescription drug or dosage.
 */

const { DISEASES } = require('../data/diseases');
const { GENERAL_TOPICS } = require('../data/healthTopics');
const { normalize } = require('./localDifferential');
const ollama = require('./ollamaClient');
const { PUNCTUATION_RULE } = require('./promptStyle');

const DOCTOR_REFERRAL_LINE =
  "If you think this might apply to you, please see a doctor or visit a hospital for an accurate diagnosis and any treatment. I can share general information, but I can't prescribe medication or confirm a diagnosis.";

/** Find a disease from the dataset named in the question, if any */
function findDiseaseMatch(text) {
  const normalized = normalize(text);
  let best = null;
  let bestLen = 0;
  for (const disease of DISEASES) {
    const nameNormalized = normalize(disease.name);
    if (nameNormalized.length > 3 && normalized.includes(nameNormalized) && nameNormalized.length > bestLen) {
      best = disease;
      bestLen = nameNormalized.length;
    }
  }
  return best;
}

/** Find a general (non-disease) health topic matching the question */
function findTopicMatch(text) {
  const normalized = normalize(text);
  let best = null;
  let bestScore = 0;
  for (const topic of GENERAL_TOPICS) {
    const score = topic.keywords.reduce((acc, kw) => (normalized.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * When a follow-up question doesn't itself name a disease/topic ("what about
 * children?", "is it common here?"), figure out what it's probably still
 * about by looking back through the conversation. Checks both user and
 * assistant turns, most recent first, for the last disease or topic
 * mentioned. This is what lets a short follow-up correctly stay "about
 * malaria" instead of Medora forgetting what was just being discussed.
 */
function resolveContextFromHistory(history = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    const content = history[i]?.content;
    if (!content) continue;
    const disease = findDiseaseMatch(content);
    if (disease) return { disease };
    const topic = findTopicMatch(content);
    if (topic) return { topic };
  }
  return {};
}

/** Build a template answer about a specific disease, angled by what sub-question was asked */
function buildDiseaseAnswer(disease, question) {
  const q = question.toLowerCase();
  const symptomList = disease.symptomsHuman.slice(0, 8).join(', ');
  const precautionText = disease.precautions.length ? disease.precautions.join('; ') : 'supportive care and rest';

  if (/symptom/.test(q)) {
    return `Common symptoms of ${disease.name.toLowerCase()} include: ${symptomList}.\n\n${disease.description}\n\n${DOCTOR_REFERRAL_LINE}`;
  }
  if (/treat|manage|cure|precaution/.test(q)) {
    return `General management for ${disease.name.toLowerCase()} typically includes: ${precautionText}.\n\n${disease.description}\n\n${DOCTOR_REFERRAL_LINE}`;
  }
  if (/contagious|spread|catch|infectious/.test(q)) {
    return `Here's what's known about ${disease.name.toLowerCase()}: ${disease.description}\n\n${DOCTOR_REFERRAL_LINE}`;
  }
  return `${disease.description}\n\nCommon symptoms include: ${symptomList}.\n\nGeneral precautions: ${precautionText}.\n\n${DOCTOR_REFERRAL_LINE}`;
}

const NO_MATCH_RESPONSES = [
  "I don't have reliable information on that in my local knowledge base, so I'd rather not guess. A doctor or pharmacist would be able to give you an accurate answer.",
  "That's outside what I can confidently answer from my local knowledge base right now. I'd recommend checking with a doctor or a trusted medical source for that one.",
];

/**
 * Answer a casual, informational medical question.
 * @returns {Promise<string>}
 */
async function answerKnowledgeQuestion(question, opts = {}) {
  const { history = [] } = opts;
  const disease = findDiseaseMatch(question) || (findTopicMatch(question) ? null : resolveContextFromHistory(history).disease);
  const topic = !disease ? findTopicMatch(question) || resolveContextFromHistory(history).topic : null;

  let baseAnswer = null;
  if (disease) baseAnswer = buildDiseaseAnswer(disease, question);
  else if (topic) baseAnswer = `${topic.content}\n\n${DOCTOR_REFERRAL_LINE}`;

  if (ollama.isEnabled() && (disease || topic)) {
    const grounding = disease
      ? `Reference facts about ${disease.name} (do not contradict or go beyond these): ${disease.description} Symptoms: ${disease.symptomsHuman.join(', ')}. General precautions: ${disease.precautions.join('; ')}.`
      : `Reference facts on this topic (do not contradict or go beyond these): ${topic.content}`;
    const systemPrompt = `You are Medora, a warm, knowledgeable medical assistant having a normal conversation. Answer the patient's question conversationally and clearly, grounded ONLY in the reference facts given; do not add facts beyond them, and do not invent statistics or sources. Never name a specific prescription drug or dosage; always say to see a doctor for actual treatment/diagnosis. Keep it to 3-6 sentences.\n\n${PUNCTUATION_RULE}\n\n${grounding}`;
    const reply = await ollama.chat(systemPrompt, [{ role: 'user', content: question }]);
    if (reply) return reply;
  }

  if (baseAnswer) return baseAnswer;

  if (ollama.isEnabled()) {
    const systemPrompt = `You are Medora, a warm, knowledgeable medical assistant. The patient asked a general medical/health question you don't have specific reference data for. Answer it as best and as safely as you can using well-established general medical knowledge, staying conservative and clearly noting uncertainty where relevant. Never name a specific prescription drug or dosage; always recommend seeing a doctor or pharmacist for that. Keep it to 3-5 sentences. If this is not a medical/health topic at all, say plainly that it's outside what you can help with.\n\n${PUNCTUATION_RULE}`;
    const reply = await ollama.chat(systemPrompt, [{ role: 'user', content: question }]);
    if (reply) return reply;
  }

  return NO_MATCH_RESPONSES[Math.floor(Math.random() * NO_MATCH_RESPONSES.length)];
}

module.exports = { answerKnowledgeQuestion, findDiseaseMatch, findTopicMatch, resolveContextFromHistory };
