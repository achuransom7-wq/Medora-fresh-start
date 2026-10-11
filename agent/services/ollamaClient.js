/**
 * Optional local LLM bridge via Ollama (https://ollama.com).
 *
 * This is entirely optional. The local medical agent works fine without it,
 * using the rule-based knowledge base only. But if the machine running Medora
 * has Ollama installed with a model pulled, this lets the agent phrase its
 * (still knowledge-base-grounded) responses more naturally, and handle
 * free-form questions the keyword matcher doesn't cover.
 *
 * To enable: install Ollama, run `ollama pull llama3.1` (or a model of your
 * choice — a medically-oriented model like `meditron` or `biomistral` if
 * available in your Ollama library works even better), then set:
 *   OLLAMA_ENABLED=true
 *   OLLAMA_MODEL=llama3.1        (or whatever you pulled)
 *   OLLAMA_BASE_URL=http://localhost:11434   (default, usually no need to set)
 *
 * Everything here fails soft: if Ollama isn't running or errors out, callers
 * get `null` back and should fall back to the template-based response.
 */

const ENABLED = String(process.env.OLLAMA_ENABLED || '').toLowerCase() === 'true';
const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || null; // e.g. 'llava', only if you have a vision model pulled
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);

function isEnabled() {
  return ENABLED;
}

async function withTimeout(promise, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Quick reachability check. Cheap enough to call before each generation if
 * you want a live status indicator in the UI (e.g. a "Local AI: ready" badge).
 */
async function isReachable() {
  if (!ENABLED) return false;
  try {
    const res = await withTimeout(
      (signal) => fetch(`${BASE_URL}/api/tags`, { signal }),
      3000
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Chat completion via Ollama's /api/chat endpoint.
 * @param {string} systemPrompt
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @param {Array<string>} [images] - base64-encoded image data (no data: prefix), only used with a vision model
 * @returns {Promise<string|null>} the model's reply text, or null on any failure
 */
async function chat(systemPrompt, messages, images = []) {
  if (!ENABLED) return null;

  const model = images.length && VISION_MODEL ? VISION_MODEL : MODEL;
  const chatMessages = [{ role: 'system', content: systemPrompt }, ...messages];

  // Attach images to the final user message only (Ollama's expected shape)
  if (images.length && chatMessages.length) {
    const last = chatMessages[chatMessages.length - 1];
    if (last.role === 'user') last.images = images;
  }

  try {
    const res = await withTimeout(
      (signal) =>
        fetch(`${BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: chatMessages, stream: false, options: { temperature: 0.4 } }),
          signal,
        }),
      TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message?.content?.trim() || null;
  } catch (err) {
    console.warn('[localAI] Ollama call failed, falling back to template engine:', err.message);
    return null;
  }
}

module.exports = { isEnabled, isReachable, chat, MODEL, VISION_MODEL };
