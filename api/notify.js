// POST /api/notify  (Vercel serverless function)
// Sends a OneSignal push ONLY to Google Android native app subscribers.
// Chrome, Safari and other web push targets are excluded by the platform flags.

const ONESIGNAL_APP_ID = "dda5795c-3990-4713-9500-43a57eae0896";
const ONESIGNAL_URL = "https://onesignal.com/api/v1/notifications";

const env = name => (process.env[name] || "").trim();

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ note: "Method not allowed" });

    // ---- 0. Server config check (names only, never values) ----
    const SB_URL = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
    const SB_ANON = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
    const SB_SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
    const OS_KEY = env("ONESIGNAL_REST_API_KEY");
    const missing = Object.entries({ SUPABASE_URL: SB_URL, SUPABASE_ANON_KEY: SB_ANON, SUPABASE_SERVICE_ROLE_KEY: SB_SERVICE, ONESIGNAL_REST_API_KEY: OS_KEY })
      .filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      console.error("notify: missing env vars:", missing.join(", "));
      return res.status(500).json({ note: "Server setup incomplete, missing: " + missing.join(", ") });
    }

    // ---- 1. Who is calling? Verify the Supabase session token from the admin panel ----
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ note: "Not signed in" });

    const who = await safeFetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
    });
    if (!who || !who.ok) return res.status(401).json({ note: "Session expired, please sign in again" });

    // ---- 2. Only admins / moderators may send ----
    const isStaff = (await rpcBool(SB_URL, SB_ANON, token, "is_admin")) || (await rpcBool(SB_URL, SB_ANON, token, "is_moderator"));
    if (!isStaff) return res.status(403).json({ note: "Not allowed to send notifications" });

    // ---- 3. Validate input ----
    let input = req.body || {};
    if (typeof input === "string") input = JSON.parse(input);
    const title = String(input.title || "").trim();
    const message = String(input.body || input.message || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    if (!title) return res.status(400).json({ note: "Title required" });

    // ---- 4. Build the OneSignal payload (Android native only) ----
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      isAndroid: true,
      isChromeWeb: false,
      isSafari: false,
      isAnyWeb: false,
      headings: { en: title },
      contents: { en: message || title },
    };

    if (email) {
      const userId = await findUserIdByEmail(SB_URL, SB_SERVICE, email);
      if (!userId) return res.status(404).json({ note: "No player found with that email" });
      payload.include_aliases = { external_id: [userId] };
      payload.target_channel = "push";
    } else {
      payload.included_segments = ["Subscribed Users"];
    }

    // ---- 5. Send to OneSignal ----
    // New app keys start with "os_v2_" and use "Key"; legacy REST keys use "Basic".
    const authHeader = OS_KEY.startsWith("os_v2_") ? `Key ${OS_KEY}` : `Basic ${OS_KEY}`;

    const r = await safeFetch(ONESIGNAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(payload),
    });
    if (!r) return res.status(502).json({ note: "Could not reach OneSignal, please try again" });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      const reason = Array.isArray(j.errors) ? j.errors.join(", ") : j.errors ? JSON.stringify(j.errors) : `HTTP ${r.status}`;
      console.error("OneSignal rejected request:", r.status, JSON.stringify(j));
      // 401/403 means the REST key is wrong (our config problem), so report it as 500
      const status = r.status === 401 || r.status === 403 ? 500 : 502;
      return res.status(status).json({ note: "OneSignal error: " + reason, codes: {} });
    }

    const recipients = j.recipients || 0;
    return res.status(200).json({
      sent: recipients,
      subscribers: recipients,
      codes: j.errors && !Array.isArray(j.errors) ? j.errors : {},
      id: j.id,
    });
  } catch (e) {
    console.error("notify crashed:", e);
    return res.status(500).json({ note: "Server error: " + (e?.message || "unknown") });
  }
}

// fetch that never throws; returns null on network failure
async function safeFetch(url, opts) {
  try {
    return await fetch(url, opts);
  } catch (e) {
    console.error("fetch failed:", url, e?.message);
    return null;
  }
}

// Calls a boolean Postgres function as the signed-in user (so auth.uid() is theirs)
async function rpcBool(SB_URL, SB_ANON, token, fn) {
  const r = await safeFetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!r || !r.ok) return false;
  return (await r.json().catch(() => null)) === true;
}

// Player lookup by email with the service role (server-only, never sent to the browser).
// Assumes a `profiles` table with `id` and `email` columns.
async function findUserIdByEmail(SB_URL, SB_SERVICE, email) {
  const r = await safeFetch(
    `${SB_URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } }
  );
  if (!r || !r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows[0]?.id || null;
}
