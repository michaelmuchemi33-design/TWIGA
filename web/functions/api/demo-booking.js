const ALLOWED_ORIGINS = new Set(["https://twiga.co.ke", "https://www.twiga.co.ke"]);
const clean = (value, max) => String(value ?? "").trim().slice(0, max);
function normalizeKenyanPhone(value) {
  let digits = String(value ?? "").replace(/\\D/g, "");
  if (digits.startsWith("0")) digits = "254" + digits.slice(1);
  else if (digits.startsWith("7") || digits.startsWith("1")) digits = "254" + digits;
  return digits;
}
function response(body, status, origin) {
  const headers = new Headers({"Content-Type":"application/json","Cache-Control":"no-store"});
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin");
  }
  return new Response(body === null ? null : JSON.stringify(body), {status, headers});
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
export async function onRequest({request, env}) {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return response(null, 204, origin);
  if (request.method !== "POST") return response({error:"Method not allowed."}, 405, origin);
  if (!ALLOWED_ORIGINS.has(origin)) return response({error:"This booking form is not allowed from this website."}, 403, origin);
  try {
    const raw = await request.text();
    if (raw.length > 8000) return response({error:"The booking request is too large."}, 413, origin);
    const body = JSON.parse(raw || "{}");
    const fullName = clean(body.name, 100);
    const businessName = clean(body.business, 120);
    const phone = normalizeKenyanPhone(body.phone);
    const email = clean(body.email, 254).toLowerCase();
    const preferredDate = clean(body.date, 10);
    const preferredTime = clean(body.time, 5);
    const honeypot = clean(body.company_website, 200);
    const parsedDate = new Date(preferredDate + "T00:00:00Z");
    const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    const validDate = /^\\d{4}-\\d{2}-\\d{2}$/.test(preferredDate) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === preferredDate &&
      parsedDate >= today;
    const validTime = ["09:00","10:30","12:00","14:00","15:30"].includes(preferredTime);
    if (fullName.length < 2 || businessName.length < 2 ||
        !/^254[17]\\d{8}$/.test(phone) ||
        !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
        !validDate || !validTime) {
      return response({error:"Please enter your name, business, valid Kenyan phone and email, and choose a future demo date and time."}, 400, origin);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const fingerprint = ip ? await sha256("twiga-demo-v1:" + ip) : null;
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "https://ztyxxikkposfpxsutnfr.supabase.co";
    const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!publishableKey) return response({error:"Demo booking is not configured yet."}, 503, origin);
    const result = await fetch(supabaseUrl + "/rest/v1/rpc/twiga_create_demo_booking", {
      method:"POST",
      headers:{apikey:publishableKey,Authorization:"Bearer " + publishableKey,"Content-Type":"application/json"},
      body:JSON.stringify({
        p_full_name:fullName,p_business_name:businessName,p_phone:phone,p_email:email,
        p_preferred_date:preferredDate,p_preferred_time:preferredTime,p_fingerprint:fingerprint,p_honeypot:honeypot
      })
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok || data?.ok !== true) {
      return response({error:"We couldn't save that request. Please check your details or try again shortly."}, result.status === 429 ? 429 : 400, origin);
    }
    return response({ok:true,bookingId:data.booking_id || null,message:"Your demo request has been received. The TWIGA team will contact you to agree on a time."}, 201, origin);
  } catch (error) {
    console.error("TWIGA demo booking intake failed", error?.message || "unknown error");
    return response({error:"Something went wrong. Please try again in a moment."}, 500, origin);
  }
}
