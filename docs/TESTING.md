# Testing Medora

`tests/e2e/smoke.py` drives a real browser through the app and checks, among other things: the landing page,
sign-in, small talk and symptom conversations through the LLM path, markdown rendering, suggestion chips,
the urgent-care card and emergency dialog, the profile page (save, validation, clearing fields), dark mode,
and that no page scrolls sideways on a phone, tablet or desktop.

## Run it

```bash
# 1. a stand-in language model (OpenAI-compatible, no keys needed)
node tests/e2e/mock-llm.js &

# 2. the app, pointed at it
cd client && npm ci && npm run build && cd ../server && npm ci
AI_PROVIDER=openai-compatible LLM_BASE_URL=http://127.0.0.1:9098 LLM_MODEL=test-model \
JWT_SECRET=a_long_random_test_secret_value PORT=4014 DB_PATH=/tmp/medora-test.db \
CLIENT_ORIGIN=http://localhost:4014 node src/index.js &

# 3. the browser checks
pip install playwright && playwright install chromium
MEDORA_URL=http://localhost:4014 python3 tests/e2e/smoke.py
```

Screenshots land in `/tmp/medora-shots/`. The mock model answers by keyword, so these tests check that the app
handles model output correctly (parsing, severity floors, emergency banner), not how clever a real model is.
