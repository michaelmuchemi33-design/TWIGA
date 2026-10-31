import { checkPassword, makeSession, cookie, checkSession } from "./_lib/auth.js";
const attempts = new Map(); // best-effort throttle per warm instance
export default function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ signedIn: checkSession(req) });
  if (req.method === "DELETE") { res.setHeader("Set-Cookie", cookie("", 0)); return res.status(200).json({ signedIn: false }); }
  if (req.method !== "POST") return res.status(405).end();
  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0], now = Date.now();
  const a = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  if (a.length >= 8) return res.status(429).json({ error: "Too many attempts. Try again later." });
  if (!process.env.SESSION_SECRET || !process.env.DASHBOARD_PASSWORD) return res.status(503).json({ error: "Dashboard login is not configured (SESSION_SECRET, DASHBOARD_PASSWORD)." });
  if (!checkPassword(req.body?.password)) { a.push(now); attempts.set(ip, a); return res.status(401).json({ error: "Wrong password" }); }
  res.setHeader("Set-Cookie", cookie(makeSession()));
  res.status(200).json({ signedIn: true });
}
