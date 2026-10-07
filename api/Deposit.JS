// POST /api/deposit  { gateway: "razorpay" | "cashfree", amount, phone? }
import { sb, authed } from "./_lib.js";
// gateway: "zapupi" | "razorpay" | "cashfree"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const u = await authed(req);
    if (!u) return res.status(401).json({ error: "Login required" });
    const { gateway, amount, phone } = req.body || {};
    const amt = Math.round(Number(amount));
    if (!(amt >= 10 && amt <= 50000)) return res.status(400).json({ error: "Amount must be ₹10 – ₹50,000" });

    if (gateway === "razorpay") {
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt * 100, currency: "INR", receipt: `u${u.id.slice(0, 8)}_${Date.now()}` }),
      });
      const o = await r.json();
      if (!r.ok) return res.status(502).json({ error: o?.error?.description || "Razorpay error" });
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: o.id });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ key: process.env.RAZORPAY_KEY_ID, order_id: o.id, amount: o.amount });
    }

    if (gateway === "cashfree") {
      const ph = String(phone || "").replace(/\D/g, "").slice(-10);
      if (ph.length !== 10) return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
      const prod = process.env.CASHFREE_ENV === "production";
      const orderId = `cf_${u.id.slice(0, 8)}_${Date.now()}`;
      const r = await fetch(`https://${prod ? "api" : "sandbox"}.cashfree.com/pg/orders`, {
        method: "POST",
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId, order_amount: amt, order_currency: "INR",
          customer_details: { customer_id: u.id.replace(/-/g, "").slice(0, 30), customer_phone: ph, customer_email: u.email },
          order_meta: { return_url: `${req.headers.origin || ""}/` },
        }),
      });
      const o = await r.json();
      if (!r.ok) return res.status(502).json({ error: o?.message || "Cashfree error" });
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: orderId });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ session: o.payment_session_id, mode: prod ? "production" : "sandbox" });
    }

    if (gateway === "zapupi") {
      const ph = String(phone || "").replace(/\D/g, "").slice(-10);
      if (ph.length !== 10) return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
      const orderId = `ZU${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const origin = req.headers.origin || `https://${req.headers.host}`;
      const r = await fetch("https://pay.zapupi.com/api/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zap_key: process.env.ZAPUPI_KEY, order_id: orderId, amount: String(amt), customer_mobile: ph,
          remark: "ClashX7 wallet deposit", redirect_url: `${origin}/?zp=${orderId}`, webhook_url: `${origin}/api/webhook?g=zapupi`,
        }),
      });
      const o = await r.json().catch(() => ({}));
      const url = o.payment_url || o.data?.payment_url;
      if (!url) { console.log("zapupi create-order", JSON.stringify(o)); return res.status(502).json({ error: o.message || "ZapUPI error" }); }
      const { error } = await sb.from("deposits").insert({ user_id: u.id, amount: amt, gateway, ref: orderId });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ url });
    }

    res.status(400).json({ error: "Unknown gateway" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
