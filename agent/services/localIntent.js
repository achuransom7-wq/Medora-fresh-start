/**
 * Medora Local Intent Gate (conversation-aware)
 * ----------------------------------------------
 * Classifies each message into: 'symptom' | 'knowledge_question' |
 * 'greeting' | 'gratitude' | 'farewell' | 'small_talk' | 'off_topic'.
 *
 * v2.2 fixed the "Bonjour → treated as a symptom" bug. Verifying that fix
 * surfaced a related one: the classifier looked at each message in total
 * isolation, so a short follow-up reply to Medora's own question — "it's
 * really bad", "about 3 days now", "7 out of 10", "yes" — contains no
 * medical keyword on its own and was falling through to 'off_topic'
 * ("I'm not able to help with that..."), even in the middle of an ongoing
 * symptom conversation. That's obviously wrong: a doctor doesn't forget
 * what they just asked you.
 *
 * Fix: classifyIntent now optionally takes the conversation `history`. Clear
 * signals (an actual greeting, a real thank-you, a real farewell, explicit
 * symptom/question language) still win immediately, exactly as before —
 * saying "thanks" mid-conversation is still honored as thanks. But when a
 * message is SHORT and AMBIGUOUS (none of those clear signals fire), instead
 * of defaulting to 'off_topic', it now checks what the ongoing conversation
 * was about and continues that — a short reply following a symptom
 * conversation continues as 'symptom', following a knowledge question
 * continues as 'knowledge_question', so it actually behaves like it
 * remembers what it just asked.
 */

const { DISEASES } = require('../data/diseases');
const { GENERAL_TOPICS } = require('../data/healthTopics');
const mlIntent = require('../ml/intentModel');

/**
 * Below this confidence, the trained model's guess isn't trusted and the
 * message continues to be treated as 'ambiguous' (falls through to the
 * short-answer/history-continuation logic, same as before the model
 * existed). Chosen empirically: correct predictions on unseen multilingual
 * phrasing during testing landed at 0.53+ confidence; wrong or genuinely
 * unclear ones landed lower. With 8 classes, random chance is ~0.125, so
 * this is still a meaningful bar, not a rubber stamp.
 */
const ML_CONFIDENCE_THRESHOLD = 0.45;

