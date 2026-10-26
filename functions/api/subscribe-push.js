// POST /api/subscribe-push   body: { playerId, platform }
// Stores the signed-in user's OneSignal Subscription (Player) ID in push_devices.

const env = name => (process.env[name] || "").trim();

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ note: "Method not allowed" });

    const SB_URL = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
    const SB_ANON = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
    const SB_SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!SB_URL || !SB_ANON || !SB_SERVICE) {
      console.error("subscribe-push: missing Supabase env vars");
      return res.status(500).json({ note: "Server setup incomplete" });
    }

    // 1) Verify the caller's Supabase session
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ note: "Not signed in" });

    const who = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` } });
    if (!who.ok) return res.status(401).json({ note: "Session expired, please sign in again" });
    const user = await who.json();

    // 2) Validate the OneSignal id (UUID format)
    let body = req.body || {};
    if (typeof body === "string") body = JSON.parse(body);
    const playerId = String(body.playerId || "").trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(playerId)) {
      return res.status(400).json({ note: "Invalid player id" });
    }

    // 3) Upsert (one row per OneSignal id, so a phone that switches account is moved to the new user)
    const r = await fetch(`${SB_URL}/rest/v1/push_devices?on_conflict=onesignal_id`, {
      method: "POST",
      headers: {
        apikey: SB_SERVICE,
        Authorization: `Bearer ${SB_SERVICE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([{
        onesignal_id: playerId,
        user_id: user.id,
        platform: "android",
        updated_at: new Date().toISOString(),
      }]),
    });
    if (!r.ok) {
      console.error("push_devices upsert failed:", r.status, await r.text());
      return res.status(500).json({ note: "Could not save device" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("subscribe-push crashed:", e);
    return res.status(500).json({ note: "Server error" });
  }
                                }
