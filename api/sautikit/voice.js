export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method not allowed");
  }
  const bridgeUrl = process.env.TWIGA_AUDIO_BRIDGE_URL;
  if (!bridgeUrl || !/^wss:\/\//i.test(bridgeUrl)) {
    return res.status(503).type("text/plain").send("TWIGA audio bridge is not configured.");
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream name="twiga-agent" url="${escapeXml(bridgeUrl)}" track="both_tracks" connect="true" outputSamplingRate="16000" bidirectionalSamplingRate="16000" statusEvents="stream-started stream-stopped stream-error"/>
</Response>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(xml);
}
function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&apos;" }[c]));
}
