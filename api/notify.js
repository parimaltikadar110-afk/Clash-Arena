// POST /api/notify  (Vercel serverless function)
// Sends a OneSignal push to Google Android native app subscribers.
// Does NOT check the local database for subscribers before sending.

const ONESIGNAL_URL = "https://onesignal.com/api/v1/notifications";
const DEFAULT_APP_ID = "dda5795c-3990-4713-9500-43a57eae0896";

const env = name => (process.env[name] || "").trim();

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ note: "Method not allowed" });

    const APP_ID = env("ONESIGNAL_APP_ID") || DEFAULT_APP_ID;
    const OS_KEY = env("ONESIGNAL_REST_API_KEY");
    const SB_URL = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
    const SB_ANON = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
    const SB_SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");

    if (!OS_KEY) {
      console.error("notify: ONESIGNAL_REST_API_KEY is not set");
      return res.status(500).json({ note: "Server setup incomplete: ONESIGNAL_REST_API_KEY missing" });
    }

    // ---- 1. Only a signed-in admin / moderator may send ----
    // (Auth stays in place; it does not look at subscribers.)
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ note: "Not signed in" });
    if (!SB_URL || !SB_ANON || !SB_SERVICE) {
      console.error("notify: Supabase env vars missing");
      return res.status(500).json({ note: "Server setup incomplete: Supabase env vars missing" });
    }

    const who = await safeFetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
    });
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

    // ---- 3. Payload ----
    const payload = {
      app_id: APP_ID,
      headings: { en: title },
      contents: { en: message || title },
      isAndroid: true,
      isChromeWeb: false, // never deliver to Chrome web push
      isAnyWeb: false,    // never deliver to any web push
    };

    if (email) {
      // Single player: email -> user id, then target the id the app registered with login(userId)
      const userId = await findUserIdByEmail(SB_URL, SB_SERVICE, email);
      if (!userId) return res.status(404).json({ note: "No player found with that email" });
      payload.include_aliases = { external_id: [userId] };
      payload.target_channel = "push";
    } else {
      // No email: send to everyone subscribed (OneSignal decides who is subscribed)
      payload.included_segments = ["Subscribed Users"];
    }

    // ---- 4. Send to OneSignal ----
    // Newer app keys start with "os_v2_" and use "Key"; legacy REST keys use "Basic".
    const authorization = OS_KEY.startsWith("os_v2_") ? `Key ${OS_KEY}` : `Basic ${OS_KEY}`;

    const r = await safeFetch(ONESIGNAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify(payload),
    });
    if (!r) return res.status(502).json({ note: "Could not reach OneSignal, please try again" });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      const reason = Array.isArray(j.errors) ? j.errors.join(", ") : j.errors ? JSON.stringify(j.errors) : `HTTP ${r.status}`;
      console.error("OneSignal rejected request:", r.status, JSON.stringify(j));
      const status = r.status === 401 || r.status === 403 ? 500 : 502;
      return res.status(status).json({ note: "OneSignal error: " + reason });
    }

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully!",
      recipients: j.recipients || 0,
      id: j.id,
      codes: j.errors && !Array.isArray(j.errors) ? j.errors : {},
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

// Looks up the player's id by email (only used when an email is given). Assumes a `profiles` table.
async function findUserIdByEmail(SB_URL, SB_SERVICE, email) {
  const r = await safeFetch(
    `${SB_URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } }
  );
  if (!r || !r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0]?.id || null;
}
