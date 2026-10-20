import { useState, useEffect, useRef, useCallback } from "react";

/* In-app support chat (English UI).
   Messages and attachments are deleted 30 minutes after they are sent.
   Photos are compressed to ~1024px JPEG; videos are re-encoded to a small WebM (max 30 seconds). */

const BUCKET = "support-media";
const MAX_VIDEO_SECONDS = 30;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const time = t => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Photo -> small JPEG
const compressImage = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob(b => (b ? resolve(b) : reject(new Error("Could not process this photo"))), "image/jpeg", 0.7);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this photo")); };
  img.src = url;
});

// Video -> small WebM (480p, ~350 kbps). Plays in real time, so a 30s clip takes about 30s.
const compressVideo = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.playsInline = true;
  v.src = url;
  v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this video")); };
  v.onloadedmetadata = () => {
    if (v.duration > MAX_VIDEO_SECONDS + 0.5) {
      URL.revokeObjectURL(url);
      return reject(new Error("Video must be 30 seconds or shorter"));
    }
    const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.round((v.videoWidth * scale) / 2) * 2);
    c.height = Math.max(2, Math.round((v.videoHeight * scale) / 2) * 2);
    const ctx = c.getContext("2d");

    const stream = c.captureStream(24);
    try { v.captureStream().getAudioTracks().forEach(t => stream.addTrack(t)); } catch {}

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 350000 });
    const chunks = [];
    let raf;
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      cancelAnimationFrame(raf);
      URL.revokeObjectURL(url);
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
    const draw = () => {
      ctx.drawImage(v, 0, 0, c.width, c.height);
      if (!v.ended) raf = requestAnimationFrame(draw);
    };
    v.onended = () => rec.stop();
    rec.start(500);
    v.play().then(draw).catch(err => { rec.stop(); reject(err); });
  };
});

function MediaView({ supabase, path, type }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase.storage.from(BUCKET).createSignedUrl(path, 1800)
      .then(({ data }) => { if (alive) setSrc(data?.signedUrl || null); });
    return () => { alive = false; };
  }, [supabase, path]);
  if (!src) return <div className="scLoading">Loading…</div>;
  return type === "video"
    ? <video className="scMedia" src={src} controls playsInline preload="metadata" />
    : <img className="scMedia" src={src} alt="Attachment" />;
}

