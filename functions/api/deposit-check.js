// POST /api/deposit-check { ref } — check payment and credit wallet (after return or if webhook missed)
import { makeLib, json } from "../../src/lib/shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const { sb, authed, settleZap } = makeLib(env);
    const u = await authed(request);
    if (!u) return json({ error: "Login required" }, 401);
    const body = await request.json().catch(() => ({}));
    const ref = body.ref || "";
    const { data: dep } = await sb.from("deposits").select("user_id").eq("ref", ref).maybeSingle();
    if (!dep || dep.user_id !== u.id) return json({ error: "Order not found" }, 404);
    return json(await settleZap(ref));
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
