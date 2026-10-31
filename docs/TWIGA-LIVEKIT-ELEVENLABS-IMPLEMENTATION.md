# TWIGA LiveKit + ElevenLabs implementation

This work belongs in the TWIGA repository. It does not modify the upstream author's repository.

## Selected configuration

- Keep +254 709 221 577, pending confirmation of SIP compatibility.
- ElevenLabs voice.
- TWIGA-owned LiveKit Agents worker.
- Outbound: manual calls, scheduled follow-ups and campaigns.
- Dashboard: `web/dashboard.html`.

## Current engine and required migration

The inherited `receptionist/agent.py` uses OpenAI Realtime speech-to-speech. Replacing its voice setting with an ElevenLabs voice ID is not sufficient. The ElevenLabs implementation should use a supported LiveKit Agents pipeline: streaming STT -> LLM -> ElevenLabs streaming TTS, plus turn detection/VAD and telephone noise cancellation. Pin mutually compatible plugin versions after testing.

The dashboard is an interface foundation. Do not represent draft items or placeholder values as real call records or connected integrations.

## Target architecture

PSTN -> existing carrier number -> SIP trunk / supported SIP forwarding -> LiveKit Cloud SIP ingress -> TWIGA LiveKit worker -> STT + LLM + ElevenLabs TTS -> caller.

Outbound: authenticated dashboard -> TWIGA API -> LiveKit SIP outbound trunk -> PSTN recipient -> TWIGA worker.

A raw telephony WebSocket is not a LiveKit room connection. Do not connect a proprietary raw media stream directly to the LiveKit WSS URL.

## Number retention gate

Ask the current provider whether +254 709 221 577 supports:
- SIP trunking or SIP URI routing to LiveKit Cloud
- Outbound SIP with the same verified Kenyan caller ID
- SIP REFER if call transfers are needed
- Call status events/webhooks

If the provider only offers a raw WebSocket media stream or proprietary AI-agent callback, that is not a SIP trunk. A compatible SIP carrier, bridge or number port may be required. Do not enable the old SautiKit-hosted agent; the target answering process is the TWIGA worker.

## Server-side secrets

Set these only in the worker/API secret manager:
```env
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
TWIGA_STT_PROVIDER=
TWIGA_LLM_PROVIDER=
TWIGA_DATABASE_URL=
TWIGA_DASHBOARD_SESSION_SECRET=
TWIGA_PHONE_NUMBER=+254709221577
TWIGA_SIP_TRUNK_ID=
TWIGA_OUTBOUND_ENABLED=false
```
Never place provider keys in browser JavaScript, local storage, public environment variables or Git.

## Dashboard

`web/dashboard.html` provides workspace navigation for overview, call history, CRM, follow-ups, outbound campaigns, agent settings, voice, knowledge base, analytics and integrations. It currently uses demo-only UI state and has no persistent database/API connection. Do not use it as a production dialler until authentication, persistence and carrier routing are implemented.

## Production requirements before outbound

1. Authenticated dashboard sessions and role-based access.
2. Consent records with source, timestamp and scope for each recipient.
3. Global suppression list and immediate opt-out processing.
4. Quiet hours using Africa/Nairobi, rate limits, retry caps and duplicate prevention.
5. Verified caller ID and provider spend limits.
6. Immutable call/campaign audit records and a global outbound kill switch.
7. Internal-number test campaign before contacting customers.

## Deployment

- Serve the dashboard from Vercel's configured `web` root.
- Run the Python agent as a persistent worker/container, not a Vercel serverless function.
- Configure LiveKit inbound SIP trunk + dispatch rule for agent name `receptionist`.
- Configure outbound SIP trunk only after carrier verification.
- Add authenticated API endpoints and a persistent database before enabling dashboard writes.

## Licensing

TWIGA is a fork of AIReceptionist under AGPL-3.0. Preserve upstream licence and copyright notices when modifying and redistributing.
