/* ClashX7 — WEBSITE only (browser). App (APK/installed) ei file use kore na. */

export const WEB_CSS = `
.wsPage{min-height:100vh;width:100%;background:#0b0b10;color:#f5f5f7;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;position:relative;overflow-x:hidden}
.wsPage *{box-sizing:border-box}
.wsNav{display:flex;justify-content:space-between;align-items:center;padding:18px 6vw;position:sticky;top:0;z-index:10;background:#0b0b10ee;backdrop-filter:blur(8px);border-bottom:1px solid #ffffff12}
.wsBrand{display:flex;align-items:center;gap:10px;font-weight:900;letter-spacing:1px;font-size:18px}
.wsBrand img{width:34px;height:34px;border-radius:9px}
.wsNavBtns{display:flex;gap:10px}
.wsLink{background:none;border:0;color:#cbd5e1;font-size:14px;cursor:pointer;padding:8px 6px}
.wsBtn{height:48px;padding:0 22px;border:0;border-radius:10px;background:linear-gradient(135deg,#ffd23f,#f59e0b);color:#1a1200;font-weight:800;font-size:15px;cursor:pointer;letter-spacing:.3px}
.wsBtn:hover{filter:brightness(1.06)}
.wsGhost{height:48px;padding:0 20px;border-radius:10px;background:transparent;color:#f5f5f7;border:1px solid #ffffff33;font-weight:700;font-size:15px;cursor:pointer}
.wsHero{position:relative;text-align:center;padding:90px 6vw 80px;background:radial-gradient(ellipse at 50% 0%,#3b0d12 0,#0b0b10 60%)}
.wsKicker{display:inline-block;padding:6px 14px;border:1px solid #ffd23f55;border-radius:99px;color:#ffd23f;font-size:12px;font-weight:700;letter-spacing:1.5px}
.wsHero h1{font-size:clamp(40px,7vw,80px);line-height:1;margin:22px 0 14px;font-weight:900;letter-spacing:-1px}
.wsHero h1 em{font-style:normal;background:linear-gradient(135deg,#ffd23f,#ff5a4e);-webkit-background-clip:text;background-clip:text;color:transparent}
.wsHero p{max-width:580px;margin:0 auto;color:#a1a1aa;font-size:17px;line-height:1.6}
.wsCtas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:32px}
.wsStats{display:flex;gap:36px;justify-content:center;flex-wrap:wrap;margin-top:56px}
.wsStats b{display:block;font-size:30px;color:#ffd23f}
.wsStats span{font-size:12px;color:#8b8b95;letter-spacing:1px}
.wsSec{padding:72px 6vw;max-width:1100px;margin:0 auto}
.wsSec h2{font-size:clamp(26px,4vw,38px);margin:0 0 8px;font-weight:900}
.wsSec>p.sub{color:#8b8b95;margin:0 0 36px}
.wsGrid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.wsCard{padding:24px;border-radius:16px;background:#15151d;border:1px solid #ffffff10}
.wsCard .ic{font-size:28px}
.wsCard h3{margin:12px 0 6px;font-size:18px}
.wsCard p{margin:0;color:#8b8b95;font-size:14px;line-height:1.55}
.wsStep b{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#ffd23f;color:#1a1200;font-weight:900}
.wsChips{display:flex;flex-wrap:wrap;gap:10px}
.wsChips i{font-style:normal;padding:9px 16px;border-radius:99px;background:#1c1c26;border:1px solid #ffffff14;font-size:13px;font-weight:600}
.wsSupport{text-align:center;background:linear-gradient(180deg,#0b0b10,#2a0a0e);border-radius:24px;margin:0 6vw 40px;max-width:1100px;padding:56px 24px}
.wsSupport h2{margin:0 0 8px}
.wsFoot{padding:28px 6vw;text-align:center;color:#63636e;font-size:12px;line-height:1.7;border-top:1px solid #ffffff10}
.wsAuthWrap{min-height:calc(100vh - 70px);display:grid;place-items:center;padding:30px 16px}
.wsAuthCard{width:100%;max-width:420px;background:#15151d;border:1px solid #ffffff14;border-radius:22px;padding:30px 26px;box-shadow:0 30px 60px #0008}
.wsAuthCard h2{margin:0;font-size:26px;font-weight:900}
.wsSub{color:#8b8b95;font-size:14px;margin:6px 0 20px}
.wsTabs{display:grid;grid-template-columns:1fr 1fr;background:#0b0b10;border-radius:12px;padding:4px;margin-bottom:18px}
.wsTabs button{height:40px;border:0;border-radius:9px;background:transparent;color:#8b8b95;font-weight:700;cursor:pointer}
.wsTabs button.on{background:#ffd23f;color:#1a1200}
.wsField{display:block;margin-bottom:14px}
.wsField span{display:block;font-size:12px;color:#a1a1aa;margin-bottom:6px;font-weight:600}
.wsField input{width:100%;height:46px;border-radius:10px;border:1px solid #ffffff1f;background:#0b0b10;color:#f5f5f7;padding:0 14px;font-size:15px;outline:none}
.wsField input:focus{border-color:#ffd23f}
.wsAuthCard .wsBtn{width:100%;margin-top:6px}
.wsAuthCard .wsGhost{width:100%;margin-top:12px}
.wsAuthCard .wsNote{text-align:center;font-size:12px;color:#63636e;margin-top:14px}
.wsSplash{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(circle at 50% 40%,#5a0f16 0,#0b0b10 65%);color:#fff;overflow:hidden}
.wsGridBg{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:44px 44px;animation:wsPan 12s linear infinite}
.wsRing{position:absolute;width:340px;height:340px;border-radius:50%;border:1px solid #ffd23f44;box-shadow:0 0 80px #ffd23f22;animation:wsSpin 6s linear infinite}
.wsLogo{position:relative;width:118px;height:118px;border-radius:28px;box-shadow:0 20px 50px #0009;animation:wsIn .9s cubic-bezier(.2,1.3,.4,1) both}
.wsTag{position:relative;margin:0;font-size:13px;letter-spacing:3px;color:#ffd23f;font-weight:800;animation:wsIn .8s .3s both}
.wsBar{position:relative;width:180px;height:3px;border-radius:3px;background:#ffffff22;overflow:hidden}
.wsBar i{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#ff5a4e);animation:wsLoad 2s linear forwards}
.wsSplash small{position:relative;color:#8b8b95;font-size:11px;letter-spacing:1px}
@keyframes wsIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
@keyframes wsSpin{to{transform:rotate(360deg)}}
@keyframes wsPan{to{background-position:44px 44px}}
@keyframes wsLoad{from{width:0}to{width:100%}}
@media(max-width:600px){.wsHero{padding:60px 20px}.wsNavBtns .wsGhost{display:none}}
`;

