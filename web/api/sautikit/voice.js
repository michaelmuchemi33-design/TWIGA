import { signCall } from "../_lib/sign.js";
const esc = (v) => String(v).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
const xml = (res, body) => res.status(200).setHeader("Content-Type", "application/xml; charset=utf-8").send(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`);

export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") { res.setHeader("Allow", "GET, POST"); return res.status(405).send("Method not allowed"); }
  const bridge = process.env.TWIGA_AUDIO_BRIDGE_URL;
  if (!bridge || !/^wss:\/\//i.test(bridge) || !process.env.BRIDGE_SECRET) return res.status(503).type("text/plain").send("TWIGA audio bridge is not configured.");
  const b = { ...(req.query || {}), ...(typeof req.body === "object" && req.body ? req.body : {}) };

  // SautiKit calls this URL again on lifecycle edges (stream stopped/error, completed). Only the first (answered) edge may open the stream.
  if (/stream|complet|end|hangup|fail|busy|no.?answer/i.test(String(b.callSessionState || b.CallSessionState || ""))) return xml(res, "<Response/>");

  const caller = String(b.From || b.from || b.Caller || "unknown"), ts = Math.floor(Date.now() / 1000);
  const url = `${bridge}?${new URLSearchParams({ from: caller, to: String(b.To || b.to || ""), dir: String(b.direction || "inbound"), ts: String(ts), sig: signCall(caller, ts) })}`;
  const status = process.env.TWIGA_EVENTS_URL ? ` statusCallback="${esc(process.env.TWIGA_EVENTS_URL)}"` : "";
  xml(res, `<Response>
  <Stream name="twiga-agent" url="${esc(url)}" track="inbound_track" connect="true" outputSamplingRate="16000" bidirectionalSamplingRate="16000"${status} statusEvents="stream-started stream-stopped stream-error"/>
</Response>`);
}
