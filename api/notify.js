// POST /api/notify  (Vercel serverless function)
// Sends a OneSignal push using the exact payload below. No local DB subscriber check.

const DEFAULT_APP_ID = "dda5795c-3990-4713-9500-43a57eae0896";

const env = name => (process.env[name] || "").trim();

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ note: "Method not allowed" });

    const SB_URL = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
    const SB_ANON = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
    const SB_SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
    const OS_KEY = env("ONESIGNAL_REST_API_KEY");
    const APP_ID = env("ONESIGNAL_APP_ID") || DEFAULT_APP_ID;

    if (!OS_KEY) return res.status(500).json({ note: "Server setup incomplete: ONESIGNAL_REST_API_KEY missing" });

    // ---- 1. Only a signed-in admin / moderator may send ----
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ note: "Not signed in" });
    if (!SB_URL || !SB_ANON || !SB_SERVICE) return res.status(500).json({ note: "Server setup incomplete: Supabase env vars missing" });

    const who = await safeFetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` } });
    if (!who || !who.ok) return res.status(401).json({ note: "Session expired, please sign in again" });

    const isStaff = (await rpcBool(SB_URL, SB_ANON, token, "is_admin")) || (await rpcBool(SB_URL, SB_ANON, token, "is_moderator"));
    if (!isStaff) return res.status(403).json({ note: "Not allowed to send notifications" });

    // ---- 2. Input ----
    let input = req.body || {};
    if (typeof input === "string") input = JSON.parse(input);
    const title = String(input.title || "").trim();
    const message = String(input.body || input.message || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    if (!title) return res.status(400).json({ note: "Title required" });

    // ---- 3. Payload (exact structure from the working OneSignal dashboard request) ----
    const payload = {
      app_id: APP_ID,
      included_segments: ["Subscribed Users"],
      headings: { en: title || "Test" },
      contents: { en: message || "Test" },
      isAndroid: true,
    };

    // Single-player send only: replace the segment with a filter for that player
    if (email) {
      const userId = await findUserIdByEmail(SB_URL, SB_SERVICE, email);
      if (!userId) return res.status(404).json({ note: "No player found with that email" });
      delete payload.included_segments;
      payload.include_aliases = { external_id: [userId] };
    }

    // ---- 4. Send to OneSignal ----
    const response = await safeFetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${OS_KEY}`
      },
      body: JSON.stringify(payload)
    });
    if (!response) return res.status(502).json({ note: "Could not reach OneSignal, please try again" });

    const data = await response.json().catch(() => ({}));
    console.log("OneSignal API status:", response.status);
    console.log("OneSignal API response:", JSON.stringify(data));
    console.log("OneSignal payload sent:", JSON.stringify(payload));

    if (!response.ok) {
      const reason = Array.isArray(data.errors) ? data.errors.join(", ") : data.errors ? JSON.stringify(data.errors) : `HTTP ${response.status}`;
      const status = response.status === 401 || response.status === 403 ? 500 : 502;
      return res.status(status).json({ note: "OneSignal error: " + reason, onesignal: data });
    }

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully!",
      recipients: data.recipients || 0,
      id: data.id,
      onesignal: data,
    });
  } catch (e) {
    console.error("notify crashed:", e);
    return res.status(500).json({ note: "Server error: " + (e?.message || "unknown") });
  }
}

async function safeFetch(url, opts) {
  try {
    return await fetch(url, opts);
  } catch (e) {
    console.error("fetch failed:", url, e?.message);
    return null;
  }
}

async function rpcBool(SB_URL, SB_ANON, token, fn) {
  const r = await safeFetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!r || !r.ok) return false;
  return (await r.json().catch(() => null)) === true;
}

async function findUserIdByEmail(SB_URL, SB_SERVICE, email) {
  const r = await safeFetch(
    `${SB_URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } }
  );
  if (!r || !r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0]?.id || null;
}
