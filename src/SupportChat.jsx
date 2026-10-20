import { useState, useEffect, useRef, useCallback } from "react";

/* In-app support chat. mode="user" for players, mode="admin" for admin panel.
   Messages auto-expire 1 hour after being sent (handled in SQL). */

const time = t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const CSS = `
.scWrap{display:flex;flex-direction:column;height:calc(100vh - 160px);min-height:360px}
.scNote{font-size:12px;color:#777;background:#fff7ed;border:1px solid #fed7aa;padding:8px 10px;border-radius:8px;margin-bottom:10px}
.scList{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px}
.scMsg{max-width:78%;padding:9px 12px;border-radius:12px;font-size:14px;word-wrap:break-word;white-space:pre-wrap}
.scMsg small{display:block;font-size:10px;opacity:.6;margin-top:4px}
.scMsg.me{align-self:flex-end;background:#dc2626;color:#fff;border-bottom-right-radius:4px}
.scMsg.them{align-self:flex-start;background:#f3f4f6;color:#111;border-bottom-left-radius:4px}
.scInput{display:flex;gap:8px;margin-top:10px}
.scInput input{flex:1;padding:11px;border:1px solid #ddd;border-radius:10px;font-size:14px}
.scInput button{padding:0 16px;border:0;border-radius:10px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer}
.scInput button:disabled{opacity:.5;cursor:default}
.scErr{color:#dc2626;font-size:12px;margin:6px 0}
.scThread{display:block;width:100%;text-align:left;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:8px;cursor:pointer}
.scThread b{font-size:13px}.scThread span{display:block;font-size:12px;color:#666;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scBack{background:none;border:0;color:#dc2626;font-weight:700;padding:4px 0;margin-bottom:6px;cursor:pointer}
`;

export default function SupportChat({ supabase, mode = "user" }) {
  const isAdmin = mode === "admin";
  const [msgs, setMsgs] = useState([]);
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null); // admin: selected player id
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const loadMine = useCallback(async () => {
    const { data, error } = await supabase.rpc("support_fetch_mine");
    if (error) return setErr(error.message);
    setMsgs(data || []);
  }, [supabase]);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.rpc("support_admin_threads");
    if (error) return setErr(error.message);
    setThreads(data || []);
  }, [supabase]);

  const loadAdminMsgs = useCallback(async uid => {
    const { data, error } = await supabase.rpc("support_admin_messages", { p_user: uid });
    if (error) return setErr(error.message);
    setMsgs(data || []);
  }, [supabase]);

  // Refresh every 5 seconds
  useEffect(() => {
    const run = () => {
      if (!isAdmin) return loadMine();
      if (active) return loadAdminMsgs(active);
      return loadThreads();
    };
    run();
    const t = setInterval(run, 5000);
    return () => clearInterval(t);
  }, [isAdmin, active, loadMine, loadThreads, loadAdminMsgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr("");
    const { error } = isAdmin
      ? await supabase.rpc("support_admin_reply", { p_user: active, p_body: body })
      : await supabase.rpc("support_send", { p_body: body });
    setBusy(false);
    if (error) return setErr(error.message);
    setText("");
    isAdmin ? loadAdminMsgs(active) : loadMine();
  };

  const mine = m => (isAdmin ? m.sender === "admin" : m.sender === "user");

  const chatView = (
    <>
      <div className="scList">
        {msgs.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>Kono message nei. Amader sathe kotha bolun.</p>}
        {msgs.map(m => (
          <div key={m.id} className={"scMsg " + (mine(m) ? "me" : "them")}>
            {m.body}
            <small>{time(m.created_at)}</small>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {err && <p className="scErr">{err}</p>}
      <div className="scInput">
        <input
          value={text}
          maxLength={1000}
          placeholder="Message likhun..."
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button onClick={send} disabled={busy || !text.trim()}>Send</button>
      </div>
    </>
  );

  let body;
  if (!isAdmin) {
    body = (
      <>
        <div className="scNote">Messages 1 ghonta por apni muche jabe.</div>
        {chatView}
      </>
    );
  } else if (!active) {
    body = (
      <>
        {err && <p className="scErr">{err}</p>}
        {threads.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>Ekhono kono chat nei.</p>}
        {threads.map(t => (
          <button key={t.thread_user} className="scThread" onClick={() => { setMsgs([]); setActive(t.thread_user); }}>
            <b>Player {String(t.thread_user).slice(0, 8)}</b> · {time(t.last_at)}
            <span>{t.last_body}</span>
          </button>
        ))}
      </>
    );
  } else {
    body = (
      <>
        <button className="scBack" onClick={() => { setActive(null); setMsgs([]); setText(""); }}>‹ Back</button>
        <div className="scNote">Message 1 ghonta por muche jabe.</div>
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
