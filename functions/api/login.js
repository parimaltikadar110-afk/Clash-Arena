import { createClient } from "@supabase/supabase-js";
import { makeLib, json } from "../../src/lib/shared.js";

// Login with Email or Mobile number only. Username is used for display (leaderboard), not for login.
export async function onRequestPost({ request, env }) {
  try {
    const { sb } = makeLib(env);
    const body = await request.json().catch(() => ({}));
    const raw = String(body.id || "").trim();
    const password = String(body.password || "");
    if (!raw || !password) return json({ error: "Enter your email or mobile number and password" }, 400);

    const isEmail = raw.includes("@");
    const digits = raw.replace(/\D/g, "");
    if (!isEmail && digits.length < 10) return json({ error: "Enter a valid email or 10-digit mobile number" }, 400);

    let loginEmail = null;
    if (isEmail) {
      loginEmail = raw.toLowerCase();
    } else {
      const phone = digits.slice(-10);
      // 1) profile phone
      const { data: prof } = await sb.from("profiles").select("id,email").eq("phone", phone).maybeSingle();
      if (prof?.email) loginEmail = prof.email;
      else if (prof?.id) {
        const { data: au } = await sb.auth.admin.getUserById(prof.id);
        loginEmail = au?.user?.email || null;
      }
      // 2) fallback: signup data (phone saved in account metadata)
      if (!loginEmail) {
        for (let page = 1; page <= 10 && !loginEmail; page++) {
          const { data: list } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
          const users = list?.users || [];
          const hit = users.find(u => String((u.user_metadata || {}).phone || "").replace(/\D/g, "").slice(-10) === phone);
          if (hit) loginEmail = hit.email || null;
          if (users.length < 1000) break;
        }
      }
    }
    if (!loginEmail) return json({ error: "Invalid login details" }, 401);

    const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: r, error } = await anon.auth.signInWithPassword({ email: loginEmail, password });
    if (error || !r?.session) return json({ error: "Invalid login details" }, 401);
    return json({ access_token: r.session.access_token, refresh_token: r.session.refresh_token });
  } catch (e) {
    return json({ error: "Login failed. Please try again." }, 500);
  }
}