const GREETING_PATTERNS = [
  /^(hi|hey|hello|yo|sup)\b/i,
  /^good\s?(morning|afternoon|evening|day)\b/i,
  /how\s?('?s| is| are)?\s?(you|it going|things|you doing)\b/i,
  /what'?s up\b/i,
  // French
  /^(bonjour|salut|coucou)\b/i,
  /comment\s?(ça va|allez[- ]vous|vas[- ]tu)\b/i,
  // Pidgin
  /^how\s?far\b/i,
  /^you dey fine\b/i,
];

const GRATITUDE_PATTERNS = [
  /^(thanks|thank you|thx|ty)\b/i,
  /^(merci)\b/i,
  /^(ok(ay)?|cool|great|got it|sounds good|perfect|nice|fine|alright)\b/i,
];

const FAREWELL_PATTERNS = [
  /^(bye|goodbye|see you|later|take care)\b/i,
  /^(au revoir)\b/i,
];

/**
 * The patient is explicitly saying they're fine / have no complaint right
 * now ("I'm feeling alright", "no complaints", "I dey fine"). Checked
 * BEFORE the symptom-hint and long-message-defaults-to-symptom logic below,
 * because otherwise a sentence like "No, I'm feeling alright, just wanted
 * to learn a few things today" has no symptom keyword, is over 60
 * characters, and used to fall through to the "assume it's a symptom"
 * fallback purely because of its length. Covers English, French, and
 * Cameroonian Pidgin, matching the other multilingual patterns in this file.
 */
const WELLNESS_NEGATIVE_PATTERN = new RegExp(
  [
    // English: "I'm fine", "I am doing well", "I feel great", "feeling better"
    "\\b(i'?m|i am)\\s+(feeling\\s+|doing\\s+)?(fine|okay|ok|alright|all\\s?right|good|great|well|better)\\b",
    "\\bi feel\\s+(fine|okay|ok|alright|all\\s?right|good|great|well)\\b",
    "\\b(nothing'?s?\\s+wrong|no complaints|no issues|no concerns|no problems)\\b",
    "\\bnot (sick|ill|unwell)\\b",
    "\\bi don'?t have (any )?(symptoms|complaints)\\b",
    "\\ball good\\b",
    // Bare reciprocal replies with no "I'm"/"I am" prefix, e.g. "good, how
    // about you?", "fine, you?" — requires the sentiment word to be
    // immediately followed by a reciprocal-question phrase (not just
    // "thanks", which is already handled as plain gratitude), so this never
    // collides with "good morning" or a simple "ok thanks".
    "^(good|fine|great|well|alright|ok(ay)?)\\s*[,.!]?\\s*(and you\\b|how about you\\b|how about yourself\\b|you\\?|what about you\\b)",
    // French: "je vais bien", "ça va bien", "rien de grave"
    "\\bje (vais|me sens) bien\\b",
    "\\bça va bien\\b",
    "\\brien de grave\\b",
    // Cameroonian Pidgin: "I dey fine", "body fine", "no wahala"
    "\\bi dey fine\\b",
    "\\bbody fine\\b",
    "\\bno wahala\\b",
  ].join('|'),
  'i'
);

/**
 * The patient wants to chat, ask general questions, or learn something,
 * without reporting a symptom ("just wanted to learn a few things",
 * "I have some questions", "curious about..."). Also checked early, for
 * the same reason as WELLNESS_NEGATIVE_PATTERN above.
 */
const GENERAL_INTENT_PATTERN = new RegExp(
  [
    "\\bjust want(ed)?\\s+to\\s+(learn|ask|chat|talk|know)\\b",
    "\\bwanted\\s+to\\s+(learn|ask|know)\\b",
    "\\b(just\\s+)?curious\\s+about\\b",
    "\\bjust curious\\b",
    "\\bwant(ed)?\\s+to\\s+know\\s+more\\b",
    "\\blearn\\s+(a few things|some things|something)\\b",
    "\\b(have|ask)\\s+(you\\s+)?(a few|some|a couple( of)?|a random|a quick|a general)\\s+questions?\\b",
    // French equivalents
    "\\bje voulais\\s+(juste\\s+)?(apprendre|poser des questions|demander)\\b",
    // Pidgin equivalent
    "\\b(just\\s+)?wan\\s+(learn|ask|know)\\b",
  ].join('|'),
  'i'
);

/**
 * A loose first-person "I feel/have been feeling ___" pattern, used only to
 * decide whether a LONG message with no exact symptom keyword still counts
 * as a plausible complaint (e.g. "I've been feeling off for a few days and
 * it's bothering me at night"), as opposed to a long message that's simply
 * unrelated to health (a poem request, a weather question).
 */
const FIRST_PERSON_FEELING_PATTERN =
  /\b(i feel|i'?ve been feeling|i'?m feeling|i have been feeling|my \w+ (is|feels|hurts|has been))\b/i;

/** Roughly: does the message contain typical illness/body/complaint language? */
const SYMPTOM_HINT_PATTERN =
  /\b(pain|hurt|ache|fever|sick|nausea|vomit|dizz|rash|cough|sore|bleed|swoll|tired|fatigue|itch|burn|breath|dizzy|weak|cramp|diarr|constipat|headache|migraine)\w*\b/i;

/** Question-shaped messages: "what is X", "how do you treat X", "tell me about X", etc. */
const QUESTION_PATTERN =
  /^(what|how|why|when|can|could|does|do|is|are|will|should|which)\b|^(tell me about|explain|describe)\b/i;

/** Broad vocabulary suggesting the message is medical/health-related in nature, even without naming a specific disease */
const MEDICAL_VOCAB_PATTERN =
  /\b(health|medical|doctor|hospital|clinic|nurse|disease|illness|infection|virus|bacteria|vaccine|vaccination|medicine|medication|treat\w*|therapy|symptoms?|diagnos\w*|condition|patient|blood pressure|cholesterol|diabetes|cancer|asthma|allerg\w*|heart|lungs?|kidney|liver|stomach|pregnan\w*|nutrition|diet\w*|exercise|sleep|mental health|anxiety|depression|stress|contagious|hygiene|immune|vitamin|hydrat\w*|water|dose|dosage|pill|tablet|injection|surgery|wound|injury|first aid|body mass|bmi|period|menstrua\w*|fever|pain|weight|smoking|alcohol|drink\w*|eating|food)\b/i;

/** Common short-answer patterns to a clarifying question: durations, ratings, yes/no, "it started..." etc. */
const SHORT_ANSWER_PATTERN =
  /^(yes|yeah|yep|no|nope|not really|kind of|a bit|a little)\b|^\d+\s?(out of|\/)\s?\d+$|^\d+\s?(day|days|hour|hours|week|weeks|month|months)\b|^(since|about|around|for)\b|^it (started|began|is|feels|got)\b|^(really|very|extremely|somewhat|pretty)\s?\w+$/i;

/** A pronoun referring back to something already discussed ("is IT contagious", "how long will THIS last") */
const BACK_REFERENCE_PATTERN = /\b(it|this|that|they|them)\b/i;

/** Does the message name one of the 41 known diseases directly (e.g. "typhoid", "malaria")? */
function mentionsKnownDisease(text) {
  const normalized = text.toLowerCase();
  return DISEASES.some((d) => d.name.length > 3 && normalized.includes(d.name.toLowerCase()));
}

/** Does the message hit a keyword for one of the curated general health topics (e.g. "flu", "cholesterol")? */
function mentionsKnownTopic(text) {
  const normalized = text.toLowerCase();
  return GENERAL_TOPICS.some((t) => t.keywords.some((kw) => normalized.includes(kw)));
}

/**
 * The one-shot classifier: what would this message be, considered entirely
 * on its own, with no conversation context? Used both as the main entry
 * point's first pass, and to look back at individual historical messages
 * without any risk of infinite recursion (it never looks at history itself).
 */
function classifyStandaloneRegex(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'small_talk';

  // Checked before anything else, at any length: an explicit "I'm fine" or
  // "I just wanted to learn/ask something" should never be pulled into the
  // symptom pipeline, no matter how long the sentence around it is.
  if (WELLNESS_NEGATIVE_PATTERN.test(trimmed)) return 'wellness_ok';
  if (GENERAL_INTENT_PATTERN.test(trimmed)) return 'small_talk';

  if (SYMPTOM_HINT_PATTERN.test(trimmed)) return 'symptom';

  if (
    QUESTION_PATTERN.test(trimmed) &&
    (MEDICAL_VOCAB_PATTERN.test(trimmed) || mentionsKnownDisease(trimmed) || mentionsKnownTopic(trimmed))
  ) {
    return 'knowledge_question';
  }

  const isShort = trimmed.length <= 60;

  if (GREETING_PATTERNS.some((p) => p.test(trimmed))) return 'greeting';
  if (GRATITUDE_PATTERNS.some((p) => p.test(trimmed))) return 'gratitude';
  if (FAREWELL_PATTERNS.some((p) => p.test(trimmed))) return 'farewell';

  if (!isShort) {
    // A long message with no symptom keyword, no medical vocabulary, no
    // known disease/topic name, and no first-person "I feel/have been
    // feeling" language is much more likely to be an unrelated message
    // (a poem request, small talk, a question about something else
    // entirely) than an undetected symptom report. Only assume 'symptom'
    // when there's at least one real health signal to hang that on;
    // otherwise let it fall through as 'ambiguous' so the off-topic /
    // small-talk handling below can take over.
    const hasHealthSignal =
      MEDICAL_VOCAB_PATTERN.test(trimmed) ||
      mentionsKnownDisease(trimmed) ||
      mentionsKnownTopic(trimmed) ||
      FIRST_PERSON_FEELING_PATTERN.test(trimmed);
    return hasHealthSignal ? 'symptom' : 'ambiguous';
  }

  if (!MEDICAL_VOCAB_PATTERN.test(trimmed)) return 'ambiguous';

  return 'symptom';
}

/**
 * The one-shot classifier, enhanced. Regex runs first and wins outright
 * whenever it recognizes something (this is deliberately unchanged from
 * before the ML model existed — the hand-written patterns are well-tested
 * and some of them, like negation-sensitive symptom detection, deserve to
 * keep being exact rather than statistical).
 *
 * Only messages the regex layer can't place — genuinely novel phrasing,
 * new languages/dialect mixes, wording nobody wrote a pattern for — fall
 * through to the trained model. This is exactly the gap a fixed pattern
 * list can never close on its own: it only knows phrasings someone thought
 * to type in, in a language they thought to write it in. The model
 * generalizes from ~170 curated EN/FR/Pidgin examples to new combinations
 * of the same vocabulary, which is what "detect all the ways" actually
 * requires for an open-ended set of real patient phrasing.
 *
 * If the model is confident, its label is used. If it isn't (or the model
 * file hasn't been trained/loaded), the message stays 'ambiguous' and
 * falls through to the same short-answer / conversation-history logic that
 * existed before — never a regression, only an addition.
 */
function classifyStandalone(text) {
  const regexResult = classifyStandaloneRegex(text);
  if (regexResult !== 'ambiguous') return regexResult;

  const prediction = mlIntent.predict(text);
  if (prediction && prediction.confidence >= ML_CONFIDENCE_THRESHOLD) {
    return prediction.label;
  }

  return 'ambiguous';
}

/**
 * Find what the conversation was about most recently, by walking backward
 * through history and classifying each user turn standalone until we hit a
 * clear 'symptom' or 'knowledge_question' turn (skipping past small talk).
 */
function findOngoingTopic(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== 'user') continue;
    const intent = classifyStandalone(m.content);
    if (intent === 'symptom' || intent === 'knowledge_question') return intent;
    if (intent === 'greeting' || intent === 'farewell' || intent === 'wellness_ok') return null; // conversation reset
  }
  return null;
}

