# Medora Local Medical Agent (v2.4)

## v2.4: a real trained model for "detect all the ways people say it"

You asked for something that understands every way a message can be phrased
— in English, French, *and* Cameroonian Pidgin — not just the exact strings
someone thought to write a regex for. Straight answer on scope first: a
genuine deep neural network needs labeled training data and infrastructure
this offline project doesn't have, so building one honestly meant something
appropriately sized — a **trained bag-of-words softmax classifier** (one
dense layer + softmax: the simplest real neural network architecture),
trained on ~170 hand-written EN/FR/Pidgin examples covering every intent
category, with pure-JS gradient descent and no external ML dependencies.

What this adds, concretely: the old regex layer only recognized a phrasing
if someone had written a pattern for it. The trained model generalizes —
`"my belle dey do me wahala since yesterday"` is correctly read as a symptom
report even though that exact sentence (and even "wahala" in that role) was
never in any pattern list, because the model learned which tokens carry
symptom-signal across languages from the training examples, not which exact
strings to match.

**How it's wired in (`services/localIntent.js` + `ml/`):** the regex layer
still runs first and still wins outright on anything it recognizes — that
logic is well-tested (including safety-relevant behavior like negation and
staying off-topic mid-conversation) and deliberately untouched. Only
messages regex can't place fall through to the trained model, and only if
the model is confident (≥45%, against a ~12.5% random baseline over 8
classes); otherwise the message stays 'ambiguous' and the existing
short-answer/conversation-history continuation logic (unchanged) takes over,
exactly as before this model existed. Net effect: strictly additive — every
regression check from v2.2/v2.3's bug history still passes, and coverage
widens for phrasing nobody explicitly anticipated.

- `data/intentTrainingData.js` — the ~170 labeled EN/FR/Pidgin examples.
  This is the model's only source of truth; extend it the same way you'd
  extend `data/symptomSynonyms.js`.
- `ml/tokenize.js` — shared tokenizer (accent-stripping, light stemming) used
  identically at training and inference time.
- `scripts/trainIntentModel.js` — retrains from the data file, writes
  `ml/intentModel.json`. Run `node scripts/trainIntentModel.js` after
  editing the training data.
- `ml/intentModel.js` — loads the trained weights, exposes `predict(text)`.
  If the model file is missing, this degrades gracefully to the regex-only
  behavior rather than throwing — the ML layer is an enhancement, not a hard
  dependency.

**Honest limitation:** ~170 examples is enough for the model to generalize
usefully within the vocabulary it's seen, but it is not a substitute for a
production-scale labeled dataset. Training-set accuracy (99%+) is a sanity
check, not a real held-out evaluation — there's no separate test set here.
If this goes into real use, the highest-value next step is logging
low-confidence and misclassified messages in production and folding real
examples back into `intentTrainingData.js`.

A fully offline, no-API-key stand-in for the Claude-backed AI in Medora —
conversational (casual chat, factual medical Q&A, graceful "I don't know"
for off-topic asks, and real symptom triage), and now properly stateful
across turns, including short follow-up replies.

## v2.3: fixing a real statefulness gap

You asked directly: is this stateful — does it remember what was said and
what it just asked? The differential engine (symptom tracking across turns)
already was. Verifying that claim surfaced a real gap: the intent
classifier itself looked at each message in total isolation. A short reply
to Medora's own question — "it's really bad", "about 3 days now", "yes",
"7 out of 10" — contains no medical keyword on its own, so it was falling
through to "I'm not able to help with that," mid-conversation, right after
Medora had just asked that exact question. That's exactly the kind of thing
that would look broken in real use.

Fixed in `localIntent.js`: `classifyIntent` now takes the conversation
history. Clear signals (an actual greeting, a real "thanks," a real
question about a new unrelated topic) still win immediately and are never
swallowed — saying "thanks" or asking about the weather mid-symptom-chat is
still handled correctly. But a short, ambiguous reply with no clear signal
of its own now checks what the conversation was already about and continues
that, instead of defaulting to "I don't know." This required being careful
about a subtlety: a short *question* should only be treated as a
continuation if it refers back to something already discussed ("is it
common here?", "how long will it last?") — a short question that's clearly
about something new ("what is the capital of France?") is correctly still
treated as a fresh, off-topic ask, even mid-conversation. Both directions
were tested before shipping.

`localAI.js`'s own reconstruction of "which past turns were genuine symptom
reports" (used to build the differential engine's context, and the visit
summary export) was also made sequentially conversation-aware for the same
reason, so it's consistent with how each message would have been classified
live.

