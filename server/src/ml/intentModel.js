/**
 * Loads the trained intent model (ml/intentModel.json, produced by
 * scripts/trainIntentModel.js) and exposes predict(text) for inference.
 *
 * If the model file is missing (e.g. fresh checkout before anyone has run
 * the training script), this degrades to returning null probabilities
 * rather than throwing, so localIntent.js's regex layer keeps working
 * standalone — the ML layer is an enhancement, never a hard dependency.
 */

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./tokenize');

let MODEL = null;
let LOAD_ERROR = null;

try {
  const raw = fs.readFileSync(path.join(__dirname, 'intentModel.json'), 'utf8');
  MODEL = JSON.parse(raw);
} catch (err) {
  LOAD_ERROR = err;
}

function softmax(scores) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Returns { label, confidence, distribution } or null if the model isn't
 * loaded. `distribution` is every label's probability, sorted descending —
 * useful for debugging/inspecting borderline calls.
 */
function predict(text) {
  if (!MODEL) return null;

  const tokens = tokenize(text);
  const scores = MODEL.weights.map((w, c) => {
    let s = MODEL.bias[c];
    for (const tok of tokens) {
      const idx = MODEL.vocab[tok];
      if (idx !== undefined) s += w[idx];
    }
    return s;
  });

  const probs = softmax(scores);
  const distribution = MODEL.labels
    .map((label, i) => ({ label, prob: probs[i] }))
    .sort((a, b) => b.prob - a.prob);

  return {
    label: distribution[0].label,
    confidence: distribution[0].prob,
    distribution,
  };
}

function isLoaded() {
  return !!MODEL;
}

module.exports = { predict, isLoaded, loadError: () => LOAD_ERROR };
