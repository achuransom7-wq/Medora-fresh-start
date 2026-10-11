/**
 * Shared style rules injected into every system prompt that generates a
 * patient-facing reply. Keeping this in one place means a fix here (e.g.
 * the hyphen/dash bug) automatically applies everywhere the LLM talks to
 * the user, instead of having to hunt down every prompt string by hand.
 */

const PUNCTUATION_RULE = `PUNCTUATION: Write in plain, properly punctuated sentences. Do not use a hyphen or dash (-, --, or —) to join clauses, add an aside, or stand in for "and", "but", or "so". If you need to connect or set off an idea, use a period, comma, colon, semicolon, or parentheses instead, or simply start a new sentence. Only use a hyphen inside an actual hyphenated word (e.g. "over-the-counter", "well-being"). Never use a hyphen or dash for emphasis; use bold text for that instead.`;

module.exports = { PUNCTUATION_RULE };
