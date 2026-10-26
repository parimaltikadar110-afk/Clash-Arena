// Shared server helpers for Cloudflare Pages Functions (replaces Vercel's _lib.js).
// Usage: const { sb, authed, gwSecrets, gwEnabled, settleZap } = makeLib(env);
import { createClient } from "@supabase/supabase-js";

export function makeLib(env) {
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Bearer token -> logged-in user (profile). Returns null if not logged in or banned.
  async function authed(request) {
    const t = (request.headers.get("authorization") || "").replace("Bearer ", "");
    if (!t) return null;
    const { data } = await sb.auth.getUser(t);
    if (!data?.user) return null;
    const { data: p } = await sb.from("profiles").select("id,name,email,role,banned").eq("id", data.user.id).single();
    return p && !p.banned ? p : null;
  }

  // Gateway keys: Admin panel (Deposit Settings) first, otherwise Cloudflare env vars
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

  // ZapUPI: verify the payment directly with ZapUPI (do not trust webhook alone)
  async function zapStatus(orderId) {
    const { zap_key } = await gwSecrets("zapupi");
    const r = await fetch("https://pay.zapupi.com/api/order-status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zap_key, order_id: orderId }),
    });
    const j = await r.json().catch(() => ({}));
    console.log("zapupi order-status", orderId, JSON.stringify(j));
    const d = j.data;
    const st = String(d?.status ?? d?.payment_status ?? "").toLowerCase();
    const amt = Number(d?.amount ?? d?.order_amount);
    return { paid: ["success", "successful", "completed", "paid", "captured"].includes(st), amount: Number.isFinite(amt) ? amt : null };
  }

  async function settleZap(ref) {
    const { data: dep } = await sb.from("deposits").select("amount,status").eq("ref", ref).eq("gateway", "zapupi").maybeSingle();
    if (!dep) return { error: "Order not found" };
    if (dep.status === "approved") return { credited: true };
    if (dep.status !== "pending") return { credited: false };
    const z = await zapStatus(ref);
    if (!z.paid) return { credited: false, pending: true };
    const { data } = await sb.rpc("credit_deposit", { p_ref: ref, p_paid: z.amount ?? dep.amount });
    return { credited: !!data };
  }

  return { sb, authed, gwSecrets, gwEnabled, zapStatus, settleZap };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// HMAC helpers for webhook signature checks (Web Crypto, works on Cloudflare Workers)
export async function hmacSign(secret, message, enc = "hex") {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  if (enc === "base64") return btoa(String.fromCharCode(...sig));
  return [...sig].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string compare
export function safeEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
