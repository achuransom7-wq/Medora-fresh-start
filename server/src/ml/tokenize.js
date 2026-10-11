/**
 * Shared tokenizer for the intent classifier.
 * ---------------------------------------------
 * MUST be used identically at training time and inference time, or the
 * model's learned weights won't line up with the features it sees live.
 * That's why this lives in its own file instead of being copy-pasted into
 * both trainIntentModel.js and intentModel.js.
 *
 * Deliberately simple and dependency-free:
 *  - lowercase
 *  - strip accents (so "ça", "cà", "ca" all collapse to one token — matters
 *    for French typed on phones without easy accent keys, and for Pidgin
 *    which has no fixed spelling convention)
 *  - strip punctuation
 *  - split on whitespace
 *  - drop a short list of near-useless stopwords shared across EN/FR (kept
 *    intentionally tiny — this is a bag-of-words model with very few
 *    training examples, so aggressive stopword removal would throw away
 *    signal, not noise)
 *  - light suffix trimming so plural/verb-form variants ("symptoms" /
 *    "symptom", "vomiting" / "vomit") share a feature instead of splitting
 *    the model's already-small evidence across near-duplicate tokens
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'i', 'you', 'to', 'of', 'and',
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'je', 'tu',
]);

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function lightStem(token) {
  // Very conservative — only strips endings unlikely to matter for
  // *intent*, never enough to collide unrelated words.
  return token
    .replace(/(ing|tion)$/, '')
    .replace(/(es|s)$/, '')
    .replace(/(er|ez)$/, '');
}

function tokenize(text) {
  const normalized = stripAccents(String(text || '').toLowerCase());
  const raw = normalized
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens = [];
  for (const t of raw) {
    if (STOPWORDS.has(t)) continue;
    if (t.length <= 1) continue;
    tokens.push(lightStem(t));
  }
  return tokens;
}

module.exports = { tokenize, stripAccents };
