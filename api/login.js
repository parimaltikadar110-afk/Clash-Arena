// POST /api/login { id, password } — id = username, mobile number, or email
import { createClient } from "@supabase/supabase-js";
import { makeLib, json } from "../../lib/shared.js";

export async function onRequestPost({ request, env }) {
  try {
    const { sb } = makeLib(env);
    const body = await request.json().catch(() => ({}));
    const { id, password } = body;
    const raw = String(id || "").trim();
    if (!raw || !password) return json({ error: "Enter your login ID and password" }, 400);

    const isEmail = raw.includes("@");
    const isPhone = !isEmail && /^[\d\s+()-]{10,}$/.test(raw);
    const q = sb.from("profiles").select("email");
    const { data } = isEmail
      ? await q.eq("email", raw.toLowerCase()).maybeSingle()
      : isPhone
        ? await q.eq("phone", raw.replace(/\D/g, "").slice(-10)).maybeSingle()
        : await q.eq("username", raw.toLowerCase()).maybeSingle();
    // Email login: the address itself is the login, so we use it directly
    const loginEmail = isEmail ? raw.toLowerCase() : data?.email;
    if (!loginEmail) return json({ error: "Invalid login details" }, 401);

    const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: r, error } = await anon.auth.signInWithPassword({ email: loginEmail, password });
    if (error) return json({ error: "Invalid login details" }, 401);
    return json({ access_token: r.session.access_token, refresh_token: r.session.refresh_token });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
