# Turning on the language model (free)

Out of the box Medora uses its built-in engine, which handles greetings, identity questions, profile questions,
symptom checks and a library of health topics. It is **not** a language model. To make Medora converse
naturally, point it at one. You only set environment variables on your backend (Render, in your case).

Check what is active at any time: open `https://YOUR-APP/api/health`. It shows `"assistant":"llm"` when a
model is connected and `"assistant":"built-in"` when it is not.

## Option A: Groq free tier (quickest)

1. Create a free account at https://console.groq.com and make an API key (no card was required at the time of writing).
2. List the models your account can use: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_KEY"`.
   Pick a recent instruct model such as a Llama 3.3 70B or Llama 3.1 8B variant. The list rotates, so use what the call returns.
3. On Render, add these environment variables, then redeploy:

```
AI_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=<model id from step 2>
LLM_API_KEY=<your key>
```

Free tiers are rate limited (per organisation, not per key). If the limit is hit, Medora quietly falls back to
the built-in engine, so users always get an answer.

## Option B: OpenRouter free models

Same variables with `LLM_BASE_URL=https://openrouter.ai/api/v1` and a model whose id ends in `:free`.

## Option C: your own model (full control, no third party sees patient messages)

Run Ollama (https://ollama.com) or vLLM on a machine you control, for example a free-tier cloud VM with enough RAM
for a small model. Then:

```
AI_PROVIDER=openai-compatible
LLM_BASE_URL=http://YOUR-VM:11434/v1
LLM_MODEL=llama3.2
```

Small models on CPU are slow and less reliable than hosted ones. Render's free web service cannot run a model itself.

## What does not change with the model

The safety layers live in the app, not in the model: red-flag keywords are checked first, the model can raise
but never lower urgency below what the reviewed dataset and red-flag check require, emergencies always get an
emergency banner, and any model failure falls back to the built-in engine.

## Privacy

With a hosted model, patient messages and selected profile details leave your server. Update your Privacy Policy and
consent text before enabling it for real users, and check the provider's data terms.

## Tuning

`LLM_TIMEOUT_MS` (default 25000), `LLM_MAX_TOKENS` (default 600), `LLM_VISION=true` only for models that accept images.
The assistant's personality and rules are in `server/src/services/assistantLlm.js`.
