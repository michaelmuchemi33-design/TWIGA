import { createHash } from "node:crypto";

const SUPABASE_URL = "https://ztyxxikkposfpxsutnfr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Zex31DUxW6bX3LP6Wlos2Q_pMiZ_JeT";
const ALLOWED_ORIGINS = new Set(["https://twiga.co.ke", "https://www.twiga.co.ke"]);

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeKenyanPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.startsWith("7") || digits.startsWith("1")) digits = "254" + digits;
  return digits;
}

export default async function handler(req, res) {
  const origin = String(req.headers.origin || "");
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ error: "This booking form is not allowed from this website." });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (JSON.stringify(body).length > 8000) return res.status(413).json({ error: "The booking request is too large." });

    const fullName = clean(body.name, 100);
    const businessName = clean(body.business, 120);
    const phone = normalizeKenyanPhone(body.phone);
    const email = clean(body.email, 254).toLowerCase();
    const preferredTime = clean(body.time || "Weekday morning", 80);
    const honeypot = clean(body.company_website, 200);

    if (fullName.length < 2 || businessName.length < 2 ||
        !/^254[17]\d{8}$/.test(phone) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter your name, business, a valid Kenyan phone number and a valid email." });
    }

    // Store only a one-way fingerprint for optional abuse throttling; never store the raw IP.
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const fingerprint = forwarded
      ? createHash("sha256").update("twiga-demo-v1:" + forwarded).digest("hex")
      : null;

    const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/twiga_create_demo_booking", {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: "Bearer " + SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_full_name: fullName,
        p_business_name: businessName,
        p_phone: phone,
        p_email: email,
        p_preferred_time: preferredTime,
        p_fingerprint: fingerprint,
        p_honeypot: honeypot
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) {
      const status = response.status === 429 ? 429 : 400;
      return res.status(status).json({ error: "We couldn't save that request. Please check your details or try again shortly." });
    }

    return res.status(201).json({
      ok: true,
      bookingId: result.booking_id || null,
      message: "Your demo request has been received. The TWIGA team will contact you to agree on a time."
    });
  } catch (error) {
    console.error("TWIGA demo booking intake failed", error);
    return res.status(500).json({ error: "Something went wrong. Please try again in a moment." });
  }
}
