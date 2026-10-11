/**
 * Medora Local Memory
 * -------------------
 * Drop-in replacement for services/memory.js. Same exported interface
 * (extractAndStoreMemories, getActiveMemories) so it's a one-line swap in
 * routes/conversations.js.
 *
 * Instead of asking an LLM to extract durable facts, this uses straightforward
 * pattern matching for the phrasings people actually use for allergies,
 * chronic conditions, and medications. It's less flexible than the
 * Claude-backed version but needs no API calls and is fully deterministic.
 *
 * If Ollama is enabled (see ollamaClient.js), it's used as a second pass to
 * catch anything the patterns miss — still optional, still fails soft.
 */

const { randomUUID } = require('crypto');
const db = require('../db');
const ollama = require('./ollamaClient');

const PATTERNS = [
  { category: 'allergy', regex: /(?:i'?m|i am)?\s*allergic to ([a-z0-9 ,'-]{2,60}?)(?:\.|,|;|$)/i },
  { category: 'allergy', regex: /allergy to ([a-z0-9 ,'-]{2,60}?)(?:\.|,|;|$)/i },
  { category: 'condition', regex: /i (?:have|was diagnosed with) ((?:type\s*[12]\s*)?diabetes|asthma|hypertension|high blood pressure|epilepsy|heart disease|kidney disease|sickle cell(?: anemia)?|hiv|hepatitis [abc])/i },
  { category: 'medication', regex: /(?:i'?m|i am) (?:currently )?(?:taking|on) ([a-z0-9 ,'-]{2,60}?)(?:\.|,|;| for | daily| every day|$)/i },
  { category: 'medication', regex: /i take ([a-z0-9 ,'-]{2,60}?) (?:daily|every day|regularly)/i },
  { category: 'preference', regex: /(?:please |can you )?(?:use|speak in|explain in) (simple|plain|clinical) (?:language|terms)/i },
];

function extractWithPatterns(text) {
  const facts = [];
  for (const { category, regex } of PATTERNS) {
    const match = text.match(regex);
    if (match && match[1]) {
      const value = match[1].trim().replace(/\s+/g, ' ');
      if (value.length < 2) continue;
      const content =
        category === 'allergy'
          ? `Allergic to ${value}`
          : category === 'condition'
          ? `Has ${value}`
          : category === 'medication'
          ? `Currently taking ${value}`
          : `Prefers ${value} language`;
      facts.push({ category, content });
    }
  }
  return facts;
}

/** Optional second pass via a local LLM, if enabled — same JSON-array contract as the Claude version */
async function extractWithOllama(userMessage, assistantMessage) {
  if (!ollama.isEnabled()) return [];
  const systemPrompt = `Extract durable, reusable facts about this patient worth remembering for FUTURE visits (allergies, chronic conditions, ongoing medications, recurring symptom patterns, or clear communication preferences). Do NOT include one-off symptoms from a single mild illness. Respond with ONLY a JSON array, no prose: [{"category": "allergy"|"condition"|"medication"|"pattern"|"preference"|"other", "content": "short factual sentence"}]. If nothing is worth remembering, respond with [].`;
  const reply = await ollama.chat(systemPrompt, [
    { role: 'user', content: `Patient said: ${userMessage}\n\nMedora replied: ${assistantMessage}` },
  ]);
  if (!reply) return [];
  try {
    const cleaned = reply.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * After an exchange, pull out durable facts and store them. Best-effort — never
 * throws, so it can't block the chat response.
 */
async function extractAndStoreMemories({ userId, conversationId, userMessage, assistantMessage }) {
  try {
    const patternFacts = extractWithPatterns(userMessage);
    const ollamaFacts = await extractWithOllama(userMessage, assistantMessage);
    const facts = [...patternFacts, ...ollamaFacts];
    if (!facts.length) return;

    const existing = db
      .prepare('SELECT content FROM memories WHERE user_id = ? AND active = 1')
      .all(userId)
      .map((r) => r.content.toLowerCase());

    const insert = db.prepare(
      `INSERT INTO memories (id, user_id, category, content, source_conversation_id) VALUES (?, ?, ?, ?, ?)`
    );

    for (const fact of facts) {
      if (!fact?.content || typeof fact.content !== 'string') continue;
      const dupe = existing.some((e) => e.includes(fact.content.toLowerCase()) || fact.content.toLowerCase().includes(e));
      if (dupe) continue;
      const category = ['allergy', 'condition', 'medication', 'pattern', 'preference', 'other'].includes(fact.category)
        ? fact.category
        : 'other';
      insert.run(randomUUID(), userId, category, fact.content.slice(0, 500), conversationId);
      existing.push(fact.content.toLowerCase()); // avoid inserting near-duplicates within the same call
    }
  } catch (err) {
    console.error('Local memory extraction failed (non-fatal):', err.message);
  }
}

function getActiveMemories(userId) {
  return db
    .prepare('SELECT * FROM memories WHERE user_id = ? AND active = 1 ORDER BY created_at DESC')
    .all(userId);
}

module.exports = { extractAndStoreMemories, getActiveMemories };
