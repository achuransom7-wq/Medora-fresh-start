/**
 * Free / self-hosted LLM bridge using the OpenAI-compatible chat API.
 *
 * Works with any open-weights model server that speaks /v1/chat/completions:
 *   - Self-hosted Ollama      LLM_BASE_URL=http://HOST:11434/v1     LLM_MODEL=llama3.2
 *   - Groq (free tier)        LLM_BASE_URL=https://api.groq.com/openai/v1
 *   - OpenRouter (free models) LLM_BASE_URL=https://openrouter.ai/api/v1
 *   - Cloudflare Workers AI   LLM_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<ID>/ai/v1
 *   - Google Gemini           LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *   - vLLM / llama.cpp server on your own VM
 * Free tiers and model names change, so check each provider's current terms.
 *
 * Enable with:  AI_PROVIDER=openai-compatible  LLM_BASE_URL=...  LLM_MODEL=...  LLM_API_KEY=...
 * Fails soft: any error returns null and callers fall back to the built-in engine.
 */

const BASE_URL = (process.env.LLM_BASE_URL || '').replace(/\/+$/, '');
const MODEL = process.env.LLM_MODEL || '';
const API_KEY = process.env.LLM_API_KEY || '';
const ENABLED = String(process.env.AI_PROVIDER || '').toLowerCase() === 'openai-compatible' && Boolean(BASE_URL && MODEL);
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 25000);
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 600);
const VISION = String(process.env.LLM_VISION || '').toLowerCase() === 'true';

function isEnabled() {
  return ENABLED;
}

async function chat(systemPrompt, messages, images = []) {
  if (!ENABLED) return null;

  const turns = [];
  for (const m of messages) {
    if (!m?.content) continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n\n${m.content}`;
    else turns.push({ role, content: m.content });
  }
  if (!turns.length) return null;

  if (VISION && images.length && turns[turns.length - 1].role === 'user') {
    const last = turns[turns.length - 1];
    last.content = [
      { type: 'text', text: last.content },
      ...images
        .filter((i) => i?.data)
        .map((i) => ({ type: 'image_url', image_url: { url: `data:${i.mediaType || 'image/jpeg'};base64,${i.data}` } })),
    ];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(API_KEY ? { authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: systemPrompt }, ...turns],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[llm] provider returned ${res.status}, using built-in engine`);
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn('[llm] call failed, using built-in engine:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { isEnabled, chat, MODEL, supportsVision: VISION };
