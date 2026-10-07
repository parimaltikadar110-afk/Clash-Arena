// POST /api/webhook?g=razorpay | cashfree | zapupi
// Gateway dashboard e ei URL webhook hishebe boshate hobe. Signature verify na hole kichu credit hobe na.
import crypto from "node:crypto";
import { sb, settleZap, gwSecrets } from "./_lib.js";

export const config = { api: { bodyParser: false } }; // raw body lagbe signature check er jonno

const raw = req => new Promise((ok, no) => { const d = []; req.on("data", c => d.push(c)); req.on("end", () => ok(Buffer.concat(d))); req.on("error", no); });
const same = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const body = await raw(req), g = req.query.g;
    let ref = null, paid = 0;

    if (g === "razorpay") {
      const k = await gwSecrets("razorpay");
      if (!k.webhook_secret) return res.status(500).send("webhook secret not set");
      const sig = crypto.createHmac("sha256", k.webhook_secret).update(body).digest("hex");
      if (!same(sig, req.headers["x-razorpay-signature"] || "")) return res.status(400).send("bad signature");
      const ev = JSON.parse(body.toString());
      if (ev.event === "payment.captured") { const p = ev.payload.payment.entity; ref = p.order_id; paid = p.amount / 100; }
    } else if (g === "cashfree") {
      const k = await gwSecrets("cashfree");
      const ts = req.headers["x-webhook-timestamp"] || "";
      const sig = crypto.createHmac("sha256", k.secret).update(ts + body.toString()).digest("base64");
      if (!same(sig, req.headers["x-webhook-signature"] || "")) return res.status(400).send("bad signature");
      const ev = JSON.parse(body.toString());
      if (ev.type === "PAYMENT_SUCCESS_WEBHOOK" && ev.data?.payment?.payment_status === "SUCCESS") { ref = ev.data.order.order_id; paid = Number(ev.data.payment.payment_amount); }
    } else if (g === "zapupi") {
      // webhook sudhu "check koro" signal — asol payment ZapUPI order-status API diye confirm hoy
      const s = body.toString(); let o = {};
      try { o = JSON.parse(s); } catch { o = Object.fromEntries(new URLSearchParams(s)); }
      const id = o.order_id || o.data?.order_id || req.query.order_id;
      if (id) await settleZap(String(id));
      return res.status(200).send("ok");
    } else return res.status(400).send("unknown gateway");

    if (ref) {
      const { error } = await sb.rpc("credit_deposit", { p_ref: ref, p_paid: paid });
      if (error) return res.status(500).send(error.message); // 500 dile gateway abar try korbe
    }
    res.status(200).send("ok");
  } catch (e) {
    res.status(500).send(e.message);
  }
}
