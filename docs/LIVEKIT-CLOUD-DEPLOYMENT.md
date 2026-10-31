# TWIGA — LiveKit Cloud deployment

This repository's Python agent lives at the repository root and uses
`receptionist/agent.py` as its LiveKit Agents entrypoint.

## Important security rules

- Never commit `.env`, `.env.local`, API keys, API secrets, or provider tokens.
- The LiveKit API key/secret previously pasted into chat must be revoked. Create a
  replacement key in LiveKit Cloud before deploying.
- LiveKit Cloud injects `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and
  `LIVEKIT_API_SECRET` into deployed agent containers. Do not add these three
  variables as agent secrets when deploying to LiveKit Cloud.
- For local development only, put the replacement credentials in a local
  `.env.local` file. Keep it out of Git.

## LiveKit project

WebSocket URL: `wss://mikeee-k1bqnx1i.livekit.cloud`

## Deploy the existing Python agent

Run these commands in PowerShell from a clone of this repository:

```powershell
git clone https://github.com/michaelmuchemi33-design/TWIGA.git
cd TWIGA

# Install the LiveKit CLI (Windows: use the official installer instructions)
# Then authenticate in the browser:
lk cloud auth

# Check the linked project, then create the Cloud agent:
lk project list
lk agent create .
```

The CLI uploads this repository's agent source, builds the container in LiveKit
Cloud, and deploys it. The first deployment creates `livekit.toml` locally;
commit that file only if it contains no secrets and you intend to track the
agent/project identity in Git.

For subsequent code changes:

```powershell
lk agent deploy .
lk agent status
lk agent logs
```

## Agent runtime secrets

The current agent implementation uses the OpenAI Realtime plugin
(`livekit-plugins-openai`) rather than ElevenLabs. To run the current agent,
add `OPENAI_API_KEY` as a LiveKit agent secret through the CLI or LiveKit
Cloud agent settings. Do not put it in Git.

Example using a local, untracked secrets file:

```text
OPENAI_API_KEY=replace-with-your-new-openai-key
```

Then:

```powershell
lk agent create . --secrets-file .\agent-secrets.env
```

If the agent already exists, use:

```powershell
lk agent update-secrets . --secrets-file .\agent-secrets.env
```

Delete the local secrets file after use and ensure it is ignored by Git.

## Important: phone routing is a separate integration step

Deploying the agent makes it available in LiveKit Cloud; it does not by itself
connect the SautiKit Kenyan number. The SautiKit-to-LiveKit connection still
needs a supported SIP trunk/dispatch configuration or a compatible media
bridge. Do not point SautiKit's raw audio WebSocket stream directly at the
LiveKit room WebSocket URL: those are different protocols.

## Current voice-engine status

The Python worker currently constructs an OpenAI Realtime session. ElevenLabs
Conversational AI has not yet been wired into this worker. Do not treat the
deployment as an ElevenLabs-powered phone receptionist until that adapter and
the SautiKit phone route are implemented and tested end to end.

## Licensing

This project is based on AGPL-3.0-licensed upstream software. Preserve the
license and required notices when modifying or distributing it.
