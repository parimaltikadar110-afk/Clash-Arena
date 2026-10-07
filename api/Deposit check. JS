// POST /api/deposit-check { ref }  — user ZapUPI theke ferar por (ba webhook miss hole) payment check kore wallet credit kore
import { sb, authed, settleZap } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const u = await authed(req);
    if (!u) return res.status(401).json({ error: "Login required" });
    const { ref } = req.body || {};
    const { data: dep } = await sb.from("deposits").select("user_id").eq("ref", ref || "").maybeSingle();
    if (!dep || dep.user_id !== u.id) return res.status(404).json({ error: "Order not found" });
    res.json(await settleZap(ref));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
