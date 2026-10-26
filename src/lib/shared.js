import { createClient } from "@supabase/supabase-js";

export function makeLib(env) {
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  async function authed(request) {
    const t = (request.headers.get("authorization") || "").replace("Bearer ", "");
    if (!t) return null;
    const { data } = await sb.auth.getUser(t);
    if (!data?.user) return null;
    const { data: p } = await sb.from("profiles").select("id,name,email,role,banned").eq("id", data.user.id).single();
    return p && !p.banned ? p : null;
  }

  const ENV = {
    zapupi: { zap_key: "ZAPUPI_KEY" },
    razorpay: { key_id: "RAZORPAY_KEY_ID", key_secret: "RAZORPAY_KEY_SECRET", webhook_secret: "RAZORPAY_WEBHOOK_SECRET" },
    cashfree: { app_id: "CASHFREE_APP_ID", secret: "CASHFREE_SECRET", env: "CASHFREE_ENV" },
  };

  async function gwSecrets(name) {
    const { data } = await sb.from("gateway_secrets").select("secrets").eq("name", name).maybeSingle();
    const out = {};
    for (const [k, e] of Object.entries(ENV[name])) out[k] = data?.secrets?.[k] || env[e] || "";
    return out;
  }

  async function gwEnabled(name) {
    const { data } = await sb.from("app_settings").select("value").eq("key", "gw_" + name).maybeSingle();
    return data?.value?.enabled !== false;
  }

  // ZapUPI order status. Returns the raw response too, so the reason can be shown on screen.
  async function zapStatus(orderId) {
    const { zap_key } = await gwSecrets("zapupi");
    if (!zap_key) return { paid: false, reason: "ZapUPI key is not set in Admin → Deposit Settings" };
    const r = await fetch("https://pay.zapupi.com/api/order-status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zap_key, order_id: orderId }),
    });
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); }
    catch { return { paid: false, reason: "ZapUPI returned non-JSON (HTTP " + r.status + ")", raw: text.slice(0, 300) }; }
    console.log("zapupi order-status", orderId, JSON.stringify(j));
    const d = j.data || {};
    const st = String(d.status ?? d.payment_status ?? j.status ?? "").toLowerCase();
    const amt = Number(d.amount ?? d.order_amount);
    const paid = ["success", "successful", "completed", "paid", "captured"].includes(st);
    const pending = ["pending", "processing", "initiated", "created"].includes(st);
    return {
      paid, pending,
      amount: Number.isFinite(amt) ? amt : null,
      reason: paid ? undefined : "ZapUPI status = '" + (st || "(empty)") + "'",
      raw: j,
    };
  }

  async function settleZap(ref) {
    const { data: dep } = await sb.from("deposits").select("amount,status").eq("ref", ref).eq("gateway", "zapupi").maybeSingle();
    if (!dep) return { credited: false, reason: "No deposit row found for this order" };
    if (dep.status === "approved") return { credited: true };
    if (dep.status !== "pending") return { credited: false, reason: "Deposit status in database = '" + dep.status + "'" };

    const z = await zapStatus(ref);
    if (!z.paid) return { credited: false, pending: !!z.pending, reason: z.reason, zapupi: z.raw };

    const { data, error } = await sb.rpc("credit_deposit", { p_ref: ref, p_paid: z.amount ?? dep.amount });
    if (error) return { credited: false, reason: "credit_deposit error: " + error.message };
    return data ? { credited: true } : { credited: false, reason: "credit_deposit returned false" };
  }

  return { sb, authed, gwSecrets, gwEnabled, zapStatus, settleZap };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function hmacSign(secret, message, enc = "hex") {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  if (enc === "base64") return btoa(String.fromCharCode(...sig));
  return [...sig].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function safeEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
  }
