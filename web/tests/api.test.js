// Automated tests use a MOCKED Supabase (global fetch is replaced). They prove our logic, not live provider connectivity.
import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, { SESSION_SECRET: "s".repeat(32), DASHBOARD_PASSWORD: "pw-test", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc", TWIGA_ORG_ID: "11111111-1111-1111-1111-111111111111", BRIDGE_SECRET: "b".repeat(32), TWIGA_AUDIO_BRIDGE_URL: "wss://bridge.test/stream", TOOLS_SECRET: "tools-secret" });
const { makeSession, checkSession, checkPassword } = await import("../api/_lib/auth.js");
const { e164 } = await import("../api/_lib/db.js");
const { computeStats } = await import("../api/_lib/stats.js");
const { verifyCall } = await import("../api/_lib/sign.js");
const data = (await import("../api/data/[resource].js")).default;
const voice = (await import("../api/sautikit/voice.js")).default;
const tool = (await import("../api/tools/take-message.js")).default;

const res = () => { const r = { h: {}, status(c) { r.code = c; return r; }, setHeader(k, v) { r.h[k] = v; return r; }, json(b) { r.body = b; return r; }, send(b) { r.body = b; return r; }, type() { return r; }, end() { return r; } }; return r; };
const authed = { headers: { cookie: `twiga_session=${makeSession()}` } };
let calls = [];
globalThis.fetch = async (url, opts = {}) => { calls.push({ url: String(url), opts }); return { ok: true, status: 200, text: async () => JSON.stringify([{ id: "x", ...(opts.body ? JSON.parse(opts.body) : {}) }]) }; };

test("sessions: valid accepted, tampered/expired rejected, wrong password rejected", () => {
  assert.ok(checkSession(authed));
  assert.ok(!checkSession({ headers: { cookie: "twiga_session=999.deadbeef" } }));
  assert.ok(!checkSession({ headers: { cookie: authed.headers.cookie } }, Date.now() + 13 * 3600e3));
  assert.ok(checkPassword("pw-test") && !checkPassword("nope"));
});
test("Kenyan numbers normalise to E.164", () => {
  assert.equal(e164("0712 345 678"), "+254712345678"); assert.equal(e164("254112345678"), "+254112345678");
  assert.equal(e164("+14155550123"), "+14155550123"); assert.equal(e164("123"), null);
});
test("data API refuses unauthenticated requests", async () => {
  const r = res(); await data({ method: "GET", query: { resource: "contacts" }, headers: {} }, r); assert.equal(r.code, 401);
});
test("contact create: normalises phone, org-scopes the row, requires consent source", async () => {
  calls = []; let r = res();
  await data({ ...authed, method: "POST", query: { resource: "contacts" }, body: { full_name: "Amina", phone: "0712345678", consent_status: "granted", consent_source: "signed form", organization_id: "evil" } }, r);
  assert.equal(r.code, 201); const sent = JSON.parse(calls[0].opts.body);
  assert.equal(sent.phone, "+254712345678"); assert.equal(sent.organization_id, process.env.TWIGA_ORG_ID);
  r = res(); await data({ ...authed, method: "POST", query: { resource: "contacts" }, body: { full_name: "B", phone: "0712345679", consent_status: "granted" } }, r);
  assert.equal(r.code, 400);
});
test("every read/update/delete is filtered by organization", async () => {
  calls = [];
  await data({ ...authed, method: "GET", query: { resource: "contacts" } }, res());
  await data({ ...authed, method: "DELETE", query: { resource: "contacts", id: "22222222-2222-2222-2222-222222222222" } }, res());
  for (const c of calls) assert.match(c.url, /organization_id=eq\.11111111/);
});
test("calls are read-only; campaigns cannot be set to running", async () => {
  let r = res(); await data({ ...authed, method: "POST", query: { resource: "calls" }, body: {} }, r); assert.equal(r.code, 405);
  r = res(); await data({ ...authed, method: "POST", query: { resource: "campaigns" }, body: { name: "Promo", status: "running" } }, r); assert.equal(r.code, 400);
});
test("campaign preview: only recorded-consent contacts are eligible", async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify([{ id: "1", consent_status: "granted" }, { id: "2", consent_status: "unknown" }, { id: "3", consent_status: "opted_out" }]) });
  const r = res(); await data({ ...authed, method: "GET", query: { resource: "campaigns", preview: "1" } }, r);
  assert.equal(r.body.eligible_count, 1); assert.deepEqual(r.body.ineligible.map((x) => x.reason), ["No recorded consent", "Opted out"]);
});
test("stats come only from call rows", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  const s = computeStats([
    { direction: "inbound", status: "completed", duration_seconds: 120, started_at: "2026-10-31T08:00:00Z" },
    { direction: "inbound", status: "missed", started_at: "2026-10-30T08:00:00Z" },
    { direction: "outbound", status: "completed", duration_seconds: 60, started_at: "2026-10-30T09:00:00Z" },
  ], now);
  assert.equal(s.total, 3); assert.equal(s.answered, 2); assert.equal(s.missed, 1); assert.equal(s.avg_duration_seconds, 90); assert.equal(s.total_minutes, 3);
  assert.deepEqual(computeStats([], now).total, 0);
});
test("voice webhook: signed Stream on first edge, empty on lifecycle edges", () => {
  let r = res(); voice({ method: "POST", query: {}, body: { From: "+254700", To: "+254709221577" } }, r);
  assert.match(r.body, /<Stream[^>]+connect="true"[^>]+bidirectionalSamplingRate="16000"/);
  const q = new URL(r.body.match(/url="([^"]+)"/)[1].replace(/&amp;/g, "&")).searchParams;
  assert.ok(verifyCall(q.get("from"), q.get("ts"), q.get("sig"))); assert.ok(!verifyCall("+254999", q.get("ts"), q.get("sig")));
  r = res(); voice({ method: "POST", query: {}, body: { callSessionState: "StreamStopped" } }, r); assert.match(r.body, /<Response\/>/);
});
test("take-message tool needs the shared secret", async () => {
  globalThis.fetch = async () => ({ ok: true, status: 201, text: async () => "[]" });
  let r = res(); await tool({ method: "POST", headers: {}, body: {} }, r); assert.equal(r.code, 401);
  r = res(); await tool({ method: "POST", headers: { "x-twiga-secret": "tools-secret" }, body: { caller_name: "A", callback_number: "0712345678", message: "call me" } }, r); assert.equal(r.code, 200);
});
