// TWIGA audio bridge: SautiKit <Stream> WebSocket  <->  ElevenLabs Agents WebSocket.
// Needs an always-on host (Fly.io / Railway / Render). Vercel Functions cannot accept WebSockets.
// Reads the active AI agent + knowledge base from the database at call start and writes the call record + transcript at the end.
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyCall } from "../web/api/_lib/sign.js";
import { db, configured, ORG } from "../web/api/_lib/db.js";

const { ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, BRIDGE_SECRET, PORT = 8080 } = process.env;
if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !BRIDGE_SECRET) { console.error("Missing ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID or BRIDGE_SECRET"); process.exit(1); }

const DEFAULTS = { greeting: "Thank you for calling. How can I help you today?", prompt: "You are a warm, concise receptionist. If you don't know something, offer to take a message." };

async function loadContext() {
  if (!configured()) return { agent: null, knowledge: "(none)" };
  try {
    const [agents, kb] = await Promise.all([
      db("agents", { query: `organization_id=eq.${ORG()}&enabled=eq.true&order=created_at.asc&limit=1` }),
      db("knowledge", { query: `organization_id=eq.${ORG()}&select=title,content&order=created_at.asc&limit=100` }),
    ]);
    return { agent: agents[0] || null, knowledge: kb.map((k) => `## ${k.title}\n${k.content}`).join("\n\n") || "(none)" };
  } catch (e) { console.error("[db] context load failed:", e.message); return { agent: null, knowledge: "(none)" }; }
}

async function signedUrl() {
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`, { headers: { "xi-api-key": ELEVENLABS_API_KEY } });
  if (!r.ok) throw new Error(`signed-url ${r.status}`);
  return (await r.json()).signed_url;
}

const server = http.createServer((_, res) => { res.writeHead(200); res.end("twiga-bridge ok"); });
const wss = new WebSocketServer({ noServer: true, handleProtocols: (p) => (p.has("audio.drachtio.org") ? "audio.drachtio.org" : false) }); // SautiKit requires this subprotocol

server.on("upgrade", (req, socket, head) => {
  const u = new URL(req.url, "http://x"), q = Object.fromEntries(u.searchParams);
  if (u.pathname !== "/stream" || !verifyCall(q.from, q.ts, q.sig)) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); return socket.destroy(); }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, q));
});

wss.on("connection", async (sauti, q) => {
  const started = Date.now(), transcript = [], queue = [];
  let el, ready = false, callRow = null, ended = false;
  const log = (...a) => console.log(`[call ${q.from}]`, ...a);

  sauti.on("message", (data, isBinary) => {
    if (!isBinary) return;
    const m = JSON.stringify({ user_audio_chunk: Buffer.from(data).toString("base64") });
    if (ready) el.send(m); else if (queue.length < 200) queue.push(m);
  });
  const end = async () => {
    if (ended) return; ended = true;
    try { el?.close(); } catch {} try { sauti.close(); } catch {}
    const secs = Math.round((Date.now() - started) / 1000);
    log("ended", secs + "s");
    if (callRow && configured()) await db("calls", { method: "PATCH", query: `id=eq.${callRow.id}&organization_id=eq.${ORG()}`, body: { status: secs >= 3 ? "completed" : "failed", ended_at: new Date().toISOString(), duration_seconds: secs, transcript } }).catch((e) => console.error("[db] finish failed", e.message));
  };
  sauti.on("close", end); sauti.on("error", end);

  const { agent, knowledge } = await loadContext();
  if (configured()) callRow = (await db("calls", { method: "POST", body: { organization_id: ORG(), direction: q.dir === "outbound" ? "outbound" : "inbound", status: "in_progress", from_number: q.from, to_number: q.to || null, agent_id: agent?.id || null } }).catch((e) => { console.error("[db] start failed", e.message); return []; }))[0];

  try { el = new WebSocket(await signedUrl()); } catch (e) { console.error("[el] connect failed", e.message); return end(); }
  el.on("open", () => {
    el.send(JSON.stringify({ type: "conversation_initiation_client_data", dynamic_variables: {
      agent_prompt: agent?.system_prompt || DEFAULTS.prompt, greeting: agent?.greeting || DEFAULTS.greeting, knowledge, caller_number: String(q.from || "unknown") } }));
    ready = true; queue.splice(0).forEach((m) => el.send(m));
  });
  el.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === "audio" && m.audio_event?.audio_base_64 && sauti.readyState === WebSocket.OPEN) sauti.send(Buffer.from(m.audio_event.audio_base_64, "base64"));
    else if (m.type === "ping") el.send(JSON.stringify({ type: "pong", event_id: m.ping_event?.event_id }));
    else if (m.type === "user_transcript") transcript.push({ role: "user", text: m.user_transcription_event?.user_transcript });
    else if (m.type === "agent_response") transcript.push({ role: "agent", text: m.agent_response_event?.agent_response });
    else if (m.type === "conversation_initiation_metadata") {
      const e = m.conversation_initiation_metadata_event || {};
      if (e.user_input_audio_format !== "pcm_16000" || e.agent_output_audio_format !== "pcm_16000") console.warn("[el] WARNING: agent audio is not pcm_16000; audio will sound wrong. Re-create the agent with scripts/setup-elevenlabs.mjs.");
    }
  });
  el.on("close", end); el.on("error", (e) => { console.error("[el] error", e.message); end(); });
});
server.listen(PORT, () => console.log(`twiga-bridge on :${PORT}`));
