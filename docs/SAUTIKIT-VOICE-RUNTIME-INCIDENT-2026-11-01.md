# SautiKit voice runtime incident — 1 November 2026

## Summary

A TWIGA outbound test call connected to the destination, but the AI did not produce speech. The telephony leg completed successfully; the AI conversation runtime failed before its first turn.

## Evidence from SautiKit

- Call ID: 15a0f19a-6d9d-44ee-bc9c-5e68131d2bb8
- Direction: outbound
- Agent ID: d17da46a-1c85-4653-bd26-46876c66b3bf
- Published agent revision: 2
- Model: sautikit-flash
- Voice: amara
- Call status: completed
- Call duration: 12 seconds
- AI turns: 0
- AI speaking seconds: 0
- Input/output tokens: 0
- Session end reason: vendor_error
- Telephony charge reported: KES 0.60
- AI usage charge reported for the call: KES 0.00

The event timeline shows the call ringing, being answered, and an audio stream starting before the call completed. This rules out a simple failure to dial or answer, but does not identify the underlying AI vendor fault.

## Account checks

At the time of the follow-up check, SautiKit reported the wallet status as healthy with a balance of KES 39.24. AI spend reporting returned zero usage for the checked period. The available AI concurrency check previously showed one seat total and zero in use.

**Conclusion:** the available evidence does not support insufficient wallet balance as the cause. The vendor_error needs investigation by SautiKit because the provider-side error detail is not exposed in the call record.

## Current TWIGA integration state

- SautiKit number: inbound AI routing remains assigned to the published TWIGA agent.
- Number lifecycle events URL: https://twiga-one.vercel.app/api/sautikit/events.
- The Vercel events endpoint currently verifies an optional HMAC signature and logs event type/call ID. It does not yet persist events to a database or power live dashboard history.
- The dashboard at web/index.html is currently a front-end interface. Live call history, transcripts, recordings, contacts, authentication, campaign persistence, and spend enforcement are not complete.
- The separate custom audio bridge/LiveKit path is not confirmed as connected to this SautiKit number.

## Required vendor investigation

Ask SautiKit support to inspect the call ID above and confirm:

1. The exact underlying provider error and failing stage.
2. Whether sautikit-flash and amara are currently enabled and compatible for this workspace and call direction.
3. Whether any AI-provider activation, account entitlement, or model/voice configuration is missing.
4. The documented supported method for binding the published AI agent to outbound calls.
5. Whether a provider-side trace or correlation ID is available.

Do not add wallet funds or run another paid test solely to troubleshoot this incident. First obtain the provider diagnosis and a confirmed configuration.

## Safety note

No API keys, SIP passwords, webhook signing secrets, personal destination numbers, or other credentials belong in this incident report or source control.
