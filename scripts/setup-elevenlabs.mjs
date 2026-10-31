// node --env-file=web/.env scripts/setup-elevenlabs.mjs
// Creates the ElevenLabs "Twiga" agent: 16 kHz PCM, prompt driven by dashboard values, take_message tool.
// NOTE: ElevenLabs' agent/tool payloads change often and this script has NOT been run against the live API.
// If it errors, create the agent in the ElevenLabs dashboard with the same prompt/first message and 16 kHz PCM, then set ELEVENLABS_AGENT_ID.
const e = process.env;
for (const k of ["ELEVENLABS_API_KEY", "TWIGA_PUBLIC_URL", "TOOLS_SECRET"]) if (!e[k]) { console.error("Missing", k); process.exit(1); }
const H = { "xi-api-key": e.ELEVENLABS_API_KEY, "Content-Type": "application/json" }, EL = "https://api.elevenlabs.io/v1/convai";
const call = async (u, o) => { const r = await fetch(u, o), t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t}`); return JSON.parse(t); };

const PROMPT = `{{agent_prompt}}

You are answering a live phone call. The caller's number is {{caller_number}}.
Rules: keep replies short (one idea at a time). Reply in the language the caller uses (English, Swahili or Sheng). Say you are an AI assistant if asked.
Only state facts from the knowledge below. Never invent prices, availability, appointments or policies. If unsure, say so and offer to take a message.
To take a message: get the caller's name, callback number and message, read them back, then call take_message.
You cannot transfer calls. For emergencies tell the caller to hang up and dial 999 or 112.

KNOWLEDGE:
{{knowledge}}`;

const tool = { type: "webhook", name: "take_message", description: "Save a message for the business after confirming name, callback number and message.",
  api_schema: { url: `${e.TWIGA_PUBLIC_URL}/api/tools/take-message`, method: "POST", request_headers: { "x-twiga-secret": e.TOOLS_SECRET },
    request_body_schema: { type: "object", required: ["caller_name", "callback_number", "message"], properties: { caller_name: { type: "string", description: "Caller's name" }, callback_number: { type: "string", description: "Number to call back" }, message: { type: "string", description: "Message to pass on" } } } } };

const cfg = { name: "Twiga", conversation_config: {
  agent: { first_message: "{{greeting}}", language: "en", prompt: { prompt: PROMPT, llm: "gemini-2.5-flash" } },
  tts: { voice_id: e.ELEVENLABS_VOICE_ID || "cjVigY5qzO86Huf0OWal", agent_output_audio_format: "pcm_16000" }, asr: { user_input_audio_format: "pcm_16000" } } };
try { const t = await call(`${EL}/tools`, { method: "POST", headers: H, body: JSON.stringify({ tool_config: tool }) }); cfg.conversation_config.agent.prompt.tool_ids = [t.id]; }
catch (err) { console.warn("tool endpoint failed, trying inline tools:", err.message); cfg.conversation_config.agent.prompt.tools = [tool]; }
const a = await call(`${EL}/agents/create`, { method: "POST", headers: H, body: JSON.stringify(cfg) });
console.log("Agent created. Set ELEVENLABS_AGENT_ID=" + a.agent_id + " on Vercel and on the bridge host.");
