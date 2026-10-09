import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

/* ClashX7 - Supabase version. Run schema.sql THEN schema_patch.sql. Admin / moderator panel: /#admin */
const env = import.meta.env;
const SB_URL = env.VITE_SUPABASE_URL, SB_KEY = env.VITE_SUPABASE_ANON_KEY;
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, {global:{fetch:(u,o)=>fetch(u,{...o,cache:"no-store"})}}) : null; // no-store = purono cached data kokhono ashbe na
const ADMIN_EMAIL = "parimaltikadar110@gmail.com"; // UI fallback only; real protection = is_admin() in SQL
const UPI_ID = env.VITE_UPI_ID || "yourupi@bank", UPI_NAME = env.VITE_UPI_NAME || "ClashX7";
const SUPPORT_URL = env.VITE_SUPPORT_URL || "";
// APK lives in Vite's /public folder. BASE_URL also works on GitHub Pages
// project sites where the app is served from /REPOSITORY_NAME/ instead of /.
const APK_URL = env.VITE_APK_URL || new URL("clashx7.apk", window.location.origin + import.meta.env.BASE_URL).href;
const GATEWAYS = (env.VITE_GATEWAYS || "zapupi,manual,razorpay,cashfree").split(",").map(s => s.trim()); // kon gateway dekhabe
const VAPID = env.VITE_VAPID_PUBLIC_KEY;
const DEFAULT_PHONE = (env.VITE_DEPOSIT_PHONE||"").replace(/\D/g,"").slice(-10); // optional: used only when a player has no mobile saved, so deposit never asks for a number
const UA = navigator.userAgent || "";
const IS_APP = /ClashX7App/i.test(UA) || /;\s*wv\)/i.test(UA) || (/Version\/[\d.]+/.test(UA) && /Chrome\//.test(UA)) || !!window.matchMedia?.("(display-mode: standalone)").matches || !!navigator.standalone; // true inside the APK / installed app
const RZP_JS = "https://checkout.razorpay.com/v1/checkout.js", CF_JS = "https://sdk.cashfree.com/js/v3/cashfree.js";
const T = ["SOLO BR","DUO BR","DUO PR KILL","SOLO PER KILL","LONE WOLF","LW HEAD","CS CHALLENGERS","CLASH SQUAD","CS HEADSHOT","LOSS TO WIN"];
const COL = ["#7f1d1d","#1e3a5f","#14532d","#4c1d95","#78350f"];
const NAV = [["home","Home","M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"],["my","My Matches","M7 4h10v5a5 5 0 0 1-10 0zM4 5h3M17 5h3M12 14v4M8 20h8"],["wallet","Wallet","M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M15 13h3"],["lb","Leaderboard","M5 20V11M12 20V4M19 20v-7"]];
const fmt = t => new Date(t).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"numeric",minute:"2-digit"});
const kf = n => n >= 1000 ? (n/1000).toFixed(1)+"k" : n;
const b64 = s => { const r = atob((s+"=".repeat((4-s.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from([...r].map(c=>c.charCodeAt(0))) };
const pushOK = () => !!VAPID && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const loadScript = (src, ok) => new Promise((res,rej) => { if(ok()) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load payment script")); document.body.appendChild(s) });

const shrink = (file,max=1000,q=.72) => new Promise((ok,no)=>{ const img=new Image(); img.onload=()=>{ const k=Math.min(1,max/Math.max(img.width,img.height)), c=document.createElement("canvas"); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(img.src); c.toBlob(b=>b?ok(b):no(new Error("Image error")),"image/jpeg",q) }; img.onerror=()=>no(new Error("Not a valid image")); img.src=URL.createObjectURL(file) });
const R = n => (n<0?"-":"")+"₹"+Math.abs(Math.round(+n||0)).toLocaleString("en-IN");

const Logo = ({s=64}) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6a5c"/><stop offset="1" stopColor="#c4161c"/></linearGradient></defs>
    <path d="M50 4l40 23v46L50 96 10 73V27z" fill="url(#lg)" stroke="#fff" strokeWidth="3"/>
    <path d="M24 34l28 32M52 34L24 66" stroke="#fff" strokeWidth="10" strokeLinecap="round"/>
    <path d="M62 34h20l-13 32" stroke="#111" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Avatar = ({name="Player",s=32}) => {
  const letter = (name||"P").trim().slice(0,1).toUpperCase();
  return <div className="avatar" style={{width:s,height:s,fontSize:Math.max(12,Math.round(s*.34))}}>
    <span className="avatarGlow">✦</span><b>{letter}</b>
  </div>;
};

/* 2-second splash shown every time the app opens */
function Splash() {
  const F = [["🛡️","Fair Play","Verified results & strict anti-cheat"],["⚡","Fast Withdrawal","Winnings paid straight to your UPI"],["💬","Good Customer Service","Real people ready to help you"],["🏆","Daily Tournaments","Solo, Duo & Clash Squad rooms"]];
  return (<div className="splash"><div className="spGlow"/><div className="spLogo"><Logo s={92}/></div><h1 className="spName">ClashX7</h1><p className="spTag">Play · Win · Withdraw</p>
    <div className="spList">{F.map(([e,t,d],i)=><div className="spItem" style={{animationDelay:`${.3+i*.22}s`}} key={t}><span>{e}</span><div><b>{t}</b><small>{d}</small></div></div>)}</div>
    <div className="spBar"><i/></div><small className="spFoot">18+ only · Play responsibly</small></div>);
}

/* Visitor landing page (login korar age) */
function Landing({open,download,showDl,support}) {
  const F = [["🛡️","Fair Play","Strict anti-cheat rules, verified room results and transparent prize pools. Everyone plays by the same rules."],["⚡","Fast Withdrawal","Winnings land in your wallet. Request a withdrawal and get paid straight to your UPI ID."],["💬","Good Customer Support","Real people on WhatsApp / Telegram to help with deposits, matches and withdrawals."]];
  return (<div>
    <div className="lh"><span className="brand" style={{fontSize:18}}><Logo s={30}/>ClashX7</span><button className="lb2 rd" onClick={()=>open("in")}>Login</button></div>
    <section className="hero"><Logo s={96}/><h1>Play. Win. Withdraw.</h1>
      <p>Join daily custom-room tournaments, compete for real prize pools and cash out your winnings by UPI.</p>
      <div className="cta"><button className="lb2" onClick={()=>open("up")}>Create account</button><button className="lb2 ghost" onClick={()=>open("in")}>Login</button>{showDl&&<button className="lb2 dk" onClick={download}>⬇ Download APK</button>}</div></section>
    <section className="lsec"><h2>Why players choose ClashX7</h2><div className="l3">{F.map(([e,t,d])=><div className="lc" key={t}><span className="em">{e}</span><b>{t}</b><p>{d}</p></div>)}</div></section>
    <section className="lsec" style={{background:"#f9fafb"}}><h2>How it works</h2><div className="l3">{[["1","Sign up","Create your free account in a minute."],["2","Add money & join","Deposit by UPI and join a match that fits you."],["3","Win & withdraw","Top the room, get paid and withdraw to UPI."]].map(([n,t,d])=><div className="lc" key={n}><span className="em">{n}</span><b>{t}</b><p>{d}</p></div>)}</div></section>
    <section className="lsec"><h2>Game modes</h2><div className="chips">{T.map(t=><i key={t}>{t}</i>)}</div></section>
    <section className="lsec" style={{textAlign:"center",background:"#fef2f2"}}><h2>Need help?</h2><p style={{marginBottom:14,color:"#555"}}>Our support team is here for you.</p>
      {support?<a className="lb2 rd" style={{textDecoration:"none",display:"inline-block"}} href={support} target="_blank" rel="noreferrer">Contact support</a>:<button className="lb2 rd" onClick={()=>open("in")}>Login to continue</button>}</section>
    <div className="lf">© {new Date().getFullYear()} ClashX7 · 18+ only · Play responsibly<br/>Games involve skill and risk. Never play with money you can't afford to lose.</div>
  </div>);
}

/* Popup form (mobile e prompt() block hoy, tai eta) — fields: [key,label,type("text"|"number"|"select"|"area"),options] */
function Dlg({d, close}) {
  const [v,setV] = useState(() => Object.fromEntries(d.fields.map(([k,,t,o]) => [k, d.init?.[k] ?? (t==="select"?o[0]:"")]))), [busy,setBusy] = useState(false);
  const set = (k,x) => setV(s => ({...s,[k]:x}));
  return (<div className="ov" onClick={close}><div className="dl" onClick={e=>e.stopPropagation()}><h3 style={{marginBottom:10}}>{d.title}</h3>
    {d.note&&<p style={{fontSize:12,color:"#666",marginBottom:8}}>{d.note}</p>}
    {d.fields.map(([k,l,t,o]) => <div key={k}><label>{l}</label>
      {t==="select" ? <select value={v[k]} onChange={e=>set(k,e.target.value)}>{o.map(x=>Array.isArray(x)?<option key={x[0]} value={x[0]}>{x[1]}</option>:<option key={x}>{x}</option>)}</select>
      : t==="area" ? <textarea rows={6} value={v[k]} onChange={e=>set(k,e.target.value)}/>
      : t==="file" ? <input type="file" accept="image/*" onChange={e=>set(k,e.target.files[0]||"")}/>
      : <input type={t} value={v[k]} onChange={e=>set(k,e.target.value)}/>}</div>)}
    <button className="btn" disabled={busy} onClick={async()=>{setBusy(true); const r = await d.ok(v); setBusy(false); if(r!==false) close()}}>{busy?"Please wait…":d.btn||"Save"}</button></div></div>);
}

const Tabs = ({list,cur,set,flex}) => (
  <div className="tabs">
    {list.map(t=><b key={t} className={t===cur?"on":""} ref={t===cur?el=>{
      if(!el||!el.parentElement||flex) return;
      const p=el.parentElement;
      const left=Math.max(0,el.offsetLeft-(p.clientWidth-el.offsetWidth)/2);
      p.scrollLeft=left;
    }:undefined} style={flex?{flex:1,textAlign:"center",textTransform:"capitalize"}:null} onClick={()=>set(t)}>{t}</b>)}
  </div>
);

/* Instant open: last known data is shown immediately, fresh data replaces it a moment later (no blank/splash screen). */
const readLS = k => { try{ return JSON.parse(localStorage.getItem(k)) }catch{ return null } };
const storedSession = () => { try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/^sb-.*-auth-token$/.test(k)){ const v=JSON.parse(localStorage.getItem(k)); if(v?.user) return v } } }catch{} return null };
const BOOT = (() => { const s=storedSession(), c=readLS("x7cache"); return { s, c: s && c && c.uid===s.user.id ? c : null } })();

function Skeleton({onRetry,onLogout}) {
  const [slow,setSlow] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setSlow(true),9000); return()=>clearTimeout(t) },[]);
  return (<div>
    <div className="hdr"><span className="sk skc"/><span className="brand"><Logo s={24}/>ClashX7</span><span className="sk skp"/></div>
    <div className="tabs">{[0,1,2,3,4].map(i=><b key={i}><span className="sk skt"/></b>)}</div>
    {[0,1,2].map(i=><div className="card" key={i} style={{cursor:"default"}}><div className="sk skimg"/><div className="matchBody"><div className="sk skl"/><div className="sk skl s"/><div style={{height:14}}/></div></div>)}
    {slow&&onRetry&&<div style={{padding:16,textAlign:"center"}}><p style={{fontSize:13,color:"#555",marginBottom:10}}>Taking longer than usual…</p><button className="btn" onClick={onRetry}>Try again</button><button className="btn" style={{background:"#fef2f2",color:"var(--r)",marginTop:8}} onClick={onLogout}>Logout</button></div>}
  </div>);
}

