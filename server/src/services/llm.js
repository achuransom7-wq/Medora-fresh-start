/**
 * Provider router: free/self-hosted OpenAI-compatible model -> Ollama -> null.
 * A null reply means "use the built-in rule-based engine", so the app always answers.
 */
const compat = require('./openaiCompatClient');
const ollama = require('./ollamaClient');

function isEnabled() {
  return compat.isEnabled() || ollama.isEnabled();
}

function supportsVision() {
  return (compat.isEnabled() && compat.supportsVision) || Boolean(ollama.isEnabled() && ollama.VISION_MODEL);
}

async function chat(systemPrompt, messages, images = []) {
  if (compat.isEnabled()) {
    const reply = await compat.chat(systemPrompt, messages, images);
    if (reply) return reply;
  }
  if (ollama.isEnabled()) {
    return ollama.chat(systemPrompt, messages, images.map((i) => (typeof i === 'string' ? i : i.data)));
  }
  return null;
}

// Safe to expose publicly: reports only whether a language model is active, never keys or URLs.
function status() {
  return { mode: isEnabled() ? 'llm' : 'built-in' };
}

module.exports = { isEnabled, supportsVision, chat, status };
