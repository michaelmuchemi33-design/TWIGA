# TWIGA prototype: dashboard + AI receptionist

Call path: **caller -> SautiKit number -> `web/api/sautikit/voice.js` (Vercel) -> signed `<Stream>` -> `bridge/` (always-on host) <-> ElevenLabs agent**.
The bridge loads the enabled agent + knowledge base from the database at call start, and saves the call + transcript at the end.
The dashboard (`/app`) reads and writes the same database.

## What works (unit-tested with a mocked database)
Login, contacts (E.164 normalisation, consent source required, CSV import -> always "no consent"), follow-ups, campaign planning + eligibility preview,
AI agents, knowledge base, call history (filters, transcript, CSV export), live calls, overview stats from real rows, integration status, organisation-scoped queries,
signed bridge URLs, message-taking tool. Run: `cd web && npm test`.

## Not built / not verified
- **Not tested on a real call.** SautiKit and ElevenLabs were unreachable from the build environment. The bridge and `scripts/setup-elevenlabs.mjs` have only been syntax-checked.
- **Dialling engine, scheduler, campaign "running", human transfer, per-user accounts/roles, per-user RLS policies, analytics beyond calls, notifications, recordings: not built.** Campaigns cannot be set to running (the API refuses). `/api/calls/outbound` stays disabled.
- **LiveKit:** SautiKit exposes a WebSocket `<Stream>`, not a SIP trunk, so this prototype does not use LiveKit. The Python LiveKit agent is untouched. Whether the number can be SIP-routed to LiveKit is still an open question to ask SautiKit.
- Auth is a single shared password (prototype). One organisation (`TWIGA_ORG_ID`).
- `web/package.json` no longer lists vite and has no build script (the site is static files + API functions).

## Setup
1. Supabase: create a project, run `supabase/schema.sql`, copy the printed organisation id.
2. Vercel (root `web`): add the variables in `web/.env.example`. Generate secrets with `openssl rand -hex 32`. Use freshly rotated keys.
3. Bridge: `fly deploy -c bridge/fly.toml --dockerfile bridge/Dockerfile` (or Railway/Render using `bridge/Dockerfile` from the repo root). Set its env vars; `TWIGA_AUDIO_BRIDGE_URL=wss://<host>/stream`.
4. `node --env-file=web/.env scripts/setup-elevenlabs.mjs` (needs `TWIGA_PUBLIC_URL`), then set `ELEVENLABS_AGENT_ID` on Vercel and the bridge.
5. In SautiKit, set the number's routing URL to `https://<vercel>/api/sautikit/voice`. Call the number from another phone.
6. Open `https://<vercel>/app`, add an AI agent + knowledge items. The next call uses them.
