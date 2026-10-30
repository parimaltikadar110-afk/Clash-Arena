// POST /api/deposit  { gateway: "zapupi" | "razorpay" | "cashfree", amount, phone? }
import { makeLib, json } from "../../src/lib/shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const { sb, authed, gwSecrets, gwEnabled } = makeLib(env);
    const u = await authed(request);
    if (!u) return json({ error: "Login required" }, 401);

    const body = await request.json().catch(() => ({}));
    const { gateway, amount, phone } = body;
    const amt = Math.round(Number(amount));
    if (!(amt >= 10 && amt <= 50000)) return json({ error: "Amount must be ₹10 – ₹50,000" }, 400);
    if (!["zapupi", "razorpay", "cashfree"].includes(gateway)) return json({ error: "Unknown gateway" }, 400);
    if (!(await gwEnabled(gateway))) return json({ error: "This payment method is disabled" }, 400);

    const k = await gwSecrets(gateway);
    const ph = String(phone || "").replace(/\D/g, "").slice(-10);
    const siteOrigin = new URL(request.url).origin;            // this Cloudflare site (webhooks + API)
    const appOrigin = (env.APP_URL || siteOrigin).replace(/\/$/, ""); // where the user returns after paying

    if (gateway === "razorpay") {
      if (!k.key_id || !k.key_secret) return json({ error: "Razorpay keys not set in Admin → Deposit Settings" }, 500);
      const auth = btoa(`${k.key_id}:${k.key_secret}`);
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt * 100, currency: "INR", receipt: `u${u.id.slice(0, 8)}_${Date.now()}` }),
      });
      const o = await r.json();
      if (!r.ok) return json({ error: o?.error?.description || "Razorpay error" }, 502);
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: o.id });
      if (error) return json({ error: error.message }, 500);
      return json({ key: k.key_id, order_id: o.id, amount: o.amount });
    }

    if (gateway === "cashfree") {
      if (!k.app_id || !k.secret) return json({ error: "Cashfree keys not set in Admin → Deposit Settings" }, 500);
      if (ph.length !== 10) return json({ error: "Enter a valid 10-digit mobile number" }, 400);
      const prod = k.env === "production";
      const orderId = `cf_${u.id.slice(0, 8)}_${Date.now()}`;
      const r = await fetch(`https://${prod ? "api" : "sandbox"}.cashfree.com/pg/orders`, {
        method: "POST",
        headers: { "x-client-id": k.app_id, "x-client-secret": k.secret, "x-api-version": "2023-08-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId, order_amount: amt, order_currency: "INR",
          customer_details: { customer_id: u.id.replace(/-/g, "").slice(0, 30), customer_phone: ph, customer_email: u.email },
          order_meta: { return_url: `${appOrigin}/` },
        }),
      });
      const o = await r.json();
      if (!r.ok) return json({ error: o?.message || "Cashfree error" }, 502);
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: orderId });
      if (error) return json({ error: error.message }, 500);
      return json({ session: o.payment_session_id, mode: prod ? "production" : "sandbox" });
    }

    // zapupi
    if (!k.zap_key) return json({ error: "ZapUPI key not set in Admin → Deposit Settings" }, 500);
    if (ph.length !== 10) return json({ error: "Enter a valid 10-digit mobile number" }, 400);
    const orderId = `ZU${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const back = (st) => `${appOrigin}/?zp=${orderId}&status=${st}`;
    const r = await fetch("https://pay.zapupi.com/api/create-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zap_key: k.zap_key, order_id: orderId, amount: String(amt), customer_mobile: ph,
        remark: "ClashX7 wallet deposit",
        success_url: back("success"),
        failed_url: back("failed"),
        timeout_url: back("timeout"),
        webhook_url: `${siteOrigin}/api/webhook?g=zapupi`,
      }),
    });
    const o = await r.json().catch(() => ({}));
    const url = o.payment_url || o.data?.payment_url;
    if (!url) { console.log("zapupi create-order failed", o?.message || "no-message"); return json({ error: o.message || "ZapUPI error" }, 502); }
    const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: orderId });
    if (error) return json({ error: error.message }, 500);
    return json({ url });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
