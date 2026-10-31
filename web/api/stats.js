import { requireAuth } from "./_lib/auth.js";
import { db, configured, ORG } from "./_lib/db.js";
import { computeStats } from "./_lib/stats.js";
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (!configured()) return res.status(503).json({ error: "Database not configured." });
  try {
    const since = new Date(Date.now() - 90 * 864e5).toISOString();
    const [calls, camps, fups] = await Promise.all([
      db("calls", { query: `organization_id=eq.${ORG()}&started_at=gte.${since}&select=direction,status,duration_seconds,started_at&limit=10000` }),
      db("campaigns", { query: `organization_id=eq.${ORG()}&status=in.(scheduled,running)&select=id` }),
      db("follow_ups", { query: `organization_id=eq.${ORG()}&status=eq.pending&select=id` }),
    ]);
    res.status(200).json({ ...computeStats(calls), active_campaigns: camps.length, pending_followups: fups.length });
  } catch (e) { console.error("stats", e.message); res.status(502).json({ error: "Database error." }); }
}