export default function App() {
  const [session,setSession] = useState(BOOT.c?BOOT.s:null), [ready,setReady] = useState(!!BOOT.c || !BOOT.s), [hash,setHash] = useState(window.location.hash);
  const [me,setMe] = useState(BOOT.c?.me||null), [M,setM] = useState(BOOT.c?.M||[]), [rooms,setRooms] = useState(BOOT.c?.rooms||{}), [joined,setJoined] = useState(BOOT.c?.joined||[]), [txs,setTxs] = useState([]), [lb,setLb] = useState([]), [allU,setAllU] = useState([]), [W,setW] = useState([]);
  const [deps,setDeps] = useState([]), [notifs,setNotifs] = useState(BOOT.c?.notifs||[]), [rules,setRules] = useState(BOOT.c?.rules||{}), [dlg,setDlg] = useState(null), [toast,setToast] = useState(null), [gw,setGw] = useState(GATEWAYS[0]), [busy,setBusy] = useState(false), [pushOn,setPushOn] = useState(pushOK() && Notification.permission==="granted");
  const [live,setLive] = useState(false), [S,setS] = useState(BOOT.c?.S||{}), [stats,setStats] = useState(null), [gwOk,setGwOk] = useState({}), [pv,setPv] = useState(null), [myW,setMyW] = useState([]), [authOpen,setAuthOpen] = useState(false), [inst,setInst] = useState(null), [howto,setHowto] = useState(false), [updatePending,setUpdatePending] = useState(false);
  const [pageMatch,setPageMatch] = useState(null), [players,setPlayers] = useState([]), [mySlots,setMySlots] = useState([]), [splash,setSplash] = useState(window.location.hash!=="#admin");
  const [tab,setTab] = useState(T[0]), [nav,setNav] = useState("home"), [page,setPage] = useState(null), [mt,setMt] = useState("upcoming"), [at,setAt] = useState("Dashboard"), [mode,setMode] = useState("in"), [f,setF] = useState({});
  const role = me?.role || "user", isAdmin = role==="admin" || session?.user?.email?.toLowerCase()===ADMIN_EMAIL, isActingAdmin = role==="acting_admin", isModerator = role==="moderator", isStaff = isAdmin || isActingAdmin || isModerator;
  const authOpenRef = useRef(false);
  authOpenRef.current = authOpen;

  // joined players + MY slots (each slot has its own game name) of the open match page
  const openMid = page==="match" ? +f.mid : 0, openFilled = M.find(x=>x.id===openMid)?.filled;
  const refreshLists = id => { if(!id||!supabase) return; supabase.rpc("match_players",{p_match:id}).then(({data})=>setPlayers(data||[])); supabase.rpc("my_slots",{p_match:id}).then(({data})=>setMySlots(data||[])) };
  useEffect(()=>{ setPlayers([]); setMySlots([]); refreshLists(openMid) },[openMid,openFilled,joined.length]);
  useEffect(()=>{ document.getElementById("x7-boot")?.remove(); const t=setTimeout(()=>setSplash(false),2000); return()=>clearTimeout(t) },[]);

  const say = (m,err) => { setToast({m,err}); setTimeout(()=>setToast(null),4200) };
  const ask = (title,fields,ok,init,extra={}) => setDlg({title,fields,ok,init,...extra});

  // Do not trigger the browser install prompt from the landing-page button.
  // That prompt immediately installs the PWA after the user accepts it.
  // We instead show manual install/download instructions, so visiting "Download APK"
  // never adds an icon to the home screen by itself.
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;
  const download = async () => {
    try {
      // Fetch first so an HTML error/404 page is never silently saved as .apk.
      const r = await fetch(APK_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(`APK not found (${r.status})`);
      const type = (r.headers.get("content-type") || "").toLowerCase();
      if (type.includes("text/html")) throw new Error("APK URL returned an HTML page. Check that clashx7.apk is inside the public folder.");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ClashX7.apk";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      say(e?.message || "APK download failed", 1);
    }
  };
  const open = m => { setMode(m); setF({}); setAuthOpen(true) };

  useEffect(()=>{
    const h = () => setHash(window.location.hash);
    window.addEventListener("hashchange",h);

    // PWA: NEVER force location.reload() from service-worker updates.
    // A controllerchange-triggered reload was causing the app to flash white
    // and repeatedly kick the user back to the landing page. The browser will
    // pick up the newest Vercel build on the next navigation/reopen.
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("/push-sw.js",{updateViaCache:"none"}).then(reg=>{
        reg.update().catch(()=>{});
      }).catch(()=>{});
    }

    // Deployment update check: Vite/Vercel emits content-hashed asset filenames.
    // We compare the currently loaded bundle URLs with a fresh no-cache index.html.
    // When they differ, the app waits for a safe point (no open form/dialog) and
    // then performs exactly one normal navigation reload. This avoids the old
    // service-worker controllerchange reload loop while still bringing an
    // installed PWA onto the latest Vercel deployment automatically.
    const bundleSig = html => {
      try{
        const doc = new DOMParser().parseFromString(html,"text/html");
        return [...doc.scripts].map(x=>x.src).filter(Boolean).sort().join("|");
      }catch{return ""}
    };
    const currentSig = () => [...document.scripts].map(x=>x.src).filter(Boolean).sort().join("|");
    const checkDeployment = async () => {
      if(document.visibilityState!=="visible" || updatePending) return;
      try{
        const r = await fetch(window.location.pathname + "?x7v=" + Date.now(), {cache:"no-store",headers:{"Cache-Control":"no-cache"}});
        if(!r.ok) return;
        const fresh = bundleSig(await r.text());
        if(fresh && currentSig() && fresh!==currentSig()) setUpdatePending(true);
      }catch{}
    };
    const upTimer = setInterval(checkDeployment,30000);
    checkDeployment();

    if(!supabase){
      setReady(true);
      return()=>{window.removeEventListener("hashchange",h);clearInterval(upTimer)};
    }

    supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>{
      l.subscription.unsubscribe();
      window.removeEventListener("hashchange",h);
      clearInterval(upTimer);
    };
  },[]);

  useEffect(()=>{
    if(!updatePending || authOpen || dlg || page || busy || Object.keys(f).length) return;
    const t=setTimeout(()=>location.reload(),900);
    return()=>clearTimeout(t);
  },[updatePending,authOpen,dlg,page,busy,f]);

  const load = useCallback(async()=>{
    if(!session) return; const uid = session.user.id, q = t => supabase.from(t).select("*");
    const [p,m,j,t,l,r,n,ru,d,mw,st] = await Promise.all([q("profiles").eq("id",uid).maybeSingle(), q("matches").order("starts_at"), q("participants").eq("user_id",uid), q("transactions").order("created_at",{ascending:false}).limit(50), q("leaderboard"), q("match_rooms"),
      q("notifications").order("created_at",{ascending:false}).limit(30), q("mode_rules"), q("deposits").order("created_at",{ascending:false}).limit(150), q("withdrawals").eq("user_id",uid).order("created_at",{ascending:false}).limit(10), q("app_settings")]);
    setMe(p.data); setM(m.data||[]); setJoined((j.data||[]).map(x=>x.match_id)); setTxs(t.data||[]); setLb(l.data||[]); setRooms(Object.fromEntries((r.data||[]).map(x=>[x.match_id,x])));
    setNotifs(n.data||[]); setRules(Object.fromEntries((ru.data||[]).map(x=>[x.mode,x]))); setDeps(d.data||[]); setMyW(mw.data||[]); setS(Object.fromEntries((st.data||[]).map(x=>[x.key,x.value])));
    if(p.data) try{ localStorage.setItem("x7cache",JSON.stringify({uid,me:p.data,M:m.data||[],joined:(j.data||[]).map(x=>x.match_id),rooms:Object.fromEntries((r.data||[]).map(x=>[x.match_id,x])),rules:Object.fromEntries((ru.data||[]).map(x=>[x.mode,x])),S:Object.fromEntries((st.data||[]).map(x=>[x.key,x.value])),notifs:(n.data||[]).slice(0,20)})) }catch{}
    if(p.data?.role==="admin" || session.user.email?.toLowerCase()===ADMIN_EMAIL){const [u,w,sx,gs]=await Promise.all([q("profiles").order("created_at"),q("withdrawals").order("created_at",{ascending:false}),supabase.rpc("admin_stats"),supabase.rpc("admin_gateway_status")]);setAllU(u.data||[]);setStats(sx.error?{error:sx.error.message}:sx.data);setGwOk(gs.data||{});setW(w.data||[])}
    else if(p.data?.role==="acting_admin"){const [u]=await Promise.all([supabase.rpc("staff_list_users")]);setAllU(u.data||[])}
  },[session]);
  useEffect(()=>{load();const i=setInterval(load,15000);return()=>clearInterval(i)},[load]);

  // LIVE: match create / room / balance / notification change hole sathe sathe screen update (refresh/redeploy lagbe na)
  useEffect(()=>{
    if(!session) return; let t; const ping = () => { clearTimeout(t); t = setTimeout(load,250) };
    const ch = supabase.channel("x7-live");
    ["matches","match_rooms","notifications","profiles","deposits","mode_rules","withdrawals","transactions"].forEach(tb => ch.on("postgres_changes",{event:"*",schema:"public",table:tb},ping));
    ch.subscribe(st=>setLive(st==="SUBSCRIBED"));
    const vis = () => document.visibilityState==="visible" && load(); document.addEventListener("visibilitychange",vis);
    return()=>{supabase.removeChannel(ch);setLive(false);document.removeEventListener("visibilitychange",vis);clearTimeout(t)};
  },[session,load]);

  const savePush = async () => { const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
    const {error} = await supabase.from("push_subscriptions").upsert({endpoint:sub.endpoint,user_id:session.user.id,sub:sub.toJSON()}); if(error) throw error };
  useEffect(()=>{ if(me&&pushOK()&&Notification.permission==="granted") savePush().then(()=>setPushOn(true)).catch(()=>{}) },[me?.id]); // already allowed hole chupchap re-register
  const enablePush = async () => { try{ if(!pushOK()) return say("This browser/phone can't receive push. On iPhone: Add to Home Screen first.",1);
    if(await Notification.requestPermission()!=="granted") return say("Notification permission was denied. Allow it from browser settings.",1);
    await savePush(); setPushOn(true); say("Phone notifications turned on ✅") }catch(e){say(e.message,1)} };

  const go = (p,init={}) => {setF(init);setPage(p)};
  const inp = (k,l,t="text") => (<div className="field"><label>{l}</label><input type={t} value={f[k]??""} onChange={e=>setF({...f,[k]:e.target.value})}/></div>);
  const rpc = async (fn,args,msg) => { const {error}=await supabase.rpc(fn,args); if(error){say(error.message,1);return false} if(msg) say(msg); await load(); return true };
  const run = async (p,msg) => { const {error}=await p; if(error){say(error.message,1);return false} if(msg) say(msg); await load(); return true };
  const api = async (path,body) => { const r = await fetch("/api/"+path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify(body)});
    const j = await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||"Request failed ("+r.status+")"); return j };

  useEffect(()=>{ if(!session) return; const o = new URLSearchParams(window.location.search).get("zp"); if(!o) return;   // ZapUPI payment theke ferar por
    window.history.replaceState({},"",window.location.pathname+window.location.hash);
    api("deposit-check",{ref:o}).then(r=>{ say(r.credited?"Payment received — wallet updated ✅":"Payment not confirmed yet. If money was deducted it will be added shortly.",!r.credited&&!r.pending); load() }).catch(e=>say(e.message,1)) },[session]);

  // ---- auth ----
  const auth = async () => { const id=(f.em||"").trim(), p=f.pw||"";
    if(mode==="up"){ const un=(f.un||"").trim().toLowerCase(), ph=(f.ph||"").replace(/\D/g,"").slice(-10);
      if(!/^[a-z0-9_]{3,20}$/.test(un)) return say("Username: 3-20 letters, numbers or _",1);
      if(ph.length!==10) return say("Enter a valid 10-digit mobile number",1);
      if(!id.includes("@")||p.length<6) return say("Enter a valid email and a password (min 6 characters)",1);
      const {data:av} = await supabase.rpc("signup_available",{p_username:un,p_phone:ph});
      if(av&&!av.username) return say("This username is already taken",1); if(av&&!av.phone) return say("This mobile number is already registered",1);
      const r = await supabase.auth.signUp({email:id,password:p,options:{data:{name:un,username:un,phone:ph}}});
      if(r.error) return say(r.error.message,1);
      if(!r.data.session) say("Account created. Confirm your email (check inbox/spam), then log in."); return }
    if(!id||!p) return say("Enter your login ID and password",1);
    if(id.includes("@")){ const r=await supabase.auth.signInWithPassword({email:id,password:p}); if(r.error) say(r.error.message,1); return }
    const r = await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,password:p})}); const j = await r.json().catch(()=>({}));
    if(!r.ok) return say(j.error||"Login failed",1);
    const {error} = await supabase.auth.setSession({access_token:j.access_token,refresh_token:j.refresh_token}); if(error) say(error.message,1) };
  const logout = async () => { try{const s=await (await navigator.serviceWorker?.getRegistration())?.pushManager.getSubscription(); if(s) await supabase.from("push_subscriptions").delete().eq("endpoint",s.endpoint)}catch{}
    await supabase.auth.signOut(); try{localStorage.removeItem("x7cache")}catch{} setMe(null); setPage(null); setF({}) };

  // ---- player actions ----
  // every slot has its OWN game name (one player can book as many slots as they like)
  const doJoin = async (m,names) => {
    const list=names.map(x=>(x||"").trim());
    if(!list.length||list.some(x=>!x)){ say("Enter a game name for every slot",1); return false }
    if((me.balance||0)+(me.winnings||0)<(+m.fee||0)*list.length){ say("Not enough balance. Add money in Wallet.",1); return false }
    await supabase.rpc("save_game_name",{p_name:list[0]});
    let done=0;
    for(const gn of list){
      const {error}=await supabase.rpc("join_match_slot",{p_match:m.id,p_game_name:gn});
      if(error){ say((done?`${done} of ${list.length} slots booked. `:"")+error.message,1); break }
      await supabase.rpc("name_new_slot",{p_match:m.id,p_name:gn}); // makes sure THIS slot carries THIS name
      done++;
    }
    if(done){ setMe(x=>({...x,game_name:list[0]})); if(done===list.length) say(done>1?`${done} slots booked ✅`:"Slot booked ✅"); await load(); refreshLists(m.id) }
    return done>0;
  };
  // join straight from the match list: popup asks one game name per slot
  const askJoin = (m,count=1) => {
    if(!m||m.status!=="upcoming") return say("This match is not open for booking.",1);
    const left=Math.max(0,(m.slots||0)-(m.filled||0));
    if(left<count) return say(left?`Only ${left} slot${left===1?"":"s"} left.`:"No slot left.",1);
    const have=joined.filter(x=>x===m.id).length, tot=(+m.fee||0)*count;
    const fields=Array.from({length:count},(_,i)=>["g"+i,count>1?`Slot ${i+1} · game name`:(have?`Slot ${have+1} · game name`:"Your in-game name"),"text"]);
    const init=Object.fromEntries(fields.map(([k],i)=>[k,(i===0&&!have)?(me.game_name||""):""]));
    ask(`Join · ${m.title}`,fields,v=>doJoin(m,fields.map(([k])=>v[k])),init,
      {note:`₹${tot}${count>1?` (${count} slots)`:""} will be deducted from your wallet. Each slot can have a different game name, and you can change names until the match goes live.`,btn:`Pay ₹${tot} & join`});
  };
  const saveSlotNames = async () => {
    for(const s of mySlots){
      const v=(f["sn_"+s.slot_id]??s.game_name??"").trim();
      if(v&&v!==(s.game_name||"")){ const {error}=await supabase.rpc("set_my_slot_name",{p_slot:s.slot_id,p_name:v}); if(error) return say(error.message,1) }
    }
    say("Game names updated ✅"); setF(x=>Object.fromEntries(Object.entries(x).filter(([k])=>!k.startsWith("sn_")))); refreshLists(openMid); load();
  };

  const saveAcc = () => run(
    supabase.from("profiles").update({
      name:f.n||me.name,
      game_name:f.gn||"",
      game_id:f.g||"",
      phone:(f.ph||"").replace(/\D/g,"").slice(-10)||null
    }).eq("id",me.id),
    "Saved"
  ).then(ok=>{ if(ok){setMe(x=>({...x,name:f.n||x.name,game_name:f.gn||"",game_id:f.g||"",phone:(f.ph||"").replace(/\D/g,"").slice(-10)||null}));go("profile")} });

  const withdraw = async () => { const wd=S.withdraw||{}, a=+f.a;
    if(wd.enabled===false) return say("Withdrawals are temporarily closed.",1);
    if(!(a>0)) return say("Enter the amount to withdraw",1);
    if(a<(+wd.min||0)) return say(`Minimum withdrawal is ₹${wd.min}`,1);
    if(+wd.max&&a>+wd.max) return say(`Maximum withdrawal per request is ₹${wd.max}`,1);
    if(a>(me.winnings||0)) return say("You can withdraw only from your Winning Balance",1);
    if(!(f.u||"").trim()) return say("Enter your UPI ID",1);
    if(await rpc("request_withdrawal",{p_amt:a,p_upi:f.u.trim()})){say("Withdrawal request sent");go(null)} };
  const saveWithdraw = () => { const w=S.withdraw||{}, mn=+(f.wmin??w.min??50), mx=+(f.wmax??w.max??0);
    if(!(mn>=0)||!(mx>=0)) return say("Enter valid amounts",1); if(mx&&mx<mn) return say("Maximum cannot be less than minimum",1);
    return run(supabase.from("app_settings").upsert({key:"withdraw",value:{enabled:(f.we??(w.enabled===false?"0":"1"))==="1",min:mn,max:mx,note:(f.wnote??w.note??"").trim()},updated_at:new Date().toISOString()}),"Withdrawal rules saved") };
  const gwActive = () => { const key = g => g==="manual"?"manual":"gw_"+g, ALL=["zapupi","manual","razorpay","cashfree"];
    const cfg = ALL.some(g=>S[key(g)]); return ALL.filter(g => cfg ? S[key(g)]?.enabled===true : GATEWAYS.includes(g)) };
  const manualDep = async () => { const a=+f.a, u=(f.u||"").trim(), mn=+(S.manual?.min||10), mx=+(S.manual?.max||0);
    if(!(a>=mn)) return say(`Minimum deposit is ₹${mn}`,1); if(mx&&a>mx) return say(`Maximum deposit is ₹${mx}`,1);
    if(u&&u.length<8) return say("UTR looks too short",1); if(!u&&!f.pf) return say("Enter the UTR / transaction ID or upload the payment screenshot",1);
    setBusy(true);
    try{ let path=null;
      if(f.pf){ const b=await shrink(f.pf,1100); path=`${me.id}/${Date.now()}.jpg`; const {error:ue}=await supabase.storage.from("proofs").upload(path,b,{contentType:"image/jpeg"}); if(ue) throw new Error("Screenshot upload failed: "+ue.message) }
      const {error}=await supabase.from("deposits").insert({user_id:me.id,amount:a,gateway:"manual",utr:u||null,proof_path:path});
      if(error) throw new Error(/duplicate/i.test(error.message)?"This UTR was already submitted":error.message);
      say("Submitted ✅ Admin will verify and add the balance."); setF({}); load()
    }catch(e){say(e.message||"Failed",1)} setBusy(false) };
  const viewProof = async path => { const {data,error}=await supabase.storage.from("proofs").createSignedUrl(path,300); if(error) return say(error.message,1); setPv(data.signedUrl) };
  const uploadQr = async file => { if(!file) return; setBusy(true); try{ const b=await shrink(file,800,.92); const {error}=await supabase.storage.from("public-assets").upload("pay-qr.jpg",b,{contentType:"image/jpeg",upsert:true}); if(error) throw error;
      const {data}=supabase.storage.from("public-assets").getPublicUrl("pay-qr.jpg"); setF(x=>({...x,qr:data.publicUrl+"?v="+Date.now()})); say("QR uploaded — now press Save") }catch(e){say(e.message,1)} setBusy(false) };
  const thumbErr = e => { const m=e?.message||"Upload failed";
    if(/row-level security|policy|not authorized|unauthorized|permission/i.test(m)) return "No permission to upload images. Run fix_patch.sql in the Supabase SQL Editor (storage policy), then try again.";
    if(/bucket/i.test(m)) return "Storage bucket 'public-assets' is missing. Run fix_patch.sql in the Supabase SQL Editor.";
    return m };
  const uploadThumbFile = async file => {
    const b=await shrink(file,1200,.86);
    const path=`match-thumbnails/${session.user.id}-${Date.now()}.jpg`;
    const {error}=await supabase.storage.from("public-assets").upload(path,b,{contentType:"image/jpeg",upsert:false});
    if(error) throw error;
    return supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
  };
  const uploadMatchThumb = async file => {
    if(!file) return;
    setBusy(true);
    try{ const url=await uploadThumbFile(file); setF(x=>({...x,th:url})); say("Thumbnail ready ✅") }
    catch(e){ say(thumbErr(e),1) } finally{ setBusy(false) }
  };
  const setThumbForMatch = m => ask(`Thumbnail · #${m.id}`,[["file","Upload image","file"],["url","…or paste image URL","text"]],async v=>{
    try{
      let url=(v.url||"").trim();
      if(v.file) url=await uploadThumbFile(v.file);
      if(!url){ say("Choose an image or paste an image URL",1); return false }
      return await run(supabase.from("matches").update({thumbnail_url:url}).eq("id",m.id),"Thumbnail updated ✅");
    }catch(e){ say(thumbErr(e),1); return false }
  },{url:m.thumbnail_url||""},{btn:"Save thumbnail",note:"Tap Choose file. If your gallery does not open, paste an image link below instead. A wide image (16:9) looks best."});
  const saveManual = () => { const m=S.manual||{}, v=(k,d="")=>f[k]??m[k]??d;
    return run(supabase.from("app_settings").upsert({key:"manual",value:{enabled:v("me_en",m.enabled===false?"0":"1")==="1",upi_id:v("upi_id").trim(),upi_name:v("upi_name").trim(),qr_url:f.qr??m.qr_url??"",note:v("note"),min:+v("min",10)||10,max:+v("max",0)||0},updated_at:new Date().toISOString()}),"Manual payment settings saved") };
  const saveGw = async (n,keys) => { const sec={}; keys.forEach(k=>{const v=(f[`gs_${n}_${k}`]||"").trim(); if(v) sec[k]=v}); const en=(f[`ge_${n}`]??(S["gw_"+n]?.enabled===true?"1":"0"))==="1";
    if(await rpc("admin_save_gateway",{p_name:n,p_enabled:en,p_secrets:sec},`${n} ${en?"enabled":"disabled"} & saved`)) setF(x=>Object.fromEntries(Object.entries(x).filter(([k])=>!k.startsWith("gs_"+n)))) };

  const gwDep = async g => { const a=+f.a; if(!(a>=10)) return say("Minimum deposit is ₹10",1); setBusy(true);
    try{ const d = await api("deposit",{gateway:g,amount:a,phone:me.phone||DEFAULT_PHONE||undefined});
      const done = () => { say("Payment received. Wallet updates in a few seconds…"); [2500,6000,12000].forEach(ms=>setTimeout(load,ms)) };
      if(g==="zapupi"){ window.location.href = d.url; return }
      if(g==="razorpay"){ await loadScript(RZP_JS,()=>window.Razorpay); new window.Razorpay({key:d.key,order_id:d.order_id,amount:d.amount,currency:"INR",name:"ClashX7",prefill:{email:me.email,name:me.name,contact:me.phone||DEFAULT_PHONE||undefined},theme:{color:"#f5403a"},handler:done}).open() }
      else { await loadScript(CF_JS,()=>window.Cashfree); await window.Cashfree({mode:d.mode}).checkout({paymentSessionId:d.session,redirectTarget:"_modal"}); done() }
    }catch(e){say(e.message,1)} setBusy(false) };

  // ---- admin / moderator actions ----
  const notify = async (body) => { try{ const r = await api("notify",body); say(`Notification sent · ${r.sent} phone(s) reached`); return true }catch(e){ say("Notification failed: "+e.message,1); return false } };

  const buildMatchRow = (src={}) => {
    const pv=String(src.private||src.type||"0").toLowerCase();
    const isPrivate=pv==="1"||pv==="true"||pv==="private";
    const starts=new Date(src.start||src.d||src.starts_at||"");
    return {
      title:String(src.title||"").trim(),
      mode:String(src.mode||T[0]).trim(),
      map:String(src.map||"BERMUDA").trim()||"BERMUDA",
      slots:+src.slots||32,
      prize:+src.prize||0,
      fee:+src.fee||0,
      starts_at:isNaN(starts.getTime())?null:starts.toISOString(),
      status:String(src.status||"upcoming"),
      is_private:isPrivate,
      code:isPrivate?(String(src.code||"").trim()||("X7"+Math.random().toString(36).slice(2,6).toUpperCase())):null,
      thumbnail_url:String(src.thumbnail||src.thumbnail_url||"").trim()||null
    };
  };

  const addMatch = async () => {
    if(!f.t||!f.d) return say("Title and start time are required",1);
    const row=buildMatchRow({title:f.t,mode:f.g,map:f.m,slots:f.s,prize:f.p,fee:f.fee,start:f.d,type:f.v,thumbnail:f.th});
    if(!row.starts_at) return say("Start time is invalid",1);
    const {data:nm,error}=await supabase.from("matches").insert(row).select().single();
    if(error) return say(error.message,1);
    setM(a=>[...a.filter(x=>x.id!==nm.id),nm].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)));
    say("Match created — players can see it now ✅");
    if(f.nf!=="0") notify({title:"🔥 New match: "+row.title,body:`${row.mode} · Prize ₹${row.prize} · Entry ₹${row.fee} · ${fmt(row.starts_at)}`});
    setF({}); load()
  };

  const bulkRows = () => {
    const count=Math.max(1,Math.min(100,+f.bulkCount||1));
    const gap=parseGapMinutes(f.bulkGap||"00:10");
    const start=new Date(f.bulkStart||"");
    if(!f.bulkTitle?.trim() || isNaN(start.getTime())) return [];
    return Array.from({length:count},(_,i)=>{
      const titleBase=f.bulkTitle.trim();
      const title=(f.bulkNumber!=="0" || count>1) ? `${titleBase} #${i+1}` : titleBase;
      return buildMatchRow({
        title,
        mode:f.bulkModeGame||T[0],
        map:f.bulkMap||"BERMUDA",
        slots:f.bulkSlots,
        prize:f.bulkPrize,
        fee:f.bulkFee,
        start:new Date(start.getTime()+i*gap*60000).toISOString(),
        thumbnail:f.th,
        type:f.bulkPrivate,
        status:f.bulkStatus||"upcoming",
      });
    });
  };

  const bulkCreate = async () => {
    const rows=bulkRows();
    if(!rows.length) return say("Fill title and first start time first.",1);
    if(rows.some(r=>!r.title||!r.starts_at)) return say("Please check the bulk match details.",1);
    const count=rows.length;
    setBusy(true);
    try{
      const {error}=await supabase.from("matches").insert(rows);
      if(error) throw error;
      say(`${count} matches created ✅`);
      if(f.bulkNotify!=="0") notify({title:`🔥 ${count} new matches added`,body:`${f.bulkModeGame||T[0]} matches are now available in ClashX7.`});
      setF({}); await load();
    }catch(e){say(e.message,1)} finally{setBusy(false)}
  };

  const openPayWinner = async m => {
    setBusy(true);
    try{
      const {data:ps,error}=await supabase.from("participants").select("user_id,game_name").eq("match_id",m.id).order("id");
      if(error) throw error;
      const rows=(ps||[]).map((p,i)=>{
        const u=allU.find(x=>x.id===p.user_id)||{};
        return {idx:String(i),user_id:p.user_id,name:u.name||u.username||u.email||"Player",game_name:p.game_name||u.game_name||"-",email:u.email||""};
      });
      if(!rows.length) return say("No players have joined this match yet.",1);
      const opts=rows.map(x=>[x.idx,`${x.name} · ${x.game_name}${x.email?` · ${x.email}`:""}`]);
      ask(`Pay prize · #${m.id}`,
        [["w","Select winner from joined players","select",opts],["a","Prize amount ₹","number"]],
        async v=>{
          const winner=rows.find(x=>x.idx===String(v.w));
          const amount=+v.a;
          if(!winner) {say("Select a joined player.",1);return false}
          if(!(amount>0)) {say("Enter a valid prize amount.",1);return false}
          if(amount>+m.prize) {say(`Prize cannot be more than ₹${m.prize}.`,1);return false}
          return rpc("admin_pay_winner",{p_match:m.id,p_user:winner.user_id,p_amt:amount},`₹${amount} paid to ${winner.name}`);
        },
        {w:"0",a:String(Math.max(1,+m.prize||0))},
        {btn:"Pay prize",note:`Joined players: ${rows.length} · Maximum payout for this match: ₹${m.prize}`}
      );
    }catch(e){say(e.message||"Could not load joined players.",1)}
    finally{setBusy(false)}
  };

  const room = m => { const o=rooms[m.id]||{};
    ask(`Room details · #${m.id}`,
      [["r","Room ID","text"],["p","Room password","text"]],
      async v=>{
        const oldR=o.room_id||"", oldP=o.room_pass||"";
        if(!v.r||!v.p) {say("Room ID and password are required",1);return false}
        if(!await run(supabase.from("match_rooms").upsert({match_id:m.id,room_id:v.r,room_pass:v.p}),"Room saved")) return false;
        if(v.r!==oldR||v.p!==oldP) await notify({match_id:m.id,title:"🎮 Room ID & password updated",body:`${m.title} room is ready. Room ID: ${v.r} · Pass: ${v.p}`});
      },{r:o.room_id||"",p:o.room_pass||""});
  };

  const setSt = (m,s) => run(supabase.from("matches").update({status:s}).eq("id",m.id),"Status: "+s).then(ok=>{ if(ok&&s==="live") notify({match_id:m.id,title:"🔴 Match is LIVE",body:m.title+" has started. Join the room now!"}) });
  const pay = m => openPayWinner(m);
  const adjust = x => ask(`Balance · ${x.name}`,[["a","Amount ₹ (use minus to deduct)","number"]],async v=>{ const a=+v.a; if(!a){say("Enter an amount",1);return false} return rpc("admin_adjust_balance",{p_user:x.id,p_amt:a},`Balance updated (${a>0?"+":""}₹${a})`) },{},{note:`Current deposit balance: ₹${x.balance}`,btn:"Update balance"});
  const setStaffRole = async (u, nextRole) => {
    if(!isAdmin) return say("Only the main Admin can change staff roles",1);
    const label = nextRole === "acting_admin" ? "Acting Admin" : nextRole === "moderator" ? "Moderator" : "User";
    if(u.role === "admin") return say("The main Admin role cannot be changed",1);
    if(await rpc("admin_set_staff_role",{p_user:u.id,p_role:nextRole},`${u.name} → ${label}`)) setF({});
  };

  const saveRules = async (m,text) => run(supabase.from("mode_rules").upsert(m.map(k=>({mode:k,rules:text,updated_at:new Date().toISOString()}))), m.length>1?"Rules saved for ALL modes":"Rules saved");
  const saveLinks = () => {
    const links={telegram:(f.telegram??S.support_links?.telegram??"").trim(),whatsapp:(f.whatsapp??S.support_links?.whatsapp??"").trim()};
    return rpc("admin_save_support_links",{p_telegram:links.telegram,p_whatsapp:links.whatsapp},"Support links saved");
  };

  // ---- UI pieces ----
  const copyText = async text => {
    try{ await navigator.clipboard.writeText(text); say("Copied ✅") }
    catch{ say("Copy failed — long press and copy it.",1) }
  };

  const parseGapMinutes = v => {
    const [hh,mm] = String(v||"00:10").split(":").map(Number);
    return Math.max(0, (hh||0)*60 + (mm||0));
  };

  const joinSlots = (m,count) => {
    count=Math.max(1,Math.min(2,+count||1));
    if(!(m.mode||"").toUpperCase().includes("DUO") && count>1) return say("Two-slot booking is only available for DUO matches.",1);
    askJoin(m,count);
  };

  const matchCard = m => {
    const left=Math.max(0,(m.slots||0)-(m.filled||0));
    const already=joined.includes(m.id);
    const isDuo=(m.mode||"").toUpperCase().includes("DUO"), myCount=joined.filter(x=>x===m.id).length;
    return (
      <div className="card matchCard" key={m.id} onClick={()=>go("match",{mid:m.id,game_name:me.game_name||""})}>
        <div className="thumbWrap">
          {m.thumbnail_url
            ? <img className="matchThumb" src={m.thumbnail_url} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none"}}/>
            : <div className="thumbFallback"><Logo s={24}/></div>}
          <div className="thumbShade"/>
          <div className="thumbTop"><span>#{m.id}</span><span>{m.mode}</span></div>
        </div>
        <div className="matchBody">
          <div className="tags"><i>{m.map}</i><i>{m.slots} SLOTS</i>{m.is_private&&<i>PRIVATE</i>}</div>
          <div className="matchTitleRow"><div><h4>{m.title}</h4><p className="pz">Prize Pool · ₹{m.prize}</p></div><b className="matchTime">{fmt(m.starts_at)}</b></div>
          <div className="bar"><u style={{width:`${m.slots?Math.min(100,(m.filled||0)/m.slots*100):0}%`}}/></div>
          <div className="foot">
            <span>{already?`✓ Joined · ${left} left`:`${left} spots left`}</span>
            {m.status==="upcoming"&&left>0 ? (
              <div className="quickDuo" onClick={e=>e.stopPropagation()}>
                {already
                  ? <><button className="joinPill joinedPill" onClick={()=>go("match",{mid:m.id,game_name:me.game_name||""})}>✓ Joined{myCount>1?` ×${myCount}`:""}</button><button className="joinPill" onClick={()=>askJoin(m,1)}>+ Slot · ₹{m.fee}</button></>
                  : isDuo
                    ? <><button className="joinPill" onClick={()=>joinSlots(m,1)}>1 Slot · ₹{m.fee}</button>{left>1&&<button className="joinPill alt" onClick={()=>joinSlots(m,2)}>2 Slots · ₹{(+m.fee||0)*2}</button>}</>
                    : <button className="joinPill" onClick={()=>askJoin(m,1)}>₹{m.fee} JOIN</button>}
              </div>
            ) : <b className={"joinPill "+(already?"joinedPill":"alt")}>{already?"✓ Joined":left<1?"FULL":String(m.status||"").toUpperCase()}</b>}
          </div>
        </div>
      </div>
    );
  };

  const body = () => {
    if(nav==="home"){
      const ms=M.filter(m=>m.status==="upcoming"&&!m.is_private&&m.mode===tab);
      return <><Tabs list={T} cur={tab} set={setTab}/>
        {pushOK()&&!pushOn&&Notification.permission!=="denied"&&<div className="bn" onClick={enablePush}>🔔 Turn on match & room notifications</div>}
        {ms.length?ms.map(matchCard):<p className="empty">No matches available in {tab}.</p>}
      </>;
    }
    if(nav==="my"){
      const ms=M.filter(m=>joined.includes(m.id)&&m.status===mt);
      return <><Tabs list={["upcoming","live","played","cancelled"]} cur={mt} set={setMt} flex/>{ms.length?ms.map(matchCard):<p className="empty">No matches here yet.</p>}</>;
    }
    if(nav==="wallet"){ const md=deps.filter(d=>d.user_id===me.id).slice(0,5); return <div className="pgb">
      <div className="wc"><span style={{fontSize:12,opacity:.9}}>Total balance</span><h2>₹{me.balance+me.winnings}</h2><div className="wsplit"><div>Deposit balance<b>₹{me.balance}</b></div><div>Winnings<b>₹{me.winnings}</b></div></div></div>
      <div style={{display:"flex",gap:8,margin:"12px 0"}}><button className="btn gb" onClick={()=>go("deposit",{a:""})}>+ Add Money</button><button className="btn" onClick={()=>go("withdraw",{})}>Withdraw</button></div>
      {myW.length>0&&<><p className="sh">Withdrawal requests</p>{myW.slice(0,5).map(w=><div className="lr" key={w.id}><b>₹{w.amount}<div style={{fontSize:10,color:"#777"}}>{w.upi} · {fmt(w.created_at)}</div></b>{stTxt(w.status)}</div>)}</>}
      {md.length>0&&<><p className="sh">Deposits</p>{md.map(d=><div className="lr" key={d.id}><b>₹{d.amount}<div style={{fontSize:10,color:"#777"}}>{d.gateway} · {fmt(d.created_at)}</div></b>{stTxt(d.status)}</div>)}</>}
      <p className="sh">Transactions</p>{txs.length?txs.slice(0,20).map(x=><div className="lr" key={x.id}><b>{x.note}<div style={{fontSize:10,color:"#777"}}>{fmt(x.created_at)}</div></b><span className={x.amount>0?"gn":""}>{x.amount>0?"+":""}₹{x.amount}</span></div>):<p className="empty" style={{padding:20}}>No transactions yet</p>}</div> }
    const r=[...lb].sort((a,b)=>b.total_won-a.total_won), P=x=>x?(<div><Avatar name={x.name} s={64}/><b>{x.name}</b><div className="gn">₹{kf(x.total_won)}</div></div>):<div/>;
    if(!r.length) return <p className="empty">No winners yet. Be the first!</p>;
    return <><div className="pod">{P(r[1])}<div style={{marginTop:-14}}>{P(r[0])}</div>{P(r[2])}</div>
      <div className="lr" style={{fontWeight:600}}><b>Name</b>Rank</div>
      {r.slice(3).map((x,i)=><div key={x.id} className={"lr"+(x.id===me.id?" me":"")}><Avatar name={x.name} s={34}/><b>{x.name}<div className="gn">₹{kf(x.total_won)}</div></b>{i+4}</div>)}</>;
  };

  const stTxt = s => <span style={{color:s==="approved"?"#16a34a":s==="pending"?"#d97706":"#dc2626",fontWeight:600,textTransform:"capitalize"}}>{s}</span>;
  const sub = () => {
    const back={account:"profile",private:"profile",tx:"profile",support:"profile",results:"profile",notifs:"profile",match:null,deposit:null,withdraw:null}[page]??null;
    let t="",h=null;

    if(page==="match"){
      const m=M.find(x=>x.id===+f.mid), r=m?rooms[m.id]:null, ru=m?rules[m.mode]?.rules:"";
      const already=joined.includes(m?.id);
      const left=m?Math.max(0,(m.slots||0)-(m.filled||0)):0;
      const canEdit=m?.status==="upcoming", isDuoM=(m?.mode||"").toUpperCase().includes("DUO");
      t=m?.title||"Match";
      if(!m) h=<p className="empty">Match not found.</p>;
      else h=<div className="matchDetail">
        {m.thumbnail_url?<img className="detailThumb" src={m.thumbnail_url} alt=""/>:<div className="detailFallback"><Logo s={58}/></div>}
        <div className="detailMeta"><span>#{m.id}</span><span>{m.mode}</span><span>{m.map}</span><span>{left} slots left</span></div>
        <div className="detailGrid"><div><small>Prize Pool</small><b>₹{m.prize}</b></div><div><small>Entry</small><b>₹{m.fee}</b></div><div><small>Start</small><b>{fmt(m.starts_at)}</b></div><div><small>Status</small><b>{m.status}</b></div></div>
        <section className="detailSection"><h4>📜 Rules</h4><div className="rulesBox">{ru||"Rules have not been added yet."}</div></section>
        <section className="detailSection"><h4>👥 Joined players ({players.length}/{m.slots})</h4>{players.length?<ol className="plist">{players.map((p,i)=><li key={i}>{p.game_name}</li>)}</ol>:<p className="hint">No one has joined yet. Be the first!</p>}</section>
        {already&&r?.room_id&&<section className="detailSection roomBox"><h4>🎮 Room details</h4>
          <div className="copyRow"><span>Room ID<b>{r.room_id}</b></span><button className="sm" onClick={()=>copyText(r.room_id)}>Copy</button></div>
          <div className="copyRow"><span>Password<b>{r.room_pass}</b></span><button className="sm" onClick={()=>copyText(r.room_pass)}>Copy</button></div>
        </section>}
        {already&&m.status==="upcoming"&&<div className="joinedNote">✓ Already joined — you have a slot. You can book another slot while space is available.</div>}
        {already&&<section className="detailSection"><h4>🎟️ Your slots ({mySlots.length})</h4>
          {mySlots.map((s,i)=><div className="slotRow" key={s.slot_id}><i>{i+1}</i><input disabled={!canEdit} value={f["sn_"+s.slot_id]??s.game_name??""} onChange={e=>setF({...f,["sn_"+s.slot_id]:e.target.value})} placeholder="Game name for this slot"/></div>)}
          {canEdit&&mySlots.length>0&&<button className="btn" style={{background:"#111"}} onClick={saveSlotNames}>Save game names</button>}
          <p className="hint">Every slot has its own game name. You can edit names until the match becomes ongoing.</p></section>}
        {canEdit&&left>0&&<section className="detailSection"><h4>➕ {already?"Book another slot":"Join this match"}</h4>
          <button className="btn gb" onClick={()=>askJoin(m,1)}>{already?"Book another slot":"Join match"} · ₹{m.fee}</button>
          {left>1&&isDuoM&&<button className="btn" style={{marginTop:8,background:"#111"}} onClick={()=>askJoin(m,2)}>Book 2 slots (2 game names) · ₹{(+m.fee||0)*2}</button>}
          <p className="hint">You can book as many slots as you want, each with a different game name.</p></section>}
        {!canEdit&&<div className="joinedNote">This match is {m.status}. New slots cannot be booked now.</div>}
      </div>;
      return <><div className="pgh"><span style={{cursor:"pointer",fontSize:20}} onClick={()=>go(back)}>←</span>{t}</div><div className="pgb">{h}</div></>;
    }

    if(page==="deposit"){
      t="Add Money";
      const a=+f.a||0, act=gwActive(), gg=act.includes(gw)?gw:act[0], man=S.manual||{}, upi=man.upi_id||UPI_ID, upiName=man.upi_name||UPI_NAME, mine=deps.filter(d=>d.user_id===me.id).slice(0,8);
      h=<>{inp("a","Amount ₹ (min 10)","number")}<div style={{display:"flex",gap:6,marginBottom:12}}>{[50,100,200,500].map(x=><button key={x} className="sm" style={{flex:1}} onClick={()=>setF({...f,a:String(x)})}>₹{x}</button>)}</div>
        {!act.length&&<p className="empty">Deposits are temporarily unavailable.</p>}{act.length>1&&<Tabs list={act} cur={gg} set={setGw} flex/>}
        {gg==="manual"&&<div style={{marginTop:10}}>
          {man.qr_url&&<div style={{textAlign:"center"}}><img src={man.qr_url} alt="Pay QR" style={{width:230,maxWidth:"80%",borderRadius:8,border:"1px solid #eee"}}/><p style={{fontSize:11,color:"#777"}}>Scan with any UPI app and pay ₹{a||"…"}</p></div>}
          <p style={{fontSize:12,color:"#555",margin:"8px 0",whiteSpace:"pre-wrap"}}>{upi&&<>UPI ID: <b style={{userSelect:"all"}}>{upi}</b> ({upiName})<br/></>}{man.note||"Pay the exact amount, then enter the UTR / transaction ID or upload the payment screenshot. Balance is added after admin verifies."}</p>
          {a>=10&&upi&&<a className="btn" style={{display:"block",textAlign:"center",textDecoration:"none",background:"#111",marginBottom:10}} href={`upi://pay?pa=${upi}&pn=${encodeURIComponent(upiName)}&am=${a}&cu=INR&tn=ClashX7`}>Open UPI app & pay ₹{a}</a>}
          {inp("u","UTR / Transaction ID (optional if screenshot)")}<label>Payment screenshot (optional if UTR)</label><input type="file" accept="image/*" onChange={e=>setF({...f,pf:e.target.files[0]})}/>
          <button className="btn" disabled={busy} onClick={manualDep}>{busy?"Uploading…":"Submit for verification"}</button></div>}
        {gg==="zapupi"&&<div style={{marginTop:10}}><p style={{fontSize:12,color:"#555",marginBottom:8}}>Pay with any UPI app (GPay, PhonePe, Paytm…). Balance is added automatically after payment.</p><button className="btn gb" disabled={busy} onClick={()=>gwDep("zapupi")}>{busy?"Please wait…":`Pay ₹${a||""} with UPI`}</button></div>}
        {gg==="razorpay"&&<div style={{marginTop:10}}><p style={{fontSize:12,color:"#555",marginBottom:8}}>UPI, cards, netbanking & wallets. Balance is added automatically.</p><button className="btn gb" disabled={busy} onClick={()=>gwDep("razorpay")}>{busy?"Please wait…":`Pay ₹${a||""} with Razorpay`}</button></div>}
        {gg==="cashfree"&&<div style={{marginTop:10}}><p style={{fontSize:12,color:"#555",marginBottom:8}}>UPI, cards & netbanking. Balance is added automatically.</p><button className="btn gb" disabled={busy} onClick={()=>gwDep("cashfree")}>{busy?"Please wait…":`Pay ₹${a||""} with Cashfree`}</button></div>}
        {mine.length>0&&<><p style={{margin:"18px 0 4px",fontWeight:600}}>Recent deposits</p>{mine.map(d=><div className="lr" key={d.id}><b>₹{d.amount}<div style={{fontSize:10,color:"#777"}}>{d.gateway} · {fmt(d.created_at)}</div></b>{stTxt(d.status)}</div>)}</>}</>
    }

    if(page==="notifs"){t="Notifications";localStorage.setItem("x7seen",Date.now());
      h=<>{pushOK()&&!pushOn&&<button className="btn" style={{marginBottom:12}} onClick={enablePush}>🔔 Turn on phone notifications</button>}{pushOn&&<p style={{fontSize:11,color:"#16a34a",marginBottom:8}}>✅ Phone notifications are on</p>}
        {notifs.length?notifs.map(n=><div className="mi" key={n.id} style={{cursor:"default",display:"block"}}><b>{n.title}</b><div style={{fontSize:12,color:"#444",marginTop:2}}>{n.body}</div><div style={{fontSize:10,color:"#999",marginTop:4}}>{fmt(n.created_at)}</div></div>):<p className="empty">No notifications yet.</p>}</>}

    if(page==="profile"){
      t="Profile";
      const links=S.support_links||{};
      h=<><div style={{textAlign:"center",margin:"10px 10px 18px"}}><Avatar name={me.name} s={96}/><h3 style={{marginTop:8}}>{me.name}</h3><p style={{fontSize:11,color:"#666"}}>{me.email}</p>{isStaff&&<p className="roleBadge">{isAdmin?"Admin":isActingAdmin?"Acting Admin":"Moderator"}</p>}{me.game_name&&<p className="gameSaved">🎮 {me.game_name}</p>}</div>
      {[["Account Settings","account"],["Notifications","notifs"],["Join Private Tournament","private"],["Results","results"],["Customer Support","support"]].map(([n,x])=><div className="mi" key={x} onClick={()=>go(x,x==="account"?{n:me.name,gn:me.game_name||"",g:me.game_id,ph:me.phone||""}:{})}>{n}<span>›</span></div>)}
      {(links.whatsapp||links.telegram)&&<div className="socialLinks">{links.telegram&&<a href={links.telegram} target="_blank" rel="noreferrer">Telegram Support</a>}{links.whatsapp&&<a href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp Community</a>}</div>}
      {isStaff&&<a className="mi" href="#admin" style={{color:"var(--r)",textDecoration:"none",fontWeight:700}}>{isAdmin?"👑 Admin Panel":isActingAdmin?"🛡️ Acting Admin Panel":"🧰 Moderator Panel"}<span>›</span></a>}
      <button className="btn" style={{background:"#fef2f2",color:"var(--r)",marginTop:20}} onClick={logout}>Logout</button></>
    }
    if(page==="account"){t="Account";h=<>{inp("n","Name")}{inp("gn","Game Name")}{inp("g","Game ID")}{inp("ph","Mobile number","tel")}<button className="btn" onClick={saveAcc}>Save</button></>}
    if(page==="private"){t="Private Tournament";h=<>{inp("c","Enter room code")}<button className="btn" onClick={async()=>{if(await rpc("join_by_code",{p_code:f.c||""}))setPage(null)}}>Join</button></>}
    if(page==="withdraw"){t="Withdrawal";const wd=S.withdraw||{}, mn=+(wd.min??0), mx=+(wd.max||0);
      h=<><div className="kv">Winning Balance<b className="gn">₹{me.winnings}</b></div>
        <div className="hint" style={{marginBottom:10}}>Minimum withdrawal: <b>₹{mn}</b>{mx?` · Maximum per request: ₹${mx}`:""}{wd.note?<><br/>{wd.note}</>:null}</div>
        {wd.enabled===false&&<div className="hint" style={{background:"#fef2f2",color:"#b91c1c",marginBottom:10}}>Withdrawals are temporarily closed.</div>}
        {inp("a","Enter amount to withdraw","number")}{inp("u","Enter UPI Id")}<button className="btn gb" disabled={wd.enabled===false} onClick={withdraw}>Withdraw</button></>}
    if(page==="tx"){t="Transactions";h=txs.length?txs.map(x=><div className="lr" key={x.id}><b>{x.note}<div style={{fontSize:10,color:"#777"}}>{new Date(x.created_at).toLocaleString()}</div></b><span className={x.amount>0?"gn":""}>{x.amount>0?"+":""}₹{x.amount}</span></div>):<p className="empty"><b>No Transactions Yet</b><br/>Your history appears here once you start playing.</p>}
    if(page==="results"){t="Results";const ps=M.filter(m=>m.status==="played");h=ps.length?ps.map(m=><div className="mi" key={m.id} onClick={()=>go("match",{mid:m.id,game_name:me.game_name||""})}><span>{m.title}<div className="gn">Winner: {m.winner_name||"-"}</div></span><b style={{color:"var(--r)"}}>₹{m.prize}</b></div>):<p className="empty">No results announced yet.</p>}
    if(page==="support"){t="Customer Support";const links=S.support_links||{};h=<div className="supportGrid">{links.telegram?<a className="supportBtn tg" href={links.telegram} target="_blank" rel="noreferrer">✈ Telegram Support</a>:null}{links.whatsapp?<a className="supportBtn wa" href={links.whatsapp} target="_blank" rel="noreferrer">💬 WhatsApp Community</a>:null}{!links.telegram&&!links.whatsapp?<p className="empty">Support links are not set yet.</p>:null}</div>}

    const actualBack=page==="match"?null:back;
    return <><div className="pgh"><span style={{cursor:"pointer",fontSize:20}} onClick={()=>actualBack!==null?go(actualBack):setPage(null)}>←</span>{t}</div><div className="pgb">{h}</div></>
  };

  const admin = () => {
    let b=null;
    const TABS = isAdmin
      ? ["Dashboard","Matches","Rules","Notify","Deposits","Deposit Settings","Support Links","Withdrawals","Withdraw Settings","Users","Staff"]
      : isActingAdmin
        ? ["Matches","Rules","Notify","Users"]
        : ["Matches","Rules","Notify"];
    const cur = TABS.includes(at)?at:TABS[0];

    if(cur==="Dashboard"){
      const x=stats;
      if(!x) b=<div className="emptyAdmin">No dashboard data available yet.</div>;
      else if(x.error) b=<div className="emptyAdmin">Stats unavailable: {x.error}<br/>Run the latest schema patch in Supabase.</div>;
      else {
        const C=(l,v,sub,goTab)=><div className="stat" key={l} style={goTab?{cursor:"pointer"}:null} onClick={goTab?()=>setAt(goTab):undefined}>{l}<h2>{v}</h2>{sub&&<small>{sub}</small>}</div>, dl=x.daily||[], mx=Math.max(1,...dl.flatMap(d=>[Math.abs(d.dep),Math.abs(d.inc)]));
        b=<>
          <p className="sh">💰 Deposits</p><div className="dg">{C("Total deposited",R(x.dep.total),`${x.dep.count} deposits`)}{C("Today",R(x.dep.today))}{C("Last 7 days",R(x.dep.week))}{C("Last 30 days",R(x.dep.month))}{C("Pending",R(x.dep.pending_amt),`${x.dep.pending_cnt} waiting`,"Deposits")}</div>
          <p className="sh">📈 Income</p><div className="dg">{C("Today",R(x.inc.today))}{C("Last 7 days",R(x.inc.week))}{C("Last 30 days",R(x.inc.month))}{C("Total income",R(x.inc.total))}{C("Entry fees collected",R(x.inc.fees))}{C("Prizes paid",R(x.inc.prizes))}</div>
          <small style={{color:"#777"}}>Income = entry fees − prize pool of finished matches.</small>
          <p className="sh">Last 7 days</p><div className="chart">{dl.map(d=><div className="cb" key={d.d}><div className="bars"><i title={"Deposit "+R(d.dep)} style={{height:`${Math.abs(d.dep)/mx*100}%`,background:"#2563eb"}}/><i title={"Income "+R(d.inc)} style={{height:`${Math.abs(d.inc)/mx*100}%`,background:d.inc<0?"#dc2626":"#16a34a"}}/></div><small>{d.d.slice(5)}</small></div>)}</div>
          <small style={{color:"#777"}}>■ Deposits &nbsp; ■ Income</small>
          <p className="sh">👥 Users</p><div className="dg">{C("Total users",x.users.total)}{C("New today",x.users.today)}{C("New (7 days)",x.users.week)}{C("Banned",x.users.banned)}</div>
          <p className="sh">🎮 Matches</p><div className="dg">{C("Total matches",x.matches.total)}{C("Upcoming",x.matches.upcoming)}{C("Live now",x.matches.live)}{C("Played",x.matches.played,`${x.matches.played_today} today`)}{C("Total joins",x.matches.joins)}</div>
          <p className="sh">💼 Wallets & withdrawals</p><div className="dg">{C("Users' deposit balance",R(x.wallet.balance),"held by app")}{C("Users' winnings",R(x.wallet.winnings),"held by app")}{C("Withdraw pending",R(x.wd.pending_amt),`${x.wd.pending_cnt} requests`,"Withdrawals")}{C("Total withdrawn",R(x.wd.paid_total))}{C("Withdrawn (7 days)",R(x.wd.paid_week))}</div>
        </>
      }
    }

    if(cur==="Matches"){
      const q=(f.ms||"").trim().toLowerCase();
      const list=[...M].filter(m=>!q||String(m.id).includes(q)||String(m.code||"").toLowerCase().includes(q)||String(m.title||"").toLowerCase().includes(q)).reverse();
      const single= !f.bulkMode;
      b=<div className="matchAdmin">
        <div className="adminModeRow"><button className={"modeBtn"+(single?" active":"")} onClick={()=>setF(x=>({...x,bulkMode:false}))}>Single Create</button><button className={"modeBtn"+(!single?" active":"")} onClick={()=>setF(x=>({...x,bulkMode:true}))}>Bulk Create</button></div>
        {single
          ? <div className="createPanel">
              <div className="createHead"><h3>Create Match</h3><span>Public / Private · Thumbnail · Room ready after create</span></div>
              <div className="fg createGrid">
                {inp("t","Match title")}
                <div><label>Mode</label><select value={f.g||T[0]} onChange={e=>setF({...f,g:e.target.value})}>{T.map(t=><option key={t}>{t}</option>)}</select></div>
                {inp("m","Map")}
                {inp("s","Slots","number")}
                {inp("p","Prize ₹","number")}
                {inp("fee","Entry fee ₹","number")}
                {inp("d","Start time","datetime-local")}
                <div><label>Type</label><select value={f.v||"0"} onChange={e=>setF({...f,v:e.target.value})}><option value="0">Public</option><option value="1">Private</option></select></div>
                <div><label>Notify</label><select value={f.nf||"1"} onChange={e=>setF({...f,nf:e.target.value})}><option value="1">Yes</option><option value="0">No</option></select></div>
              </div>
              <label>Thumbnail URL (optional)</label><input value={f.th||""} onChange={e=>setF({...f,th:e.target.value})} placeholder="https://.../thumbnail.jpg"/>
              <label>Or upload thumbnail</label><input type="file" accept="image/*" disabled={busy} onChange={e=>uploadMatchThumb(e.target.files[0])}/>
              {f.th&&<img className="adminThumbPreview" src={f.th} alt="thumbnail preview"/>}
              <button className="btn" onClick={addMatch}>Create match</button>
            </div>
          : <div className="createPanel bulkPanel">
              <div className="createHead"><div><h3>Bulk Create</h3><p className="fieldHint">Set everything once. ClashX7 will create a full schedule automatically.</p></div><span className="bulkCountBadge">{Math.max(1,+f.bulkCount||1)} matches</span></div>
              <div className="fg bulkGrid createGrid">
                {inp("bulkTitle","Match title / prefix")}
                <div><label>Game mode</label><select value={f.bulkModeGame||T[0]} onChange={e=>setF({...f,bulkModeGame:e.target.value})}>{T.map(t=><option key={t}>{t}</option>)}</select></div>
                {inp("bulkMap","Map")}
                {inp("bulkCount","Number of matches","number")}
                <div className="field">
                  <label>Gap between matches</label>
                  <input type="time" step="60" value={f.bulkGap||"00:10"} onChange={e=>setF({...f,bulkGap:e.target.value})}/>
                  <small className="fieldHint">Example: 00:10 = 10 minutes · 01:00 = 1 hour</small>
                </div>
                {inp("bulkSlots","Slots per match","number")}
                {inp("bulkFee","Entry fee ₹","number")}
                {inp("bulkPrize","Prize pool ₹","number")}
                {inp("bulkStart","First match start","datetime-local")}
                <div><label>Initial status</label><select value={f.bulkStatus||"upcoming"} onChange={e=>setF({...f,bulkStatus:e.target.value})}><option value="upcoming">Upcoming</option><option value="live">Live now</option></select></div>
                <div><label>Match type</label><select value={f.bulkPrivate||"0"} onChange={e=>setF({...f,bulkPrivate:e.target.value})}><option value="0">Public</option><option value="1">Private</option></select></div>
                <div><label>Number titles</label><select value={f.bulkNumber||"1"} onChange={e=>setF({...f,bulkNumber:e.target.value})}><option value="1">Yes · #1, #2, #3…</option><option value="0">No · same title</option></select></div>
              </div>
              <label>Same thumbnail for all matches (optional)</label>
              <input value={f.th||""} onChange={e=>setF({...f,th:e.target.value})} placeholder="https://.../thumbnail.jpg"/>
              <label>Or upload thumbnail once</label>
              <input type="file" accept="image/*" disabled={busy} onChange={e=>uploadMatchThumb(e.target.files[0])}/>
              {f.th&&<img className="adminThumbPreview" src={f.th} alt="thumbnail preview"/>}
              <div className="bulkPreview">
                <div className="bulkPreviewHead"><b>Schedule preview</b><span>{parseGapMinutes(f.bulkGap||"00:10")} min gap</span></div>
                {bulkRows().slice(0,8).map((r,i)=><div className="bulkPreviewRow" key={i}><span><b>{r.title}</b><small>{fmt(r.starts_at)} · {r.mode} · {r.slots} slots</small></span><strong>₹{r.fee}</strong></div>)}
                {bulkRows().length>8&&<small className="fieldHint">+ {bulkRows().length-8} more matches will be created.</small>}
                {!bulkRows().length&&<small className="fieldHint">Enter the title and first start time to preview the schedule.</small>}
              </div>
              <label>Send one notification after bulk create</label><select value={f.bulkNotify||"1"} onChange={e=>setF({...f,bulkNotify:e.target.value})}><option value="1">Yes</option><option value="0">No</option></select>
              <button className="btn" disabled={busy||!bulkRows().length} onClick={bulkCreate}>{busy?"Creating…":`Create ${Math.max(1,+f.bulkCount||1)} matches`}</button>
            </div>}
        <div className="adminSearch"><input value={f.ms||""} onChange={e=>setF({...f,ms:e.target.value})} placeholder="Search match code / #ID / title"/></div>
        <div className="acards">{list.map(m=><div className="ucard" key={m.id}>
          <div className="uhead"><b>#{m.id} · {m.title}</b><span className={"pill "+m.status}>{m.status}</span></div>
          <div className="ugrid"><span>Mode<b>{m.mode}</b></span><span>Slots<b>{m.filled||0}/{m.slots}</b></span><span>Prize / Entry<b>₹{m.prize} / ₹{m.fee}</b></span><span>Start<b>{fmt(m.starts_at)}</b></span><span>Room ID / Pass<b>{rooms[m.id]?.room_id?`${rooms[m.id].room_id} / ${rooms[m.id].room_pass}`:"not set"}</b></span>{m.is_private&&<span>Private code<b>🔒 {m.code}</b></span>}</div>
          <div className="uact"><button className="sm" onClick={()=>room(m)}>ID / Pass</button><button className="sm" onClick={()=>setThumbForMatch(m)}>Thumbnail</button>{m.status==="upcoming"&&<button className="sm" onClick={()=>setSt(m,"live")}>Live</button>}{m.status==="live"&&<button className="sm" onClick={()=>setSt(m,"played")}>Done</button>}{isAdmin&&m.status==="played"&&<button className="sm" onClick={()=>pay(m)}>Pay</button>}{isAdmin&&<button className="sm" onClick={()=>window.confirm("Delete match?")&&run(supabase.from("matches").delete().eq("id",m.id),"Deleted")}>Del</button>}</div></div>)}{!list.length&&<p className="empty">No matches found</p>}</div>
      </div>;
    }

    if(cur==="Rules"){const rm=f.rm||T[0], txt=f.rt ?? rules[rm]?.rules ?? "";
      b=<><p style={{fontSize:12,color:"#555",marginBottom:8}}>Rules are shown only after the player opens a match.</p>
        <label>Mode</label><select value={rm} onChange={e=>setF({rm:e.target.value})}>{T.map(t=><option key={t}>{t}</option>)}</select>
        <label>Rules for {rm}</label><textarea rows={12} value={txt} placeholder={"1. No hacking / teaming\n2. Join room 5 min before start\n3. ..."} onChange={e=>setF({...f,rm,rt:e.target.value})}/>
        <button className="btn" onClick={()=>saveRules([rm],txt)}>Save for {rm}</button>
        <button className="btn" style={{background:"#111",marginTop:8}} onClick={()=>window.confirm("Replace rules of ALL modes with this text?")&&saveRules(T,txt)}>Apply this to ALL modes</button></>}

    if(cur==="Notify") b=<><p style={{fontSize:12,color:"#555",marginBottom:8}}>Push notification + in-app notification for players who enabled notifications.</p>{inp("nt","Title")}<label>Message</label><textarea rows={4} value={f.nb??""} onChange={e=>setF({...f,nb:e.target.value})}/>{inp("ne","Only this user's email (leave blank = everyone)","email")}
      <button className="btn" disabled={busy} onClick={async()=>{if(!f.nt) return say("Title required",1); setBusy(true); if(await notify({title:f.nt,body:f.nb,email:f.ne})) setF({}); setBusy(false)}}>Send notification</button></>;

    if(cur==="Deposits"){const L=deps.filter(d=>f.dp==="all"?true:d.status==="pending"); b=<><div style={{margin:"0 0 8px"}}><button className="sm" onClick={()=>setF({dp:"pending"})}>Pending</button><button className="sm" onClick={()=>setF({dp:"all"})}>All</button></div>
      {L.length?<div className="acards">{L.map(d=><div className="ucard" key={d.id}><div className="uhead"><b>{allU.find(x=>x.id===d.user_id)?.name||"User"}</b>{stTxt(d.status)}</div>
        <div className="ugrid"><span>Amount<b>₹{d.amount}</b></span><span>Via<b>{d.gateway}</b></span><span>UTR<b>{d.utr||"-"}</b></span><span>Date<b>{fmt(d.created_at)}</b></span></div>
        {(d.proof_path||d.status==="pending")&&<div className="uact">{d.proof_path&&<button className="sm" onClick={()=>viewProof(d.proof_path)}>View proof</button>}{d.status==="pending"&&<><button className="sm ok" onClick={()=>rpc("admin_review_deposit",{p_id:d.id,p_ok:true},"Deposit approved, balance added")}>Approve</button><button className="sm no" onClick={()=>rpc("admin_review_deposit",{p_id:d.id,p_ok:false},"Deposit rejected")}>Reject</button></>}</div>}</div>)}</div>:<p className="empty">No deposits</p>}</>}

    if(cur==="Deposit Settings"){ const m=S.manual||{}, fv=(k,d="")=>f[k]??d, fl=(k,l,d,t="text")=>(<><label>{l}</label><input type={t} value={fv(k,d)} onChange={e=>setF({...f,[k]:e.target.value})}/></>),
        GW=[["zapupi","ZapUPI",["zap_key"],{zap_key:"ZapUPI Key"}],["razorpay","Razorpay",["key_id","key_secret","webhook_secret"],{key_id:"Key ID",key_secret:"Key Secret",webhook_secret:"Webhook Secret"}],["cashfree","Cashfree",["app_id","secret","env"],{app_id:"App ID",secret:"Secret Key",env:"Mode"}]];
      b=<>
      <div className="pnl"><h4>📲 Manual payment (your QR / UPI)</h4><p style={{fontSize:11,color:"#777",margin:"4px 0 8px"}}>Players scan your QR, pay, then send the UTR and/or a screenshot.</p>
        <label>Status</label><select value={fv("me_en",m.enabled===false?"0":"1")} onChange={e=>setF({...f,me_en:e.target.value})}><option value="1">Enabled</option><option value="0">Disabled</option></select>
        {fl("upi_id","Your UPI ID",m.upi_id)}{fl("upi_name","Payee name",m.upi_name)}
        <label>Payment QR</label>{(f.qr??m.qr_url)&&<img src={f.qr??m.qr_url} alt="QR" style={{width:180,display:"block",margin:"6px 0",borderRadius:8,border:"1px solid #eee"}}/>}<input type="file" accept="image/*" disabled={busy} onChange={e=>uploadQr(e.target.files[0])}/>
        <label>Instructions shown to players</label><textarea rows={3} value={fv("note",m.note||"")} onChange={e=>setF({...f,note:e.target.value})}/>
        {fl("min","Minimum deposit ₹",m.min||10,"number")}{fl("max","Maximum deposit ₹ (0 = no limit)",m.max||0,"number")}
        <button className="btn" onClick={saveManual}>Save manual payment</button></div>
      {GW.map(([n,label,keys,names])=><div className="pnl" key={n}><h4>{label} <span style={{fontSize:11,fontWeight:600,color:gwOk[n]?"#16a34a":"#d97706"}}>{gwOk[n]?"✔ keys saved":"⚠ keys not set"}</span></h4>
        <label>Status</label><select value={fv("ge_"+n,S["gw_"+n]?.enabled===true?"1":"0")} onChange={e=>setF({...f,["ge_"+n]:e.target.value})}><option value="1">Enabled</option><option value="0">Disabled</option></select>
        {keys.map(k=>k==="env"?<div key={k}><label>{names[k]}</label><select value={fv("gs_"+n+"_"+k,"")} onChange={e=>setF({...f,["gs_"+n+"_"+k]:e.target.value})}><option value="">Keep current</option><option>sandbox</option><option>production</option></select></div>
          :<div key={k}><label>{names[k]}</label><input type="password" autoComplete="off" placeholder={gwOk[n]?"•••••• (leave blank to keep)":"Paste here"} value={fv("gs_"+n+"_"+k,"")} onChange={e=>setF({...f,["gs_"+n+"_"+k]:e.target.value})}/></div>)}
        <p style={{fontSize:11,color:"#777",margin:"6px 0"}}>Webhook URL: <b style={{userSelect:"all"}}>{window.location.origin}/api/webhook?g={n}</b></p>
        <button className="btn" onClick={()=>saveGw(n,keys)}>Save {label}</button></div>)}</>}

    if(cur==="Support Links"){
      const links=S.support_links||{};
      b=<div className="pnl"><h3>🔗 Customer service & community</h3><p style={{fontSize:12,color:"#666",margin:"4px 0 12px"}}>These links appear in the user profile/support section.</p>
        <label>Telegram customer service link</label><input value={f.telegram??links.telegram??""} onChange={e=>setF({...f,telegram:e.target.value})} placeholder="https://t.me/your_support"/>
        <label>WhatsApp community link</label><input value={f.whatsapp??links.whatsapp??""} onChange={e=>setF({...f,whatsapp:e.target.value})} placeholder="https://chat.whatsapp.com/..."/>
        <button className="btn" onClick={saveLinks}>Save links</button>
      </div>
    }

    if(cur==="Staff"){
      const staffers=allU.filter(x=>x.role==="moderator"||x.role==="acting_admin");
      b=<div className="pnl">
        <h3>👥 Staff & Moderators</h3>
        <p style={{fontSize:12,color:"#666",margin:"4px 0 12px"}}>Only the main Admin can change staff roles. Acting Admin sits between Moderator and Admin.</p>
        {staffers.length ? <div className="acards">{staffers.map(x=><div className="ucard" key={x.id}><div className="uhead"><b>{x.name||"-"}</b><span className={"pill "+x.role}>{x.role==="acting_admin"?"Acting Admin":"Moderator"}</span></div><div className="ugrid"><span>Email<b>{x.email||"-"}</b></span></div><div className="uact"><select value={x.role} onChange={e=>setStaffRole(x,e.target.value)}><option value="moderator">Moderator</option><option value="acting_admin">Acting Admin</option><option value="user">Remove staff</option></select></div></div>)}</div> : <p className="empty">No moderators or acting admins yet.</p>}
        <p className="sh">Role powers</p>
        <div className="roleInfo"><div><b>Moderator</b><small>Matches, room ID/Pass, rules and notifications.</small></div><div><b>Acting Admin</b><small>Moderator powers + user search + add / deduct any user's balance. Cannot change customer-service links, access gateway settings, payouts, staff roles or delete matches.</small></div><div><b>Admin</b><small>Full control, including staff roles, finance settings, payouts and match deletion.</small></div></div>
      </div>;
    }

    if(cur==="Users"){const k=(f.q||"").toLowerCase(), L=allU.filter(x=>!k||x.name?.toLowerCase().includes(k)||x.email?.toLowerCase().includes(k)||x.phone?.includes(k)||x.username?.includes(k)); b=<>{inp("q","Search name / email / mobile")}<p className="hint">{L.length} user{L.length===1?"":"s"}{isActingAdmin?" · you can add / deduct balance":""}</p><div className="acards">{L.map(x=><div className="ucard" key={x.id}><div className="uhead"><b>{x.name||"-"}{x.banned?" 🚫":""}</b><span className={"pill "+(x.role||"user")}>{x.role==="acting_admin"?"Acting Admin":(x.role||"user")}</span></div><div className="ugrid"><span>Email<b>{x.email||"-"}</b></span><span>Mobile<b>{x.phone||"-"}</b></span><span>Game name<b>{x.game_name||"-"}</b></span><span>Deposit<b>₹{x.balance??0}</b></span><span>Winnings<b>₹{x.winnings??0}</b></span></div>{(isAdmin||isActingAdmin)&&<div className="uact"><button className="sm" onClick={()=>adjust(x)}>± Balance</button>{isAdmin&&<><button className="sm" onClick={()=>rpc("admin_set_ban",{p_user:x.id,p_ban:!x.banned})}>{x.banned?"Unban":"Ban"}</button>{x.role!=="admin"&&<select className="sm" value={x.role||"user"} onChange={e=>setStaffRole(x,e.target.value)}><option value="user">User</option><option value="moderator">Moderator</option><option value="acting_admin">Acting Admin</option></select>}</>}</div>}</div>)}{!L.length&&<p className="empty">No users found</p>}</div></>}

    if(cur==="Withdraw Settings"){ const w=S.withdraw||{}, fv=(k,d)=>f[k]??d;
      b=<div className="pnl"><h3>🏧 Withdrawal rules</h3><p style={{fontSize:12,color:"#666",margin:"4px 0 12px"}}>Players cannot request less than the minimum amount. This is enforced by the database too, not only by the app.</p>
        <label>Withdrawals</label><select value={fv("we",w.enabled===false?"0":"1")} onChange={e=>setF({...f,we:e.target.value})}><option value="1">Open</option><option value="0">Closed (pause all withdrawals)</option></select>
        <label>Minimum withdrawal ₹</label><input type="number" value={fv("wmin",w.min??50)} onChange={e=>setF({...f,wmin:e.target.value})}/>
        <label>Maximum per request ₹ (0 = no limit)</label><input type="number" value={fv("wmax",w.max??0)} onChange={e=>setF({...f,wmax:e.target.value})}/>
        <label>Note shown to players (optional)</label><textarea rows={2} value={fv("wnote",w.note||"")} onChange={e=>setF({...f,wnote:e.target.value})} placeholder="e.g. Withdrawals are paid within 24 hours"/>
        <button className="btn" onClick={saveWithdraw}>Save withdrawal rules</button></div>;
    }

    if(cur==="Withdrawals") b=W.length?<div className="acards">{W.map(w=><div className="ucard" key={w.id}><div className="uhead"><b>{allU.find(x=>x.id===w.user_id)?.name||"User"}</b>{stTxt(w.status)}</div><div className="ugrid"><span>Amount<b>₹{w.amount}</b></span><span>UPI<b>{w.upi}</b></span><span>Date<b>{fmt(w.created_at)}</b></span></div>{w.status==="pending"&&<div className="uact"><button className="sm ok" onClick={()=>rpc("admin_set_withdrawal",{p_id:w.id,p_ok:true},"Approved")}>Approve</button><button className="sm no" onClick={()=>rpc("admin_set_withdrawal",{p_id:w.id,p_ok:false},"Rejected")}>Reject</button></div>}</div>)}</div>:<p className="empty">No withdrawal requests</p>;

    return <><div className="adminHeader"><div className="brand" style={{fontSize:18}}><Logo s={36}/> ClashX7 {isAdmin?"Admin":isActingAdmin?"Acting Admin":"Moderator"}</div><div className="adminHeaderRight"><span className={"lv"+(live?" on":"")}>{live?"● Live":"○ Auto-refresh"}</span><button className="sm" onClick={()=>{load();say("Refreshed")}}>↻</button><a className="sm" href="#">Open app</a></div></div>
      <div className="adminTabs">{TABS.map(x=><button key={x} className={x===cur?"on":""} onClick={()=>{setAt(x);setF({})}}>{x==="Users"&&isActingAdmin?"User Search":x}</button>)}</div>{b}</>;
  };

  const wrap = c => (<div className="x7"><style>{css}</style><div id="app" className={hash==="#admin"?"adm":(!session&&!authOpen&&!IS_APP)?"land":""}>{c}</div>{pv&&<div className="ov" onClick={()=>setPv(null)}><img src={pv} alt="proof" style={{maxWidth:"96vw",maxHeight:"92vh",borderRadius:8}}/></div>}{howto&&<div className="ov" onClick={()=>setHowto(false)}><div className="dl" onClick={e=>e.stopPropagation()}><h3 style={{marginBottom:8}}>Install ClashX7</h3><p style={{fontSize:13,lineHeight:1.6,marginBottom:12}}><b>Android (Chrome):</b> menu ⋮ → Install app / Add to Home screen.<br/><b>iPhone (Safari):</b> Share → Add to Home Screen.<br/><br/><b>Important:</b> Installing it this way keeps the app connected to your Vercel website, so new Vercel deployments can become the live app without deleting and reinstalling it.</p><button className="btn" onClick={()=>setHowto(false)}>OK</button></div></div>}{dlg&&<Dlg d={dlg} close={()=>setDlg(null)}/>}{toast&&<div className={"toast"+(toast.err?" er":"")}>{toast.m}</div>}</div>);
  if(!supabase) return wrap(<p className="empty">Supabase is not configured. In Vercel → Settings → Environment Variables add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>, then redeploy.</p>);
  if(splash) return wrap(<Splash/>);
  if(!ready) return wrap(<Skeleton/>);
  if(!session && !authOpen && !IS_APP) return wrap(<Landing open={open} download={download} showDl={!IS_APP} support={SUPPORT_URL}/>);
  if(!session) return wrap(<div className="login"><Logo s={80}/><h2 style={{margin:"10px 0"}}>ClashX7</h2>
    {mode==="up"&&<>{inp("un","Username")}{inp("ph","Mobile number","tel")}</>}{inp("em",mode==="up"?"Email":"Email / Username / Mobile",mode==="up"?"email":"text")}{inp("pw","Password","password")}
    <button className="btn" onClick={auth}>{mode==="up"?"Create account":"Login"}</button>
    <p style={{marginTop:14,color:"var(--r)",cursor:"pointer",fontSize:13}} onClick={()=>setMode(mode==="up"?"in":"up")}>{mode==="up"?"Already have an account? Login":"New here? Create account"}</p>
    {!IS_APP&&<p style={{marginTop:10,color:"#666",cursor:"pointer",fontSize:12}} onClick={()=>setAuthOpen(false)}>← Back to home</p>}</div>);
  if(!me) return wrap(<Skeleton onRetry={load} onLogout={logout}/>);
  if(hash==="#admin") return wrap(isStaff?admin():<p className="empty">Not authorized. <a href="#">Back to app</a></p>);
  const seen = +localStorage.getItem("x7seen")||0, unread = notifs.filter(n=>+new Date(n.created_at)>seen).length;
  return wrap(page ? sub() : <>
    <div className="hdr"><span onClick={()=>go("profile")}><Avatar name={me.name} s={34}/></span><span className="brand"><Logo s={24}/>ClashX7</span>
      <span style={{display:"flex",gap:6}}><button className="ic" onClick={()=>go("notifs")}>🔔{unread>0&&<sup style={{color:"var(--r)",fontWeight:800}}> {unread}</sup>}</button><button className="ic" onClick={()=>{setPage(null);setNav("wallet")}}>₹{me.balance+me.winnings}</button></span></div>
    {body()}
    <nav>{NAV.map(([n,l,d])=><a key={n} className={nav===n?"on":""} onClick={()=>setNav(n)}><svg viewBox="0 0 24 24"><path d={d}/></svg>{l}</a>)}</nav></>);
}

