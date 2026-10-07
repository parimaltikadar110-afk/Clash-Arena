import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ClashX7 - Supabase version. Run schema.sql THEN schema_patch.sql. Admin / moderator panel: /#admin */
const env = import.meta.env;
const SB_URL = env.VITE_SUPABASE_URL, SB_KEY = env.VITE_SUPABASE_ANON_KEY;
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, {global:{fetch:(u,o)=>fetch(u,{...o,cache:"no-store"})}}) : null; // no-store = purono cached data kokhono ashbe na
const ADMIN_EMAIL = "parimaltikadar110@gmail.com"; // UI fallback only; real protection = is_admin() in SQL
const UPI_ID = env.VITE_UPI_ID || "yourupi@bank", UPI_NAME = env.VITE_UPI_NAME || "ClashX7";
const SUPPORT_URL = env.VITE_SUPPORT_URL || "", APK_URL = env.VITE_APK_URL || ""; // WhatsApp/Telegram link, optional APK link
const GATEWAYS = (env.VITE_GATEWAYS || "zapupi,manual,razorpay,cashfree").split(",").map(s => s.trim()); // kon gateway dekhabe
const VAPID = env.VITE_VAPID_PUBLIC_KEY;
const RZP_JS = "https://checkout.razorpay.com/v1/checkout.js", CF_JS = "https://sdk.cashfree.com/js/v3/cashfree.js";
const T = ["SOLO BR","DUO BR","DUO PR KILL","SOLO PER KILL","LONE WOLF","CS CHALLENGERS","CLASH SQUAD","CS HEADSHOT","LOSS TO WIN"];
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

/* Visitor landing page (login korar age) */
function Landing({open,download,showDl,support}) {
  const F = [["🛡️","Fair Play","Strict anti-cheat rules, verified room results and transparent prize pools. Everyone plays by the same rules."],["⚡","Fast Withdrawal","Winnings land in your wallet. Request a withdrawal and get paid straight to your UPI ID."],["💬","Good Customer Support","Real people on WhatsApp / Telegram to help with deposits, matches and withdrawals."]];
  return (<div>
    <div className="lh"><span className="brand" style={{fontSize:18}}><Logo s={30}/>ClashX7</span><button className="lb2 rd" onClick={()=>open("in")}>Login</button></div>
    <section className="hero"><Logo s={96}/><h1>Play. Win. Withdraw.</h1>
      <p>Join daily custom-room tournaments, compete for real prize pools and cash out your winnings by UPI.</p>
      <div className="cta"><button className="lb2" onClick={()=>open("up")}>Create account</button><button className="lb2 ghost" onClick={()=>open("in")}>Login</button>{showDl&&<button className="lb2 dk" onClick={download}>⬇ Download App</button>}</div></section>
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
      : <input type={t} value={v[k]} onChange={e=>set(k,e.target.value)}/>}</div>)}
    <button className="btn" disabled={busy} onClick={async()=>{setBusy(true); const r = await d.ok(v); setBusy(false); if(r!==false) close()}}>{busy?"Please wait…":d.btn||"Save"}</button></div></div>);
}

