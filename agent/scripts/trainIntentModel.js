#!/usr/bin/env node
/**
 * Trains the local intent classifier and writes ml/intentModel.json.
 *
 * Run this whenever data/intentTrainingData.js changes:
 *   node scripts/trainIntentModel.js
 *
 * What it actually is: a bag-of-words multinomial logistic regression
 * (softmax over a single linear layer) — the simplest real neural network
 * architecture there is (one dense layer + softmax, no hidden layer).
 * Trained with full-batch gradient descent and L2 regularization, entirely
 * in plain JS, no external ML libraries. This is an honest, appropriately-
 * scoped choice for ~250 labeled examples: a deeper network would have far
 * more parameters than training examples and would just memorize them
 * instead of generalizing, which would make it *worse* at understanding
 * phrasings it hasn't seen, not better.
 *
 * Why this beats hand-written regex for the stated goal ("detect all the
 * ways, in English/French/Pidgin"): the model doesn't need an exact phrase
 * or pattern to have been anticipated. It learned that tokens like "pain",
 * "fievre"/"fever", "dey", "hurt", "vomit" etc. carry weight toward
 * 'symptom' regardless of what sentence they show up in, in any of the
 * three languages, because they appeared with that label during training.
 * New phrasings that reuse the same vocabulary in new combinations are
 * handled correctly even though that exact sentence was never written down
 * anywhere — which is precisely what a fixed regex list can't do.
 */

const fs = require('fs');
const path = require('path');
const { tokenize } = require('../ml/tokenize');
const { TRAINING_EXAMPLES } = require('../data/intentTrainingData');

const LABELS = [
  'greeting',
  'gratitude',
  'farewell',
  'symptom',
  'knowledge_question',
  'wellness_ok',
  'small_talk',
  'off_topic',
];

const LEARNING_RATE = 0.5;
const EPOCHS = 800;
const L2 = 0.001;

function buildVocab(examples) {
  const vocab = new Map(); // token -> index
  for (const ex of examples) {
    for (const tok of tokenize(ex.text)) {
      if (!vocab.has(tok)) vocab.set(tok, vocab.size);
    }
  }
  return vocab;
}

function toFeatureVector(text, vocab) {
  const vec = new Array(vocab.size).fill(0);
  for (const tok of tokenize(text)) {
    const idx = vocab.get(tok);
    if (idx !== undefined) vec[idx] = 1; // binary bag-of-words
  }
  return vec;
}

function softmax(scores) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function train() {
  const vocab = buildVocab(TRAINING_EXAMPLES);
  const numFeatures = vocab.size;
  const numClasses = LABELS.length;
  const labelIndex = Object.fromEntries(LABELS.map((l, i) => [l, i]));

  const X = TRAINING_EXAMPLES.map((ex) => toFeatureVector(ex.text, vocab));
  const Y = TRAINING_EXAMPLES.map((ex) => labelIndex[ex.label]);

  // weights[class][feature], bias[class]
  let weights = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
  let bias = new Array(numClasses).fill(0);

  const n = X.length;

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const gradW = Array.from({ length: numClasses }, () => new Array(numFeatures).fill(0));
    const gradB = new Array(numClasses).fill(0);
    let totalLoss = 0;

    for (let i = 0; i < n; i++) {
      const x = X[i];
      const y = Y[i];

      const scores = weights.map((w, c) => {
        let s = bias[c];
        for (let f = 0; f < numFeatures; f++) s += w[f] * x[f];
        return s;
      });
      const probs = softmax(scores);
      totalLoss += -Math.log(Math.max(probs[y], 1e-12));

      for (let c = 0; c < numClasses; c++) {
        const err = probs[c] - (c === y ? 1 : 0);
        gradB[c] += err;
        for (let f = 0; f < numFeatures; f++) {
          if (x[f] !== 0) gradW[c][f] += err * x[f];
        }
      }
    }

    for (let c = 0; c < numClasses; c++) {
      bias[c] -= (LEARNING_RATE * gradB[c]) / n;
      for (let f = 0; f < numFeatures; f++) {
        const reg = L2 * weights[c][f];
        weights[c][f] -= LEARNING_RATE * (gradW[c][f] / n + reg);
      }
    }

    if (epoch % 200 === 0 || epoch === EPOCHS - 1) {
      console.log(`epoch ${epoch}: avg loss ${(totalLoss / n).toFixed(4)}`);
    }
  }

  // Training-set accuracy (sanity check, not a real held-out eval — see README note)
  let correct = 0;
  for (let i = 0; i < n; i++) {
    const scores = weights.map((w, c) => {
      let s = bias[c];
      for (let f = 0; f < numFeatures; f++) s += w[f] * X[i][f];
      return s;
    });
    const pred = scores.indexOf(Math.max(...scores));
    if (pred === Y[i]) correct++;
  }
  console.log(`training-set accuracy: ${correct}/${n} (${((correct / n) * 100).toFixed(1)}%)`);

  const model = {
    version: 1,
    trainedAt: new Date().toISOString(),
    labels: LABELS,
    vocab: Object.fromEntries(vocab),
    weights,
    bias,
  };

  const outPath = path.join(__dirname, '..', 'ml', 'intentModel.json');
  fs.writeFileSync(outPath, JSON.stringify(model));
  console.log(`wrote ${outPath} (${numFeatures} features, ${n} training examples, ${numClasses} classes)`);
}

train();
