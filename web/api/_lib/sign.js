import crypto from "node:crypto";
const hmac = (secret, s) => crypto.createHmac("sha256", secret).update(s).digest("hex");
const same = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

/** Signed bridge URL params so only calls started by our webhook can use the audio bridge. */
export const signCall = (caller, ts, secret = process.env.BRIDGE_SECRET) => hmac(secret, `call|${caller}|${ts}`);
export function verifyCall(caller, ts, sig, secret = process.env.BRIDGE_SECRET) {
  if (!secret || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 120) return false;
  return same(signCall(caller, ts, secret), sig);
}
export { hmac, same };
