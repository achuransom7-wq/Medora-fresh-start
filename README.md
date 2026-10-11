# Medora — AI Health Assistant (Web App)

A chat-based health guidance app for Cameroon: describe symptoms, review general next steps, and organize health notes. It does not diagnose or book medical appointments.

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4, React Router
- **Backend**: Node.js + Express 5, SQLite (`better-sqlite3`), JWT auth
- **AI**: Local rule-based assistant; optional local Ollama model, disabled by default
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
| `see_doctor` | Consider arranging an in-person visit within 24–48 hours |
| `urgent` | Seek immediate in-person care |

**Safety design**: a hard-coded red-flag keyword list in `server/src/services/triage.js` can escalate a response to `urgent`. This is general guidance, not a diagnosis or emergency service. The repository does not seed real providers; the referral feature stays empty until an operator adds and verifies provider records. Referral requests are saved in Medora and do not contact or book with a clinic.

## Local setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env: set a long, random JWT_SECRET. The assistant needs no API key.
npm run dev      # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev      # starts on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and start chatting.

## Environment variables (server/.env)

```
PORT=4000
NODE_ENV=development
AI_PROVIDER=local
JWT_SECRET=<long random string>
CLIENT_ORIGIN=http://localhost:5173
DB_PATH=./data/medora.db
UPLOAD_DIR=./data/uploads
OLLAMA_ENABLED=false
```

## Dynamic Render deployment

Create a Render **Web Service** (not a Static Site) from the repository root. Build command: `npm --prefix server ci --omit=dev && npm --prefix client ci --include=dev && npm --prefix client run build`. Start command: `node server/src/index.js`. Set `NODE_ENV=production`, `AI_PROVIDER=local`, a strong `JWT_SECRET`, `DB_PATH=/var/data/medora.db`, and `UPLOAD_DIR=/var/data/uploads`. Attach a persistent disk mounted at `/var/data`; without it, SQLite data and uploads may be lost on redeploy. `VITE_API_URL` is not needed; the client calls the same-origin `/api` path.

## Design system

- **Palette**: deep teal (`#0F5E56`) for trust/brand, mint for calm backgrounds, coral (`#FF6F5E`) reserved for urgent-only states, amber for "monitor", orange for "see a doctor."
- **Type**: system UI fonts with Georgia display type. No external font requests.
- **Signature element**: the severity rail on chat messages, and a heartbeat-style "pulse divider" used between conversation turns — both reinforce the health context without resorting to a literal heart icon.

## Local assistant mode

The app uses its local, no-API-key assistant by default. It provides pattern-based health guidance, follow-up questions, red-flag escalation, severity labels, local research from bundled references, and conversation summaries. It is not a replacement for a clinician. The built-in engine does not visually analyze attachments or perform live web searches.

To optionally use a local language model, install Ollama on the server host, download a model, and set `OLLAMA_ENABLED=true` and `OLLAMA_MODEL`. Prompts and selected supported attachments are sent to the configured Ollama endpoint. If it is unavailable, Medora falls back to its built-in engine. On Render, Ollama must be separately hosted and reachable; it is not included in the Web Service.

```bash
ollama pull llama3.2
```

## What's not yet wired up

- Verified provider records and clinic contact workflows are not configured in this repository. Add only reviewed provider details before enabling referrals for real users.
- Payment integration (MTN/Orange Money) is not part of this build — this platform is a free health assistant, not a paid service, per the project brief. Can be added later if a premium tier is planned.
- Push notifications, WhatsApp integration (Phase 4 of your timeline) are handled separately — see the mobile app section for how notifications work there.
