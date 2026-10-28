import { createClient } from "@supabase/supabase-js";
import { makeLib, json } from "../../src/lib/shared.js";

// Escape LIKE wildcards so a username is matched literally (case-insensitive)
const likeEscape = s => s.replace(/[\\%_]/g, m => "\\" + m);

export async function onRequestPost({ request, env }) {
  try {
    const { sb } = makeLib(env);
    const body = await request.json().catch(() => ({}));
    const raw = String(body.id || "").trim();
    const password = String(body.password || "");
    if (!raw || !password) return json({ error: "Enter your login ID and password" }, 400);

    const isEmail = raw.includes("@");
    const isPhone = !isEmail && /^[\d\s+()-]{10,}$/.test(raw);

    let profile = null;
    if (isEmail) {
      // Email login: use the address directly, no profile lookup needed
      profile = { email: raw.toLowerCase() };
    } else if (isPhone) {
      const { data } = await sb.from("profiles").select("id,email").eq("phone", raw.replace(/\D/g, "").slice(-10)).maybeSingle();
      profile = data;
    } else {
      // Username: case-insensitive, ignores extra spaces
      const { data } = await sb.from("profiles").select("id,email").ilike("username", likeEscape(raw)).maybeSingle();
      profile = data;
    }
    if (!profile) return json({ error: "Invalid login details" }, 401);

    // Profile may have no email saved; take it from the auth account instead
    let loginEmail = profile.email;
    if (!loginEmail && profile.id) {
      const { data: au } = await sb.auth.admin.getUserById(profile.id);
      loginEmail = au?.user?.email || null;
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
