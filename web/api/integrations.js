// Reports which server-side settings exist (true/false only). Never returns values.
import { requireAuth } from "./_lib/auth.js";
const has = (k) => !!process.env[k];
export default function handler(req, res) {
  if (!requireAuth(req, res)) return;
  res.status(200).json({
    phone_number: process.env.TWIGA_PHONE_NUMBER || null,
    webhook_url: process.env.TWIGA_VOICE_CALLBACK_URL || null,
    checks: {
      database: has("SUPABASE_URL") && has("SUPABASE_SERVICE_ROLE_KEY") && has("TWIGA_ORG_ID"),
      sautikit: has("SAUTIKIT_API_KEY"),
      elevenlabs: has("ELEVENLABS_API_KEY") && has("ELEVENLABS_AGENT_ID"),
      audio_bridge: /^wss:\/\//.test(process.env.TWIGA_AUDIO_BRIDGE_URL || "") && has("BRIDGE_SECRET"),
      ai_message_tool: has("TOOLS_SECRET"),
      outbound_enabled: process.env.TWIGA_OUTBOUND_ENABLED === "true",
    },
  });
}
