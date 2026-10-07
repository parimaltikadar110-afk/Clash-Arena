import { createClient } from "@supabase/supabase-js";

export const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Bearer token theke logged-in user + role ber kore
export async function authed(req) {
  const t = (req.headers.authorization || "").replace("Bearer ", "");
  if (!t) return null;
  const { data } = await sb.auth.getUser(t);
  if (!data?.user) return null;
  const { data: p } = await sb.from("profiles").select("id,name,email,role,banned").eq("id", data.user.id).single();
  return p && !p.banned ? p : null;
}

// ---- ZapUPI ----
// Payment sachchi hoyeche kina ZapUPI er server theke nijer order_id diye check kora hoy (webhook e bishwas kora hoy na).
export async function zapStatus(orderId) {
  const r = await fetch("https://pay.zapupi.com/api/order-status", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zap_key: process.env.ZAPUPI_KEY, order_id: orderId }),
  });
  const j = await r.json().catch(() => ({}));
  console.log("zapupi order-status", orderId, JSON.stringify(j)); // Vercel logs e dekhe field milie nin
  const d = j.data; // sudhu data object er status dhori — top-level "status":"success" mane sudhu API call safol
  const st = String(d?.status ?? d?.payment_status ?? "").toLowerCase();
  const amt = Number(d?.amount ?? d?.order_amount);
  return { paid: ["success", "successful", "completed", "paid", "captured"].includes(st), amount: Number.isFinite(amt) ? amt : null };
}

export async function settleZap(ref) {
  const { data: dep } = await sb.from("deposits").select("amount,status").eq("ref", ref).eq("gateway", "zapupi").maybeSingle();
  if (!dep) return { error: "Order not found" };
  if (dep.status === "approved") return { credited: true };
  if (dep.status !== "pending") return { credited: false };
  const z = await zapStatus(ref);
  if (!z.paid) return { credited: false, pending: true };
  const { data } = await sb.rpc("credit_deposit", { p_ref: ref, p_paid: z.amount ?? dep.amount });
  return { credited: !!data };
}
