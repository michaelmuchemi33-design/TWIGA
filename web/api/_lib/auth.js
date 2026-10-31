// Prototype auth: one shared dashboard password -> signed, HttpOnly, expiring session cookie.
// Replace with per-user auth (Supabase Auth) before onboarding more than one business.
import { hmac, same } from "./sign.js";
const NAME = "twiga_session", TTL = 60 * 60 * 12;
const secret = () => process.env.SESSION_SECRET || "";

export function makeSession(now = Date.now()) {
  const exp = Math.floor(now / 1000) + TTL;
  return `${exp}.${hmac(secret(), `s|${exp}`)}`;
}
export function checkSession(req, now = Date.now()) {
  if (!secret()) return false;
  const m = String(req.headers?.cookie || "").match(new RegExp(`(?:^|;\\s*)${NAME}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  return Number(exp) > now / 1000 && same(sig || "", hmac(secret(), `s|${exp}`));
}
export const cookie = (value, maxAge = TTL) => `${NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
export function requireAuth(req, res) {
  if (checkSession(req)) return true;
  res.status(401).json({ error: "Not signed in" });
  return false;
}
export const checkPassword = (p) => !!process.env.DASHBOARD_PASSWORD && same(p || "", process.env.DASHBOARD_PASSWORD);
