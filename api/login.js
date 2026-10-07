// POST /api/login { id, password } — id = username ya mobile number (email hole client nijei login kore)
import { createClient } from "@supabase/supabase-js";
import { sb } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { id, password } = req.body || {};
    const raw = String(id || "").trim();
    if (!raw || !password) return res.status(400).json({ error: "Enter your login ID and password" });
    const isPhone = /^[\d\s+()-]{10,}$/.test(raw);
    const q = sb.from("profiles").select("email");
    const { data } = isPhone ? await q.eq("phone", raw.replace(/\D/g, "").slice(-10)).maybeSingle() : await q.eq("username", raw.toLowerCase()).maybeSingle();
    if (!data?.email) return res.status(401).json({ error: "Invalid login details" });
    const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: r, error } = await anon.auth.signInWithPassword({ email: data.email, password });
    if (error) return res.status(401).json({ error: "Invalid login details" });
    res.json({ access_token: r.session.access_token, refresh_token: r.session.refresh_token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
