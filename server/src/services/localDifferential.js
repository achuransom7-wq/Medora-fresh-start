/**
 * Medora Local Differential Engine
 * ---------------------------------
 * A real (if modest) symptom-checker: matches free-text symptom descriptions
 * against data/diseases.js using weighted cosine similarity over symptom
 * vectors (the same core idea used by real clinical symptom checkers and the
 * ML notebooks this dataset comes from) — not simple keyword counting.
 *
 * Key design choices, made deliberately for safety and accuracy:
 *  - Returns a TOP-3 DIFFERENTIAL, never a single confident "diagnosis". This
 *    mirrors how symptom checkers are meant to be used and avoids the
 *    dangerous overconfidence of "you have X" from a keyword match.
 *  - Negation-aware: "no fever", "I don't have chest pain" correctly excludes
 *    that symptom rather than matching it.
 *  - Coverage-gated: a disease only surfaces if a meaningful fraction of ITS
 *    defining symptoms were mentioned — matching 1 of 15 symptoms for a
 *    disease should not trigger a confident-sounding result.
 *  - Self-learning hook: scores can be nudged by localLearning.js's stored
 *    feedback weights, so accuracy can improve with use over time.
 */

const { DISEASES, SYMPTOM_SEVERITY_WEIGHTS } = require('../data/diseases');
const { PHRASE_ENTRIES, stem } = require('../data/symptomSynonyms');

const NEGATION_WORDS = ['no', 'not', 'none', 'never', "don't", 'dont', "didn't", 'didnt', 'without', 'denies', "haven't", 'havent', "isn't", 'isnt', "wasn't", 'wasnt'];
const NEGATION_LOOKBACK_WORDS = 4; // how many words before a matched content word to scan for a negation cue

function normalize(text) {
  return (text || '').toLowerCase().replace(/[^\w\s'’]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Extract canonical symptom tokens mentioned in free text, respecting negation.
 * Uses stemmed bag-of-words matching per synonym phrase (order-independent,
 * tense/inflection-tolerant) rather than brittle exact substrings — "my heart
 * is racing" now matches the same as "heart racing" would.
 * Returns { present: Set<string>, negated: Set<string> }.
 */
function extractSymptoms(text) {
  const words = tokenize(text);
  const stems = words.map(stem);
  const stemSet = new Set(stems);
  const present = new Set();
  const negated = new Set();

  for (const { contentStems, canonical } of PHRASE_ENTRIES) {
    if (contentStems.length === 0) continue;
    const allPresent = contentStems.every((s) => stemSet.has(s));
    if (!allPresent) continue;

    // Find the earliest position among the matched content stems, to check for a
    // nearby negation cue. Approximate by design — good enough for a short chat message.
    let earliestIdx = Infinity;
    for (const s of contentStems) {
      const idx = stems.indexOf(s);
      if (idx !== -1 && idx < earliestIdx) earliestIdx = idx;
    }
    const lookback = words.slice(Math.max(0, earliestIdx - NEGATION_LOOKBACK_WORDS), earliestIdx);
    const isNegated = lookback.some((w) => NEGATION_WORDS.includes(w));

    if (isNegated) negated.add(canonical);
    else present.add(canonical);
  }

  for (const n of negated) present.delete(n);
  return { present, negated };
}

function symptomWeight(symptom) {
  return SYMPTOM_SEVERITY_WEIGHTS[symptom] ?? SYMPTOM_SEVERITY_WEIGHTS[symptom.replace(/ /g, '_')] ?? 2;
}

/**
 * Weighted Dice coefficient between the patient's matched symptoms and a
 * disease's symptom set, plus the disease-side coverage ratio used as a
 * confidence gate.
 *
 * Dice (rather than cosine) is used deliberately: cosine similarity is biased
 * toward diseases with a SMALL total symptom count, because its denominator
 * is each vector's own magnitude — a disease with only 4 known symptoms can
 * outscore one with 15 just by matching 2 of its 4, even when the 15-symptom
 * disease actually explains more of what the patient described. Dice's
 * denominator is the SUM of both sets' weights, which doesn't have that bias
 * and better rewards a disease that accounts for most of what was said.
 */
function scoreDisease(matchedSymptoms, disease, learningMultiplier = 1) {
  const diseaseSet = new Set(disease.symptoms);
  const intersection = [...matchedSymptoms].filter((s) => diseaseSet.has(s));
  if (intersection.length === 0) return { score: 0, coverage: 0, matched: [] };

  const intersectionWeight = intersection.reduce((sum, s) => sum + symptomWeight(s), 0);
  const patientWeight = [...matchedSymptoms].reduce((sum, s) => sum + symptomWeight(s), 0);
  const diseaseWeight = disease.symptoms.reduce((sum, s) => sum + symptomWeight(s), 0);
  const dice = (2 * intersectionWeight) / (patientWeight + diseaseWeight);
  const coverage = intersection.length / disease.symptoms.length;

  return { score: dice * learningMultiplier, coverage, matched: intersection };
}

/**
 * Run the differential engine against free text (typically the whole
 * conversation so far). Returns up to `topN` candidates above a minimum
 * confidence/coverage bar, sorted best-first.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {(diseaseName: string) => number} [opts.getLearningMultiplier] - from localLearning.js
 */
function runDifferential(text, opts = {}) {
  const { present } = extractSymptoms(text);
  if (present.size === 0) return { matchedSymptoms: [], candidates: [] };

  const getMultiplier = opts.getLearningMultiplier || (() => 1);

  const scored = DISEASES.map((disease) => {
    const { score, coverage, matched } = scoreDisease(present, disease, getMultiplier(disease.name));
    return { disease, score, coverage, matched };
  })
    // A disease qualifies if EITHER it covers a meaningful share of its own
    // symptom list, OR at least 3 of the patient's symptoms line up with it
    // regardless of the disease's total symptom count. The OR matters:
    // Dengue has 14 listed symptoms, so a textbook fever+headache+joint-pain
    // report only covers ~21% of its list — without the absolute-count
    // escape hatch, a classic presentation like that was being silently
    // dropped just because the disease happens to have a long symptom list.
    .filter((r) => r.matched.length >= 2 && (r.coverage >= 0.25 || r.matched.length >= 3) && r.score > 0.12)
    // Primary: similarity score. Tie-break: more corroborating matched symptoms first
    // (a disease that explains ALL the mentioned symptoms shouldn't lose a coin-flip
    // tie to one that only explains a couple, just because it has a smaller total
    // symptom list), then by coverage of that disease's own symptom set.
    .sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || b.coverage - a.coverage)
    .slice(0, 3);

  // Normalize scores into rough "confidence" percentages relative to each other
  const totalScore = scored.reduce((sum, r) => sum + r.score, 0) || 1;
  const candidates = scored.map((r) => ({
    name: r.disease.name,
    description: r.disease.description,
    precautions: r.disease.precautions,
    severityTier: r.disease.severityTier,
    matchedSymptoms: r.matched.map((s) => s.replace(/_/g, ' ')),
    confidencePct: Math.round((r.score / totalScore) * 100),
  }));

  return { matchedSymptoms: [...present].map((s) => s.replace(/_/g, ' ')), candidates };
}

module.exports = { runDifferential, extractSymptoms, normalize };