/**
 * Main entry point. `history` is optional — omitting it just disables the
 * conversation-continuation behavior (equivalent to classifying the message
 * fully standalone).
 */
/** Catches the patient bouncing the "how are you" question back at Medora ("and you?", "how about you", "you?") */
const RECIPROCAL_QUESTION_PATTERN = /\b(and you|how about you|how about yourself|what about you|what about yourself|and how are you|and yourself|you\?)\s*\??$/i;

function classifyIntent(text, history = []) {
  const standalone = classifyStandalone(text);
  if (standalone !== 'ambiguous') return standalone;

  // Ambiguous on its own — a short message with no clear signal and no
  // medical vocabulary. Before giving up and calling it off-topic, check
  // whether it's plausibly a reply to what Medora just asked.
  //
  // A short message that's ALSO phrased as a brand-new question with no
  // back-reference to anything already discussed ("what is the capital of
  // France") is much more likely a genuinely new, unrelated topic than a
  // continuation — even mid-symptom-conversation — so those are excluded
  // from the continuation check. A short question WITH a back-reference
  // ("is it common here?", "how long will it last?") is exactly the kind of
  // natural follow-up a real conversation has, so those ARE included.
  const trimmed = (text || '').trim();
  const isFreshUnrelatedQuestion = QUESTION_PATTERN.test(trimmed) && !BACK_REFERENCE_PATTERN.test(trimmed);
  const looksLikeAnAnswer = !isFreshUnrelatedQuestion && (SHORT_ANSWER_PATTERN.test(trimmed) || trimmed.split(' ').length <= 6);
  if (looksLikeAnAnswer) {
    const ongoing = findOngoingTopic(history);
    if (ongoing) return ongoing;
  }

  return 'off_topic';
}

