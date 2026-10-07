// POST /api/deposit  { gateway: "zapupi" | "razorpay" | "cashfree", amount, phone? }
import { sb, authed, gwSecrets, gwEnabled } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const u = await authed(req);
    if (!u) return res.status(401).json({ error: "Login required" });
    const { gateway, amount, phone } = req.body || {};
    const amt = Math.round(Number(amount));
    if (!(amt >= 10 && amt <= 50000)) return res.status(400).json({ error: "Amount must be ₹10 – ₹50,000" });
    if (!["zapupi", "razorpay", "cashfree"].includes(gateway)) return res.status(400).json({ error: "Unknown gateway" });
    if (!(await gwEnabled(gateway))) return res.status(400).json({ error: "This payment method is disabled" });
    const k = await gwSecrets(gateway);
    const ph = String(phone || "").replace(/\D/g, "").slice(-10);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    if (gateway === "razorpay") {
      if (!k.key_id || !k.key_secret) return res.status(500).json({ error: "Razorpay keys not set in Admin → Deposit Settings" });
      const auth = Buffer.from(`${k.key_id}:${k.key_secret}`).toString("base64");
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt * 100, currency: "INR", receipt: `u${u.id.slice(0, 8)}_${Date.now()}` }),
      });
      const o = await r.json();
      if (!r.ok) return res.status(502).json({ error: o?.error?.description || "Razorpay error" });
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: o.id });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ key: k.key_id, order_id: o.id, amount: o.amount });
    }

    if (gateway === "cashfree") {
      if (!k.app_id || !k.secret) return res.status(500).json({ error: "Cashfree keys not set in Admin → Deposit Settings" });
      if (ph.length !== 10) return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
      const prod = k.env === "production";
      const orderId = `cf_${u.id.slice(0, 8)}_${Date.now()}`;
      const r = await fetch(`https://${prod ? "api" : "sandbox"}.cashfree.com/pg/orders`, {
        method: "POST",
        headers: { "x-client-id": k.app_id, "x-client-secret": k.secret, "x-api-version": "2023-08-01", "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId, order_amount: amt, order_currency: "INR",
          customer_details: { customer_id: u.id.replace(/-/g, "").slice(0, 30), customer_phone: ph, customer_email: u.email },
          order_meta: { return_url: `${origin}/` },
        }),
      });
      const o = await r.json();
      if (!r.ok) return res.status(502).json({ error: o?.message || "Cashfree error" });
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: orderId });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ session: o.payment_session_id, mode: prod ? "production" : "sandbox" });
    }

    // zapupi
    if (!k.zap_key) return res.status(500).json({ error: "ZapUPI key not set in Admin → Deposit Settings" });
    if (ph.length !== 10) return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
    const orderId = `ZU${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const r = await fetch("https://pay.zapupi.com/api/create-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zap_key: k.zap_key, order_id: orderId, amount: String(amt), customer_mobile: ph,
        remark: "ClashX7 wallet deposit", redirect_url: `${origin}/?zp=${orderId}`, webhook_url: `${origin}/api/webhook?g=zapupi`,
      }),
    });
    const o = await r.json().catch(() => ({}));
    const url = o.payment_url || o.data?.payment_url;
    if (!url) { console.log("zapupi create-order", JSON.stringify(o)); return res.status(502).json({ error: o.message || "ZapUPI error" }); }
    const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: orderId });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
