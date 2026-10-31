// ElevenLabs server tool: the AI calls this to take a message. Stored as a pending follow-up.
import { db, configured, ORG, e164 } from "../_lib/db.js";
import { same } from "../_lib/sign.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.TOOLS_SECRET || !same(req.headers["x-twiga-secret"] || "", process.env.TOOLS_SECRET)) return res.status(401).json({ error: "unauthorized" });
  if (!configured()) return res.status(503).json({ error: "db not configured" });
  const { caller_name, callback_number, message } = req.body || {};
  try {
    await db("follow_ups", { method: "POST", body: {
      organization_id: ORG(), phone: e164(callback_number) || String(callback_number || "").slice(0, 20), source: "ai_message", priority: "normal",
      scheduled_at: new Date(Date.now() + 3600e3).toISOString(),
      instructions: `Message from ${String(caller_name || "caller").slice(0, 80)}: ${String(message || "").slice(0, 1000)}`,
    } });
    res.status(200).json({ status: "saved", note: "Tell the caller the team will call them back." });
  } catch (e) { console.error("take-message", e.message); res.status(502).json({ error: "could not save" }); }
}
