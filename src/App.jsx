import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ClashX7 - real Supabase version. Needs: schema.sql run once, env vars VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY,
   and "@supabase/supabase-js" in package.json. Admin panel: /#admin (only for the admin email). */
const SB_URL = import.meta.env.VITE_SUPABASE_URL, SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;
const ADMIN_EMAIL = "parimaltikadar110@gmail.com"; // UI only; real protection = is_admin() in schema.sql
const T = ["SOLO BR","DUO BR","DUO PR KILL","SOLO PER KILL","LONE WOLF","CS CHALLENGERS","CLASH SQUAD","CS HEADSHOT","LOSS TO WIN"];
const COL = ["#7f1d1d","#1e3a5f","#14532d","#4c1d95","#78350f"];
const NAV = [["home","Home","M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"],["my","My Matches","M7 4h10v5a5 5 0 0 1-10 0zM4 5h3M17 5h3M12 14v4M8 20h8"],["store","Clash Store","M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v10M9 10h6"],["lb","Leaderboard","M5 20V11M12 20V4M19 20v-7"]];
const fmt = t => new Date(t).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"numeric",minute:"2-digit"});
const kf = n => n >= 1000 ? (n/1000).toFixed(1)+"k" : n;

const Logo = ({s=64}) => (
  <svg width={s} height={s} viewBox="0 0 100 100">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6a5c"/><stop offset="1" stopColor="#c4161c"/></linearGradient></defs>
    <path d="M50 4l40 23v46L50 96 10 73V27z" fill="url(#lg)" stroke="#fff" strokeWidth="3"/>
    <path d="M24 34l28 32M52 34L24 66" stroke="#fff" strokeWidth="10" strokeLinecap="round"/>
    <path d="M62 34h20l-13 32" stroke="#111" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function App() {
  const [session,setSession] = useState(null), [ready,setReady] = useState(false), [hash,setHash] = useState(window.location.hash);
  const [me,setMe] = useState(null), [M,setM] = useState([]), [rooms,setRooms] = useState({}), [joined,setJoined] = useState([]), [txs,setTxs] = useState([]), [lb,setLb] = useState([]), [allU,setAllU] = useState([]), [W,setW] = useState([]);
  const [tab,setTab] = useState(T[0]), [nav,setNav] = useState("home"), [page,setPage] = useState(null), [mt,setMt] = useState("upcoming"), [at,setAt] = useState("Dashboard"), [mode,setMode] = useState("in"), [f,setF] = useState({});
  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(()=>{
    const h = () => setHash(window.location.hash); window.addEventListener("hashchange",h);
    if(!supabase){setReady(true);return()=>window.removeEventListener("hashchange",h)}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
    const {data:l} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>{l.subscription.unsubscribe();window.removeEventListener("hashchange",h)};
  },[]);

  const load = useCallback(async()=>{
    if(!session) return; const uid = session.user.id, q = t => supabase.from(t).select("*");
    const [p,m,j,t,l,r] = await Promise.all([q("profiles").eq("id",uid).maybeSingle(), q("matches").order("starts_at"), q("participants").eq("user_id",uid), q("transactions").order("created_at",{ascending:false}).limit(50), q("leaderboard"), q("match_rooms")]);
    setMe(p.data); setM(m.data||[]); setJoined((j.data||[]).map(x=>x.match_id)); setTxs(t.data||[]); setLb(l.data||[]); setRooms(Object.fromEntries((r.data||[]).map(x=>[x.match_id,x])));
    if(session.user.email?.toLowerCase()===ADMIN_EMAIL){const [u,w]=await Promise.all([q("profiles").order("created_at"),q("withdrawals").order("created_at",{ascending:false})]);setAllU(u.data||[]);setW(w.data||[])}
  },[session]);
  useEffect(()=>{load();const i=setInterval(load,30000);return()=>clearInterval(i)},[load]);

  const go = (p,init={}) => {setF(init);setPage(p)};
  const inp = (k,l,t="text") => (<><label>{l}</label><input type={t} value={f[k]??""} onChange={e=>setF({...f,[k]:e.target.value})}/></>);
  const rpc = async (fn,args) => { const {error}=await supabase.rpc(fn,args); if(error){alert(error.message);return false} await load(); return true };
  const run = async p => { const {error}=await p; if(error) return alert(error.message); await load() };

  // ---- auth ----
  const auth = async () => { const e=(f.em||"").trim(), p=f.pw||""; if(!e||!p) return alert("Email and password required");
    const r = mode==="up" ? await supabase.auth.signUp({email:e,password:p,options:{data:{name:f.nm||e.split("@")[0]}}}) : await supabase.auth.signInWithPassword({email:e,password:p});
    if(r.error) return alert(r.error.message);
    if(mode==="up"&&!r.data.session) alert("Account created. Confirm your email (check inbox/spam), then log in."); };
  const logout = async () => { await supabase.auth.signOut(); setMe(null); setPage(null); setF({}) };

  // ---- player actions ----
  const join = async id => { if(await rpc("join_match",{p_match:id})) setPage(null) };
  const saveAcc = () => run(supabase.from("profiles").update({name:f.n||me.name,game_id:f.g||""}).eq("id",me.id)).then(()=>go("profile"));
  const withdraw = async () => { if(await rpc("request_withdrawal",{p_amt:+f.a,p_upi:f.u||""})){alert("Request sent");go("profile")} };

  // ---- admin actions ----
  const addMatch = async () => { if(!f.t||!f.d) return alert("Title and time are required"); const pv=f.v==="1";
    const {error}=await supabase.from("matches").insert({title:f.t,mode:f.g||T[0],map:f.m||"BERMUDA",slots:+f.s||32,prize:+f.p||0,fee:+f.fee||0,starts_at:new Date(f.d).toISOString(),is_private:pv,code:pv?"X7"+Math.random().toString(36).slice(2,6).toUpperCase():null});
    if(error) return alert(error.message); setF({}); load() };
  const room = m => { const o=rooms[m.id]||{}, r=prompt("Room ID?",o.room_id||""); if(r===null) return; run(supabase.from("match_rooms").upsert({match_id:m.id,room_id:r,room_pass:prompt("Room password?",o.room_pass||"")||""})) };
  const setSt = (id,s) => run(supabase.from("matches").update({status:s}).eq("id",id));
  const pay = m => { const n=prompt("Winner name?"), w=allU.find(x=>x.name===n), a=+prompt("Prize amount ₹?",m.prize); if(!w||!(a>0)) return alert("User not found / bad amount"); rpc("admin_pay_winner",{p_match:m.id,p_user:w.id,p_amt:a}) };
  const adjust = x => { const a=+prompt("Add amount ₹ (negative to deduct)"); a&&rpc("admin_adjust_balance",{p_user:x.id,p_amt:a}) };

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
    if(nav==="home"){const ms=M.filter(m=>m.mode===tab&&m.status==="upcoming"&&!m.is_private); return <><Tabs list={T} cur={tab} set={setTab}/>{ms.length?ms.map(card):<p className="empty">No matches now. Check back soon!</p>}</>}
    if(nav==="my"){const ms=M.filter(m=>joined.includes(m.id)&&m.status===mt); return <><Tabs list={["upcoming","live","played"]} cur={mt} set={setMt} flex/>{ms.length?ms.map(card):<p className="empty">No matches now. Join upcoming!</p>}</>}
    if(nav==="store") return <p className="empty">Clash Store coming soon.</p>;
    const r=[...lb].sort((a,b)=>b.total_won-a.total_won), P=x=>x?(<div><div className="av">{x.name?.[0]}</div><b>{x.name}</b><div className="gn">₹{kf(x.total_won)}</div></div>):<div/>;
    if(!r.length) return <p className="empty">No winners yet. Be the first!</p>;
    return <><div className="pod">{P(r[1])}<div style={{marginTop:-14}}>{P(r[0])}</div>{P(r[2])}</div>
      <div className="lr" style={{fontWeight:600}}><b>Name</b>Rank</div>
      {r.slice(3).map((x,i)=><div key={x.id} className={"lr"+(x.id===me.id?" me":"")}><span className="av">{x.name?.[0]}</span><b>{x.name}<div className="gn">₹{kf(x.total_won)}</div></b>{i+4}</div>)}</>;
  };

  const sub = () => { const back=["account","private","withdraw","tx","support","results"].includes(page)?"profile":null; let t="",h=null;
    if(page==="wallet"){t="Wallet";h=<><div className="kv">Current Balance<b>₹{me.balance}</b></div><div className="kv">Winning Balance<b className="gn">₹{me.winnings}</b></div><p className="empty" style={{padding:20}}>To add money, pay the admin by UPI and send the payment screenshot via Customer Support. Your wallet is credited after verification.</p></>}
    if(page==="profile"){t="Profile";h=<><div style={{textAlign:"center",margin:10}}><div className="av" style={{width:90,height:90,fontSize:34,margin:"auto"}}>{me.name?.[0]}</div><h3 style={{marginTop:8}}>{me.name}</h3><p style={{fontSize:11,color:"#666"}}>{me.email}</p></div>
      {[["Account Settings","account"],["Join Private Tournament","private"],["Withdrawals","withdraw"],["Transactions","tx"],["Results","results"],["Customer Support","support"]].map(([n,x])=><div className="mi" key={x} onClick={()=>go(x,x==="account"?{n:me.name,g:me.game_id}:{})}>{n}<span>›</span></div>)}
      {isAdmin&&<a className="mi" href="#admin" style={{color:"var(--r)",textDecoration:"none",fontWeight:700}}>Admin Panel<span>›</span></a>}
      <button className="btn" style={{background:"#fef2f2",color:"var(--r)",marginTop:20}} onClick={logout}>Logout</button></>}
    if(page==="account"){t="Account";h=<>{inp("n","Game Name")}{inp("g","Game ID")}<button className="btn" onClick={saveAcc}>Save</button></>}
    if(page==="private"){t="Private Tournament";h=<>{inp("c","Enter room code")}<button className="btn" onClick={async()=>{if(await rpc("join_by_code",{p_code:f.c||""}))setPage(null)}}>Join</button></>}
    if(page==="withdraw"){t="Withdrawal";h=<><div className="kv">Winning Balance<b className="gn">₹{me.winnings}</b></div>{inp("a","Enter amount to withdraw","number")}{inp("u","Enter UPI Id")}<button className="btn gb" onClick={withdraw}>Withdraw</button></>}
    if(page==="tx"){t="Transactions";h=txs.length?txs.map(x=><div className="lr" key={x.id}><b>{x.note}<div style={{fontSize:10,color:"#777"}}>{new Date(x.created_at).toLocaleString()}</div></b><span className={x.amount>0?"gn":""}>{x.amount>0?"+":""}₹{x.amount}</span></div>):<p className="empty"><b>No Transactions Yet</b><br/>Your history appears here once you start playing.</p>}
    if(page==="results"){t="Results";const ps=M.filter(m=>m.status==="played");h=ps.length?ps.map(m=><div className="mi" key={m.id} style={{cursor:"default"}}><span>{m.title}<div className="gn">Winner: {m.winner_name||"-"}</div></span><b style={{color:"var(--r)"}}>₹{m.prize}</b></div>):<p className="empty">No results announced yet.</p>}
    if(page==="support"){t="Customer Support";h=<p className="empty">Add your WhatsApp / Telegram support link here.</p>}
    return <><div className="pgh"><span style={{cursor:"pointer",fontSize:20}} onClick={()=>go(back)}>←</span>{t}</div><div className="pgb">{h}</div></> };

  const admin = () => { let b=null;
    if(at==="Dashboard") b=<div className="grid">{[["Users",allU.length],["Matches",M.length],["Live now",M.filter(m=>m.status==="live").length],["Pending withdrawals",W.filter(w=>w.status==="pending").length]].map(([n,v])=><div className="stat" key={n}>{n}<h2>{v}</h2></div>)}</div>;
    if(at==="Matches") b=<>
      <div className="fg">{inp("t","Title")}<div><label>Mode</label><select value={f.g||T[0]} onChange={e=>setF({...f,g:e.target.value})}>{T.map(t=><option key={t}>{t}</option>)}</select></div>{inp("m","Map")}{inp("s","Slots","number")}{inp("p","Prize ₹","number")}{inp("fee","Entry fee ₹","number")}{inp("d","Start time","datetime-local")}
        <div><label>Type</label><select value={f.v||"0"} onChange={e=>setF({...f,v:e.target.value})}><option value="0">Public</option><option value="1">Private</option></select></div></div>
      <button className="btn" onClick={addMatch}>Create match</button>
      <table><tbody><tr><th>Match</th><th>Mode</th><th>Slots</th><th>Status</th><th>Actions</th></tr>
        {[...M].reverse().map(m=><tr key={m.id}><td>#{m.id} {m.title}{m.is_private?" 🔒"+m.code:""}</td><td>{m.mode}</td><td>{m.filled}/{m.slots}</td><td>{m.status}</td>
          <td><button className="sm" onClick={()=>room(m)}>Room</button><button className="sm" onClick={()=>setSt(m.id,"live")}>Live</button><button className="sm" onClick={()=>pay(m)}>Pay winner</button><button className="sm" onClick={()=>window.confirm("Delete match?")&&run(supabase.from("matches").delete().eq("id",m.id))}>Del</button></td></tr>)}</tbody></table></>;
    if(at==="Users") b=<table><tbody><tr><th>Name</th><th>Email</th><th>Game ID</th><th>Deposit</th><th>Winning</th><th></th></tr>
      {allU.map(x=><tr key={x.id}><td>{x.name}{x.banned?" (banned)":""}</td><td>{x.email}</td><td>{x.game_id||"-"}</td><td>₹{x.balance}</td><td>₹{x.winnings}</td><td><button className="sm" onClick={()=>adjust(x)}>± Balance</button><button className="sm" onClick={()=>rpc("admin_set_ban",{p_user:x.id,p_ban:!x.banned})}>{x.banned?"Unban":"Ban"}</button></td></tr>)}</tbody></table>;
    if(at==="Withdrawals") b=W.length?<table><tbody><tr><th>User</th><th>Amount</th><th>UPI</th><th>Status</th><th></th></tr>
      {W.map(w=><tr key={w.id}><td>{allU.find(x=>x.id===w.user_id)?.name}</td><td>₹{w.amount}</td><td>{w.upi}</td><td>{w.status}</td><td>{w.status==="pending"&&<><button className="sm" onClick={()=>rpc("admin_set_withdrawal",{p_id:w.id,p_ok:true})}>Approve</button><button className="sm" onClick={()=>rpc("admin_set_withdrawal",{p_id:w.id,p_ok:false})}>Reject</button></>}</td></tr>)}</tbody></table>:<p className="empty">No withdrawal requests</p>;
    return <><div className="brand" style={{fontSize:18}}><Logo s={36}/> ClashX7 Admin <a href="#" style={{marginLeft:"auto",fontSize:13}}>← Open app</a></div>
      <div style={{margin:"14px 0"}}>{["Dashboard","Matches","Users","Withdrawals"].map(x=><button key={x} className="sm" style={x===at?{background:"#111",color:"#fff"}:null} onClick={()=>{setAt(x);setF({})}}>{x}</button>)}</div>{b}</>;
  };

  const wrap = c => (<div className="x7"><style>{css}</style><div id="app" className={hash==="#admin"?"adm":""}>{c}</div></div>);
  if(!supabase) return wrap(<p className="empty">Supabase is not configured. In Vercel → Settings → Environment Variables add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b>, then redeploy.</p>);
  if(!ready) return wrap(<div className="sp"><Logo s={110}/>ClashX7</div>);
  if(!session) return wrap(<div className="login"><Logo s={80}/><h2 style={{margin:"10px 0"}}>ClashX7</h2>
    {mode==="up"&&inp("nm","Your name")}{inp("em","Email","email")}{inp("pw","Password","password")}
    <button className="btn" onClick={auth}>{mode==="up"?"Create account":"Login"}</button>
    <p style={{marginTop:14,color:"var(--r)",cursor:"pointer",fontSize:13}} onClick={()=>setMode(mode==="up"?"in":"up")}>{mode==="up"?"Already have an account? Login":"New here? Create account"}</p></div>);
  if(!me) return wrap(<p className="empty">Loading your profile… If this never finishes, run schema.sql in the Supabase SQL Editor.</p>);
  if(hash==="#admin") return wrap(isAdmin?admin():<p className="empty">Not authorized. <a href="#">Back to app</a></p>);
  return wrap(page ? sub() : <>
    <div className="hdr"><span className="av" onClick={()=>go("profile")}>{me.name?.[0]}</span><span className="brand"><Logo s={24}/>ClashX7</span><button className="ic" onClick={()=>go("wallet")}>₹{me.balance+me.winnings}</button></div>
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
`;