const CSS = `
.scWrap{display:flex;flex-direction:column;height:calc(100vh - 160px);min-height:360px}
.scNote{font-size:12px;color:#777;background:#fff7ed;border:1px solid #fed7aa;padding:8px 10px;border-radius:8px;margin-bottom:10px}
.scList{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px}
.scMsg{max-width:78%;padding:9px 12px;border-radius:12px;font-size:14px;word-wrap:break-word;white-space:pre-wrap}
.scMsg small{display:block;font-size:10px;opacity:.6;margin-top:4px}
.scMsg.me{align-self:flex-end;background:#dc2626;color:#fff;border-bottom-right-radius:4px}
.scMsg.them{align-self:flex-start;background:#f3f4f6;color:#111;border-bottom-left-radius:4px}
.scMedia{display:block;width:100%;max-width:220px;border-radius:10px;margin-bottom:4px;background:#000}
.scLoading{font-size:12px;opacity:.7;margin-bottom:4px}
.scChip{display:flex;align-items:center;justify-content:space-between;font-size:12px;background:#f3f4f6;border-radius:8px;padding:6px 10px;margin-top:8px}
.scChip button{border:0;background:none;font-weight:700;color:#dc2626;cursor:pointer}
.scInput{display:flex;gap:8px;margin-top:10px;align-items:center}
.scInput input[type=text]{flex:1;padding:11px;border:1px solid #ddd;border-radius:10px;font-size:14px;min-width:0}
.scAttach{width:42px;height:42px;border:1px solid #ddd;border-radius:10px;background:#fff;font-size:18px;cursor:pointer;flex-shrink:0}
.scAttach:disabled{opacity:.5;cursor:default}
.scInput .scSend{padding:0 16px;height:42px;border:0;border-radius:10px;background:#dc2626;color:#fff;font-weight:700;cursor:pointer;flex-shrink:0}
.scInput .scSend:disabled{opacity:.5;cursor:default}
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
  const [text, setText] = useState("");
  const [pending, setPending] = useState(null); // { path, type } uploaded, not sent yet
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

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

  const pickFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setUploading(true);
    try {
      let blob, type;
      if (file.type.startsWith("image/")) { blob = await compressImage(file); type = "image"; }
      else if (file.type.startsWith("video/")) { blob = await compressVideo(file); type = "video"; }
      else throw new Error("Only photos and videos can be attached");
      if (blob.size > MAX_UPLOAD_BYTES) throw new Error("File is still too large. Please try a shorter video.");

      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error("Please log in first");
      const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${type === "image" ? "jpg" : "webm"}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
      if (error) throw error;
      setPending({ path, type });
    } catch (ex) {
      setErr(ex.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const cancelPending = async () => {
    if (pending) await supabase.storage.from(BUCKET).remove([pending.path]);
    setPending(null);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !pending) || busy || uploading) return;
    setBusy(true); setErr("");
    const args = { p_body: body, p_media_path: pending?.path ?? null, p_media_type: pending?.type ?? null };
    const { error } = isAdmin
      ? await supabase.rpc("support_admin_reply", { p_user: active, ...args })
      : await supabase.rpc("support_send", args);
    setBusy(false);
    if (error) return setErr(error.message);
    setText(""); setPending(null);
    isAdmin ? loadAdminMsgs(active) : loadMine();
  };

  const mine = m => (isAdmin ? m.sender === "admin" : m.sender === "user");

  const chatView = (
    <>
      <div className="scList">
        {msgs.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No messages yet. Send us a message.</p>}
        {msgs.map(m => (
          <div key={m.id} className={"scMsg " + (mine(m) ? "me" : "them")}>
            {m.media_path && <MediaView supabase={supabase} path={m.media_path} type={m.media_type} />}
            {m.body && <div>{m.body}</div>}
            <small>{time(m.created_at)}</small>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {err && <p className="scErr">{err}</p>}
      {pending && (
        <div className="scChip">
          <span>{pending.type === "image" ? "Photo" : "Video"} attached</span>
          <button onClick={cancelPending}>Remove</button>
        </div>
      )}
      <div className="scInput">
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={pickFile} />
        <button className="scAttach" title="Attach photo or video" disabled={uploading || busy || !!pending} onClick={() => fileRef.current?.click()}>
          {uploading ? "…" : "📎"}
        </button>
        <input
          type="text"
          value={text}
          maxLength={1000}
          placeholder={uploading ? "Uploading…" : "Type a message..."}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button className="scSend" onClick={send} disabled={busy || uploading || (!text.trim() && !pending)}>Send</button>
      </div>
    </>
  );

  let body;
  if (!isAdmin) {
    body = (
      <>
        <div className="scNote">Messages and attachments are deleted 30 minutes after they are sent.</div>
        {chatView}
      </>
    );
  } else if (!active) {
    body = (
      <>
        {err && <p className="scErr">{err}</p>}
        {threads.length === 0 && <p style={{ color: "#888", fontSize: 13 }}>No active chats.</p>}
        {threads.map(t => (
          <button key={t.thread_user} className="scThread" onClick={() => { setMsgs([]); setActive(t.thread_user); }}>
            <b>Player {String(t.thread_user).slice(0, 8)}</b> · {time(t.last_at)}
            <span>{t.last_body || "[Attachment]"}</span>
          </button>
        ))}
      </>
    );
  } else {
    body = (
      <>
        <button className="scBack" onClick={() => { setActive(null); setMsgs([]); setText(""); setPending(null); }}>‹ Back</button>
        <div className="scNote">Messages and attachments are deleted 30 minutes after they are sent.</div>
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
