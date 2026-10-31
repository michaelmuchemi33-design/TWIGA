# TWIGA telephony setup

## Architecture
- Vercel hosts the TWIGA web app and HTTPS control-plane endpoints.
- SautiKit owns the Kenyan DID and routes inbound/outbound calls.
- A persistent WebSocket audio bridge (Railway or another always-on host) handles full-duplex 16 kHz PCM audio.
- The bridge connects to ElevenLabs Conversational AI using server-side credentials.

Vercel serverless functions are not the live audio WebSocket bridge. Do not point SautiKit's media stream directly at a normal Vercel API route.

## SautiKit number
- Display number: +254 709 221 577
- Number ID: 2de4cf96-1ee2-4563-81ec-5e78b9660d42
- Voice callback: https://YOUR-VERCEL-DOMAIN/api/sautikit/voice
- Events callback: https://YOUR-VERCEL-DOMAIN/api/sautikit/events

Configure the number routing in SautiKit to use the callback and events URLs. Confirm callback method, VoiceAction XML format, and webhook signature header against the current workspace documentation before production.

## Vercel environment variables
Set in Vercel > Project > Settings > Environment Variables:
- SAUTIKIT_API_KEY: newly rotated SautiKit token
- SAUTIKIT_NUMBER_ID: 2de4cf96-1ee2-4563-81ec-5e78b9660d42
- SAUTIKIT_WEBHOOK_SECRET: webhook signing secret, if enabled
- ELEVENLABS_API_KEY: newly rotated ElevenLabs key
- ELEVENLABS_AGENT_ID: Conversational AI Agent ID
- TWIGA_AUDIO_BRIDGE_URL: wss://... persistent bridge URL
- TWIGA_VOICE_CALLBACK_URL: https://.../api/sautikit/voice

Never use NEXT_PUBLIC_ for secrets. Never commit credentials or paste them into source code.

## Outbound calls
POST /api/calls/outbound with JSON:
{ "to": "+2547XXXXXXXX", "business_context": "Appointment reminder" }

Before exposing this endpoint to customers, add authenticated sessions, per-business authorization, rate limits, consent checks, an auditable opt-out list, and call logging. Restrict testing to numbers whose owners have explicitly agreed.

## Test checklist
1. Rotate credentials pasted into chat.
2. Configure Vercel environment variables and redeploy.
3. Deploy the persistent audio bridge and set TWIGA_AUDIO_BRIDGE_URL.
4. Set SautiKit number routing to the callback and events endpoints.
5. Call +254 709 221 577 from a separate phone.
6. Verify two-way audio, barge-in, call termination and failure handling.
7. Test outbound only with an opted-in test contact.
