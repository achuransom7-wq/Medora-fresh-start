/**
 * Medora Local Research
 * ---------------------
 * Drop-in replacement for services/research.js. Same exported interface
 * (researchHealthTopic) for a one-line swap in routes/research.js.
 *
 * Now shares its reference material with services/localKnowledgeQA.js via
 * data/healthTopics.js (~28 curated general topics) and data/diseases.js
 * (the 41-disease dataset) — one reviewed source of truth for both the
 * "Learn more" panel and casual conversational questions, instead of two
 * separate, smaller, duplicated snippet lists.
 *
 * IMPORTANT LIMITATION: this cannot do live web search — there's no internet
 * lookup happening offline. For anything outside the ~28 general topics or
 * 41 diseases, it says so honestly rather than fabricating a citation, and
 * suggests connecting the Claude API for full live research mode.
 */

const ollama = require('./ollamaClient');
const { PUNCTUATION_RULE } = require('./promptStyle');
const { normalize } = require('./localDifferential');
const { DISEASES } = require('../data/diseases');
const { GENERAL_TOPICS } = require('../data/healthTopics');

function findSnippet(query) {
  const normalized = normalize(query);
  let best = null;
  let bestScore = 0;
  for (const topic of GENERAL_TOPICS) {
    const score = topic.keywords.reduce((acc, kw) => (normalized.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return bestScore > 0 ? { topic: best.topic, content: best.content, source: 'Medora local health topics reference' } : null;
}

/** If the query names one of the 41 diseases directly (e.g. "what is typhoid?"), use its dataset entry */
function findDiseaseTopic(query) {
  const normalized = normalize(query);
  for (const disease of DISEASES) {
    const nameNormalized = normalize(disease.name);
    if (nameNormalized.length > 3 && normalized.includes(nameNormalized)) {
      return {
        topic: disease.name,
        content: `${disease.description} Common precautions/management: ${disease.precautions.join('; ')}.`,
        source: "Medora's local 41-disease reference dataset",
      };
    }
  }
  return null;
}

const NO_MATCH_MESSAGE =
  "Medora's local assistant doesn't have live internet access, so it can only answer from a small set of built-in reference topics, and this question falls outside that set. For open-ended, cited research on any topic, connect your Anthropic API key to unlock full research mode with live web search.";

/**
 * Same signature as services/research.js's researchHealthTopic.
 * Returns { content, sources } — sources here are reference notes, not live URLs.
 */
async function researchHealthTopic(query, { conversationContext } = {}) {
  const diseaseTopic = findDiseaseTopic(query);
  const snippet = diseaseTopic || findSnippet(query + ' ' + (conversationContext || ''));

  if (!snippet) {
    return { content: NO_MATCH_MESSAGE, sources: [] };
  }

  let content = snippet.content;

  if (ollama.isEnabled()) {
    const systemPrompt = `You help explain health topics in plain language for a patient. You are given a reference note; rephrase it clearly and warmly for the patient's specific question, but do NOT add any facts beyond what's in the reference note, and do NOT invent sources or statistics. Keep it to 3-5 short sentences plus one line on when to see a doctor. Never name specific prescription drugs or dosages.\n\n${PUNCTUATION_RULE}\n\nReference note: ${snippet.content}`;
    const reply = await ollama.chat(systemPrompt, [{ role: 'user', content: query }]);
    if (reply) content = reply;
  }

  return {
    content,
    sources: [{ title: snippet.topic, url: null, note: snippet.source }],
  };
}

module.exports = { researchHealthTopic };
