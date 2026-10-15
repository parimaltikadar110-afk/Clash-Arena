// POST /api/notify  (Vercel serverless function)
// Sends OneSignal push ONLY to Google Android native app subscribers.
// Chrome, Safari and every other web push target are excluded.

const ONESIGNAL_APP_ID = "dda5795c-3990-4713-9500-43a57eae0896";
const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OS_KEY = process.env.ONESIGNAL_REST_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 1) Who is calling? Verify the Supabase session token sent by the admin panel.
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ note: "Not signed in" });

  const who = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) return res.status(401).json({ note: "Session expired, please sign in again" });

  // 2) Only admins / moderators may send. is_admin() is the real SQL-side check.
  const isStaff = await rpcBool("is_admin", token) || await rpcBool("is_moderator", token);
  if (!isStaff) return res.status(403).json({ note: "Not allowed" });

  // 3) Validate input
  const { title, body, email } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ note: "Title required" });

  // 4) Build the OneSignal payload. Platform flags restrict delivery to Android native.
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    isAndroid: true,
    isChromeWeb: false,
    isSafari: false,
    isAnyWeb: false,
    headings: { en: String(title) },
    contents: { en: String(body || title) },
  };

  if (email) {
    // Single player: resolve email -> user id, then target the id the app
    // registered with median.onesignal.login(userId) on sign-in.
    const userId = await findUserIdByEmail(String(email).trim().toLowerCase());
    if (!userId) return res.status(200).json({ note: "No player found with that email" });
    payload.include_aliases = { external_id: [userId] };
    payload.target_channel = "push";
  } else {
    // Everyone subscribed. The platform flags above still limit it to Android native.
    payload.included_segments = ["Subscribed Users"];
  }

  // 5) Send to OneSignal
  const r = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${OS_KEY}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    const msg = Array.isArray(j.errors) ? j.errors.join(", ") : (j.errors ? JSON.stringify(j.errors) : "unknown");
    return res.status(502).json({ note: "OneSignal error: " + msg, codes: {} });
  }

  const recipients = j.recipients || 0;
  return res.status(200).json({
    sent: recipients,
    subscribers: recipients,
    codes: j.errors && !Array.isArray(j.errors) ? j.errors : {},
    id: j.id,
  });
}

// Calls a boolean Postgres function as the signed-in user (so auth.uid() is theirs).
async function rpcBool(fn, token) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SB_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

// Looks up a player by email with the service role (server-only, never sent to browser).
// Assumes a `profiles` table with `id` and `email` columns. Change if your schema differs.
async function findUserIdByEmail(email) {
  const r = await fetch(
    `${SB_URL}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } }
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0]?.id || null;
}