export default function App() {
  const [session,setSession] = useState(null), [ready,setReady] = useState(false), [hash,setHash] = useState(window.location.hash);
  const [me,setMe] = useState(null), [M,setM] = useState([]), [rooms,setRooms] = useState({}), [joined,setJoined] = useState([]), [txs,setTxs] = useState([]), [lb,setLb] = useState([]), [allU,setAllU] = useState([]), [W,setW] = useState([]);
  const [deps,setDeps] = useState([]), [notifs,setNotifs] = useState([]), [rules,setRules] = useState({}), [dlg,setDlg] = useState(null), [toast,setToast] = useState(null), [gw,setGw] = useState(GATEWAYS[0]), [busy,setBusy] = useState(false), [pushOn,setPushOn] = useState(pushOK() && Notification.permission==="granted");
  const [live,setLive] = useState(false), [S,setS] = useState({}), [stats,setStats] = useState(null), [gwOk,setGwOk] = useState({}), [pv,setPv] = useState(null), [myW,setMyW] = useState([]), [authOpen,setAuthOpen] = useState(false), [inst,setInst] = useState(null), [howto,setHowto] = useState(false);
  const [tab,setTab] = useState(T[0]), [nav,setNav] = useState("home"), [page,setPage] = useState(null), [mt,setMt] = useState("upcoming"), [at,setAt] = useState("Dashboard"), [mode,setMode] = useState("in"), [f,setF] = useState({});
  const isAdmin = me?.role==="admin" || session?.user?.email?.toLowerCase()===ADMIN_EMAIL, isStaff = isAdmin || me?.role==="moderator";

  const say = (m,err) => { setToast({m,err}); setTimeout(()=>setToast(null),4200) };
  const ask = (title,fields,ok,init,extra={}) => setDlg({title,fields,ok,init,...extra});

  useEffect(()=>{ const h = e => {e.preventDefault();setInst(e)}; window.addEventListener("beforeinstallprompt",h); return()=>window.removeEventListener("beforeinstallprompt",h) },[]);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;
  const download = async () => { if(APK_URL) return window.open(APK_URL,"_blank"); if(inst){ inst.prompt(); await inst.userChoice; return setInst(null) } setHowto(true) };
  const open = m => { setMode(m); setF({}); setAuthOpen(true) };

  useEffect(()=>{
    const h = () => setHash(window.location.hash); window.addEventListener("hashchange",h);
    if("serviceWorker" in navigator){ // purono PWA/cache service worker thakle mere dei — eta-i "deploy korle tarpor show hoy" er boro karon
      navigator.serviceWorker.getRegistrations().then(async rs=>{ let killed=false;
        for(const r of rs){ const u=(r.active||r.waiting||r.installing)?.scriptURL||""; if(!u.endsWith("/push-sw.js")){ await r.unregister(); killed=true } }
        if(window.caches) for(const k of await caches.keys()) await caches.delete(k);
        if(killed&&!sessionStorage.getItem("x7sw")){ sessionStorage.setItem("x7sw","1"); location.reload() } });
      navigator.serviceWorker.register("/push-sw.js").catch(()=>{}) }
    if(!supabase){setReady(true);return()=>window.removeEventListener("hashchange",h)}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
    const {data:l} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>{l.subscription.unsubscribe();window.removeEventListener("hashchange",h)};
  },[]);

  const load = useCallback(async()=>{
    if(!session) return; const uid = session.user.id, q = t => supabase.from(t).select("*");
    const [p,m,j,t,l,r,n,ru,d,mw,st] = await Promise.all([q("profiles").eq("id",uid).maybeSingle(), q("matches").order("starts_at"), q("participants").eq("user_id",uid), q("transactions").order("created_at",{ascending:false}).limit(50), q("leaderboard"), q("match_rooms"),
      q("notifications").order("created_at",{ascending:false}).limit(30), q("mode_rules"), q("deposits").order("created_at",{ascending:false}).limit(150), q("withdrawals").eq("user_id",uid).order("created_at",{ascending:false}).limit(10), q("app_settings")]);
    setMe(p.data); setM(m.data||[]); setJoined((j.data||[]).map(x=>x.match_id)); setTxs(t.data||[]); setLb(l.data||[]); setRooms(Object.fromEntries((r.data||[]).map(x=>[x.match_id,x])));
    setNotifs(n.data||[]); setRules(Object.fromEntries((ru.data||[]).map(x=>[x.mode,x]))); setDeps(d.data||[]); setMyW(mw.data||[]); setS(Object.fromEntries((st.data||[]).map(x=>[x.key,x.value])));
    if(p.data?.role==="admin" || session.user.email?.toLowerCase()===ADMIN_EMAIL){const [u,w,sx,gs]=await Promise.all([q("profiles").order("created_at"),q("withdrawals").order("created_at",{ascending:false}),supabase.rpc("admin_stats"),supabase.rpc("admin_gateway_status")]);setAllU(u.data||[]);setStats(sx.error?{error:sx.error.message}:sx.data);setGwOk(gs.data||{});setW(w.data||[])}
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

  const savePush = async () => { const reg = await navigator.serviceWorker.register("/push-sw.js"); await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
    const {error} = await supabase.from("push_subscriptions").upsert({endpoint:sub.endpoint,user_id:session.user.id,sub:sub.toJSON()}); if(error) throw error };
  useEffect(()=>{ if(me&&pushOK()&&Notification.permission==="granted") savePush().then(()=>setPushOn(true)).catch(()=>{}) },[me?.id]); // already allowed hole chupchap re-register
  const enablePush = async () => { try{ if(!pushOK()) return say("This browser/phone can't receive push. On iPhone: Add to Home Screen first.",1);
    if(await Notification.requestPermission()!=="granted") return say("Notification permission was denied. Allow it from browser settings.",1);
    await savePush(); setPushOn(true); say("Phone notifications turned on ✅") }catch(e){say(e.message,1)} };

  const go = (p,init={}) => {setF(init);setPage(p)};
  const inp = (k,l,t="text") => (<><label>{l}</label><input type={t} value={f[k]??""} onChange={e=>setF({...f,[k]:e.target.value})}/></>);
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
    await supabase.auth.signOut(); setMe(null); setPage(null); setF({}) };

  // ---- player actions ----
  const join = async id => { if(await rpc("join_match",{p_match:id})) setPage(null) };
  const saveAcc = () => run(supabase.from("profiles").update({name:f.n||me.name,game_id:f.g||"",phone:(f.ph||"").replace(/\D/g,"").slice(-10)||null}).eq("id",me.id),"Saved").then(()=>go("profile"));
  const withdraw = async () => { if(await rpc("request_withdrawal",{p_amt:+f.a,p_upi:f.u||""})){say("Withdrawal request sent");go(null)} };
  const gwActive = () => { const key = g => g==="manual"?"manual":"gw_"+g, ALL=["zapupi","manual","razorpay","cashfree"];
    const cfg = ALL.some(g=>S[key(g)]); return ALL.filter(g => cfg ? S[key(g)]?.enabled===true : GATEWAYS.includes(g)) }; // admin panel e set korle sheta, na hole env list
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
  const saveManual = () => { const m=S.manual||{}, v=(k,d="")=>f[k]??m[k]??d;
    return run(supabase.from("app_settings").upsert({key:"manual",value:{enabled:v("me_en",m.enabled===false?"0":"1")==="1",upi_id:v("upi_id").trim(),upi_name:v("upi_name").trim(),qr_url:f.qr??m.qr_url??"",note:v("note"),min:+v("min",10)||10,max:+v("max",0)||0},updated_at:new Date().toISOString()}),"Manual payment settings saved") };
  const saveGw = async (n,keys) => { const sec={}; keys.forEach(k=>{const v=(f[`gs_${n}_${k}`]||"").trim(); if(v) sec[k]=v}); const en=(f[`ge_${n}`]??(S["gw_"+n]?.enabled===true?"1":"0"))==="1";
    if(await rpc("admin_save_gateway",{p_name:n,p_enabled:en,p_secrets:sec},`${n} ${en?"enabled":"disabled"} & saved`)) setF(x=>Object.fromEntries(Object.entries(x).filter(([k])=>!k.startsWith("gs_"+n)))) };

  const gwDep = async g => { const a=+f.a; if(!(a>=10)) return say("Minimum deposit is ₹10",1); setBusy(true);
    try{ const d = await api("deposit",{gateway:g,amount:a,phone:f.ph});
      const done = () => { say("Payment received. Wallet updates in a few seconds…"); [2500,6000,12000].forEach(ms=>setTimeout(load,ms)) };
      if(g==="zapupi"){ window.location.href = d.url; return }
      if(g==="razorpay"){ await loadScript(RZP_JS,()=>window.Razorpay); new window.Razorpay({key:d.key,order_id:d.order_id,amount:d.amount,currency:"INR",name:"ClashX7",prefill:{email:me.email,name:me.name},theme:{color:"#f5403a"},handler:done}).open() }
      else { await loadScript(CF_JS,()=>window.Cashfree); await window.Cashfree({mode:d.mode}).checkout({paymentSessionId:d.session,redirectTarget:"_modal"}); done() }
    }catch(e){say(e.message,1)} setBusy(false) };

  // ---- admin / moderator actions ----
  const notify = async (body) => { try{ const r = await api("notify",body); say(`Notification sent · ${r.sent} phone(s) reached`); return true }catch(e){ say("Notification failed: "+e.message,1); return false } };
  const addMatch = async () => { if(!f.t||!f.d) return say("Title and time are required",1); const pv=f.v==="1";
    const row={title:f.t,mode:f.g||T[0],map:f.m||"BERMUDA",slots:+f.s||32,prize:+f.p||0,fee:+f.fee||0,starts_at:new Date(f.d).toISOString(),status:"upcoming",is_private:pv,code:pv?"X7"+Math.random().toString(36).slice(2,6).toUpperCase():null};
    const {data:nm,error}=await supabase.from("matches").insert(row).select().single(); if(error) return say(error.message,1);
    if(nm) setM(a=>[...a.filter(x=>x.id!==nm.id),nm]); // admin list e sathe sathe dekhao
    say("Match created — players can see it now ✅");
    if(f.nf!=="0"&&!pv) notify({title:"🔥 New match: "+row.title,body:`${row.mode} · Prize ₹${row.prize} · Entry ₹${row.fee} · ${fmt(row.starts_at)}`});
    setF({}); load() };
  const room = m => { const o=rooms[m.id]||{};
    ask(`Room details · #${m.id}`,[["r","Room ID","text"],["p","Room password","text"],["n","Notify joined players?","select",[["1","Yes, send notification"],["0","No"]]]],async v=>{
      if(!await run(supabase.from("match_rooms").upsert({match_id:m.id,room_id:v.r,room_pass:v.p}),"Room saved")) return false;
      if(v.n==="1") notify({match_id:m.id,title:"🎮 Room ready: "+m.title,body:`Room ID ${v.r} · Pass ${v.p}`}) },{r:o.room_id||"",p:o.room_pass||""}) };
  const setSt = (m,s) => run(supabase.from("matches").update({status:s}).eq("id",m.id),"Status: "+s).then(ok=>{ if(ok&&s==="live") notify({match_id:m.id,title:"🔴 Match is LIVE",body:m.title+" has started. Join the room now!"}) });
  const pay = m => ask(`Pay winner · #${m.id}`,[["w","Winner name or email","text"],["a","Prize amount ₹","number"]],async v=>{
      const k=v.w.trim().toLowerCase(), w=allU.find(x=>x.email?.toLowerCase()===k||x.name?.toLowerCase()===k), a=+v.a;
      if(!w||!(a>0)){say("User not found / bad amount",1);return false} return rpc("admin_pay_winner",{p_match:m.id,p_user:w.id,p_amt:a},`₹${a} paid to ${w.name}`) },{a:m.prize},{btn:"Pay"});
  const adjust = x => ask(`Balance · ${x.name}`,[["a","Amount ₹ (use minus to deduct)","number"]],async v=>{ const a=+v.a; if(!a){say("Enter an amount",1);return false} return rpc("admin_adjust_balance",{p_user:x.id,p_amt:a},`Balance updated (${a>0?"+":""}₹${a})`) },{},{note:`Current deposit balance: ₹${x.balance}`,btn:"Update balance"});
  const saveRules = async (m,text) => run(supabase.from("mode_rules").upsert(m.map(k=>({mode:k,rules:text,updated_at:new Date().toISOString()}))), m.length>1?"Rules saved for ALL modes":"Rules saved");

  // ---- UI pieces ----
  const card = m => { const left=m.slots-m.filled, j=joined.includes(m.id), r=rooms[m.id]; return (
    <div className="card" key={m.id}>
      <div className="tags"><i>{m.mode.split(" ")[0]}</i><i>{m.map}</i><i>{m.slots} SLOTS</i></div>
      <div className="row"><div><h4>{m.title}</h4><p className="pz">Prize Pool – ₹{m.prize}</p></div>
        <div className="thw"><div className="th" style={{background:`linear-gradient(135deg,${COL[m.id%5]},#111)`}}><Logo s={34}/></div>{fmt(m.starts_at)}</div></div>
      <div className="bar"><u style={{width:`${m.filled/m.slots*100}%`}}/></div>
      <div className="foot"><span>MATCH ID {m.id}</span><span>{left} spots left</span></div>
      {j&&r?.room_id&&<div className="room">Room ID: {r.room_id} · Pass: {r.room_pass}</div>}
      <button className="join" disabled={left<1||j||m.status!=="upcoming"} onClick={()=>join(m.id)}>{j?"JOINED":"₹"+m.fee+" JOIN"}</button>
    </div>)};
  const Tabs = ({list,cur,set,flex}) => (<div className="tabs">{list.map(t=><b key={t} className={t===cur?"on":""} style={flex?{flex:1,textAlign:"center",textTransform:"capitalize"}:null} onClick={()=>set(t)}>{t}</b>)}</div>);

  const body = () => {
    if(nav==="home"){const ms=M.filter(m=>m.mode===tab&&m.status==="upcoming"&&!m.is_private), ru=rules[tab]?.rules;
      return <><Tabs list={T} cur={tab} set={setTab}/>
        {pushOK()&&!pushOn&&Notification.permission!=="denied"&&<div className="bn" onClick={enablePush}>🔔 Tap to get match & room notifications on your phone</div>}
        {ru&&<details className="rl"><summary>📜 {tab} — Rules</summary><p>{ru}</p></details>}
        {ms.length?ms.map(card):<p className="empty">No matches now. Check back soon!</p>}</>}
    if(nav==="my"){const ms=M.filter(m=>joined.includes(m.id)&&m.status===mt); return <><Tabs list={["upcoming","live","played"]} cur={mt} set={setMt} flex/>{ms.length?ms.map(card):<p className="empty">No matches now. Join upcoming!</p>}</>}
    if(nav==="wallet"){ const md=deps.filter(d=>d.user_id===me.id).slice(0,5); return <div className="pgb">
      <div className="wc"><span style={{fontSize:12,opacity:.9}}>Total balance</span><h2>₹{me.balance+me.winnings}</h2><div className="wsplit"><div>Deposit balance<b>₹{me.balance}</b></div><div>Winnings<b>₹{me.winnings}</b></div></div></div>
      <div style={{display:"flex",gap:8,margin:"12px 0"}}><button className="btn gb" onClick={()=>go("deposit",{a:""})}>+ Add Money</button><button className="btn" onClick={()=>go("withdraw",{})}>Withdraw</button></div>
      {myW.length>0&&<><p className="sh">Withdrawal requests</p>{myW.slice(0,5).map(w=><div className="lr" key={w.id}><b>₹{w.amount}<div style={{fontSize:10,color:"#777"}}>{w.upi} · {fmt(w.created_at)}</div></b>{stTxt(w.status)}</div>)}</>}
      {md.length>0&&<><p className="sh">Deposits</p>{md.map(d=><div className="lr" key={d.id}><b>₹{d.amount}<div style={{fontSize:10,color:"#777"}}>{d.gateway} · {fmt(d.created_at)}</div></b>{stTxt(d.status)}</div>)}</>}
      <p className="sh">Transactions</p>{txs.length?txs.slice(0,20).map(x=><div className="lr" key={x.id}><b>{x.note}<div style={{fontSize:10,color:"#777"}}>{fmt(x.created_at)}</div></b><span className={x.amount>0?"gn":""}>{x.amount>0?"+":""}₹{x.amount}</span></div>):<p className="empty" style={{padding:20}}>No transactions yet</p>}</div> }
    const r=[...lb].sort((a,b)=>b.total_won-a.total_won), P=x=>x?(<div><div className="av">{x.name?.[0]}</div><b>{x.name}</b><div className="gn">₹{kf(x.total_won)}</div></div>):<div/>;
    if(!r.length) return <p className="empty">No winners yet. Be the first!</p>;
    return <><div className="pod">{P(r[1])}<div style={{marginTop:-14}}>{P(r[0])}</div>{P(r[2])}</div>
      <div className="lr" style={{fontWeight:600}}><b>Name</b>Rank</div>
      {r.slice(3).map((x,i)=><div key={x.id} className={"lr"+(x.id===me.id?" me":"")}><span className="av">{x.name?.[0]}</span><b>{x.name}<div className="gn">₹{kf(x.total_won)}</div></b>{i+4}</div>)}</>;
  };

  const stTxt = s => <span style={{color:s==="approved"?"#16a34a":s==="pending"?"#d97706":"#dc2626",fontWeight:600,textTransform:"capitalize"}}>{s}</span>;
  const sub = () => { const back={account:"profile",private:"profile",tx:"profile",support:"profile",results:"profile",notifs:"profile"}[page]||null; let t="",h=null;
    if(page==="deposit"){t="Add Money";const a=+f.a||0, act=gwActive(), gg=act.includes(gw)?gw:act[0], man=S.manual||{}, upi=man.upi_id||UPI_ID, upiName=man.upi_name||UPI_NAME, mine=deps.filter(d=>d.user_id===me.id).slice(0,8);
      h=<>{inp("a","Amount ₹ (min 10)","number")}<div style={{display:"flex",gap:6,marginBottom:12}}>{[50,100,200,500].map(x=><button key={x} className="sm" style={{flex:1}} onClick={()=>setF({...f,a:String(x)})}>₹{x}</button>)}</div>
        {!act.length&&<p className="empty">Deposits are temporarily unavailable.</p>}{act.length>1&&<Tabs list={act} cur={gg} set={setGw} flex/>}
        {gg==="manual"&&<div style={{marginTop:10}}>
          {man.qr_url&&<div style={{textAlign:"center"}}><img src={man.qr_url} alt="Pay QR" style={{width:230,maxWidth:"80%",borderRadius:8,border:"1px solid #eee"}}/><p style={{fontSize:11,color:"#777"}}>Scan with any UPI app and pay ₹{a||"…"}</p></div>}
          <p style={{fontSize:12,color:"#555",margin:"8px 0",whiteSpace:"pre-wrap"}}>{upi&&<>UPI ID: <b style={{userSelect:"all"}}>{upi}</b> ({upiName})<br/></>}{man.note||"Pay the exact amount, then enter the UTR / transaction ID or upload the payment screenshot. Balance is added after admin verifies."}</p>
          {a>=10&&upi&&<a className="btn" style={{display:"block",textAlign:"center",textDecoration:"none",background:"#111",marginBottom:10}} href={`upi://pay?pa=${upi}&pn=${encodeURIComponent(upiName)}&am=${a}&cu=INR&tn=ClashX7`}>Open UPI app & pay ₹{a}</a>}
          {inp("u","UTR / Transaction ID (optional if screenshot)")}<label>Payment screenshot (optional if UTR)</label><input type="file" accept="image/*" onChange={e=>setF({...f,pf:e.target.files[0]})}/>
          <button className="btn" disabled={busy} onClick={manualDep}>{busy?"Uploading…":"Submit for verification"}</button></div>}
        {gg==="zapupi"&&<div style={{marginTop:10}}><p style={{fontSize:12,color:"#555",marginBottom:8}}>Pay with any UPI app (GPay, PhonePe, Paytm…). Balance is added automatically after payment.</p>{inp("ph","Mobile number","tel")}<button className="btn gb" disabled={busy} onClick={()=>gwDep("zapupi")}>{busy?"Please wait…":`Pay ₹${a||""} with UPI`}</button></div>}
        {gg==="razorpay"&&<div style={{marginTop:10}}><p style={{fontSize:12,color:"#555",marginBottom:8}}>UPI, cards, netbanking & wallets. Balance is added automatically.</p><button className="btn gb" disabled={busy} onClick={()=>gwDep("razorpay")}>{busy?"Please wait…":`Pay ₹${a||""} with Razorpay`}</button></div>}
        {gg==="cashfree"&&<div style={{marginTop:10}}><p style={{fontSize:12,color:"#555",marginBottom:8}}>UPI, cards & netbanking. Balance is added automatically.</p>{inp("ph","Mobile number","tel")}<button className="btn gb" disabled={busy} onClick={()=>gwDep("cashfree")}>{busy?"Please wait…":`Pay ₹${a||""} with Cashfree`}</button></div>}
        {mine.length>0&&<><p style={{margin:"18px 0 4px",fontWeight:600}}>Recent deposits</p>{mine.map(d=><div className="lr" key={d.id}><b>₹{d.amount}<div style={{fontSize:10,color:"#777"}}>{d.gateway} · {fmt(d.created_at)}</div></b>{stTxt(d.status)}</div>)}</>}</>}
    if(page==="notifs"){t="Notifications";localStorage.setItem("x7seen",Date.now());
      h=<>{pushOK()&&!pushOn&&<button className="btn" style={{marginBottom:12}} onClick={enablePush}>🔔 Turn on phone notifications</button>}{pushOn&&<p style={{fontSize:11,color:"#16a34a",marginBottom:8}}>✅ Phone notifications are on</p>}
        {notifs.length?notifs.map(n=><div className="mi" key={n.id} style={{cursor:"default",display:"block"}}><b>{n.title}</b><div style={{fontSize:12,color:"#444",marginTop:2}}>{n.body}</div><div style={{fontSize:10,color:"#999",marginTop:4}}>{fmt(n.created_at)}</div></div>):<p className="empty">No notifications yet.</p>}</>}
    if(page==="profile"){t="Profile";h=<><div style={{textAlign:"center",margin:10}}><div className="av" style={{width:90,height:90,fontSize:34,margin:"auto"}}>{me.name?.[0]}</div><h3 style={{marginTop:8}}>{me.name}</h3><p style={{fontSize:11,color:"#666"}}>{me.email}</p></div>
      {[["Account Settings","account"],["Notifications","notifs"],["Join Private Tournament","private"],["Results","results"],["Customer Support","support"]].map(([n,x])=><div className="mi" key={x} onClick={()=>go(x,x==="account"?{n:me.name,g:me.game_id,ph:me.phone||""}:{})}>{n}<span>›</span></div>)}
      {isStaff&&<a className="mi" href="#admin" style={{color:"var(--r)",textDecoration:"none",fontWeight:700}}>{isAdmin?"Admin Panel":"Moderator Panel"}<span>›</span></a>}
      <button className="btn" style={{background:"#fef2f2",color:"var(--r)",marginTop:20}} onClick={logout}>Logout</button></>}
    if(page==="account"){t="Account";h=<>{inp("n","Game Name")}{inp("g","Game ID")}{inp("ph","Mobile number","tel")}<button className="btn" onClick={saveAcc}>Save</button></>}
    if(page==="private"){t="Private Tournament";h=<>{inp("c","Enter room code")}<button className="btn" onClick={async()=>{if(await rpc("join_by_code",{p_code:f.c||""}))setPage(null)}}>Join</button></>}
    if(page==="withdraw"){t="Withdrawal";h=<><div className="kv">Winning Balance<b className="gn">₹{me.winnings}</b></div>{inp("a","Enter amount to withdraw","number")}{inp("u","Enter UPI Id")}<button className="btn gb" onClick={withdraw}>Withdraw</button></>}
    if(page==="tx"){t="Transactions";h=txs.length?txs.map(x=><div className="lr" key={x.id}><b>{x.note}<div style={{fontSize:10,color:"#777"}}>{new Date(x.created_at).toLocaleString()}</div></b><span className={x.amount>0?"gn":""}>{x.amount>0?"+":""}₹{x.amount}</span></div>):<p className="empty"><b>No Transactions Yet</b><br/>Your history appears here once you start playing.</p>}
    if(page==="results"){t="Results";const ps=M.filter(m=>m.status==="played");h=ps.length?ps.map(m=><div className="mi" key={m.id} style={{cursor:"default"}}><span>{m.title}<div className="gn">Winner: {m.winner_name||"-"}</div></span><b style={{color:"var(--r)"}}>₹{m.prize}</b></div>):<p className="empty">No results announced yet.</p>}
    if(page==="support"){t="Customer Support";h=<div className="empty">{SUPPORT_URL?<a className="btn gb" style={{display:"block",textDecoration:"none"}} href={SUPPORT_URL} target="_blank" rel="noreferrer">Chat with support</a>:"Support link not set yet."}</div>}
    return <><div className="pgh"><span style={{cursor:"pointer",fontSize:20}} onClick={()=>go(back)}>←</span>{t}</div><div className="pgb">{h}</div></> };

  const admin = () => { let b=null;
    const TABS = isAdmin ? ["Dashboard","Matches","Rules","Notify","Deposits","Deposit Settings","Withdrawals","Users"] : ["Matches","Rules","Notify"], cur = TABS.includes(at)?at:TABS[0];
    if(cur==="Dashboard"){ const x=stats;
      if(!x) b=<p className="empty">Loading stats…</p>;
      else if(x.error) b=<p className="empty">Stats unavailable: {x.error}<br/>Run the latest schema_patch.sql in Supabase.</p>;
      else { const C=(l,v,sub,go)=><div className="stat" key={l} style={go?{cursor:"pointer"}:null} onClick={go?()=>setAt(go):undefined}>{l}<h2>{v}</h2>{sub&&<small>{sub}</small>}</div>, dl=x.daily||[], mx=Math.max(1,...dl.flatMap(d=>[Math.abs(d.dep),Math.abs(d.inc)]));
        b=<>
        <p className="sh">💰 Deposits</p><div className="dg">{C("Total deposited",R(x.dep.total),`${x.dep.count} deposits`)}{C("Today",R(x.dep.today))}{C("Last 7 days",R(x.dep.week))}{C("Last 30 days",R(x.dep.month))}{C("Pending",R(x.dep.pending_amt),`${x.dep.pending_cnt} waiting`,"Deposits")}</div>
        <p className="sh">📈 Income</p><div className="dg">{C("Today",R(x.inc.today))}{C("Last 7 days",R(x.inc.week))}{C("Last 30 days",R(x.inc.month))}{C("Total income",R(x.inc.total))}{C("Entry fees collected",R(x.inc.fees))}{C("Prizes paid",R(x.inc.prizes))}</div>
        <small style={{color:"#777"}}>Income = entry fees − prize pool of finished (played) matches.</small>
        <p className="sh">Last 7 days</p><div className="chart">{dl.map(d=><div className="cb" key={d.d}><div className="bars"><i title={"Deposit "+R(d.dep)} style={{height:`${Math.abs(d.dep)/mx*100}%`,background:"#2563eb"}}/><i title={"Income "+R(d.inc)} style={{height:`${Math.abs(d.inc)/mx*100}%`,background:d.inc<0?"#dc2626":"#16a34a"}}/></div><small>{d.d.slice(5)}</small></div>)}</div>
        <small style={{color:"#777"}}><b style={{color:"#2563eb"}}>■</b> Deposits &nbsp;<b style={{color:"#16a34a"}}>■</b> Income</small>
        <p className="sh">👥 Users</p><div className="dg">{C("Total users",x.users.total)}{C("New today",x.users.today)}{C("New (7 days)",x.users.week)}{C("Banned",x.users.banned)}</div>
        <p className="sh">🎮 Matches</p><div className="dg">{C("Total matches",x.matches.total)}{C("Upcoming",x.matches.upcoming)}{C("Live now",x.matches.live)}{C("Played",x.matches.played,`${x.matches.played_today} today`)}{C("Total joins",x.matches.joins)}</div>
        <p className="sh">💼 Wallets & withdrawals</p><div className="dg">{C("Users' deposit balance",R(x.wallet.balance),"held by app")}{C("Users' winnings",R(x.wallet.winnings),"held by app")}{C("Withdraw pending",R(x.wd.pending_amt),`${x.wd.pending_cnt} requests`,"Withdrawals")}{C("Total withdrawn",R(x.wd.paid_total))}{C("Withdrawn (7 days)",R(x.wd.paid_week))}</div>
        <p className="sh">🏆 Top winners</p><table><tbody>{[...allU].sort((a,b)=>b.winnings-a.winnings).slice(0,5).map(u=><tr key={u.id}><td>{u.name}</td><td>₹{u.winnings}</td></tr>)}</tbody></table>
        <p className="sh">🆕 Latest signups</p><table><tbody>{[...allU].reverse().slice(0,5).map(u=><tr key={u.id}><td>{u.name}</td><td>{u.phone||u.email}</td><td>{fmt(u.created_at)}</td></tr>)}</tbody></table></> } }
    if(cur==="Matches") b=<>
      <div className="fg">{inp("t","Title")}<div><label>Mode</label><select value={f.g||T[0]} onChange={e=>setF({...f,g:e.target.value})}>{T.map(t=><option key={t}>{t}</option>)}</select></div>{inp("m","Map")}{inp("s","Slots","number")}{inp("p","Prize ₹","number")}{inp("fee","Entry fee ₹","number")}{inp("d","Start time","datetime-local")}
        <div><label>Type</label><select value={f.v||"0"} onChange={e=>setF({...f,v:e.target.value})}><option value="0">Public</option><option value="1">Private</option></select></div>
        <div><label>Notify players</label><select value={f.nf||"1"} onChange={e=>setF({...f,nf:e.target.value})}><option value="1">Yes (push)</option><option value="0">No</option></select></div></div>
      <button className="btn" onClick={addMatch}>Create match</button>
      <table><tbody><tr><th>Match</th><th>Mode</th><th>Slots</th><th>Status</th><th>Actions</th></tr>
        {[...M].reverse().map(m=><tr key={m.id}><td>#{m.id} {m.title}{m.is_private?" 🔒"+m.code:""}</td><td>{m.mode}</td><td>{m.filled}/{m.slots}</td><td>{m.status}</td>
          <td><button className="sm" onClick={()=>room(m)}>Room</button><button className="sm" onClick={()=>setSt(m,"live")}>Live</button><button className="sm" onClick={()=>setSt(m,"played")}>Done</button>{isAdmin&&<button className="sm" onClick={()=>pay(m)}>Pay winner</button>}<button className="sm" onClick={()=>window.confirm("Delete match?")&&run(supabase.from("matches").delete().eq("id",m.id),"Deleted")}>Del</button></td></tr>)}</tbody></table></>;
    if(cur==="Rules"){const rm=f.rm||T[0], txt=f.rt ?? rules[rm]?.rules ?? "";
      b=<><p style={{fontSize:12,color:"#555",marginBottom:8}}>Players see these rules on the Home screen under the mode tab.</p>
        <label>Mode</label><select value={rm} onChange={e=>setF({rm:e.target.value})}>{T.map(t=><option key={t}>{t}</option>)}</select>
        <label>Rules for {rm}</label><textarea rows={10} value={txt} placeholder={"1. No hacking / teaming\n2. Join room 5 min before start\n3. ..."} onChange={e=>setF({...f,rm,rt:e.target.value})}/>
        <button className="btn" onClick={()=>saveRules([rm],txt)}>Save for {rm}</button>
        <button className="btn" style={{background:"#111",marginTop:8}} onClick={()=>window.confirm("Replace rules of ALL modes with this text?")&&saveRules(T,txt)}>Apply this to ALL modes</button></>}
    if(cur==="Notify") b=<><p style={{fontSize:12,color:"#555",marginBottom:8}}>Goes to every player's phone (who allowed notifications) and the in-app list.</p>{inp("nt","Title")}<label>Message</label><textarea rows={4} value={f.nb??""} onChange={e=>setF({...f,nb:e.target.value})}/>{inp("ne","Only this user's email (leave blank = everyone)","email")}
      <button className="btn" disabled={busy} onClick={async()=>{if(!f.nt) return say("Title required",1); setBusy(true); if(await notify({title:f.nt,body:f.nb,email:f.ne})) setF({}); setBusy(false)}}>Send notification</button></>;
    if(cur==="Deposits"){const L=deps.filter(d=>f.dp==="all"?true:d.status==="pending"); b=<><div style={{margin:"0 0 8px"}}><button className="sm" onClick={()=>setF({dp:"pending"})}>Pending</button><button className="sm" onClick={()=>setF({dp:"all"})}>All</button></div>
      {L.length?<table><tbody><tr><th>User</th><th>Amount</th><th>Via</th><th>UTR</th><th>Proof</th><th>Status</th><th></th></tr>{L.map(d=><tr key={d.id}><td>{allU.find(x=>x.id===d.user_id)?.name}</td><td>₹{d.amount}</td><td>{d.gateway}</td><td>{d.utr||"-"}</td><td>{d.proof_path?<button className="sm" onClick={()=>viewProof(d.proof_path)}>View</button>:"-"}</td><td>{stTxt(d.status)}</td>
        <td>{d.status==="pending"&&<><button className="sm" onClick={()=>rpc("admin_review_deposit",{p_id:d.id,p_ok:true},"Deposit approved, balance added")}>Approve</button><button className="sm" onClick={()=>rpc("admin_review_deposit",{p_id:d.id,p_ok:false},"Deposit rejected")}>Reject</button></>}</td></tr>)}</tbody></table>:<p className="empty">No deposits</p>}</>}
    if(cur==="Deposit Settings"){ const m=S.manual||{}, fv=(k,d="")=>f[k]??d, fl=(k,l,d,t="text")=><><label>{l}</label><input type={t} value={fv(k,d)} onChange={e=>setF({...f,[k]:e.target.value})}/></>,
        GW=[["zapupi","ZapUPI",["zap_key"],{zap_key:"ZapUPI Key"}],["razorpay","Razorpay",["key_id","key_secret","webhook_secret"],{key_id:"Key ID",key_secret:"Key Secret",webhook_secret:"Webhook Secret"}],["cashfree","Cashfree",["app_id","secret","env"],{app_id:"App ID",secret:"Secret Key",env:"Mode"}]];
      b=<>
      <div className="pnl"><h4>📲 Manual payment (your QR / UPI)</h4><p style={{fontSize:11,color:"#777",margin:"4px 0 8px"}}>Players scan your QR, pay, then send the UTR and/or a screenshot. You approve from the Deposits tab.</p>
        <label>Status</label><select value={fv("me_en",m.enabled===false?"0":"1")} onChange={e=>setF({...f,me_en:e.target.value})}><option value="1">Enabled</option><option value="0">Disabled</option></select>
        {fl("upi_id","Your UPI ID",m.upi_id)}{fl("upi_name","Payee name",m.upi_name)}
        <label>Payment QR (screenshot of your scanner)</label>{(f.qr??m.qr_url)&&<img src={f.qr??m.qr_url} alt="QR" style={{width:180,display:"block",margin:"6px 0",borderRadius:8,border:"1px solid #eee"}}/>}<input type="file" accept="image/*" disabled={busy} onChange={e=>uploadQr(e.target.files[0])}/>
        <label>Instructions shown to players</label><textarea rows={3} value={fv("note",m.note||"")} onChange={e=>setF({...f,note:e.target.value})}/>
        {fl("min","Minimum deposit ₹",m.min||10,"number")}{fl("max","Maximum deposit ₹ (0 = no limit)",m.max||0,"number")}
        <button className="btn" onClick={saveManual}>Save manual payment</button></div>
      {GW.map(([n,label,keys,names])=><div className="pnl" key={n}><h4>{label} <span style={{fontSize:11,fontWeight:600,color:gwOk[n]?"#16a34a":"#d97706"}}>{gwOk[n]?"✔ keys saved":"⚠ keys not set"}</span></h4>
        <label>Status</label><select value={fv("ge_"+n,S["gw_"+n]?.enabled===true?"1":"0")} onChange={e=>setF({...f,["ge_"+n]:e.target.value})}><option value="1">Enabled</option><option value="0">Disabled</option></select>
        {keys.map(k=>k==="env"?<div key={k}><label>{names[k]}</label><select value={fv("gs_"+n+"_"+k,"")} onChange={e=>setF({...f,["gs_"+n+"_"+k]:e.target.value})}><option value="">Keep current</option><option>sandbox</option><option>production</option></select></div>
          :<div key={k}><label>{names[k]}</label><input type="password" autoComplete="off" placeholder={gwOk[n]?"•••••• (leave blank to keep)":"Paste here"} value={fv("gs_"+n+"_"+k,"")} onChange={e=>setF({...f,["gs_"+n+"_"+k]:e.target.value})}/></div>)}
        <p style={{fontSize:11,color:"#777",margin:"6px 0"}}>Webhook URL: <b style={{userSelect:"all"}}>{window.location.origin}/api/webhook?g={n}</b></p>
        <button className="btn" onClick={()=>saveGw(n,keys)}>Save {label}</button></div>)}</>}
    if(cur==="Users"){const k=(f.q||"").toLowerCase(), L=allU.filter(x=>!k||x.name?.toLowerCase().includes(k)||x.email?.toLowerCase().includes(k)||x.phone?.includes(k)||x.username?.includes(k)); b=<>{inp("q","Search name / email")}<table><tbody><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Game ID</th><th>Role</th><th>Deposit</th><th>Winning</th><th></th></tr>
      {L.map(x=><tr key={x.id}><td>{x.name}{x.banned?" (banned)":""}</td><td>{x.email}</td><td>{x.phone||"-"}</td><td>{x.game_id||"-"}</td><td>{x.role||"user"}</td><td>₹{x.balance}</td><td>₹{x.winnings}</td><td><button className="sm" onClick={()=>adjust(x)}>± Balance</button><button className="sm" onClick={()=>rpc("admin_set_ban",{p_user:x.id,p_ban:!x.banned})}>{x.banned?"Unban":"Ban"}</button>
        {x.role!=="admin"&&<button className="sm" onClick={()=>rpc("admin_set_role",{p_user:x.id,p_role:x.role==="moderator"?"user":"moderator"},x.role==="moderator"?`${x.name} is no longer a moderator`:`${x.name} is now a moderator`)}>{x.role==="moderator"?"Remove mod":"Make mod"}</button>}</td></tr>)}</tbody></table></>}
    if(cur==="Withdrawals") b=W.length?<table><tbody><tr><th>User</th><th>Amount</th><th>UPI</th><th>Status</th><th></th></tr>
      {W.map(w=><tr key={w.id}><td>{allU.find(x=>x.id===w.user_id)?.name}</td><td>₹{w.amount}</td><td>{w.upi}</td><td>{w.status}</td><td>{w.status==="pending"&&<><button className="sm" onClick={()=>rpc("admin_set_withdrawal",{p_id:w.id,p_ok:true},"Approved")}>Approve</button><button className="sm" onClick={()=>rpc("admin_set_withdrawal",{p_id:w.id,p_ok:false},"Rejected")}>Reject</button></>}</td></tr>)}</tbody></table>:<p className="empty">No withdrawal requests</p>;
    return <><div className="brand" style={{fontSize:18}}><Logo s={36}/> ClashX7 {isAdmin?"Admin":"Moderator"} <span className={"lv"+(live?" on":"")} style={{marginLeft:"auto"}}>{live?"● Live":"○ Auto-refresh"}</span><button className="sm" onClick={()=>{load();say("Refreshed")}}>↻ Refresh</button><a href="#" style={{fontSize:13}}>← Open app</a></div>
      <div style={{margin:"14px 0"}}>{TABS.map(x=><button key={x} className="sm" style={x===cur?{background:"#111",color:"#fff"}:null} onClick={()=>{setAt(x);setF({})}}>{x}</button>)}</div>{b}</>;
  };

  const wrap = c => (<div className="x7"><style>{css}</style><div id="app" className={hash==="#admin"?"adm":(!session&&!authOpen)?"land":""}>{c}</div>{pv&&<div className="ov" onClick={()=>setPv(null)}><img src={pv} alt="proof" style={{maxWidth:"96vw",maxHeight:"92vh",borderRadius:8}}/></div>}{howto&&<div className="ov" onClick={()=>setHowto(false)}><div className="dl" onClick={e=>e.stopPropagation()}><h3 style={{marginBottom:8}}>Install ClashX7</h3><p style={{fontSize:13,lineHeight:1.6,marginBottom:12}}><b>Android (Chrome):</b> menu ⋮ → Install app / Add to Home screen.<br/><b>iPhone (Safari):</b> Share → Add to Home Screen.</p><button className="btn" onClick={()=>setHowto(false)}>OK</button></div></div>}{dlg&&<Dlg d={dlg} close={()=>setDlg(null)}/>}{toast&&<div className={"toast"+(toast.err?" er":"")}>{toast.m}</div>}</div>);
  if(!supabase) return wrap(<p className="empty">Supabase is not configured. In Vercel → Settings → Environment Variables add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>, then redeploy.</p>);
  if(!ready) return wrap(<div className="sp"><Logo s={110}/>ClashX7</div>);
  if(!session && !authOpen) return wrap(<Landing open={open} download={download} showDl={!standalone} support={SUPPORT_URL}/>);
  if(!session) return wrap(<div className="login"><Logo s={80}/><h2 style={{margin:"10px 0"}}>ClashX7</h2>
    {mode==="up"&&<>{inp("un","Username")}{inp("ph","Mobile number","tel")}</>}{inp("em",mode==="up"?"Email":"Email / Username / Mobile",mode==="up"?"email":"text")}{inp("pw","Password","password")}
    <button className="btn" onClick={auth}>{mode==="up"?"Create account":"Login"}</button>
    <p style={{marginTop:14,color:"var(--r)",cursor:"pointer",fontSize:13}} onClick={()=>setMode(mode==="up"?"in":"up")}>{mode==="up"?"Already have an account? Login":"New here? Create account"}</p>
    <p style={{marginTop:10,color:"#666",cursor:"pointer",fontSize:12}} onClick={()=>setAuthOpen(false)}>← Back to home</p></div>);
  if(!me) return wrap(<p className="empty">Loading your profile… If this never finishes, run schema.sql then schema_patch.sql in the Supabase SQL Editor.</p>);
  if(hash==="#admin") return wrap(isStaff?admin():<p className="empty">Not authorized. <a href="#">Back to app</a></p>);
  const seen = +localStorage.getItem("x7seen")||0, unread = notifs.filter(n=>+new Date(n.created_at)>seen).length;
  return wrap(page ? sub() : <>
    <div className="hdr"><span className="av" onClick={()=>go("profile")}>{me.name?.[0]}</span><span className="brand"><Logo s={24}/>ClashX7</span>
      <span style={{display:"flex",gap:6}}><button className="ic" onClick={()=>go("notifs")}>🔔{unread>0&&<sup style={{color:"var(--r)",fontWeight:800}}> {unread}</sup>}</button><button className="ic" onClick={()=>{setPage(null);setNav("wallet")}}>₹{me.balance+me.winnings}</button></span></div>
    {body()}
    <nav>{NAV.map(([n,l,d])=><a key={n} className={nav===n?"on":""} onClick={()=>setNav(n)}><svg viewBox="0 0 24 24"><path d={d}/></svg>{l}</a>)}</nav></>);
}

const css = `
.x7{--r:#f5403a;--g:#22c55e;background:#e5e7eb;min-height:100vh;color:#111;font-size:14px}
.x7,.x7 *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.x7 #app{max-width:480px;min-height:100vh;margin:auto;background:#fff;padding-bottom:70px;position:relative}
.x7 #app.adm{max-width:980px;padding:16px}
.sp{background:var(--r);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:10px;font-weight:800;font-size:26px}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;z-index:5}
.av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4c1d95);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px;cursor:pointer}
.ic{border:1px solid #ddd;border-radius:15px;background:#fff;height:30px;padding:0 10px;font-weight:600;cursor:pointer}
.brand{display:flex;align-items:center;gap:6px;font-weight:800}
.tabs{display:flex;overflow-x:auto;border-bottom:1px solid #eee;scrollbar-width:none}
.tabs b{padding:12px;white-space:nowrap;font-size:12px;font-weight:500;color:#555;cursor:pointer;border-bottom:2px solid transparent}
.tabs b.on{color:var(--r);border-color:var(--r)}
.card{margin:8px;border:1px solid #eee;border-radius:6px;position:relative;overflow:hidden;padding:10px 10px 0;box-shadow:0 1px 3px #0001}
.tags i{font-style:normal;font-size:9px;border:1px solid #333;border-radius:4px;padding:2px 5px;margin-right:6px}
.row{display:flex;justify-content:space-between;gap:8px;margin-top:10px}
.row h4{font-size:13px;margin:8px 0 14px}
.pz{color:var(--r);font-weight:700;font-size:13px}
.thw{text-align:center;font-size:10px;font-weight:600}
.th{width:80px;height:80px;border-radius:6px;display:grid;place-items:center;margin-bottom:3px}
.bar{height:3px;background:#eee;margin-top:6px}.bar u{display:block;height:100%;background:var(--r)}
.foot{display:flex;justify-content:space-between;font-size:10px;color:var(--r);padding:6px 0 30px}
.join{position:absolute;right:0;bottom:0;background:var(--r);color:#fff;border:0;font-weight:800;padding:8px 14px 8px 32px;clip-path:polygon(18px 0,100% 0,100% 100%,0 100%);cursor:pointer;font-size:13px}
.join:disabled{background:#9ca3af}
.room{background:#fef2f2;color:var(--r);font-size:11px;padding:5px 8px;margin:6px -10px 0;font-weight:600}
.x7 nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid #eee;display:flex;z-index:9}
.x7 nav a{flex:1;text-align:center;padding:8px 0;font-size:10px;color:#666;cursor:pointer}
.x7 nav a.on{color:var(--r)}
.x7 nav svg{display:block;margin:0 auto 2px;width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pgh{display:flex;align-items:center;gap:14px;padding:14px;font-weight:600}
.pgb{padding:12px}
.x7 label{font-size:11px;color:#555}
.x7 input,.x7 select{width:100%;padding:11px;border:1px solid #e5e7eb;border-radius:6px;margin:4px 0 10px;background:#fafafa}
.btn{width:100%;padding:11px;border:0;border-radius:6px;background:var(--r);color:#fff;font-weight:600;cursor:pointer}
.gb{background:var(--g)}
.kv{display:flex;justify-content:space-between;padding:10px 4px;font-weight:500}
.mi{display:flex;justify-content:space-between;padding:14px;border:1px solid #eee;border-radius:6px;margin:6px 0;cursor:pointer}
.empty{text-align:center;color:#555;padding:60px 20px;font-size:13px}
.pod{display:flex;justify-content:space-around;align-items:flex-start;padding:24px 0 30px;text-align:center;font-size:12px}
.pod .av{width:64px;height:64px;font-size:22px;margin:0 auto 6px}
.lr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #eee}
.lr b{flex:1}.lr.me{background:#dbeafe}.gn{color:#16a34a;font-weight:600}
.login{max-width:320px;margin:80px auto;text-align:center}
.adm table{width:100%;border-collapse:collapse;margin-top:12px}
.x7 td,.x7 th{padding:8px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.stat{background:#f9fafb;border:1px solid #eee;border-radius:8px;padding:14px}
.fg{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.sm{padding:5px 9px;border:1px solid #ddd;background:#fff;border-radius:5px;cursor:pointer;margin:2px;font-size:12px}
.x7 textarea{width:100%;padding:11px;border:1px solid #e5e7eb;border-radius:6px;margin:4px 0 10px;background:#fafafa;font-size:14px;resize:vertical}
.ov{position:fixed;inset:0;background:#0007;display:grid;place-items:center;z-index:50;padding:16px}
.dl{background:#fff;border-radius:10px;padding:16px;width:100%;max-width:380px;max-height:90vh;overflow:auto}
.toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:99;max-width:92vw;box-shadow:0 4px 14px #0004}
.toast.er{background:#b91c1c}
.bn{margin:8px;padding:10px;background:#fef2f2;color:var(--r);border-radius:6px;font-size:12px;font-weight:600;text-align:center;cursor:pointer}
.rl{margin:8px;border:1px solid #eee;border-radius:6px;padding:8px 10px;font-size:12px}.rl summary{font-weight:700;cursor:pointer;color:var(--r)}.rl p{white-space:pre-wrap;margin-top:6px;line-height:1.5;color:#333}
.sm:disabled,.btn:disabled{opacity:.6}
.x7 #app.land{max-width:1000px;padding-bottom:0}
.lh{display:flex;justify-content:space-between;align-items:center;padding:14px 18px}
.hero{background:linear-gradient(160deg,#f5403a,#7f1d1d);color:#fff;text-align:center;padding:48px 20px 56px;display:flex;flex-direction:column;align-items:center;gap:12px}
.hero h1{font-size:clamp(30px,6vw,52px);font-weight:800}.hero p{max-width:520px;opacity:.93;line-height:1.5}
.cta{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px}
.lb2{border:0;border-radius:8px;padding:12px 22px;font-weight:700;cursor:pointer;font-size:14px;background:#fff;color:var(--r)}
.lb2.ghost{background:transparent;color:#fff;border:1.5px solid #fff}.lb2.dk{background:#111;color:#fff}.lb2.rd{background:var(--r);color:#fff}
.lsec{padding:34px 18px}.lsec h2{text-align:center;margin-bottom:18px;font-size:22px}
.l3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.lc{border:1px solid #eee;border-radius:10px;padding:18px;background:#fff;box-shadow:0 1px 3px #0001}.lc b{display:block;margin:8px 0 4px;font-size:16px}.lc p{color:#555;line-height:1.5;font-size:13px}.lc .em{font-size:28px;font-weight:800;color:var(--r)}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.chips i{font-style:normal;border:1px solid #333;border-radius:20px;padding:6px 12px;font-size:12px}
.lf{background:#111;color:#bbb;text-align:center;padding:24px 18px;font-size:12px;line-height:1.8}
.wc{background:linear-gradient(135deg,#f5403a,#7f1d1d);color:#fff;border-radius:12px;padding:18px}.wc h2{font-size:32px;margin:2px 0 12px}
.wsplit{display:flex;gap:10px}.wsplit div{flex:1;background:#fff2;border-radius:8px;padding:8px 10px;font-size:11px}.wsplit b{display:block;font-size:16px;margin-top:2px}
.sh{margin:16px 0 4px;font-weight:700}.lv{font-size:11px;color:#999}.lv.on{color:#16a34a}
.pnl{border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:14px;background:#fff}.pnl h4{margin-bottom:4px}
.dg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.dg .stat{border:1px solid #eee;border-radius:8px;padding:10px;background:#fff;font-size:12px;color:#555}.dg .stat h2{font-size:20px;color:#111;margin-top:2px}.dg .stat small{display:block;font-size:10px;color:#777;margin-top:2px}
.chart{display:flex;gap:6px;height:130px;align-items:flex-end;margin:8px 0}.cb{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}.bars{display:flex;gap:2px;align-items:flex-end;height:100px;width:100%;justify-content:center}.bars i{width:38%;min-height:2px;border-radius:3px 3px 0 0}.cb small{font-size:9px;color:#777;margin-top:2px}
`;
