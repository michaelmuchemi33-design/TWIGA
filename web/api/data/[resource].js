// Generic, whitelisted CRUD over the organization's tables. Auth required; every query scoped to TWIGA_ORG_ID.
import { requireAuth } from "../_lib/auth.js";
import { db, configured, ORG, e164 } from "../_lib/db.js";

const UUID = /^[0-9a-f-]{36}$/i;
const R = {
  contacts:  { fields: ["full_name", "phone", "email", "company", "tags", "notes", "consent_status", "consent_source", "preferred_time"], required: ["full_name", "phone"], order: "created_at.desc" },
  agents:    { fields: ["name", "description", "system_prompt", "greeting", "language", "voice_id", "enabled"], required: ["name"], order: "created_at.desc" },
  knowledge: { fields: ["title", "content", "category"], required: ["title", "content"], order: "created_at.desc" },
  campaigns: { fields: ["name", "description", "agent_id", "status", "start_at", "timezone", "max_calls_per_hour", "max_concurrent", "max_retries"], required: ["name"], order: "created_at.desc" },
  follow_ups:{ fields: ["contact_id", "phone", "agent_id", "scheduled_at", "priority", "instructions", "status"], required: ["scheduled_at"], order: "scheduled_at.asc" },
  calls:     { fields: [], readonly: true, order: "started_at.desc" },
};
// The dialling engine is not built/enabled yet, so a campaign can never be set to running from the UI/API.
const CAMPAIGN_STATUS_ALLOWED = ["draft", "scheduled", "paused", "cancelled"];

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (!configured()) return res.status(503).json({ error: "Database not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TWIGA_ORG_ID)." });
  const name = req.query.resource, cfg = R[name];
  if (!cfg) return res.status(404).json({ error: "Unknown resource" });
  const id = req.query.id;
  if (id && !UUID.test(id)) return res.status(400).json({ error: "Bad id" });
  const scope = `organization_id=eq.${ORG()}`;

  try {
    if (req.method === "GET") {
      if (name === "campaigns" && req.query.preview) return res.status(200).json(await preview());
      const rows = await db(name, { query: `${scope}&order=${cfg.order}&limit=500` });
      return res.status(200).json(rows);
    }
    if (cfg.readonly) return res.status(405).json({ error: "Read-only" });

    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id required" });
      await db(name, { method: "DELETE", query: `${scope}&id=eq.${id}` });
      return res.status(200).json({ deleted: id });
    }
    if (req.method !== "POST" && req.method !== "PATCH") return res.status(405).end();

    const clean = {};
    for (const k of cfg.fields) if (req.body && k in req.body && req.body[k] !== "") clean[k] = req.body[k];
    const missing = req.method === "POST" ? cfg.required.filter((k) => clean[k] == null) : [];
    if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

    if (name === "contacts" && clean.phone != null) {
      const p = e164(clean.phone); if (!p) return res.status(400).json({ error: "Invalid phone number. Use +2547XXXXXXXX or 07XXXXXXXX." });
      clean.phone = p;
    }
    if (name === "follow_ups" && clean.phone != null) clean.phone = e164(clean.phone) || clean.phone;
    if (name === "contacts" && clean.consent_status === "granted") { clean.consent_at = new Date().toISOString(); if (!clean.consent_source) return res.status(400).json({ error: "Recording consent requires a consent source (e.g. 'signed form', 'WhatsApp opt-in')." }); }
    if (name === "campaigns" && clean.status && !CAMPAIGN_STATUS_ALLOWED.includes(clean.status))
      return res.status(400).json({ error: "Campaigns can't be started yet: the dialling engine is disabled in this prototype." });

    if (req.method === "POST") return res.status(201).json((await db(name, { method: "POST", body: { ...clean, organization_id: ORG() } }))[0]);
    if (!id) return res.status(400).json({ error: "id required" });
    return res.status(200).json((await db(name, { method: "PATCH", query: `${scope}&id=eq.${id}`, body: clean }))[0] || {});
  } catch (e) {
    console.error("data api", name, e.status, e.detail || e.message);
    return res.status(e.status === 409 ? 409 : 502).json({ error: e.status === 409 ? "That record already exists." : "Database error." });
  }
}

// Who could be called in a campaign: consent must be recorded and the contact must not have opted out.
async function preview() {
  const rows = await db("contacts", { query: `organization_id=eq.${ORG()}&select=id,full_name,phone,consent_status&limit=2000` });
  const eligible = [], ineligible = [];
  for (const c of rows) {
    if (c.consent_status === "granted") eligible.push(c);
    else ineligible.push({ ...c, reason: c.consent_status === "opted_out" ? "Opted out" : "No recorded consent" });
  }
  return { eligible_count: eligible.length, ineligible };
}
