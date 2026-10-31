export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const token = process.env.SAUTIKIT_API_KEY;
  const numberId = process.env.SAUTIKIT_NUMBER_ID;
  if (!token || !numberId) {
    return res.status(503).json({ error: "SautiKit is not configured on the server." });
  }
  const { to, business_context } = req.body || {};
  if (typeof to !== "string" || !/^\+?[1-9]\d{7,14}$/.test(to.replace(/[\s()-]/g, ""))) {
    return res.status(400).json({ error: "Provide a valid destination phone number in international format." });
  }
  const callback = process.env.TWIGA_VOICE_CALLBACK_URL;
  if (!callback) return res.status(503).json({ error: "TWIGA_VOICE_CALLBACK_URL is not configured." });
  try {
    const response = await fetch("https://api.sautikit.com/v1/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from_number_id: numberId,
        to: to.replace(/[\s()-]/g, ""),
        voice_callback_url: callback,
        metadata: { source: "twiga", business_context: String(business_context || "").slice(0, 500) }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("SautiKit outbound call failed", response.status, data);
      return res.status(response.status >= 500 ? 502 : response.status).json({ error: "SautiKit could not start the call.", detail: data.message || data.error || "Provider request failed." });
    }
    return res.status(200).json({ success: true, call: data });
  } catch (error) {
    console.error("TWIGA outbound request error", error);
    return res.status(502).json({ error: "Unable to reach SautiKit." });
  }
}