## v2.2: real conversational range, not just symptom triage

You asked for something you could genuinely *converse* with — ask it about a
disease, have a normal back-and-forth, and have it say "I don't know" to
things outside medicine — rather than a bot that only knows how to run
symptom triage. That was a fair criticism of v2.1: everything that wasn't a
personal symptom complaint got forced through the same triage template,
which is exactly what produced the "Bonjour" bug you caught earlier.

What's new:
- **`localKnowledgeQA.js`** — a real conversational Q&A engine. Ask "what
  are the symptoms of typhoid," "how do you treat malaria," "is chicken pox
  contagious," "how much water should I drink," "what's a normal blood
  pressure" — it answers from the 41-disease dataset or the new
  **`data/healthTopics.js`** (28 curated general-wellness topics), phrased
  conversationally, never naming a specific drug or dosage, always closing
  with "see a doctor for diagnosis/treatment."
- **Off-topic detection.** Ask it the capital of France, for a poem, or a
  math question, and it now says plainly that's outside what it does — it
  doesn't try to force an answer or misfire into symptom triage.
- **`localIntent.js` extended** to tell apart: a personal symptom report, a
  factual medical question, small talk, and something genuinely off-topic —
  checking against real disease names and topic keywords, not just a fixed
  word list, so it keeps improving as the datasets grow.
- **Conversation accuracy fix:** earlier factual questions no longer leak
  into later symptom scoring. Previously, asking "what are the symptoms of
  fever?" could make the engine think you'd personally reported having a
  fever a few turns later. Only genuine symptom-report turns are now fed
  into the differential engine's context.

### Two real bugs this caught before shipping (accuracy is still king)

Testing a realistic multi-turn conversation ("I have a fever and headache" →
"I also feel weak and have joint pain") surfaced two genuine accuracy bugs,
both fixed:
1. **Plain "fever" wasn't recognized as a symptom at all** — only "high
   fever" and "mild fever" were mapped. Since "I have a fever" is probably
   the single most common way a real patient phrases this, that was a
   serious recall gap, now fixed (defaults to the more clinically
   significant "high fever" interpretation when unqualified — erring toward
   caution).
2. **The confidence gate was too strict for diseases with long symptom
   lists.** A textbook Dengue presentation (fever + headache + joint pain)
   was being silently dropped because it only covered ~21% of Dengue's full
   14-symptom list. Fixed by allowing a disease to qualify via either
   meaningful coverage OR a strong absolute number of matched symptoms.
3. **(Safety-relevant)** When early-turn confidence was low, the response
   was hardcoding `severity: 'monitor'` regardless of what the actual
   candidates warranted — meaning a legitimately `see_doctor`-level
   possibility could get silently under-stated just because the exact
   diagnosis was still uncertain. Fixed: uncertainty about *which* condition
   it is never reduces how seriously the situation is flagged.

## What's still honestly true

This still isn't Claude or ChatGPT, and won't fully be until your API key is
connected — no local, rule-based system fully matches a real LLM's fluency
and world knowledge. What genuinely changed: it now has actual conversational
*range* (small talk, factual Q&A, graceful refusal, symptom triage) instead
of one mode, and several real accuracy bugs were caught and fixed through
deliberate testing before being shipped to you — not just claimed as fixed.
If you want the closest thing to LLM-level smoothness available locally,
Ollama (see below) is still the honest path there; the template layer is
now a substantially better fallback when Ollama isn't running.

## What changed from v1 → v2

You asked for a lot more medical knowledge, better accuracy, and self-learning.
Here's honestly what that meant and how it was done:

