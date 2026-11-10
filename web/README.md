# TWIGA website

A responsive TWIGA landing page for Kenyan businesses, built with Vite and deployed from `web/` on Vercel.

## Stack

- Vite 6 and vanilla HTML, CSS and JavaScript
- `@vapi-ai/web` 3.1.1 for live browser voice sessions
- Vapi assistant with ElevenLabs voice overrides
- Vercel Functions under `api/`

## Local development

```bash
npm install
npm run dev
```

Build with `npm run build` and preview with `npm run preview`.

## Live browser voice demo

The homepage starts a real Vapi Web SDK voice session. Press **Start live call**, allow microphone access, and speak to the assistant. This is a browser WebRTC demo, not a call to a mobile or landline number. The five selectable ElevenLabs voices are sent as per-call overrides; the saved Vapi assistant is not modified by the website.

Configure `VITE_VAPI_PUBLIC_KEY` and `VITE_VAPI_ASSISTANT_ID` in `.env.local` or Vercel Production variables. A Vapi public key is intended to be visible in browser code. Never put a private Vapi key or ElevenLabs API secret in a `VITE_` variable. The assistant still needs valid model, transcriber, voice and account configuration. Browser microphone permission and network access are required.

## Branding and images

- Brand palette: orange `#F36F21`, white and black/charcoal. No purple palette remains.
- `public/favicon.svg` and PNG app icons provide site and device icons.
- `public/assets/phone-hand.webp` is the hand-held smartphone hero image.
- `public/assets/kenyan-barbershop.webp` is the African barbershop scene.
- `../IMAGE-PROMPTS.md` contains individual prompts for these images and optional future Kenyan business scenes.

The site uses a simple TWIGA wordmark and T mark because no official logo vector was present in the website directory when rebuilt. Replace it with the approved logo SVG when supplied.

## SEO and Vercel

The page includes descriptive metadata, canonical URL, Open Graph tags, SoftwareApplication JSON-LD, `robots.txt` and `sitemap.xml`. Rankings are not guaranteed; continue with Search Console, useful content, page speed and genuine local backlinks.

Vercel settings: root `web`, framework Vite, install `npm install`, build `npm run build`, output `dist`, production domain `https://twiga.co.ke`.

## Retained API routes

- `api/calls/outbound.js` — protected SautiKit outbound endpoint; disabled unless enabled server-side.
- `api/sautikit/events.js` — SautiKit event webhook receiver.
- `api/sautikit/voice.js` — returns configured audio stream instructions when `TWIGA_AUDIO_BRIDGE_URL` is set.

These existing server routes are separate from the public browser demo. Keep their private environment variables on the server only.


## Current Android APK download

The Android download strip on the homepage points to the TWIGA Business Assistant release, not the older Unity AI Receptionist APK. The page calls the same-origin Vercel endpoint `/api/latest-apk`; that endpoint reads the latest `twiga-business-assistant-latest` GitHub Release, then returns the real asset URL, version, file size, minimum Android version and checksum metadata.

The Android repository's `TWIGA Business Assistant Android` workflow publishes or replaces the APK and `version.json` after each successful push build on `feature/twiga-business-assistant-app`. The website therefore picks up new APK builds automatically; no website code edit is needed for each app build. Vercel's API cache is set to five minutes with stale-while-revalidate.

The current APK is the Business Assistant build (package `co.ke.twiga.businessassistant`), supports Android 7.0 / API 24 and newer, and includes the WhatsApp workspace. A debug-signed APK can be installed fresh, but Android requires a consistent signing certificate for seamless in-place upgrades. Configure a permanent release keystore and sign every production APK with it before treating the APK channel as a production update channel; never commit the keystore or its password to this public repository.
