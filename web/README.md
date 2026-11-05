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