| Ask | What was done |
|---|---|
| "Hundreds of thousands of facts" | Not literally possible to hand-verify safely — see "Being straight with you" below. Instead: swapped ~25 hand-typed conditions for a **real, structured 41-disease / 132-symptom dataset** (a widely used open dataset, originally shared on Kaggle, with official descriptions and precautions), which is both bigger and more reliable than anything I could hand-write. |
| "As intelligent as an LLM" | Added a proper **differential diagnosis engine** (weighted Dice-coefficient symptom matching — the same family of technique used in real symptom-checker research), not keyword counting. It reasons about *combinations* of symptoms, handles **negation** ("no fever" is correctly excluded), and returns a **top-3 differential** rather than one guess. |
| "Self-learning" | Added `localLearning.js`: a real, transparent feedback loop. Every suggestion is logged; if you wire up the optional feedback endpoint, confirmed/corrected outcomes nudge future scoring for that disease — capped so it can't run away in either direction. You can inspect exactly what it's learned at any time. |
| "Predict and other good LLM stuff" | The differential engine *is* the prediction step — given symptoms, it predicts likely conditions, ranked by confidence, the same task a real symptom checker performs. |
| "Accuracy is key" | Extensively tested against real phrasing (see "Testing" below), fixed two real bugs found during that testing (a phrase-matching brittleness problem and a cosine-similarity bias toward diseases with fewer total symptoms) before shipping. |

## Being straight with you about "hundreds of thousands of facts"

I want to be honest rather than just tell you what sounds good: I can't respons‑
ibly hand-write or fabricate hundreds of thousands of medical facts — anything
I "generated" at that scale would just be guessing dressed up as data, which
is the opposite of what you asked for (you were explicit that accuracy is
key). What I *can* do, and did, is use a **real, published, structured
dataset** — verifiable, widely cited in academic papers on this exact task —
covering 41 diseases. That's a large step up in genuine reliability from
v1's 25 hand-typed entries, even though the raw number is smaller than
"hundreds of thousands." Quality and verifiability over a fabricated-sounding
number.

If you want to go further later, the honest paths are: (1) connect your
Claude API key when it's ready — Claude's actual training gives far broader
coverage than any hand-assembled local dataset ever will; or (2) if you find
other well-sourced structured medical datasets (e.g. from a medical school,
WHO, or a licensed clinical database), `data/diseases.js` is a plain array
that's easy to extend — see "Extending the dataset" below.

## What's in this folder

```
data/
  diseases.js            → the real 41-disease dataset (symptoms, descriptions, precautions)
  healthTopics.js        → 28 curated general-wellness topics (hydration, sleep, blood pressure, etc.)
  symptomSynonyms.js      → maps everyday phrasing ("my heart is racing") to dataset symptom terms
services/
  localAI.js              → drop-in replacement for server/src/services/ai.js
  localDifferential.js    → the differential diagnosis engine (matching + scoring)
  localIntent.js          → classifies messages: symptom / knowledge question / small talk / off-topic
  localKnowledgeQA.js     → answers casual factual medical questions conversationally
  localLearning.js        → the self-learning feedback loop
  localMemory.js          → drop-in replacement for server/src/services/memory.js
  localResearch.js        → drop-in replacement for server/src/services/research.js
  ollamaClient.js         → optional bridge to a real local LLM (see below)
routes/
  localAgentFeedback.js   → optional route enabling the self-learning loop from the UI
```

No new npm packages needed beyond what your project already has, except that
`localLearning.js` and the feedback route use your existing `better-sqlite3`
and `express-validator` — already in your `server/package.json`.

## How it actually decides things

1. **Extract symptoms.** `localDifferential.js` scans what the patient said
   for any of ~130 known symptom concepts, using a synonym dictionary plus
   light stemming so "burning when I pee," "it burns when I urinate," and
   "burns to pee" all resolve to the same underlying symptom. Negated
   symptoms ("no fever") are correctly excluded.
2. **Score every disease.** For each of the 41 diseases, it computes a
   weighted Dice coefficient between the patient's symptoms and that
   disease's known symptom profile — rewarding diseases that explain a large
   share of *both* what was said and what's known about the disease.
3. **Gate for confidence.** A disease only surfaces if at least 2 symptoms
   matched AND it covers at least 30% of that disease's own symptom list —
   this stops a single vague symptom from producing a confident-sounding
   result.
4. **Return a differential, never a diagnosis.** Up to 3 ranked candidates,
   each with its match strength, real description, and standard precautions
   — always framed as "here's how this lines up," never "you have X."
5. **Hard safety net, unchanged.** Your existing `triage.js` red-flag phrase
   list is still checked first, on every message, and always wins — exactly
   as in v1. This was never dependent on how smart the matching engine is.
6. **Optional LLM polish.** If Ollama is enabled, the differential is handed
   to it as grounding context so the reply reads more naturally — the LLM is
   told not to contradict the reference data, just phrase it well.