const RESPONSES = {
  greeting: [
    "Hi there! I'm Medora. How are you feeling today? Is there something going on with your health I can help with?",
    "Hello! I'm here to help with any health questions or symptoms you're dealing with. What's going on?",
  ],
  gratitude: [
    "You're welcome! Let me know if anything changes or if you have another health question.",
    "Glad that helped. I'm here if you need anything else.",
  ],
  farewell: [
    'Take care of yourself! Come back anytime you have a health question.',
    "Bye for now. Don't hesitate to reach out if symptoms come up or change.",
  ],
  small_talk: [
    "I'm here to help with health questions and symptoms. What's on your mind?",
    "Sure, happy to chat. What would you like to know or talk about?",
  ],
  wellness_ok: [
    "Good to hear you're feeling well! Is there a health topic you'd like to learn about, or anything else I can help with?",
    "Glad you're doing okay. What would you like to know?",
    "That's great to hear. Let me know if a health question comes to mind, or if there's something you'd like to learn about today.",
  ],
  wellness_ok_reciprocal: [
    "I'm doing well too, thanks for asking! Is there a health topic you'd like to learn about, or anything else I can help with?",
    "Doing great, thank you! What would you like to know?",
    "I'm well, thanks! Let me know if a health question comes to mind, or if there's something you'd like to learn about today.",
  ],
  off_topic: [
    "That's outside what I can help with. I'm built specifically for health and medical questions. Feel free to ask me about symptoms, conditions, or general wellness anytime!",
    "I don't have anything useful to say about that one, sorry! My focus is health and medical topics. What's going on with your health today?",
    "I'm not able to help with that. I'm a medical assistant, so I stick to health-related questions. Ask me about a symptom, a condition, or general wellness whenever you're ready.",
  ],
};

function respondToIntent(intent, text = '') {
  const key = intent === 'wellness_ok' && RECIPROCAL_QUESTION_PATTERN.test((text || '').trim()) ? 'wellness_ok_reciprocal' : intent;
  const options = RESPONSES[key] || RESPONSES.small_talk;
  return options[Math.floor(Math.random() * options.length)];
}

module.exports = { classifyIntent, respondToIntent };
