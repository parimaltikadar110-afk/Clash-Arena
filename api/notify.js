// POST /api/notify  { title, body, email?, match_id? } — admin / acting admin / moderator
import webpush from "web-push";
import { sb, authed } from "./_lib.js";

// VAPID setup is done per request, so a missing env var gives a readable JSON error instead of crashing the function
function setupVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY is missing in Vercel env");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@clashx7.in", pub, priv);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const u = await authed(req);
    // acting_admin was missing here, so acting admins got "Staff only"
    if (!u || !["admin", "acting_admin", "moderator"].includes(u.role)) return res.status(403).json({ error: "Staff only" });
    setupVapid();

    const { title, body, email, match_id } = req.body || {};
    if (!title) return res.status(400).json({ error: "Title required" });

    let ids = null; // null = sobar kache
    if (match_id) {
      const { data } = await sb.from("participants").select("user_id").eq("match_id", match_id);
      ids = (data || []).map(x => x.user_id);
    } else if (email) {
      const { data } = await sb.from("profiles").select("id").ilike("email", email.trim()).maybeSingle();
      if (!data) return res.status(404).json({ error: "User not found" });
      ids = [data.id];
    }
    if (ids && !ids.length) return res.json({ sent: 0, failed: 0, subscribers: 0, note: "No joined players for this match" });

    const rows = ids ? ids.map(id => ({ user_id: id, title, body })) : [{ user_id: null, title, body }];
    const { error: insErr } = await sb.from("notifications").insert(rows);
    if (insErr) console.error("notifications insert:", insErr.message);

    let q = sb.from("push_subscriptions").select("endpoint,sub");
    if (ids) q = q.in("user_id", ids);
    const { data: subs, error: subErr } = await q;
    if (subErr) throw new Error("push_subscriptions read failed: " + subErr.message);

    const payload = JSON.stringify({ title, body: body || "", url: "/" });
    let sent = 0; const dead = []; const codes = {};
    await Promise.allSettled((subs || []).map(s =>
      webpush.sendNotification(s.sub, payload).then(() => sent++).catch(e => {
        const c = e.statusCode || "error";
        codes[c] = (codes[c] || 0) + 1;
        // 404/410 = phone unsubscribed; 403 = VAPID key mismatch between frontend and server
        if ([404, 410].includes(e.statusCode)) dead.push(s.endpoint);
        console.error("push failed", c, e.body || e.message);
      })
    ));
    if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);

    res.json({
      sent,
      failed: (subs?.length || 0) - sent,
      subscribers: subs?.length || 0,
      codes,            // e.g. {"403":3} = VAPID mismatch, {"410":2} = old phones
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