## Installing (same as before — 2 minutes)

1. Copy `data/`, `services/`, and (optionally) `routes/localAgentFeedback.js`
   from this folder into your existing `server/src/` folder.
2. Change the same **three require lines** as before:

   **`server/src/routes/conversations.js`**
   ```diff
   - const { getConsultationResponse, generateTitle, generateCareSummary } = require('../services/ai');
   + const { getConsultationResponse, generateTitle, generateCareSummary } = require('../services/localAI');
   ```
   ```diff
   - const { extractAndStoreMemories, getActiveMemories } = require('../services/memory');
   + const { extractAndStoreMemories, getActiveMemories } = require('../services/localMemory');
   ```

   **`server/src/routes/research.js`**
   ```diff
   - const { researchHealthTopic } = require('../services/research');
   + const { researchHealthTopic } = require('../services/localResearch');
   ```

3. *(Optional — enables the self-learning loop from the UI)* In
   `server/src/index.js`:
   ```js
   const localAgentFeedbackRoutes = require('./routes/localAgentFeedback');
   app.use('/api/local-agent', localAgentFeedbackRoutes);
   ```
   This exposes `POST /api/local-agent/feedback` (`{ conversationId,
   diseaseName, outcome: "confirmed"|"corrected" }`) and `GET
   /api/local-agent/learning-stats`. Without this, the agent still logs every
   suggestion — it just never receives explicit confirm/correct feedback to
   learn from.
4. Restart your server. No `.env` changes required.

## Switching back to Claude later

Same as before: revert the three require lines to `./services/ai`,
`./services/memory`, `./services/research`, add your real
`ANTHROPIC_API_KEY`, restart. Nothing else changes.

## Optional: Ollama for more natural phrasing

Unchanged from v1 — see the Ollama section that was already in your project,
or:
```
ollama pull llama3.1
```
then in `server/.env`:
```
OLLAMA_ENABLED=true
OLLAMA_MODEL=llama3.1
```
The differential engine's output is always what grounds the facts; Ollama
(if enabled) only affects phrasing, never invents beyond the reference data.

## Extending the dataset

`data/diseases.js` is a plain JS array — each entry has `name`, `symptoms`
(dataset tokens), `symptomsHuman`, `description`, `precautions`, and
`severityTier`. To add a condition, add an entry and (important) add its
symptom vocabulary to `data/symptomSynonyms.js` so natural phrasing maps to
it. `data/diseases.js`'s header comment documents the tier logic if you want
to adjust any severity assignments.

## Testing performed before shipping this

I ran the differential engine against realistic multi-symptom sentences
(not just clean textbook phrasing) — including negation ("I do NOT have a
fever"), casual tense variation ("my heart is racing," "I lost my balance"),
and a crisis phrase — before finalizing this. That testing caught and fixed
two real accuracy bugs:
- Exact-substring phrase matching was missing valid matches on tense/word-
  order variation → replaced with stemmed bag-of-words matching.
- Cosine similarity was structurally biased toward diseases with fewer total
  symptoms → replaced with a weighted Dice coefficient.

I'd still encourage you to try it with real conversations before trusting it
for anything important — 41 diseases and hand-reviewed logic is good, but it
is not exhaustive.

## Honest limitations (unchanged in spirit from v1, updated in scope)

- **41 diseases, not "everything."** A real step up from v1's 25, backed by
  actual data instead of hand-typed guesses — but still far narrower than a
  clinician or Claude. Outside this set, the agent says "no confident match"
  rather than guessing.
- **Dataset license not confirmed.** The underlying disease-symptom dataset
  is a widely-used, widely-cited open dataset, but I could not confirm an
  explicit license on its original Kaggle listing. Treat it as fine for
  personal/development use; check the dataset's Kaggle page yourself before
  any commercial redistribution.
- **Pattern matching, not clinical reasoning.** It can't factor in a
  patient's full history, exam findings, or labs the way a clinician (or
  Claude, given the same context) can.
- **"Self-learning" reweights among the same 41 diseases** based on
  confirm/correct feedback — it does not learn new diseases or medical facts
  beyond the dataset.
- **No live web search, no vision by default** — see `localResearch.js`'s
  built-in snippets + dataset lookups, and the `OLLAMA_VISION_MODEL` option
  for optional photo support.
