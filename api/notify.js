// POST /api/notify  { title, body, email?, match_id? } — sudhu admin / moderator
import webpush from "web-push";
import { sb, authed } from "./_lib.js";

webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const u = await authed(req);
    if (!u || !["admin", "moderator"].includes(u.role)) return res.status(403).json({ error: "Staff only" });
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
    if (ids && !ids.length) return res.json({ sent: 0, failed: 0 });

    const rows = ids ? ids.map(id => ({ user_id: id, title, body })) : [{ user_id: null, title, body }];
    await sb.from("notifications").insert(rows);

    let q = sb.from("push_subscriptions").select("endpoint,sub");
    if (ids) q = q.in("user_id", ids);
    const { data: subs } = await q;
    const payload = JSON.stringify({ title, body: body || "", url: "/" });
    let sent = 0, dead = [];
    await Promise.allSettled((subs || []).map(s =>
      webpush.sendNotification(s.sub, payload).then(() => sent++).catch(e => { if ([404, 410].includes(e.statusCode)) dead.push(s.endpoint); })
    ));
    if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
    res.json({ sent, failed: (subs?.length || 0) - sent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
