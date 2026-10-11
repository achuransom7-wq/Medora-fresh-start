const { randomUUID } = require('crypto');
const db = require('../db');
const { client, MODEL } = require('./ai');

/**
 * After an exchange, ask the model to pull out any durable facts worth remembering
 * for future visits (allergies, chronic conditions, medications, recurring symptom
 * patterns, communication preferences). Cheap, small, best-effort — failures are
 * swallowed so this never blocks the chat response.
 */
async function extractAndStoreMemories({ userId, conversationId, userMessage, assistantMessage }) {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: `Extract durable, reusable facts about this patient from the exchange below, worth remembering for FUTURE visits (not just this conversation). Only include things like: allergies, chronic conditions, ongoing medications, recurring symptom patterns ("gets migraines around her period"), or clear communication preferences ("prefers simple language").

Do NOT include one-off symptoms from a single mild illness. Do NOT invent anything not stated or clearly implied.

Respond with ONLY a JSON array (no prose, no markdown fences). Each item: {"category": "allergy"|"condition"|"medication"|"pattern"|"preference"|"other", "content": "short factual sentence"}. If nothing is worth remembering, respond with [].`,
      messages: [
        {
          role: 'user',
          content: `Patient said: ${userMessage}\n\nMedora replied: ${assistantMessage}`,
        },
      ],
    });

    const raw = response.content.find((b) => b.type === 'text')?.text?.trim() || '[]';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let facts;
    try {
      facts = JSON.parse(cleaned);
    } catch {
      return;
    }
    if (!Array.isArray(facts) || facts.length === 0) return;

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
    }
  } catch (err) {
    console.error('Memory extraction failed (non-fatal):', err.message);
  }
}

function getActiveMemories(userId) {
  return db
    .prepare('SELECT * FROM memories WHERE user_id = ? AND active = 1 ORDER BY created_at DESC')
    .all(userId);
}

module.exports = { extractAndStoreMemories, getActiveMemories };
