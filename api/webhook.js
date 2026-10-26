// POST /api/webhook?g=razorpay | cashfree | zapupi
// Gateway dashboard e ei URL webhook hishebe boshate hobe. Signature verify na hole kichu credit hobe na.
import { makeLib, hmacSign, safeEq } from "../../lib/shared.js";

const txt = (body, status = 200) => new Response(body, { status });

export async function onRequestPost({ request, env }) {
  const g = new URL(request.url).searchParams.get("g");
  try {
    const { sb, settleZap, gwSecrets } = makeLib(env);
    const bodyText = await request.text();
    let ref = null, paid = 0;

    if (g === "razorpay") {
      const k = await gwSecrets("razorpay");
      if (!k.webhook_secret) return txt("webhook secret not set", 500);
      const sig = await hmacSign(k.webhook_secret, bodyText, "hex");
      if (!safeEq(sig, request.headers.get("x-razorpay-signature") || "")) return txt("bad signature", 400);
      const ev = JSON.parse(bodyText);
      if (ev.event === "payment.captured") { const p = ev.payload.payment.entity; ref = p.order_id; paid = p.amount / 100; }

    } else if (g === "cashfree") {
      const k = await gwSecrets("cashfree");
      const ts = request.headers.get("x-webhook-timestamp") || "";
      const sig = await hmacSign(k.secret, ts + bodyText, "base64");
      if (!safeEq(sig, request.headers.get("x-webhook-signature") || "")) return txt("bad signature", 400);
      const ev = JSON.parse(bodyText);
      if (ev.type === "PAYMENT_SUCCESS_WEBHOOK" && ev.data?.payment?.payment_status === "SUCCESS") {
        ref = ev.data.order.order_id; paid = Number(ev.data.payment.payment_amount);
      }

    } else if (g === "zapupi") {
      // webhook only says "check this order"; the real payment is confirmed with ZapUPI's order-status API
      let o = {};
      try { o = JSON.parse(bodyText); } catch { o = Object.fromEntries(new URLSearchParams(bodyText)); }
      const id = o.order_id || o.data?.order_id || new URL(request.url).searchParams.get("order_id");
      if (id) await settleZap(String(id));
      return txt("ok");

    } else {
      return txt("unknown gateway", 400);
    }

    if (ref) {
      const { error } = await sb.rpc("credit_deposit", { p_ref: ref, p_paid: paid });
      if (error) return txt(error.message, 500); // 500 => gateway retries
    }
    return txt("ok");
  } catch (e) {
    return txt(e.message, 500);
  }
}