const css = `
.x7{--r:#f5403a;--g:#22c55e;background:#eef0f3;min-height:100vh;color:#111;font-size:14px}
.x7,.x7 *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.x7 #app{max-width:480px;min-height:100vh;margin:auto;background:#fff;padding-bottom:74px;position:relative}
.x7 #app.adm{max-width:1180px;padding:18px;background:#fff}
.bootBlank{min-height:100vh;background:#fff}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:20}
.brand{display:flex;align-items:center;gap:6px;font-weight:800}
.avatar{border-radius:50%;display:grid;place-items:center;position:relative;color:#fff;background:radial-gradient(circle at 30% 25%,#a78bfa 0,#7c3aed 35%,#4c1d95 100%);overflow:hidden;box-shadow:0 4px 10px #4c1d9533}
.avatar b{position:relative;z-index:2;text-shadow:0 1px 2px #0005}
.avatarGlow{position:absolute;top:4%;right:7%;font-size:.55em;opacity:.85;color:#fff}
.ic{border:1px solid #ddd;border-radius:15px;background:#fff;height:30px;padding:0 10px;font-weight:600;cursor:pointer}
.tabs{display:flex;overflow-x:auto;border-bottom:1px solid #eee;scrollbar-width:none;background:#fff}
.tabs b{padding:12px;white-space:nowrap;font-size:12px;font-weight:600;color:#555;cursor:pointer;border-bottom:2px solid transparent}
.tabs b.on{color:var(--r);border-color:var(--r)}.tabs{-webkit-overflow-scrolling:touch}.tabs b{flex:0 0 auto}
.searchBox{display:flex;align-items:center;gap:8px;margin:10px 8px;padding:0 11px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa}
.searchBox span{font-size:20px;color:#777}.searchBox input{border:0!important;background:transparent!important;margin:0!important;padding:11px 2px!important}
.card{margin:8px;border:1px solid #ececec;border-radius:13px;overflow:hidden;box-shadow:0 2px 8px #0000000b;cursor:pointer;background:#fff}
.thumbWrap{height:82px;position:relative;background:#111;overflow:hidden}
.matchThumb{width:100%;height:100%;display:block;object-fit:cover}
.thumbFallback{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#7f1d1d,#111)}
.thumbShade{position:absolute;inset:0;background:linear-gradient(180deg,#0005 0,#0000 38%,#0007 100%)}
.thumbTop{position:absolute;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-weight:700}
.matchBody{padding:8px 10px 0}
.tags i{font-style:normal;font-size:9px;border:1px solid #333;border-radius:5px;padding:3px 6px;margin-right:6px;background:#fff}
.matchTitleRow{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-top:9px}
.matchTitleRow h4{font-size:14px;margin:3px 0 2px}.pz{color:var(--r);font-weight:800;font-size:13px}.matchTime{font-size:10px;color:#555;text-align:right;white-space:nowrap}
.bar{height:5px;background:#eee;margin-top:10px;border-radius:6px;overflow:hidden}.bar u{display:block;height:100%;background:var(--r);text-decoration:none}
.foot{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:10px;color:#666;padding:7px 0 9px}.joinPill{color:#fff;background:var(--r);padding:7px 10px;border-radius:8px;font-size:11px;white-space:nowrap}.quickDuo{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.quickDuo .sm{margin:0;padding:6px 8px;font-weight:700}.quickDuo2{background:#111!important;color:#fff;border-color:#111!important}
.x7 nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid #eee;display:flex;z-index:30}
.x7 nav a{flex:1;text-align:center;padding:8px 0;font-size:10px;color:#666;cursor:pointer}.x7 nav a.on{color:var(--r)}
.x7 nav svg{display:block;margin:0 auto 2px;width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pgh{display:flex;align-items:center;gap:14px;padding:14px;font-weight:700;border-bottom:1px solid #eee;background:#fff;position:sticky;top:0;z-index:18}.pgb{padding:12px}
.x7 label{display:block;font-size:11px;color:#555;font-weight:600}.x7 input,.x7 select,.x7 textarea{width:100%;padding:11px;border:1px solid #e5e7eb;border-radius:8px;margin:4px 0 10px;background:#fafafa;color:#111!important;-webkit-text-fill-color:#111!important;opacity:1!important;font-size:14px}.x7 input::placeholder,.x7 textarea::placeholder{color:#777!important;-webkit-text-fill-color:#777!important;opacity:1!important}.x7 select option{color:#111;background:#fff}.x7 input:disabled,.x7 select:disabled,.x7 textarea:disabled{color:#666!important;-webkit-text-fill-color:#666!important;opacity:1!important}
.btn{width:100%;padding:11px;border:0;border-radius:8px;background:var(--r);color:#fff;font-weight:700;cursor:pointer}.gb{background:var(--g)}
.kv{display:flex;justify-content:space-between;padding:10px 4px;font-weight:500}
.mi{display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid #eee;border-radius:10px;margin:7px 0;cursor:pointer;background:#fff}
.empty{text-align:center;color:#555;padding:60px 20px;font-size:13px}
.pod{display:flex;justify-content:space-around;align-items:flex-start;padding:24px 0 30px;text-align:center;font-size:12px}
.lr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #eee}.lr b{flex:1}.lr.me{background:#dbeafe}.gn{color:#16a34a;font-weight:600}
.login{max-width:320px;margin:80px auto;text-align:center}
.sm{padding:6px 9px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;margin:2px;font-size:12px}.sm:disabled,.btn:disabled{opacity:.6}
.ov{position:fixed;inset:0;background:#0008;display:grid;place-items:center;z-index:80;padding:16px}.dl{background:#fff;border-radius:12px;padding:16px;width:100%;max-width:400px;max-height:90vh;overflow:auto}
.toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:9px;font-size:13px;z-index:99;max-width:92vw;box-shadow:0 4px 14px #0004}.toast.er{background:#b91c1c}
.bn{margin:8px;padding:11px;background:#fef2f2;color:var(--r);border-radius:8px;font-size:12px;font-weight:700;text-align:center;cursor:pointer}
.wc{background:linear-gradient(135deg,#f5403a,#7f1d1d);color:#fff;border-radius:14px;padding:18px}.wc h2{font-size:32px;margin:2px 0 12px}.wsplit{display:flex;gap:10px}.wsplit div{flex:1;background:#fff2;border-radius:8px;padding:8px 10px;font-size:11px}.wsplit b{display:block;font-size:16px;margin-top:2px}
.sh{margin:16px 0 4px;font-weight:700}.lv{font-size:11px;color:#999}.lv.on{color:#16a34a}
.gameSaved{display:inline-block;margin-top:7px;padding:5px 9px;border-radius:99px;background:#f3f4f6;color:#444;font-size:11px}
.socialLinks{display:flex;gap:8px;margin:12px 0}.socialLinks a{flex:1;text-align:center;text-decoration:none;padding:10px;border-radius:9px;background:#111;color:#fff;font-weight:700;font-size:12px}
.supportGrid{display:grid;gap:10px}.supportBtn{display:block;text-align:center;text-decoration:none;color:#fff;padding:13px;border-radius:10px;font-weight:800}.tg{background:#229ed9}.wa{background:#16a34a}
.matchDetail{background:#fff}.detailThumb,.detailFallback{width:100%;height:160px;object-fit:cover}.detailFallback{display:grid;place-items:center;background:linear-gradient(135deg,#7f1d1d,#111)}
.detailMeta{display:flex;gap:6px;flex-wrap:wrap;padding:10px 0}.detailMeta span{padding:5px 8px;background:#f3f4f6;border-radius:99px;font-size:10px;color:#444}
.detailGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.detailGrid div{border:1px solid #eee;border-radius:10px;padding:10px}.detailGrid small{display:block;color:#777;font-size:10px}.detailGrid b{display:block;margin-top:3px;font-size:13px}
.detailSection{margin-top:14px;border:1px solid #eee;border-radius:12px;padding:12px}.detailSection h4{margin-bottom:8px}.rulesBox{white-space:pre-wrap;line-height:1.6;color:#333;font-size:13px}.roomBox{background:#fef2f2;border-color:#fee2e2}.copyRow{display:flex;align-items:center;gap:8px;margin-top:8px}.copyRow span{flex:1;background:#fff;border:1px solid #eee;border-radius:8px;padding:9px;font-size:11px}.copyRow b{display:block;margin-top:2px;font-size:13px;color:var(--r);user-select:all}.joinedNote,.hint{margin-top:8px;padding:9px;border-radius:8px;background:#f8fafc;color:#555;font-size:11px;line-height:1.5}
.adm table{width:100%;border-collapse:collapse;margin-top:12px}.x7 td,.x7 th{padding:9px;border-bottom:1px solid #eee;text-align:left;font-size:12px;vertical-align:top}.tableWrap{overflow:auto;border:1px solid #eee;border-radius:10px;background:#fff}
.field{min-width:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}.stat{background:#f9fafb;border:1px solid #eee;border-radius:10px;padding:14px}.dg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.dg .stat{background:#fff}.fg{display:grid;grid-template-columns:1fr;gap:10px}.createGrid{grid-template-columns:1fr}.bulkGrid{grid-template-columns:1fr}
.adminHeader{display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:0;background:#fff;padding:6px 0 12px;z-index:25}.adminHeaderRight{display:flex;align-items:center;gap:5px}.adminTabs{display:flex;gap:6px;overflow-x:auto;padding:0 0 12px}.adminTabs button{border:1px solid #ddd;background:#fff;padding:8px 12px;border-radius:8px;white-space:nowrap;cursor:pointer}.adminTabs button.on{background:#111;color:#fff}.adminModeRow{display:flex;gap:8px;margin:6px 0 10px;flex-wrap:wrap}.modeBtn{border:1px solid #ddd;background:#fff;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer}.modeBtn.active{background:#111;color:#fff}.createPanel{border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;background:#fff;box-shadow:0 2px 10px #00000008}.createHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;margin-bottom:12px}.createHead h3{font-size:19px;margin:0 0 3px}.createHead div{min-width:0}.createHead span{font-size:10px;color:#777}.adminThumbPreview{width:180px;height:100px;object-fit:cover;border-radius:9px;margin:4px 0 10px;display:block}.fieldHint{font-size:11px;color:#777;margin:3px 0 0}.bulkCountBadge{padding:6px 9px;border-radius:99px;background:#fef2f2;color:var(--r);font-weight:800;font-size:11px;white-space:nowrap}.bulkGrid{grid-template-columns:1fr}.bulkPreview{margin:10px 0 12px;border:1px solid #eee;border-radius:10px;background:#fafafa;overflow:hidden}.bulkPreviewHead{display:flex;justify-content:space-between;padding:10px 11px;border-bottom:1px solid #eee;font-size:11px}.bulkPreviewHead span{color:#777}.bulkPreviewRow{display:flex;justify-content:space-between;gap:10px;padding:9px 11px;border-bottom:1px solid #eee;font-size:11px;background:#fff}.bulkPreviewRow:last-of-type{border-bottom:0}.bulkPreviewRow span{min-width:0}.bulkPreviewRow b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px}.bulkPreviewRow small{display:block;color:#777;margin-top:2px}.bulkPreviewRow strong{color:var(--r);white-space:nowrap}.bulkPreview>.fieldHint{display:block;padding:9px 11px}.adminSearch{margin:10px 0}.adminSearch input{margin:0!important}.emptyAdmin{padding:40px;text-align:center;color:#666}
.chart{display:flex;gap:6px;height:130px;align-items:flex-end;margin:8px 0}.cb{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}.bars{display:flex;gap:2px;align-items:flex-end;height:100px;width:100%;justify-content:center}.bars i{width:38%;min-height:2px;border-radius:3px 3px 0 0}.cb small{font-size:9px;color:#777;margin-top:2px}
.x7 #app.land{max-width:1000px;padding-bottom:0}.lh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px}.hero{background:linear-gradient(160deg,#f5403a,#7f1d1d);color:#fff;text-align:center;padding:48px 20px 56px;display:flex;flex-direction:column;align-items:center;gap:12px}.hero h1{font-size:clamp(30px,6vw,52px);font-weight:800}.hero p{max-width:520px;opacity:.93;line-height:1.5}.cta{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px}.lb2{border:0;border-radius:8px;padding:12px 22px;font-weight:700;cursor:pointer;font-size:14px;background:#fff;color:var(--r)}.lb2.ghost{background:transparent;color:#fff;border:1.5px solid #fff}.lb2.dk{background:#111;color:#fff}.lb2.rd{background:var(--r);color:#fff}.lsec{padding:34px 18px}.lsec h2{text-align:center;margin-bottom:18px;font-size:22px}.l3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.lc{border:1px solid #eee;border-radius:10px;padding:18px;background:#fff;box-shadow:0 1px 3px #0001}.lc b{display:block;margin:8px 0 4px;font-size:16px}.lc p{color:#555;line-height:1.5;font-size:13px}.lc .em{font-size:28px;font-weight:800;color:var(--r)}.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.chips i{font-style:normal;border:1px solid #333;border-radius:20px;padding:6px 12px;font-size:12px}.lf{background:#111;color:#bbb;text-align:center;padding:24px 18px;font-size:12px;line-height:1.8}
.acards{display:grid;gap:10px;margin-top:10px}.ucard{border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;box-shadow:0 1px 3px #0001;min-width:0}
.uhead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.uhead b{font-size:14px;word-break:break-word}
.ugrid{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}.ugrid span{font-size:11px;color:#777;min-width:0}.ugrid b{display:block;font-size:13px;color:#111;margin-top:1px;word-break:break-word}
.uact{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid #f1f1f1}.uact .sm,.uact select{margin:0}
.sm.ok{background:#16a34a;color:#fff;border-color:#16a34a}.sm.no{background:#fef2f2;color:#dc2626;border-color:#fecaca}
.pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;background:#f3f4f6;color:#374151;text-transform:capitalize;white-space:nowrap}.pill.live{background:#fee2e2;color:#dc2626}.pill.upcoming,.pill.moderator{background:#dbeafe;color:#1d4ed8}.pill.played{background:#dcfce7;color:#15803d}.pill.admin{background:#fef3c7;color:#b45309}.pill.acting_admin{background:#ede9fe;color:#6d28d9}
.plist{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;padding-left:22px;font-size:13px}
.roleBadge{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700}
button.joinPill{border:0;cursor:pointer;font:inherit;font-weight:800;color:#fff;background:var(--r);padding:7px 10px;border-radius:8px}.joinPill.alt{background:#111;color:#fff}.quickDuo{display:flex;gap:6px}
@media(min-width:700px){.acards{grid-template-columns:1fr 1fr}.ugrid{grid-template-columns:repeat(3,1fr)}}
.sk{background:linear-gradient(90deg,#eceef1 25%,#f6f7f9 37%,#eceef1 63%);background-size:400% 100%;animation:x7sk 1.3s ease infinite;border-radius:8px}@keyframes x7sk{0%{background-position:100% 0}100%{background-position:0 0}}
.skc{width:34px;height:34px;border-radius:50%;display:block}.skp{width:72px;height:30px;display:block;border-radius:15px}.skt{display:block;width:62px;height:12px}.skimg{height:82px;border-radius:0}.skl{height:14px;margin:12px 0 6px}.skl.s{width:50%;height:10px}
.joinPill.joinedPill{background:#16a34a}.joinPill em{font-style:normal;background:#ffffff33;border-radius:6px;padding:1px 6px;margin-left:6px}
.splash{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;color:#fff;background:radial-gradient(circle at 50% 16%,#ff6a5c 0,#d62828 40%,#5b0f12 100%);overflow:hidden;text-align:center}
.spGlow{position:absolute;width:420px;height:420px;border-radius:50%;background:#ffffff40;filter:blur(64px);top:-140px;animation:spPulse 2s ease-in-out infinite}
.spLogo{position:relative;animation:spPop .6s cubic-bezier(.2,1.4,.4,1) both;filter:drop-shadow(0 10px 24px #0006)}
.spName{position:relative;font-size:34px;font-weight:900;letter-spacing:.5px;animation:spUp .6s .1s both}
.spTag{position:relative;opacity:.92;font-size:12px;letter-spacing:3px;text-transform:uppercase;animation:spUp .6s .2s both}
.spList{position:relative;display:grid;gap:10px;width:100%;max-width:340px;margin-top:20px;text-align:left}
.spItem{display:flex;gap:12px;align-items:center;background:#ffffff1f;border:1px solid #ffffff38;backdrop-filter:blur(6px);border-radius:14px;padding:11px 14px;opacity:0;animation:spUp .55s both}
.spItem span{font-size:24px}.spItem b{display:block;font-size:14px}.spItem small{opacity:.88;font-size:11px}
.spBar{position:relative;width:150px;height:4px;border-radius:4px;background:#ffffff40;overflow:hidden;margin-top:24px}.spBar i{display:block;height:100%;background:#fff;animation:spLoad 2s linear forwards}
.spFoot{position:relative;opacity:.75;font-size:10px;margin-top:8px}
@keyframes spUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes spPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes spLoad{from{width:0}to{width:100%}}
@keyframes spPulse{50%{opacity:.55;transform:scale(1.15)}}
.slotRow{display:flex;align-items:center;gap:8px}.slotRow i{font-style:normal;flex:0 0 26px;height:26px;border-radius:50%;background:#111;color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700}.slotRow input{margin:4px 0 8px!important}
`;
