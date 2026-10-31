// Minimal Supabase REST client (server-side only, service-role key). Every query is scoped to TWIGA_ORG_ID.
export const configured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TWIGA_ORG_ID);
export const ORG = () => process.env.TWIGA_ORG_ID;

export async function db(table, { method = "GET", query = "", body } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) { const e = new Error(`db ${method} ${table} ${r.status}`); e.status = r.status; e.detail = text.slice(0, 300); throw e; }
  return text ? JSON.parse(text) : [];
}

export function e164(raw) {
  let p = String(raw || "").replace(/[\s()-]/g, "");
  if (/^0[17]\d{8}$/.test(p)) p = "+254" + p.slice(1);       // 0712345678 / 0112345678
  else if (/^254[17]\d{8}$/.test(p)) p = "+" + p;
  else if (/^[17]\d{8}$/.test(p)) p = "+254" + p;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}
