# Medora — AI Health Assistant (Web App)

A calm, chat-based AI health assistant for Cameroon: describe your symptoms, get clear guidance, and get connected to a real doctor when it matters. 

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4, React Router
- **Backend**: Node.js + Express 5, SQLite (`better-sqlite3`), JWT auth
- **AI**: Local rule-based assistant by default, with optional Anthropic Claude API (`claude-sonnet-4-6`) support
- **Security**: bcrypt password hashing, httpOnly refresh cookies, rate limiting, helmet, input validation

## Project structure

```
medora-web/
├── server/          Express API
│   ├── src/
│   │   ├── db/           SQLite schema, connection, seed data
│   │   ├── middleware/    JWT auth middleware
│   │   ├── routes/        auth, conversations, referrals, doctors, users
│   │   └── services/      triage engine, AI consultation, referral matching
│   └── .env.example
└── client/          React web app
    └── src/
        ├── api/           axios client with auto token refresh
        ├── context/       auth context
        ├── components/    ChatMessage, SeverityBadge, Sidebar, ReferralCard, etc.
        └── pages/         ChatPage, LoginPage, RegisterPage, ReferralsPage, ProfilePage
```

## How the triage system works

Every AI response is classified into one of four severity levels, shown as a colored rail + badge directly on the chat message so health status is visible at a glance:

| Level | Meaning |
|---|---|
| `self_care` | Manageable at home |
| `monitor` | Watch it, seek care if it worsens |
| `see_doctor` | Book a visit within 24–48 hours |
| `urgent` | Seek immediate in-person care |

**Safety design**: a hard-coded red-flag keyword list (chest pain, difficulty breathing, suicidal ideation, severe bleeding, stroke signs, anaphylaxis, etc.) in `server/src/services/triage.js` force-escalates severity to `urgent` **regardless of what the AI model concludes**. This is a deterministic safety net that does not depend solely on LLM judgment. When severity is `see_doctor` or `urgent`, the app automatically surfaces nearby doctors from the seeded directory and lets the user request a referral.

## Local setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET (random string). The local assistant works without an API key.
npm run seed     # seeds 12 doctors across Buea and Bamenda
npm run dev      # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
# .env already points to http://localhost:4000/api — edit if needed
npm run dev      # starts on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and start chatting.

## Environment variables (server/.env)

```
PORT=4000
NODE_ENV=development
AI_PROVIDER=local
JWT_SECRET=<long random string>
ANTHROPIC_API_KEY=<your Anthropic API key>
ANTHROPIC_MODEL=claude-sonnet-4-6
CLIENT_ORIGIN=http://localhost:5173
DB_PATH=./data/medora.db
```

## Deployment (matches your existing Render/GitHub Pages workflow)

- **Backend → Render**: use a persistent disk mounted at the `DB_PATH` directory (same pattern as your restaurant projects) so the SQLite file survives restarts. Set all env vars above in the Render dashboard. Build command: `npm install`. Start command: `npm start`.
- **Frontend → Render (static site) or GitHub Pages**: build command `npm run build`, publish directory `dist`. Set `VITE_API_URL` to your deployed backend's `/api` URL before building (GitHub Pages can't do full-stack, so the backend must be hosted separately — Render is the better fit here given the SQLite persistence requirement, same as your other full-stack projects).

## Design system

- **Palette**: deep teal (`#0F5E56`) for trust/brand, mint for calm backgrounds, coral (`#FF6F5E`) reserved for urgent-only states, amber for "monitor", orange for "see a doctor."
- **Type**: Fraunces (display) + Inter (body) + JetBrains Mono (data/tags).
- **Signature element**: the severity rail on chat messages, and a heartbeat-style "pulse divider" used between conversation turns — both reinforce the health context without resorting to a literal heart icon.

## Local assistant mode

The app automatically uses a local, no-API-key assistant when `ANTHROPIC_API_KEY` is missing or still contains the example placeholder. You can also set `AI_PROVIDER=local` explicitly. This mode provides symptom follow-up questions, basic self-care guidance, deterministic red-flag escalation, severity labels, and conversation titles from the user's first message. It does not inspect images or documents and is not a replacement for a clinician.

For a genuine local language model, install [Ollama](https://ollama.com), download a model such as `llama3.2`, start Ollama, and set `AI_PROVIDER=ollama`. Medora will send the conversation to Ollama on your machine and fall back to the offline engine if Ollama is unavailable:

```bash
ollama pull llama3.2
```

To switch to Claude later, set `AI_PROVIDER=anthropic` and replace `ANTHROPIC_API_KEY` with a real key, then restart the server.

## What's not yet wired up

- Claude-specific image understanding, memory extraction, research reports, and AI visit summaries require an Anthropic API key. The core chat remains available in local mode without it.
- Payment integration (MTN/Orange Money) is not part of this build — this platform is a free health assistant, not a paid service, per the project brief. Can be added later if a premium tier is planned.
- Push notifications, WhatsApp integration (Phase 4 of your timeline) are handled separately — see the mobile app section for how notifications work there.
