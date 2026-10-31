import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const raw = await readRaw(req);
  const secret = process.env.SAUTIKIT_WEBHOOK_SECRET;
  const signature = req.headers["x-sautikit-signature"];
  if (secret) {
    if (!signature) return res.status(401).json({ error: "Missing webhook signature" });
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const supplied = String(signature).replace(/^sha256=/, "");
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  }
  let event;
  try { event = JSON.parse(raw.toString("utf8")); }
  catch { return res.status(400).json({ error: "Invalid JSON" }); }
  // TODO: persist call lifecycle events to the configured database.
  console.log("TWIGA SautiKit event", JSON.stringify({
    type: event.type || event.event || "unknown",
    call_id: event.call_id || event.id || null
  }));
  return res.status(200).json({ received: true });
}