const FEATURES = [
  ["🛡️", "Fair Play", "Strict anti-cheat rules, verified room results and transparent prize pools."],
  ["⚡", "Fast Withdrawal", "Request a withdrawal and get paid straight to your UPI ID."],
  ["💬", "Real Support", "Real people on WhatsApp / Telegram for deposits, matches and withdrawals."],
];

const STEPS = [
  ["1", "Create account", "Sign up free in about a minute."],
  ["2", "Add money & join", "Deposit by UPI and join a match that fits you."],
  ["3", "Win & withdraw", "Top the room, get paid and withdraw to UPI."],
];

/* ---------- Website splash ---------- */
export function WebSplash({ logo }) {
  return (
    <div className="wsSplash">
      <style>{WEB_CSS}</style>
      <div className="wsGridBg" />
      <div className="wsRing" />
      <img className="wsLogo" src={logo} alt="ClashX7" />
      <p className="wsTag">WHERE SKILLS MEETS REWARD</p>
      <div className="wsBar"><i /></div>
      <small>Loading tournaments…</small>
    </div>
  );
}

/* ---------- Website landing page ---------- */
export function WebLanding({ logo, modes, open, download, showDl, support }) {
  return (
    <div className="wsPage">
      <style>{WEB_CSS}</style>
      <header className="wsNav">
        <span className="wsBrand"><img src={logo} alt="" />ClashX7</span>
        <div className="wsNavBtns">
          <button className="wsLink" onClick={() => open("in")}>Login</button>
          <button className="wsBtn" onClick={() => open("up")}>Sign up</button>
        </div>
      </header>

      <section className="wsHero">
        <span className="wsKicker">DAILY CUSTOM-ROOM TOURNAMENTS</span>
        <h1>Play. <em>Win.</em> Withdraw.</h1>
        <p>Join daily custom-room tournaments, compete for real prize pools and cash out your winnings by UPI.</p>
        <div className="wsCtas">
          <button className="wsBtn" onClick={() => open("up")}>Create free account</button>
          <button className="wsGhost" onClick={() => open("in")}>Login</button>
          {showDl && <button className="wsGhost" onClick={download}>⬇ Download Android app</button>}
        </div>
        <div className="wsStats">
          <div><b>Daily</b><span>NEW MATCHES</span></div>
          <div><b>UPI</b><span>INSTANT PAYOUTS</span></div>
          <div><b>18+</b><span>PLAY RESPONSIBLY</span></div>
        </div>
      </section>

      <section className="wsSec">
        <h2>Why players choose ClashX7</h2>
        <p className="sub">Built on fair rules and fast payouts.</p>
        <div className="wsGrid3">
          {FEATURES.map(([e, t, d]) => (
            <div className="wsCard" key={t}><span className="ic">{e}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="wsSec">
        <h2>How it works</h2>
        <p className="sub">Three simple steps.</p>
        <div className="wsGrid3">
          {STEPS.map(([n, t, d]) => (
            <div className="wsCard wsStep" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="wsSec">
        <h2>Game modes</h2>
        <p className="sub">Pick your style and jump in.</p>
        <div className="wsChips">{modes.map(t => <i key={t}>{t}</i>)}</div>
      </section>

      <section className="wsSupport">
        <h2>Need help?</h2>
        <p style={{ color: "#a1a1aa", margin: "0 0 18px" }}>Our support team is here for you.</p>
        {support
          ? <a className="wsBtn" style={{ textDecoration: "none", display: "inline-block" }} href={support} target="_blank" rel="noreferrer">Contact support</a>
          : <button className="wsBtn" onClick={() => open("in")}>Login to continue</button>}
      </section>

      <footer className="wsFoot">
        © {new Date().getFullYear()} ClashX7 · 18+ only · Play responsibly<br />
        Games involve skill and risk. Never play with money you can't afford to lose.
      </footer>
    </div>
  );
}

/* ---------- Website login / signup page ---------- */
export function WebAuth({ mode, setMode, f, onChange, onSubmit, onBack, logo, download, showDl }) {
  const up = mode === "up";
  const field = (k, label, type = "text") => (
    <label className="wsField">
      <span>{label}</span>
      <input type={type} value={f[k] ?? ""} onChange={e => onChange(k, e.target.value)} />
    </label>
  );
  return (
    <div className="wsPage">
      <style>{WEB_CSS}</style>
      <header className="wsNav">
        <button className="wsLink" onClick={onBack}>← Home</button>
        <span className="wsBrand"><img src={logo} alt="" />ClashX7</span>
      </header>
      <main className="wsAuthWrap">
        <div className="wsAuthCard">
          <h2>{up ? "Create your account" : "Welcome back"}</h2>
          <p className="wsSub">{up ? "Join in a minute and start playing today." : "Login to join matches and manage your wallet."}</p>
          <div className="wsTabs">
            <button className={!up ? "on" : ""} onClick={() => setMode("in")}>Login</button>
            <button className={up ? "on" : ""} onClick={() => setMode("up")}>Sign up</button>
          </div>
          {up && field("un", "Username")}
          {up && field("ph", "Mobile number", "tel")}
          {field("em", up ? "Email" : "Email / Username / Mobile", up ? "email" : "text")}
          {field("pw", "Password", "password")}
          <button className="wsBtn" onClick={onSubmit}>{up ? "Create account" : "Login"}</button>
          {showDl && <button className="wsGhost" onClick={download}>⬇ Download Android app</button>}
          <p className="wsNote">18+ only · Play responsibly</p>
        </div>
      </main>
    </div>
  );
}
