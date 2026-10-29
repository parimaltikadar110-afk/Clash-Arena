import { useState, useEffect, useRef, useCallback } from "react";

/* In-app support chat (English UI), text only.
   - Players cannot send links; admins can send links (e.g. a Google Form).
   - Links in messages are clickable.
   - No photos/videos.
   - Messages are deleted 30 minutes after they are sent. */

const LINK_RE = /(https?:\/\/[^\s]+)/g;

// Makes http/https links clickable
function Linked({ text }) {
  return text.split(LINK_RE).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="scLink">{part}</a>
      : <span key={i}>{part}</span>
  );
}

const time = t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const CSS = `
.scWrap{display:flex;flex-direction:column;height:calc(100vh - 160px);min-height:360px}
.scNote{font-size:12px;color:#777;background:#fff7ed;border:1px solid #fed7aa;padding:8px 10px;border-radius:8px;margin-bottom:10px}
.scList{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px}
.scMsg{max-width:78%;padding:9px 12px;border-radius:12px;font-size:14px;word-wrap:break-word;white-space:pre-wrap}
.scMsg small{display:block;font-size:10px;opacity:.6;margin-top:4px}
.scMsg.me{align-self:flex-end;background:#dc2626;color:#fff;border-bottom-right-radius:4px}
.scMsg.them{align-self:flex-start;background:#f3f4f6;color:#111;border-bottom-left-radius:4px}
.scInput{display:flex;gap:8px;margin-top:10px;align-items:center}
.scInput input[type=text]{flex:1;padding:11px;border:1px solid #ddd;border-radius:10px;font-size:14px;min-width:0}
.scInput .scSend{padding:0 16px;height:42px;border:0;border-radius:10px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer;flex-shrink:0}
.scInput .scSend:disabled{opacity:.5;cursor:default}
.scLink{text-decoration:underline;word-break:break-all;color:inherit}
.scMsg.me .scLink{color:#fff}
.scErr{color:#dc2626;font-size:12px;margin:6px 0}
.scThread{display:block;width:100%;text-align:left;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:8px;cursor:pointer}
.scThread b{font-size:13px}.scThread span{display:block;font-size:12px;color:#666;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scBack{background:none;border:0;color:#dc2626;font-weight:700;padding:4px 0;margin-bottom:6px;cursor:pointer}
`;

export default function SupportChat({ supabase, mode = "user" }) {
  const isAdmin = mode === "admin";
  const [msgs, setMsgs] = useState([]);
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [activeName, setActiveName] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [pollErr, setPollErr] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const loadMine = useCallback(async () => {
    const { data, error } = await supabase.rpc("support_fetch_mine");
    if (error) return setPollErr(error.message);
    setPollErr(""); setMsgs(data || []);
  }, [supabase]);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.rpc("support_admin_threads");
    if (error) return setPollErr(error.message);
    setPollErr(""); setThreads(data || []);
  }, [supabase]);

  const loadAdminMsgs = useCallback(async uid => {
    const { data, error } = await supabase.rpc("support_admin_messages", { p_user: uid });
    if (error) return setPollErr(error.message);
    setPollErr(""); setMsgs(data || []);
  }, [supabase]);

  useEffect(() => {
    const run = () => {
      if (!isAdmin) return loadMine();
      if (active) return loadAdminMsgs(active);
      return loadThreads();
    };
    run();
    // Support chat stays at 5 seconds so messages arrive quickly; it pauses only when the app is hidden
    const t = setInterval(() => { if (document.visibilityState === "visible") run(); }, 5000);
    return () => clearInterval(t);
  }, [isAdmin, active, loadMine, loadThreads, loadAdminMsgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    if (!isAdmin && /https?:\/\/|www\./i.test(body)) { setErr("Links are not allowed in chat"); return; }
    setBusy(true); setErr("");
    const args = { p_body: body, p_media_path: null, p_media_type: null };
    const { error } = isAdmin
      ? await supabase.rpc("support_admin_reply", { p_user: active, ...args })
      : await supabase.rpc("support_send", args);
    setBusy(false);
    if (error) return setErr(error.message);
    setText("");
    isAdmin ? loadAdminMsgs(active) : loadMine();
  };

  const mine = m => (isAdmin ? m.sender === "admin" : m.sender === "user");
  const note = "Messages are deleted 30 minutes after they are sent.";

  const chatView = (
    <>
      <div className="scList">
        {msgs.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No messages yet. Send us a message.</p>}
        {msgs.map(m => (
          <div key={m.id} className={"scMsg " + (mine(m) ? "me" : "them")}>
            <Linked text={m.body} />
            <small>{time(m.created_at)}</small>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {(err || pollErr) && <p className="scErr">{err || pollErr}</p>}
      <div className="scInput">
        <input
          type="text"
          value={text}
          maxLength={1000}
          placeholder="Type a message..."
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button className="scSend" onClick={send} disabled={busy || !text.trim()}>Send</button>
      </div>
    </>
  );

  let body;
  if (!isAdmin) {
    body = (
      <>
        <div className="scNote">{note}</div>
        {chatView}
      </>
    );
  } else if (!active) {
    body = (
      <>
        {err && <p className="scErr">{err}</p>}
        {pollErr && <p className="scErr">{pollErr}</p>}
        {threads.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No active chats.</p>}
        {threads.map(t => (
          <button key={t.thread_user} className="scThread" onClick={() => { setMsgs([]); setActiveName(t.player_name || "Player"); setActive(t.thread_user); }}>
            <b>{t.player_name || "Player"}</b> · {time(t.last_at)}
            <span>{t.last_body || ""}</span>
          </button>
        ))}
      </>
    );
  } else {
    body = (
      <>
        <button className="scBack" onClick={() => { setActive(null); setActiveName(""); setMsgs([]); setText(""); }}>‹ Back</button>
        <b style={{ display: "block", margin: "0 0 8px", fontSize: 15 }}>{activeName}</b>
        <div className="scNote">{note}</div>
        {chatView}
      </>
    );
  }

  return (
    <div className="scWrap">
      <style>{CSS}</style>
      {body}
    </div>
  );
}


/* Customer support (WhatsApp mode): shows the number only, player copies it themselves. */
export function WhatsAppSupport({ wa }) {
  const [copied, setCopied] = useState(false);
  const shown = String(wa || "").replace(/\D/g, "");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };
  return (
    <div className="scWrap">
      <style>{CSS}</style>
      <div className="scNote">Need help? Contact our support team on WhatsApp.</div>
      <div style={{ textAlign: "center", marginTop: 28 }}>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 8 }}>WhatsApp support number</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, userSelect: "all", WebkitUserSelect: "all" }}>{shown}</div>
        <button onClick={copy}
          style={{ marginTop: 16, padding: "12px 24px", border: 0, borderRadius: 10, background: "#111", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          {copied ? "Copied ✅" : "Copy number"}
        </button>
        <p style={{ fontSize: 12, color: "#888", marginTop: 14 }}>Open WhatsApp and send a message to this number.</p>
      </div>
    </div>
  );
}

/* Admin control: choose In-app chat or WhatsApp, and set the WhatsApp number. */
export function SupportModeBox({ supabase, cfg, onSaved }) {
  const [mode, setMode] = useState(cfg.mode || "chat");
  const [wa, setWa] = useState(cfg.wa || "");
  const [msg, setMsg] = useState("");
  useEffect(() => { setMode(cfg.mode || "chat"); setWa(cfg.wa || ""); }, [cfg.mode, cfg.wa]);

  const save = async () => {
    const digits = wa.replace(/\D/g, "");
    if (mode === "whatsapp" && digits.length < 8) { setMsg("Enter a valid WhatsApp number"); return; }
    setMsg("Saving…");
    const a = await supabase.rpc("admin_set_setting", { p_key: "support_mode", p_value: mode });
    const b = await supabase.rpc("admin_set_setting", { p_key: "support_wa", p_value: digits });
    if (a.error || b.error) { setMsg("Save failed: " + ((a.error || b.error).message)); return; }
    setMsg("Saved ✅");
    onSaved && onSaved();
  };

  const tab = (val, label) => (
    <button onClick={() => setMode(val)}
      style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd", fontWeight: 700, cursor: "pointer",
               background: mode === val ? "#111" : "#fff", color: mode === val ? "#fff" : "#111" }}>{label}</button>
  );

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12, background: "#fff" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Customer service mode</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {tab("chat", "In-app chat")}
        {tab("whatsapp", "WhatsApp")}
      </div>
      {mode === "whatsapp" && (
        <input value={wa} onChange={e => setWa(e.target.value)} placeholder="WhatsApp number, e.g. 9123055135"
          style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid #ddd", borderRadius: 10, marginBottom: 8 }} />
      )}
      <button onClick={save} style={{ width: "100%", padding: 11, border: 0, borderRadius: 10, background: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
      {msg && <p className="hint" style={{ marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
