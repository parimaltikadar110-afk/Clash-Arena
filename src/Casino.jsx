import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";

/* ClashX7 Casino v5
   Lobby -> Auto Roulette | Dragon Tiger | Aviator
   - Every outcome is decided on the server. One RPC per action. The client never picks a result.
   - Roulette wheel and ball are animated through refs (no re-render per frame).
   - Stats/history come from localStorage only. No DB calls for stats.
   - Optimistic balance: deducted at once, reverted if the RPC fails.
   - Props: supabase, me, reload (App load), say (App toast), cfg (app_settings 'casino_config') */

const HIST_KEY = "x7_casino_hist", DT_KEY = "x7_dt_hist", HIST_MAX = 50;
const BET_SECONDS = 12;
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const SEG = 360 / 37;
const CHIPS = [10, 25, 100, 500];
const CHIP_COL = { 1: ["#f3f4f6","#6b7280"], 5: ["#ef4444","#7f1d1d"], 10: ["#3b82f6","#1e3a8a"], 25: ["#22c55e","#14532d"], 100: ["#1f2937","#030712"], 500: ["#a855f7","#581c87"] };
const GOLD = "#d4af37", GOLD_L = "#facc15";
const FELT = "radial-gradient(ellipse at 50% 30%,#17703f 0%,#0d4a2a 60%,#082f1b 100%)";
const C_RED = "#b91c1c", C_BLK = "#111318", C_GRN = "#0f7a3c";
const RANK = ["", "A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const CSS = `
@keyframes x7drop{0%{transform:translateY(0)}70%{transform:translateY(34px)}80%{transform:translateY(25px)}88%{transform:translateY(31px)}94%{transform:translateY(28px)}100%{transform:translateY(32px)}}
@keyframes x7fall{0%{transform:translateY(-8vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:.9}}
@keyframes x7deal{0%{transform:translateY(-70px) scale(.8);opacity:0}100%{transform:none;opacity:1}}
@keyframes x7boom{0%{transform:scale(.2);opacity:1}100%{transform:scale(2.8);opacity:0}}
@keyframes x7shake{0%,100%{transform:translate(0)}20%{transform:translate(-5px,2px)}40%{transform:translate(5px,-2px)}60%{transform:translate(-4px,1px)}80%{transform:translate(4px,-1px)}}
@keyframes x7chip{0%{transform:translateY(-34px) scale(1.7);opacity:0}70%{transform:translateY(2px) scale(.94);opacity:1}100%{transform:none}}
@keyframes x7unchip{to{transform:scale(.2);opacity:0}}
@keyframes x7roll{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes x7tumble{0%{transform:rotateX(0deg) rotateY(0deg)}100%{transform:rotateX(720deg) rotateY(720deg)}}
@keyframes x7pulse{0%,100%{box-shadow:0 0 0 0 #facc1566}50%{box-shadow:0 0 0 10px #facc1500}}
`;

// Web Audio: the browser only lets sound play after a user tap, so the context is unlocked on the first tap.
let _ac = null;
// one master gain (louder) + compressor (no distortion) for every sound
let _master = null;
const masterOut = ac => {
  if (!_master || _master.context !== ac) {
    const g = ac.createGain();
    g.gain.value = 2.6;
    const c = ac.createDynamicsCompressor();
    c.threshold.value = -10; c.knee.value = 6; c.ratio.value = 4; c.attack.value = 0.003; c.release.value = 0.2;
    g.connect(c); c.connect(ac.destination);
    _master = g;
  }
  return _master;
};
const getAC = () => {
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === "suspended") _ac.resume();
    return _ac;
  } catch { return null; }
};
const unlockAudio = () => { getAC(); };
const playTone = (freq, dur) => {
  const ac = getAC();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(masterOut(ac));
    o.start(t); o.stop(t + dur + 0.03);
  } catch {}
};

const colorName = n => (n === 0 ? "green" : RED.includes(n) ? "red" : "black");
const numColor = n => (n === 0 ? C_GRN : RED.includes(n) ? C_RED : C_BLK);
const R = n => "₹" + Math.round(+n || 0).toLocaleString("en-IN");
const num = (v, d = 1) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : d);
const fx = v => num(v, 0).toFixed(2);
const RM = v => "₹" + (Math.floor(num(v, 0) * 100) / 100).toFixed(2);
const mod = (x, m) => ((x % m) + m) % m;
const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [150 + r * Math.sin(a), 150 - r * Math.cos(a)]; };
const btn = { background: "#16291d", color: "#f3efe0", border: `1px solid ${GOLD}`, borderRadius: 10, padding: "9px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" };
const friendly = e => { const m = e?.message || ""; return /closed|not available|Insufficient|Bet|Place|Too many|Unknown|login|Invalid|Round/i.test(m) ? m : "Connection lost"; };

const hits = (type, v, n) => {
  switch (type) {
    case "straight": return n === +v;
    case "red": return RED.includes(n);
    case "black": return n !== 0 && !RED.includes(n);
    case "even": return n !== 0 && n % 2 === 0;
    case "odd": return n % 2 === 1;
    case "low": return n >= 1 && n <= 18;
    case "high": return n >= 19 && n <= 36;
    case "dozen": return n !== 0 && n >= (v - 1) * 12 + 1 && n <= v * 12;
    case "column": return n !== 0 && (n - 1) % 3 === v - 1;
    default: return false;
  }
};
const wedge = (cx, cy, r1, r2, a1, a2) => {
  const p = (r, a) => { const t = (a * Math.PI) / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
  const [x1, y1] = p(r2, a1), [x2, y2] = p(r2, a2), [x3, y3] = p(r1, a2), [x4, y4] = p(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
};

/* ---------- casino chip ---------- */
function ChipToken({ value, size = 48, label, selected }) {
  const col = CHIP_COL[value] || ["#9ca3af", "#374151"];
  const b = Math.max(1, Math.round(size * 0.04));
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", boxSizing: "border-box",
      background: `repeating-conic-gradient(${col[0]} 0deg 14deg, #ffffffee 14deg 22deg)`,
      boxShadow: `0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.2)}px #000c, inset 0 0 0 ${b}px #0007`,
      outline: selected ? `2px solid ${GOLD_L}` : "none" }}>
      <div style={{ position: "absolute", inset: size * 0.16, borderRadius: "50%", boxSizing: "border-box",
        background: `radial-gradient(circle at 35% 30%, #ffffff55, transparent 42%), radial-gradient(circle, ${col[0]}, ${col[1]})`,
        border: `${b}px dashed #ffffffcc`, display: "grid", placeItems: "center",
        color: value === 1 ? "#111" : "#fff", fontWeight: 900, fontSize: Math.round(size * 0.3), textShadow: "0 1px 2px #000" }}>
        {label ?? value}
      </div>
    </div>
  );
}
const chipFor = amt => { let c = CHIPS[0]; CHIPS.forEach(x => { if (amt >= x) c = x; }); return c; };

/* ---------- shared hooks / UI ---------- */
function useBal(me) {
  const real = (+me.balance || 0) + (+me.winnings || 0);
  const [bal, setBal] = useState(real);
  useEffect(() => { setBal(real); }, [real]);
  return [bal, setBal, real];
}
function useFlash() {
  const [tip, setTip] = useState(null);
  const flash = useCallback(t => { setTip(t); setTimeout(() => setTip(null), 3000); }, []);
  return [tip, flash];
}
const Tip = ({ t }) => !t ? null : (
  <div style={{ position: "fixed", top: "40%", left: "50%", transform: "translateX(-50%)", background: "rgba(6,20,12,.96)",
    border: `1px solid ${GOLD}`, color: "#f3efe0", padding: "10px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13,
    zIndex: 80, whiteSpace: "nowrap", boxShadow: "0 8px 24px #000" }}>{t}</div>
);
// number that counts up from 0 to |value|
function CountUp({ value, prefix = "" }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, t0 = null;
    const target = Math.abs(value);
    const step = ts => {
      if (t0 === null) t0 = ts;
      const k = Math.min(1, (ts - t0) / 900);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{R(v)}</>;
}
// confetti burst, removes itself after ~3s
function Confetti() {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), 3000); return () => clearTimeout(t); }, []);
  if (!on) return null;
  const pieces = Array.from({ length: 48 }, (_, i) => ({
    l: (i * 37) % 100, d: (i % 9) * 0.08, c: ["#facc15", "#f87171", "#60a5fa", "#4ade80", "#f472b6", "#ffffff"][i % 6], w: 6 + (i % 4) * 2,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 95, overflow: "hidden" }}>
      {pieces.map((p, i) => (
        <span key={i} style={{ position: "absolute", top: "-5vh", left: p.l + "%", width: p.w, height: p.w * 1.6, background: p.c,
          borderRadius: 2, animation: `x7fall 2.4s ${p.d}s ease-in forwards` }} />
      ))}
    </div>
  );
}
const Chips = ({ value, onChange }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 9, flexWrap: "wrap", margin: "12px 0" }}>
    {CHIPS.map(c => (
      <button key={c} onClick={() => { playSfx(520, 0.03); onChange(c); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: "50%",
        transform: c === value ? "translateY(-4px) scale(1.06)" : "none", transition: "transform .15s" }}>
        <ChipToken value={c} size={50} selected={c === value} />
      </button>
    ))}
    <input type="number" min="10" inputMode="numeric" placeholder="Other ₹"
      onFocus={e => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
      onChange={e => { const v = Math.floor(+e.target.value); if (v >= 10) onChange(v); }}
      style={{ width: 84, height: 40, borderRadius: 10, border: `1px solid ${GOLD}`, background: "#0a1f14", color: "#f3efe0",
        padding: "0 8px", fontWeight: 800, boxSizing: "border-box" }} />
  </div>
);
const Shell = ({ title, onBack, right, children }) => (
  <div style={{ background: "linear-gradient(180deg,#0a1f14 0%,#050d09 100%)", minHeight: "100vh", color: "#f3efe0",
    padding: "8px 10px 110px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>
    <style>{CSS}</style>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <button onClick={onBack} style={btn}>← Lobby</button>
      <b style={{ flex: 1, color: GOLD_L, letterSpacing: .5 }}>{title}</b>
      {right}
    </div>
    {children}
  </div>
);
const BalBar = ({ bal, extra }) => (
  <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#050d09", borderTop: `1px solid ${GOLD}`,
    padding: "8px 12px calc(8px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: 12, zIndex: 50 }}>
    <div>Balance <b style={{ color: GOLD_L }}>{R(bal)}</b></div>
    <div style={{ opacity: .85, textAlign: "right" }}>{extra}</div>
  </div>
);
const Ring = ({ left, total }) => {
  const p = Math.max(0, Math.min(1, left / total)), C = 2 * Math.PI * 18;
  return (
    <svg width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r="18" stroke="rgba(255,255,255,.15)" strokeWidth="4" fill="none" />
      <circle cx="23" cy="23" r="18" stroke={GOLD_L} strokeWidth="4" fill="none" strokeDasharray={C}
        strokeDashoffset={C * (1 - p)} transform="rotate(-90 23 23)" style={{ transition: "stroke-dashoffset 1s linear" }} />
      <text x="23" y="28" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900">{left}</text>
    </svg>
  );
};

/* ---------- roulette local history (localStorage, max 50) ---------- */
function useLocalHistory() {
  const [hist, setHist] = useState(() => {
    try { const a = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); return Array.isArray(a) ? a.slice(0, HIST_MAX) : []; }
    catch { return []; }
  });
  const push = useCallback(n => {
    setHist(h => {
      const next = [{ n, color: colorName(n), ts: Date.now() }, ...h].slice(0, HIST_MAX);
      try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [hist, push];
}

/* ---------- wheel ----------
   Idle: slow turn while bets are open (DOM refs, no React re-render).
   Spin: the wheel turns to the server's pocket. The ball is driven by its own physics loop:
   it runs fast in the other direction, slows down, drops from the track, bounces with decaying
   height and wobble, and comes to rest exactly in the winning pocket at the top. */
const TRACK_R = 128, POCKET_R = 96, SPIN_MS = 4400, DROP_AT = 0.62;
const easeOutBounce = t => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
  t -= 2.625 / d1; return n1 * t * t + 0.984375;
};

const Wheel = memo(function Wheel({ target, spinId, spinning }) {
  const wheelRef = useRef(null), ballRef = useRef(null), ballCircleRef = useRef(null);
  const rotRef = useRef(0), ballRotRef = useRef(0), rafRef = useRef(null), idleRef = useRef(null);

  const setWheel = (deg, dur) => {
    const el = wheelRef.current;
    if (!el) return;
    el.style.transition = dur ? `transform ${dur} cubic-bezier(.17,.67,.2,1)` : "none";
    el.style.transform = `rotate(${deg}deg)`;
  };
  const setBall = (deg, r) => {
    if (ballRef.current) ballRef.current.style.transform = `rotate(${deg}deg)`;
    if (ballCircleRef.current) ballCircleRef.current.setAttribute("cy", String(150 - r));
  };

  // idle: slow turn while bets are open
  useEffect(() => {
    if (spinning) return;
    idleRef.current = setInterval(() => {
      rotRef.current += 0.4;
      ballRotRef.current -= 0.9;
      setWheel(rotRef.current, null);
      setBall(ballRotRef.current, TRACK_R);
    }, 50);
    return () => clearInterval(idleRef.current);
  }, [spinning]);

  // spin
  useEffect(() => {
    if (spinId === 0 || target == null) return;
    clearInterval(idleRef.current);
    const idx = ORDER.indexOf(target);
    const wStart = rotRef.current;
    const wEnd = wStart + 1800 + mod(-(idx * SEG) - wStart, 360);
    rotRef.current = wEnd;
    setWheel(wEnd, "3.6s");

    const b0 = ballRotRef.current;
    const bEnd = b0 - 2160 - mod(b0, 360);     // a whole number of turns: the ball ends at the top pocket
    const K = b0 - bEnd;
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / SPIN_MS);
      if (t >= 1) {
        ballRotRef.current = bEnd;
        setBall(bEnd, POCKET_R);
        return;
      }
      let theta = b0 - K * (1 - Math.pow(1 - t, 3));   // fast at first, slows down
      let r = TRACK_R;
      if (t > DROP_AT) {
        const q = (t - DROP_AT) / (1 - DROP_AT);
        r = TRACK_R - (TRACK_R - POCKET_R) * easeOutBounce(q);   // drops and bounces
        theta += (1 - q) * 9 * Math.sin(q * 26);                   // wobble that dies out on landing
      }
      setBall(theta, r);
      rafRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pockets = useMemo(() => ORDER.map((n, i) => {
    const a1 = i * SEG - SEG / 2, a2 = i * SEG + SEG / 2;
    const [x1, y1] = pt(126, a1), [x2, y2] = pt(126, a2), [x3, y3] = pt(66, a2), [x4, y4] = pt(66, a1);
    const d = `M${x1} ${y1} A126 126 0 0 1 ${x2} ${y2} L${x3} ${y3} A66 66 0 0 0 ${x4} ${y4} Z`;
    const [fx1, fy1] = pt(66, a1), [fx2, fy2] = pt(126, a1);
    const [tx, ty] = pt(96, i * SEG);
    return (
      <g key={n}>
        <path d={d} fill={numColor(n)} />
        <line x1={fx1} y1={fy1} x2={fx2} y2={fy2} stroke="#d1d5db" strokeWidth=".9" />
        <text x={tx} y={ty} fill="#fff" fontSize="8.5" fontWeight="800" textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(${i * SEG} ${tx} ${ty})`}>{n}</text>
      </g>
    );
  }), []);

  return (
    <div style={{ position: "relative", width: "min(80vw,300px)", aspectRatio: "1", margin: "0 auto",
      transform: "perspective(900px) rotateX(18deg)", filter: "drop-shadow(0 26px 26px #000d)" }}>
      <div style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${GOLD_L}`,
        zIndex: 3, filter: "drop-shadow(0 2px 2px #000)" }} />
      <svg ref={wheelRef} viewBox="0 0 300 300" style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%" }}>
        <defs>
          <radialGradient id="x7wood" cx="50%" cy="45%" r="70%">
            <stop offset="0" stopColor="#7a4a22" /><stop offset=".65" stopColor="#4a2810" /><stop offset="1" stopColor="#24130a" />
          </radialGradient>
          <linearGradient id="x7rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbeaa0" /><stop offset=".5" stopColor="#b8860b" /><stop offset="1" stopColor="#5b3e08" />
          </linearGradient>
          <radialGradient id="x7hubwood" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#4b2c14" /><stop offset="1" stopColor="#1a0e06" />
          </radialGradient>
          <radialGradient id="x7hub" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff7c2" /><stop offset=".5" stopColor={GOLD_L} /><stop offset="1" stopColor="#7a5200" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="148" fill="url(#x7wood)" />
        <circle cx="150" cy="150" r="141" fill="none" stroke="url(#x7rim)" strokeWidth="6" />
        <circle cx="150" cy="150" r="146" fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="3" />
        <circle cx="150" cy="150" r="133" fill="#0a0a0a" />
        {pockets}
        <circle cx="150" cy="150" r="126" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="10" />
        <circle cx="150" cy="150" r="66" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="6" />
        <circle cx="150" cy="150" r="66" fill="url(#x7hubwood)" stroke={GOLD} strokeWidth="1.5" />
        {[0,1,2,3,4,5,6,7].map(k => { const [a, b] = pt(58, k * 45), [c, e] = pt(16, k * 45); return <line key={k} x1={a} y1={b} x2={c} y2={e} stroke={GOLD} strokeWidth="2" />; })}
        <circle cx="150" cy="150" r="22" fill="url(#x7hub)" />
      </svg>
      <svg ref={ballRef} viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <radialGradient id="x7ball" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#d1d5db" /><stop offset="1" stopColor="#6b7280" />
          </radialGradient>
        </defs>
        <circle ref={ballCircleRef} cx="150" cy="22" r="5.5" fill="url(#x7ball)" stroke="#374151" strokeWidth=".6" style={{ filter: "drop-shadow(2px 3px 2px #000b)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle at 32% 22%, #ffffff2e, transparent 42%)" }} />
    </div>
  );
});

/* ---------- one betting cell (memo) ---------- */
const Cell = memo(function Cell({ type, value, label, bg, amount, win, onPlace, vertical, flexy, tall, fs, ghost = 0 }) {
  return (
    <div onClick={() => onPlace(type, value)}
      style={{ position: "relative", background: bg, color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: fs || 12,
        cursor: "pointer", userSelect: "none", boxSizing: "border-box", height: tall || undefined,
        flex: flexy ? 1 : undefined, writingMode: vertical ? "vertical-rl" : undefined, letterSpacing: vertical ? 1 : 0,
        boxShadow: win ? `0 0 0 2px ${GOLD_L}, 0 0 14px ${GOLD_L}` : "inset 0 1px 0 rgba(255,255,255,.15)",
        animation: win ? "x7pulse 1s ease-in-out infinite" : "none", transition: "box-shadow .3s" }}>
      {label}
      {ghost > 0 && (
        <span key={"g" + ghost} style={{ position: "absolute", top: -7, right: -5, background: `radial-gradient(circle at 35% 30%,#fff7c2,${GOLD})`,
          color: "#1a1200", borderRadius: 99, fontSize: 9, fontWeight: 900, padding: "2px 5px", animation: "x7unchip .3s ease-in forwards", pointerEvents: "none" }}>{ghost}</span>
      )}
      {amount > 0 && <div key={amount} style={{ position: "absolute", top: -10, right: -8, animation: "x7chip .35s ease-out" }}><ChipToken value={chipFor(amount)} size={28} label={amount} /></div>}
    </div>
  );
});

/* ---------- racetrack (straight-number bets, same placement logic as the grid) ---------- */
function RaceTrack({ place, amounts, winNum }) {
  return (
    <div style={{ position: "relative", margin: "16px auto 0", width: 320, maxWidth: "100%", height: 210, background: FELT,
      borderRadius: 130, border: `2px solid ${GOLD}`, boxShadow: "inset 0 0 30px #0008" }}>
      {ORDER.map((n, i) => {
        const t = (i * SEG * Math.PI) / 180;
        const x = 160 + 118 * Math.sin(t), y = 105 - 80 * Math.cos(t);
        const a = amounts[`straight:${n}`] || 0, win = winNum !== null && n === winNum;
        return (
          <div key={n} onClick={() => place("straight", n)} style={{ position: "absolute", left: x - 16, top: y - 16, width: 32, height: 32,
            borderRadius: "50%", background: numColor(n), color: "#fff", border: "1px solid #ffffff55", display: "grid", placeItems: "center",
            fontSize: 11, fontWeight: 900, cursor: "pointer", boxSizing: "border-box",
            boxShadow: win ? `0 0 0 2px ${GOLD_L}, 0 0 14px ${GOLD_L}` : "0 2px 4px #000a" }}>
            {n}
            {a > 0 && <span style={{ position: "absolute", top: -7, right: -6, background: GOLD_L, color: "#111", borderRadius: 99, fontSize: 9, padding: "1px 4px", fontWeight: 900 }}>{a}</span>}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", color: GOLD_L, fontWeight: 900, fontSize: 12, letterSpacing: 1, textAlign: "center" }}>
        RACETRACK<div style={{ fontSize: 10, opacity: .7, fontWeight: 600 }}>tap a number</div>
      </div>
    </div>
  );
}

/* ---------- statistics modal (local history only, no DB calls) ---------- */
const CATS = [
  ["1st 12", x => x.n >= 1 && x.n <= 12], ["2nd 12", x => x.n >= 13 && x.n <= 24], ["3rd 12", x => x.n >= 25 && x.n <= 36],
  ["1st col", x => x.n > 0 && (x.n - 1) % 3 === 0], ["2nd col", x => x.n > 0 && (x.n - 1) % 3 === 1], ["3rd col", x => x.n > 0 && (x.n - 1) % 3 === 2],
  ["1-18", x => x.n >= 1 && x.n <= 18], ["Even", x => x.n > 0 && x.n % 2 === 0], ["Red", x => x.color === "red"],
  ["Black", x => x.color === "black"], ["Odd", x => x.n % 2 === 1], ["19-36", x => x.n >= 19], ["Zero", x => x.n === 0],
];
function StatsModal({ hist, onClose }) {
  const [tab, setTab] = useState("hc");
  const [len, setLen] = useState(50);
  const H = hist.slice(0, len);              // hist is newest first
  const n = H.length;
  const freq = Array(37).fill(0);
  H.forEach(x => { freq[x.n]++; });
  const maxF = Math.max(1, ...freq);
  const ranked = freq.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c || a.i - b.i);
  const hot = ranked.slice(0, 5).filter(r => r.c > 0);
  // cold = numbers absent for the longest time (in the whole history we have)
  const lastSeen = {};
  hist.forEach((x, idx) => { if (lastSeen[x.n] === undefined) lastSeen[x.n] = idx; });
  const cold = [...Array(37).keys()].map(i => ({ i, age: lastSeen[i] === undefined ? 9999 : lastSeen[i] }))
    .sort((a, b) => b.age - a.age).slice(0, 5);
  const hotSet = new Set(hot.map(h => h.i)), coldSet = new Set(cold.map(c => c.i));
  const pct = pred => (n ? Math.round((H.filter(pred).length / n) * 100) : 0);

  const tabBtn = (k, l) => (
    <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: 9, border: "none", background: "none", cursor: "pointer",
      color: tab === k ? GOLD_L : "#f3efe0", fontWeight: 800, borderBottom: `2px solid ${tab === k ? GOLD_L : "transparent"}` }}>{l}</button>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0a1f14", border: `1px solid ${GOLD}`, borderRadius: 16, width: "min(94vw,380px)",
        maxHeight: "86vh", display: "flex", flexDirection: "column", color: "#f3efe0", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${GOLD}55` }}>
          <b style={{ flex: 1, color: GOLD_L }}>Statistics</b>
          <button onClick={onClose} style={{ ...btn, padding: "4px 10px" }}>✕</button>
        </div>
        <div style={{ display: "flex", borderBottom: `1px solid ${GOLD}33` }}>
          {tabBtn("hc", "HOT / COLD")}{tabBtn("adv", "ADVANCED")}{tabBtn("last", `LAST ${len}`)}
        </div>

        <div style={{ padding: 14, overflowY: "auto" }}>
          {n === 0 && <p style={{ fontSize: 13, opacity: .7, textAlign: "center" }}>No spins yet on this device.</p>}

          {n > 0 && tab === "hc" && (
            <>
              <svg viewBox="-110 -110 220 220" style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }}>
                <circle r="30" fill="#0d4a2a" stroke={GOLD} strokeWidth="1.5" />
                {Array.from({ length: 37 }, (_, i) => {
                  const f = freq[i], len2 = 18 + 70 * (f / maxF), t = (i * SEG * Math.PI) / 180;
                  const hotS = hotSet.has(i), coldS = coldSet.has(i);
                  const col = hotS ? "#ef4444" : coldS ? "#60a5fa" : "#6b7280";
                  return <line key={i} x1={30 * Math.sin(t)} y1={-30 * Math.cos(t)} x2={(30 + len2) * Math.sin(t)} y2={-(30 + len2) * Math.cos(t)}
                    stroke={col} strokeWidth={hotS || coldS ? 4 : 2} strokeLinecap="round" />;
                })}
              </svg>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 800 }}>🔥 Hot</p>
                  {hot.map(h => <div key={h.i} style={{ fontSize: 13, padding: "3px 0" }}>#{h.i} · {h.c}×</div>)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 800 }}>❄️ Cold</p>
                  {cold.map(c => <div key={c.i} style={{ fontSize: 13, padding: "3px 0" }}>#{c.i} · {c.age === 9999 ? "never" : `${c.age} ago`}</div>)}
                </div>
              </div>
              <p style={{ margin: "12px 0 6px", fontWeight: 800, fontSize: 12 }}>Last 20</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {hist.slice(0, 20).map((h, i) => (
                  <span key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: numColor(h.n), border: "1px solid #ffffff55" }} />
                ))}
              </div>
            </>
          )}

          {n > 0 && tab === "adv" && (
            <>
              {CATS.map(([label, pred]) => {
                const v = pct(pred);
                return (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}><span>{label}</span><b>{v}%</b></div>
                    <div style={{ height: 8, borderRadius: 6, background: "#ffffff14", overflow: "hidden" }}>
                      <div style={{ width: `${v}%`, height: "100%", background: `linear-gradient(90deg,${GOLD},${GOLD_L})`, transition: "width .5s" }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === "last" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4 }}>
                {H.map((h, i) => (
                  <span key={i} style={{ height: 24, borderRadius: 4, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800,
                    background: numColor(h.n), color: "#fff" }}>{h.n}</span>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 13, fontWeight: 800, textAlign: "center" }}>LAST {len} ROUNDS</div>
              <input type="range" min="5" max="50" step="1" value={len} onChange={e => setLen(+e.target.value)}
                style={{ width: "100%", accentColor: GOLD_L }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= AUTO ROULETTE ================= */
function Roulette({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [hist, pushHist] = useLocalHistory();
  const [bal, setBal, realBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [stack, setStack] = useState([]);
  const [lastBets, setLastBets] = useState([]);
  const [chip, setChip] = useState(10);
  const [auto, setAuto] = useState(false);
  const [phase, setPhase] = useState("bet");     // bet | spinning | result
  const [count, setCount] = useState(BET_SECONDS);
  const [target, setTarget] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [winNum, setWinNum] = useState(null);
  const [last, setLast] = useState(null);
  const [burst, setBurst] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [track, setTrack] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sound, setSound] = useState(soundOn);
  const [favBets, setFavBets] = useState(() => { try { return JSON.parse(localStorage.getItem("x7_fav_bets") || "[]"); } catch { return []; } });
  const toggleSound = () => { setSound(v => { const n = !v; try { localStorage.setItem("x7_sound", n ? "on" : "off"); } catch {} return n; }); };
  const sfx = (f, d) => { if (sound) playSfx(f, d); };

  const aggregate = list => {
    const m = new Map();
    list.forEach(s => { const c = m.get(s.key) || { key: s.key, type: s.type, value: s.value, amount: 0 }; c.amount += s.amount; m.set(s.key, c); });
    return [...m.values()];
  };
  const bets = useMemo(() => aggregate(stack), [stack]);
  const total = useMemo(() => bets.reduce((a, b) => a + b.amount, 0), [bets]);
  const amounts = useMemo(() => { const o = {}; bets.forEach(b => { o[b.key] = b.amount; }); return o; }, [bets]);

  const place = useCallback((type, value = null) => {
    if (phase !== "bet") return;
    if (total + chip > bal) return flash("Balance too low");
    if (total + chip > MAX) return flash(`Max bet ${R(MAX)}`);
    setStack(s => [...s, { key: `${type}:${value ?? ""}`, type, value, amount: chip }]);
  }, [phase, total, chip, bal, MAX]); // eslint-disable-line react-hooks/exhaustive-deps

  const [ghost, setGhost] = useState(null);
  const undo = () => {
    if (phase !== "bet" || !stack.length) return;
    const last = stack[stack.length - 1];
    setGhost({ key: last.key, amount: last.amount });
    setTimeout(() => setGhost(null), 320);
    setStack(s => s.slice(0, -1));
  };
  const clear = () => { if (phase === "bet") setStack([]); };
  const saveFav = () => {
    if (!stack.length) return flash("Place a bet first");
    setFavBets(stack);
    try { localStorage.setItem("x7_fav_bets", JSON.stringify(stack)); } catch {}
    flash("Saved as favorite");
  };
  const applyFav = () => {
    if (phase !== "bet") return;
    if (!favBets.length) return flash("No favorite saved");
    const sum = favBets.reduce((a, b) => a + b.amount, 0);
    if (sum > bal) return flash("Balance too low");
    setStack(favBets.map(b => ({ ...b })));
  };
  const dbl = () => {
    if (phase !== "bet" || !bets.length) return;
    if (total * 2 > bal) return flash("Balance too low");
    if (total * 2 > MAX) return flash(`Max bet ${R(MAX)}`);
    setStack(s => [...s, ...bets.map(b => ({ ...b }))]);
  };

  const spin = async () => {
    if (phase !== "bet") return;
    let list = bets;
    if (!list.length && auto && lastBets.length) list = lastBets;
    if (!list.length) { setCount(BET_SECONDS); return; }
    const sum = list.reduce((a, b) => a + b.amount, 0);
    if (sum < MIN) { setCount(BET_SECONDS); return flash(`Minimum bet ${R(MIN)}`); }
    if (sum > bal) { setAuto(false); setCount(BET_SECONDS); return flash("Balance too low for AUTO"); }

    const before = bal;
    setPhase("spinning"); setWinNum(null); setBal(before - sum); sfx(220, 0.08);
    const { data, error } = await supabase.rpc("casino_spin", {
      p_game: "roulette", p_bet: sum,
      p_choice: list.map(b => ({ type: b.type, value: b.value, amount: b.amount })),
    });
    if (error || !data?.success) {
      setBal(before); setPhase("bet"); setCount(BET_SECONDS);
      return say ? say(friendly(error), 1) : flash(friendly(error));
    }
    setTarget(data.number); setSpinId(x => x + 1);
    setTimeout(() => {
      const net = data.won_amount - sum;
      setWinNum(data.number);
      pushHist(data.number);
      setLastBets(list);
      setStack([]);
      setBal(data.new_balance);
      setLast({ n: data.number, net, stake: sum, payout: data.won_amount });
      if (net > 0) { flash(`WON ${R(data.won_amount)}`); playSfx(880, 0.25); speakWin(data.won_amount); }
      if (net > 0) setBurst(b => b + 1);
      setPhase("result");
      reload && reload();
      setTimeout(() => { setWinNum(null); setPhase("bet"); setCount(BET_SECONDS); }, 4500);
    }, 4200);
  };

  const spinRef = useRef(spin);
  spinRef.current = spin;

  useEffect(() => {
    if (phase !== "bet") return;
    const t = setTimeout(() => { if (count <= 1) spinRef.current(); else setCount(c => c - 1); }, 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  const cell = (type, value, label, bg, opts = {}) => (
    <Cell key={`${type}:${value ?? ""}`} type={type} value={value} label={label} bg={bg}
      amount={amounts[`${type}:${value ?? ""}`] || 0}
      ghost={ghost && ghost.key === `${type}:${value ?? ""}` ? ghost.amount : 0}
      win={winNum !== null && hits(type, value, winNum)} onPlace={place} {...opts} />
  );
  const numRows = Array.from({ length: 12 }, (_, r) => [3, 2, 1].map(k => 3 * r + k));
  const statusBg = phase === "result" && last ? (last.net > 0 ? "#14532d" : last.net < 0 ? "#7f1d1d" : "#374151") : "rgba(0,0,0,.35)";

  return (
    <Shell title="Auto Roulette" onBack={onBack}
      right={<>
        <button onClick={() => setAuto(a => !a)} style={{ ...btn, background: auto ? GOLD : "#16291d", color: auto ? "#111" : "#f3efe0" }}>AUTO {auto ? "ON" : "OFF"}</button>
        <button onClick={toggleSound} style={btn}>{sound ? "🔊" : "🔇"}</button>
        <button onClick={() => setCollapsed(c => !c)} style={btn}>{collapsed ? "▲" : "▼"}</button>
        <button onClick={() => setTrack(t => !t)} style={btn}>{track ? "Grid" : "Track"}</button>
        <button onClick={() => setShowStats(true)} style={btn}>Stats</button>
      </>}>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0 10px" }}>
        {hist.length === 0 && <span style={{ fontSize: 12, opacity: .6 }}>No spins yet</span>}
        {hist.slice(0, 20).map((h, i) => (
          <span key={h.ts + "-" + i} style={{ minWidth: 28, height: 28, borderRadius: 99, display: "grid", placeItems: "center",
            fontSize: 12, fontWeight: 800, background: numColor(h.n), color: "#fff", border: `1px solid ${GOLD}`, flex: "0 0 auto" }}>{h.n}</span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, borderRadius: 12,
        background: statusBg, border: `1px solid ${GOLD}66`, marginBottom: 14, padding: "6px 10px", fontWeight: 900, fontSize: 14 }}>
        {phase === "bet" && <><Ring left={count} total={BET_SECONDS} /><span>Place your bets</span></>}
        {phase === "spinning" && <span>No more bets</span>}
        {phase === "result" && last && <span>Result #{last.n}</span>}
      </div>

      {last && last.net > 0 && (() => {
        const k = "win";
        const bg = k === "win" ? "linear-gradient(135deg,#15803d,#166534)" : k === "lose" ? "linear-gradient(135deg,#b91c1c,#7f1d1d)" : "#374151";
        return (
          <div style={{ borderRadius: 14, padding: "10px 12px", marginBottom: 14, background: bg, color: "#fff", border: `1px solid ${GOLD}`,
            boxShadow: "0 6px 18px #000a", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
              WON {R(last.payout)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>Bet {R(last.stake)} · Win {R(last.net)} · Total {R(last.payout)}</div>
          </div>
        );
      })()}

      {!collapsed && <Wheel target={target} spinId={spinId} spinning={phase === "spinning"} />}

      {!collapsed && (track ? <RaceTrack place={place} amounts={amounts} winNum={winNum} /> : <div style={{ marginTop: 16, background: FELT, borderRadius: 14, padding: 10, border: `2px solid ${GOLD}`, boxShadow: "inset 0 0 30px #0008" }}>
        {cell("straight", 0, "0", C_GRN, { tall: 36 })}
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", gap: 4, marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cell("low", null, "1-18", C_BLK, { flexy: true })}{cell("even", null, "EVEN", C_BLK, { flexy: true })}
            {cell("red", null, "◆", C_RED, { flexy: true, fs: 16 })}{cell("black", null, "◆", C_BLK, { flexy: true, fs: 16 })}
            {cell("odd", null, "ODD", C_BLK, { flexy: true })}{cell("high", null, "19-36", C_BLK, { flexy: true })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
            {numRows.flat().map(n => cell("straight", n, n, numColor(n), { tall: 34 }))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cell("dozen", 1, "1ST 12", C_BLK, { flexy: true, vertical: true })}
            {cell("dozen", 2, "2ND 12", C_BLK, { flexy: true, vertical: true })}
            {cell("dozen", 3, "3RD 12", C_BLK, { flexy: true, vertical: true })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", gap: 4, marginTop: 4 }}>
          <div />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
            {[3, 2, 1].map(c => cell("column", c, "2 TO 1", C_BLK, { tall: 30 }))}
          </div>
          <div />
        </div>
      </div>)}

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={undo} style={btn}>UNDO</button>
        <button onClick={dbl} style={btn}>x2 DOUBLE</button>
        <button onClick={clear} style={btn}>CLEAR</button>
        <button onClick={saveFav} style={btn}>⭐ Save</button>
        <button onClick={applyFav} style={btn}>⭐ Apply</button>
      </div>

      <BalBar bal={bal} extra={<>Bet <b>{R(total)}</b> · {R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
      {showStats && <StatsModal hist={hist} onClose={() => setShowStats(false)} />}
    </Shell>
  );
}

/* ================= DRAGON TIGER ================= */
function PlayCard({ rank, label, color, shown, glow }) {
  return (
    <div style={{ width: 96, height: 136, perspective: 700, animation: "x7deal .5s ease-out both",
      filter: glow ? `drop-shadow(0 0 12px ${GOLD_L})` : "none" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d",
        transition: "transform .7s cubic-bezier(.3,.7,.3,1)", transform: shown ? "rotateY(180deg)" : "none" }}>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, border: `2px solid ${GOLD}`,
          background: `repeating-linear-gradient(45deg,${color} 0 8px,#111 8px 16px)`, boxShadow: "0 8px 20px #000a" }} />
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 12,
          border: `2px solid ${GOLD}`, background: "#fff", color: "#111", display: "grid", placeItems: "center",
          fontWeight: 900, fontSize: 38, boxShadow: "0 8px 20px #000a" }}>{shown && rank ? RANK[rank] : ""}</div>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 900, marginTop: 6, letterSpacing: 1, color: GOLD_L }}>{label}</div>
    </div>
  );
}

function DragonTiger({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal, realBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [side, setSide] = useState("dragon");
  const [chip, setChip] = useState(10);
  const [busy, setBusy] = useState(false);
  const [deal, setDeal] = useState(0);            // changes every deal, so the cards are dealt again
  const [cards, setCards] = useState(null);       // {dragon, tiger} ranks from the server
  const [shown, setShown] = useState(false);      // flips the cards face up
  const [res, setRes] = useState(null);
  const [burst, setBurst] = useState(0);
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem(DT_KEY) || "[]"); } catch { return []; } });

  const dealCards = async () => {
    if (busy) return;
    if (chip < MIN || chip > MAX) return flash(`Bet between ${R(MIN)} and ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBusy(true); setRes(null); setShown(false); setCards(null); setBal(before - chip); setDeal(d => d + 1); playSfx(300, 0.06);
    const { data, error } = await supabase.rpc("casino_dragon_tiger", { p_bet: chip, p_side: side });
    if (error || !data?.success) { setBal(before); setBusy(false); return say ? say(friendly(error), 1) : flash(friendly(error)); }
    setCards({ dragon: data.dragon, tiger: data.tiger });
    setTimeout(() => setShown(true), 600);          // flip after the deal animation
    setTimeout(() => {
      const net = data.won_amount - chip;
      setRes({ winner: data.winner, net, won: num(data.won_amount, 0) });
      setBal(data.new_balance);
      if (net > 0) { setBurst(b => b + 1); speakWin(data.won_amount); }
      const nh = [{ w: data.winner, ts: Date.now() }, ...hist].slice(0, 50);
      setHist(nh);
      try { localStorage.setItem(DT_KEY, JSON.stringify(nh)); } catch {}
      setBusy(false);
      reload && reload();
    }, 1500);
  };

  const sideBtn = (k, label, odds) => (
    <button key={k} onClick={() => setSide(k)} style={{ flex: 1, padding: "12px 6px", borderRadius: 12, fontWeight: 900, cursor: "pointer",
      border: `2px solid ${side === k ? GOLD_L : "#2f4a3a"}`, background: side === k ? `linear-gradient(180deg,#fde68a,${GOLD})` : "#0f2418",
      color: side === k ? "#111" : "#f3efe0", transform: side === k ? "translateY(-2px)" : "none", transition: "transform .15s" }}>
      {label}<div style={{ fontSize: 11, fontWeight: 700 }}>{odds}</div>
    </button>
  );

  return (
    <Shell title="Dragon Tiger" onBack={onBack}>
      <div style={{ background: FELT, borderRadius: 16, padding: "18px 10px 14px", border: `2px solid ${GOLD}`, minHeight: 230 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 22 }}>
          {cards && <PlayCard key={`d${deal}`} rank={cards.dragon} label="DRAGON" color="#b91c1c" shown={shown} glow={res?.winner === "dragon"} />}
          {cards && <PlayCard key={`t${deal}`} rank={cards.tiger} label="TIGER" color="#b45309" shown={shown} glow={res?.winner === "tiger"} />}
          {!cards && <div style={{ height: 150, display: "grid", placeItems: "center", opacity: .5, fontSize: 13 }}>Place a bet and deal</div>}
        </div>
        <div style={{ textAlign: "center", minHeight: 40, marginTop: 12, fontWeight: 900, fontSize: 16 }}>
          {busy && !res && <span style={{ opacity: .8 }}>Dealing…</span>}
          {res && (
            <span style={{ color: res.net > 0 ? "#86efac" : res.net < 0 ? "#fca5a5" : "#e5e7eb" }}>
              {res.winner === "tie" ? "TIE" : res.winner.toUpperCase() + " WINS"} · {res.net > 0 ? <>WON <CountUp value={res.won} /></> : res.net < 0 ? "" : "RETURNED ₹0"}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {sideBtn("dragon", "DRAGON", "1 : 1")}
        {sideBtn("tie", "TIE", "11 : 1")}
        {sideBtn("tiger", "TIGER", "1 : 1")}
        {sideBtn("suited_tie", "SUITED TIE", "50 : 1")}
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={dealCards} disabled={busy} style={{ ...btn, background: `linear-gradient(180deg,#fde68a,${GOLD})`, color: "#111", padding: "12px 34px", fontSize: 15, opacity: busy ? .5 : 1 }}>
          DEAL {R(chip)}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 5, marginTop: 14 }}>
        {Array.from({ length: 30 }, (_, i) => hist[i]).map((h, i) => (
          <span key={i} title={h ? h.w : ""} style={{ width: 14, height: 14, borderRadius: "50%", margin: "0 auto",
            background: !h ? "#1e293b" : h.w === "dragon" ? "#ef4444" : h.w === "tiger" ? "#facc15" : "#22c55e" }} />
        ))}
      </div>

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </Shell>
  );
}

/* ================= AVIATOR =================
   Presentation + round control. The server decides the crash point and settles every cash out.
   Client only: starts a round, polls the round status, sends the cash out, and draws what the server reports. */
const AV_K = 0.07;                 // server curve: multiplier(t) = e^(K * t)
const AV_HIST_KEY = "x7_av_hist";
const AV_W = 300, AV_H = 180;
const AV_QUICK = [10, 25, 100, 500];

function Aviator({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();

  const [phase, setPhase] = useState("idle");          // idle | flying | done
  const [busy, setBusy] = useState(false);             // start request in progress
  const [chip, setChip] = useState(10);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [autoOn, setAutoOn] = useState(false);
  const [autoAt, setAutoAt] = useState("2.00");
  const [m, setM] = useState(1);
  const [pts, setPts] = useState([1]);
  const [res, setRes] = useState(null);                // { won, crash, net }
  const [boom, setBoom] = useState(false);
  const [shake, setShake] = useState(false);
  const [crashes, setCrashes] = useState(() => { try { const a = JSON.parse(localStorage.getItem(AV_HIST_KEY) || "[]"); return Array.isArray(a) ? a.slice(0, 10) : []; } catch { return []; } });
  const pushCrash = c => setCrashes(h => {
    if (!Number.isFinite(Number(c))) return h;
    const n = [Number(c), ...h].slice(0, 10);
    try { localStorage.setItem(AV_HIST_KEY, JSON.stringify(n)); } catch {}
    return n;
  });
  const [burst, setBurst] = useState(0);

  const roundRef = useRef(null), timer = useRef(null), poll = useRef(null), finRef = useRef(null);
  const doneRef = useRef(false), stakeRef = useRef(0), mRef = useRef(1);
  const startRef = useRef(0), offRef = useRef(0);      // server start time (ms) and clock offset
  const autoRef = useRef(0);
  autoRef.current = autoOn ? (parseFloat(autoAt) || 0) : 0;

  useEffect(() => () => { clearInterval(timer.current); clearInterval(poll.current); clearInterval(finRef.current); }, []);

  // multiplier on the same curve as the server, measured from the server's start time
  const curM = () => Math.max(1, Math.exp(AV_K * ((Date.now() + offRef.current - startRef.current) / 1000)));

  function explode() {
    setBoom(true); setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  // round is over. A win keeps the plane flying to the real crash point; a loss stops it there.
  function finish(rawCrash, won) {
    const crash = Math.max(1, num(rawCrash, Math.max(1, mRef.current)));
    pushCrash(crash);
    playSfx(won ? 880 : 110, won ? 0.2 : 0.5);
    clearInterval(timer.current);
    clearInterval(poll.current);
    if (won) {
      finRef.current = setInterval(() => {
        const v = mRef.current * 1.05;
        if (v >= crash) {
          clearInterval(finRef.current);
          mRef.current = crash; setM(crash); setPts(p => [...p, crash]);
          explode();
          return;
        }
        mRef.current = v; setM(v); setPts(p => [...p, v]);
      }, 60);
    } else {
      setPts(p => [...p.filter(x => x <= crash), crash]);
      mRef.current = crash; setM(crash);
      explode();
    }
  }

  function tick() {
    const v = curM();
    mRef.current = v;
    setM(v);
    setPts(p => (p.length > 500 ? [...p.slice(-499), v] : [...p, v]));
    if (autoRef.current && v >= autoRef.current) cashOut();
    if (v >= 100) cashOut();
  }

  // asks the server if the round has crashed. The crash point is only sent after it happened.
  async function pollStatus() {
    if (!roundRef.current || doneRef.current) return;
    let data = null;
    try { ({ data } = await supabase.rpc("casino_aviator_status", { p_round: roundRef.current })); }
    catch { return; }
    if (!data?.success || data.status === "open") return;
    doneRef.current = true;
    roundRef.current = null;
    setPhase("done");
    const won = data.status === "cashed";
    const crash = num(data.crash, mRef.current);
    setRes({ won, crash, net: num(data.won_amount, 0) - stakeRef.current });
    if (data.new_balance !== undefined && data.new_balance !== null) setBal(num(data.new_balance, 0));
    if (won) setBurst(b => b + 1);
    reload && reload();
    finish(crash, won);
  }

  async function cashOut() {
    if (!roundRef.current || doneRef.current) return;
    doneRef.current = true;
    clearInterval(timer.current);
    clearInterval(poll.current);
    const id = roundRef.current;
    const mult = Math.min(100, Math.round(mRef.current * 100) / 100);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_aviator_cashout", { p_round: id, p_mult: mult })); }
    catch (e) { error = e; }
    roundRef.current = null;
    setPhase("done");
    if (error || !data?.success) { say ? say(friendly(error), 1) : flash(friendly(error)); return; }
    const won = !!data.won, crash = num(data.crash, mult);
    setRes({ won, crash, net: num(data.won_amount, 0) - stakeRef.current });
    if (data.new_balance !== undefined && data.new_balance !== null) setBal(num(data.new_balance, 0));
    if (won) setBurst(b => b + 1);
    reload && reload();
    finish(crash, won);
  }

  const start = async () => {
    if (phase === "flying" || busy) return;
    if (chip < MIN) return flash(`Minimum bet ${R(MIN)}`);
    if (chip > MAX) return flash(`Max bet ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip);
    setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_aviator_start", { p_bet: chip })); }
    catch (e) { error = e; }
    setBusy(false);
    if (error || !data?.success) { setBal(before); return say ? say(friendly(error), 1) : flash(friendly(error)); }

    roundRef.current = data.round_id;
    stakeRef.current = chip; doneRef.current = false;
    startRef.current = num(data.start_ms, Date.now());
    offRef.current = num(data.server_ms, Date.now()) - Date.now();
    clearInterval(finRef.current);
    mRef.current = 1;
    setRes(null); setPts([1]); setM(1); setBoom(false); setPhase("flying"); playSfx(330, 0.12);
    clearInterval(timer.current); clearInterval(poll.current);
    timer.current = setInterval(tick, 100);
    poll.current = setInterval(pollStatus, 2000);        // one light status call every 2 seconds while flying
  };

  // ---- custom amount ("Other ₹") ----
  const commitCustom = () => {
    let n = Math.floor(Number(customVal));
    if (!Number.isFinite(n) || n < MIN) n = MIN;
    if (n > MAX) n = MAX;
    setChip(n);
    setCustomVal(String(n));
  };
  const pickQuick = v => { setChip(v); setCustomOpen(false); };

  // ---- chart geometry (log scale on the y axis) ----
  const maxV = Math.max(2, ...pts);
  const xy = (i, v) => [
    (i / Math.max(pts.length - 1, 1)) * AV_W * 0.94,
    AV_H - 16 - (Math.log(v) / Math.log(maxV)) * (AV_H - 40),
  ];
  const line = pts.map((v, i) => { const [x, y] = xy(i, v); return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
  const [lx] = xy(pts.length - 1, pts[pts.length - 1]);
  const area = `${line} L${lx.toFixed(1)} ${AV_H} L0 ${AV_H} Z`;
  const [px, py] = xy(pts.length - 1, pts[pts.length - 1]);
  const planeAng = (() => {
    if (pts.length < 2) return 0;
    const [x1, y1] = xy(pts.length - 2, pts[pts.length - 2]);
    return Math.atan2(py - y1, px - x1) * 180 / Math.PI;
  })();
  const trailD = pts.slice(-16).map((v, i, arr) => { const [x, y] = xy(pts.length - arr.length + i, v); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
  const crashed = !!res && !res.won;

  const label = phase === "idle" ? "WAITING"
    : phase === "flying" ? "FLYING"
    : res ? (res.won ? "CASHED OUT" : `FLEW AWAY AT ${fx(res.crash)}`)
    : "WAITING";
  const labelCls = phase === "flying" ? "text-amber-300" : crashed ? "text-red-400" : "text-slate-400";
  const multText = phase === "idle" ? "1.00x"
    : crashed && boom && res ? fx(res.crash)
    : fx(m);
  const multSize = 60 + Math.min(26, (m - 1) * 6);

  const actionText = phase === "flying" ? `CASH OUT ${RM(stakeRef.current * m)}`
    : busy ? "WAITING" : "BET";
  const actionCls = phase === "flying" ? "bg-orange-500 text-white animate-pulse"
    : busy ? "bg-slate-700 text-slate-300"
    : "bg-emerald-500 text-slate-950 hover:bg-emerald-400";
  const actionDisabled = busy;

  const onAction = () => (phase === "flying" ? cashOut() : start());

  // ---- styles: inline, so the screen looks right even when Tailwind is not loaded ----
  const ST = {
    page: { minHeight: "100vh", background: "#0b1120", color: "#f1f5f9", display: "flex", justifyContent: "center", fontFamily: "system-ui,sans-serif", boxSizing: "border-box" },
    wrap: { width: "100%", maxWidth: 448, display: "flex", flexDirection: "column", padding: "12px 12px 120px", boxSizing: "border-box" },
    lobby: { alignSelf: "flex-start", padding: "8px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontWeight: 800, fontSize: 14, cursor: "pointer" },
    stage: { position: "relative", marginTop: 12, aspectRatio: "5 / 3", borderRadius: 16, overflow: "hidden", background: "#070d1c", border: "1px solid #1e293b",
      backgroundImage: "linear-gradient(rgba(148,163,184,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.07) 1px, transparent 1px)",
      backgroundSize: "32px 32px", animation: shake ? "x7shake .5s linear" : "none" },
    label: { position: "absolute", top: 12, left: 0, right: 0, textAlign: "center", fontSize: 12, fontWeight: 900, letterSpacing: 3,
      color: phase === "flying" ? "#fcd34d" : crashed ? "#f87171" : "#94a3b8" },
    multWrap: { position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" },
    mult: { fontSize: multSize, fontWeight: 900, color: crashed ? "#f87171" : "#f8fafc", textShadow: "0 3px 12px #000", transition: "font-size .2s ease-out" },
    result: { minHeight: 24, marginTop: 8, textAlign: "center", fontSize: 14, fontWeight: 700 },
    panel: { marginTop: 8, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 12, display: "grid", gap: 12, boxSizing: "border-box" },
    betBox: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#020617", border: "1px solid #334155", borderRadius: 12, padding: "8px 16px" },
    betLabel: { color: "#64748b", fontSize: 13, fontWeight: 800 },
    betAmt: { color: "#ffffff", fontSize: 24, fontWeight: 900 },
    chips: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 },
    row: { display: "flex", alignItems: "center", gap: 8 },
    rupee: { color: "#cbd5e1", fontSize: 14, fontWeight: 800 },
    input: { flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: 12, background: "#1e293b", border: "1px solid #475569", color: "#ffffff", fontSize: 18, fontWeight: 800, textAlign: "right", outline: "none", boxSizing: "border-box" },
    autoRow: { display: "flex", alignItems: "center", gap: 12 },
    autoLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#e2e8f0", cursor: "pointer" },
    autoInput: { marginLeft: "auto", width: 112, padding: "8px 10px", borderRadius: 10, border: "1px solid #475569", background: "#1e293b", color: "#ffffff", fontSize: 16, fontWeight: 800, textAlign: "right", boxSizing: "border-box" },
    action: { width: "100%", padding: "16px", borderRadius: 14, border: "none", fontSize: 18, fontWeight: 900, letterSpacing: 1,
      cursor: busy ? "default" : "pointer", opacity: busy ? .75 : 1,
      background: phase === "flying" ? "#f97316" : busy ? "#334155" : "#10b981",
      color: phase === "flying" ? "#ffffff" : busy ? "#cbd5e1" : "#022c22",
      animation: phase === "flying" ? "x7pulse 1.2s infinite" : "none" },
    footer: { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(15,23,42,.97)", borderTop: "1px solid #1e293b",
      padding: "12px 16px calc(12px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, boxSizing: "border-box" },
  };
  const tokenStyle = active => ({
    height: 48, borderRadius: 999, color: "#ffffff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxSizing: "border-box",
    border: `2px dashed ${active ? "#34d399" : "rgba(226,232,240,.45)"}`,
    background: "radial-gradient(circle at 35% 30%, #475569, #0f172a 70%)",
    boxShadow: active ? "0 0 0 2px #34d399, 0 6px 14px rgba(0,0,0,.5)" : "0 4px 10px rgba(0,0,0,.45)",
    transform: active ? "translateY(-2px)" : "none",
  });
  const focusOn = e => { e.target.style.borderColor = "#34d399"; e.target.style.boxShadow = "0 0 0 2px rgba(52,211,153,.35)"; };
  const focusOff = e => { e.target.style.borderColor = "#475569"; e.target.style.boxShadow = "none"; };

  return (
    <div style={ST.page}>
      <style>{CSS}</style>
      <div style={ST.wrap}>

        <div><button onClick={onBack} style={ST.lobby}>« Lobby</button></div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 10 }}>
          {crashes.map((c, i) => (
            <span key={i} style={{ flex: "0 0 auto", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 800,
              color: c >= 10 ? "#f0abfc" : c >= 2 ? "#5eead4" : "#cbd5e1", border: `1px solid ${c >= 10 ? "#a21caf" : c >= 2 ? "#0f766e" : "#334155"}`, background: "#0f172a" }}>{fx(c)}x</span>
          ))}
        </div>

        {/* main graph */}
        <div style={ST.stage}>
          <svg viewBox={`0 0 ${AV_W} ${AV_H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <defs>
              <linearGradient id="avArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ef4444" stopOpacity=".5" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
              <filter id="avGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {pts.length > 1 && <path d={area} fill="url(#avArea)" />}
            {pts.length > 1 && <path d={line} fill="none" stroke="#ef4444" strokeWidth="3.2" strokeLinejoin="round" filter="url(#avGlow)" />}
            {pts.length > 1 && !boom && (
                <>
                <path d={trailD} fill="none" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" opacity=".55" filter="url(#avGlow)" />
                <g transform={`translate(${px} ${py}) rotate(${planeAng.toFixed(1)}) scale(2.1)`} style={{ filter: "drop-shadow(0 0 8px #ef4444)" }}>
                <path d="M-44 0 L-22 -3 L-22 3 Z" fill="#fb923c" opacity=".65" />
                <path d="M-18 -3 L-6 -3 L-8 -14 L-2 -14 L6 -3 L14 -3 L22 0 L14 3 L6 3 L-2 14 L-8 14 L-6 3 L-18 3 L-22 7 L-24 7 L-22 0 L-24 -7 L-22 -7 Z"
                  fill="#f8fafc" stroke="#ef4444" strokeWidth=".8" strokeLinejoin="round" />
              </g>
                </>
            )}
            {boom && (
              <g transform={`translate(${px} ${py})`}>
                <circle r="14" fill="#fb923c" style={{ transformOrigin: "0 0", animation: "x7boom .8s ease-out forwards" }} />
                <circle r="9" fill="#fde68a" style={{ transformOrigin: "0 0", animation: "x7boom .6s ease-out forwards" }} />
              </g>
            )}
          </svg>

          <div style={ST.label}>{label}</div>
          <div style={ST.multWrap}><div style={ST.mult}>{multText}</div></div>
        </div>

        {/* result */}
        <div style={ST.result}>
          {res?.won && <span style={{ color: "#34d399" }}>Won {RM(res.net + stakeRef.current)}</span>}
          {res && !res.won && <span style={{ color: "#f87171" }}>Lost {R(-res.net)}</span>}
        </div>

        {/* betting panel */}
        <div style={ST.panel}>
          <div style={ST.betBox}>
            <span style={ST.betLabel}>BET</span>
            <span style={ST.betAmt}>{R(chip)}</span>
          </div>

          <div style={ST.chips}>
            {AV_QUICK.map(v => (
              <button key={v} onClick={() => pickQuick(v)} style={tokenStyle(chip === v && !customOpen)}>{v}</button>
            ))}
            <button onClick={() => { setCustomOpen(o => !o); setCustomVal(""); }} style={{ ...tokenStyle(customOpen), fontSize: 12 }}>Other ₹</button>
          </div>

          {customOpen && (
            <div style={ST.row}>
              <span style={ST.rupee}>₹</span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN}
                max={MAX}
                autoFocus
                value={customVal}
                placeholder={`${MIN} - ${MAX}`}
                onFocus={e => { focusOn(e); (e => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300))(e); }}
                onBlur={e => { focusOff(e); commitCustom(); }}
                onChange={e => { setCustomVal(e.target.value); const n = Math.floor(Number(e.target.value)); if (Number.isFinite(n) && n >= MIN && n <= MAX) setChip(n); }}
                onKeyDown={e => { if (e.key === "Enter") { commitCustom(); e.currentTarget.blur(); } }}
                style={ST.input}
              />
            </div>
          )}

          <div style={ST.autoRow}>
            <label style={ST.autoLabel}>
              <input type="checkbox" checked={autoOn} onChange={e => setAutoOn(e.target.checked)} style={{ accentColor: "#10b981", width: 16, height: 16 }} />
              Auto x
            </label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={autoAt}
              disabled={!autoOn}
              onFocus={e => { focusOn(e); (e => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300))(e); }}
              onChange={e => setAutoAt(e.target.value)}
              onBlur={e => { focusOff(e); const v = parseFloat(autoAt); if (!Number.isFinite(v) || v < 1.01) setAutoAt("2.00"); }}
              style={{ ...ST.autoInput, opacity: autoOn ? 1 : .4 }}
            />
          </div>

          <button onClick={onAction} disabled={actionDisabled} style={ST.action}>{actionText}</button>
        </div>
      </div>

      <div style={ST.footer}>
        <div>Balance <b style={{ color: "#34d399" }}>{R(bal)}</b></div>
        <div style={{ color: "#94a3b8" }}>{R(MIN)} - {R(MAX)}</div>
      </div>

      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </div>
  );
}

/* ================= SOUND (one switch for the whole casino) ================= */
const soundOn = () => { try { return localStorage.getItem("x7_sound") !== "off"; } catch { return true; } };
// Richer effects synthesized with Web Audio (noise bursts, filter sweeps, bell chimes)
const noiseBuf = (ac, dur) => {
  const n = Math.max(1, Math.floor(ac.sampleRate * dur));
  const b = ac.createBuffer(1, n, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;   // audio noise, not game logic
  return b;
};
const envG = (ac, g, t, peak, dur) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};
const SFX = {
  click(ac, t) {                       // chip press
    const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, 0.03);
    const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 2;
    const g = ac.createGain(); envG(ac, g, t, 0.5, 0.03);
    src.connect(f); f.connect(g); g.connect(masterOut(ac)); src.start(t); src.stop(t + 0.04);
  },
  deal(ac, t) {                        // card swish
    const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, 0.16);
    const f = ac.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
    f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2800, t + 0.13);
    const g = ac.createGain(); envG(ac, g, t, 0.35, 0.16);
    src.connect(f); f.connect(g); g.connect(masterOut(ac)); src.start(t); src.stop(t + 0.17);
  },
  takeoff(ac, t) {                     // plane engine rising
    const o = ac.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.9);
    const f = ac.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.9);
    const g = ac.createGain(); envG(ac, g, t, 0.12, 1.0);
    o.connect(f); f.connect(g); g.connect(masterOut(ac)); o.start(t); o.stop(t + 1.05);
  },
  crash(ac, t) {                       // plane crash: noise falling + low thump
    const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, 0.8);
    const f = ac.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(70, t + 0.7);
    const g = ac.createGain(); envG(ac, g, t, 0.7, 0.75);
    src.connect(f); f.connect(g); g.connect(masterOut(ac)); src.start(t); src.stop(t + 0.8);
    const o = ac.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    const g2 = ac.createGain(); envG(ac, g2, t, 0.45, 0.55);
    o.connect(g2); g2.connect(masterOut(ac)); o.start(t); o.stop(t + 0.6);
  },
  boom(ac, t) {                        // mine explosion
    const src = ac.createBufferSource(); src.buffer = noiseBuf(ac, 0.45);
    const f = ac.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    const g = ac.createGain(); envG(ac, g, t, 0.9, 0.45);
    src.connect(f); f.connect(g); g.connect(masterOut(ac)); src.start(t); src.stop(t + 0.5);
  },
  win(ac, t) {                         // bell arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => {
      const st = t + i * 0.09;
      [1, 2].forEach(h => {
        const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = fr * h;
        const g = ac.createGain(); envG(ac, g, st, h === 1 ? 0.22 : 0.06, 0.9);
        o.connect(g); g.connect(masterOut(ac)); o.start(st); o.stop(st + 1.0);
      });
    });
  },
  tick(ac, t) {                        // small UI blip
    const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = 900;
    const g = ac.createGain(); envG(ac, g, t, 0.12, 0.05);
    o.connect(g); g.connect(masterOut(ac)); o.start(t); o.stop(t + 0.06);
  },
};
// spoken win message, e.g. "You won 20" (falls back to the chime if speech is not available)
const speakWin = amt => {
  try {
    if (!soundOn() || typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(`You won ${Math.floor(num(amt, 0))}`);
    u.lang = "en-US"; u.rate = 1.05; u.pitch = 1.05; u.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
};
const playSfx = (f, d) => {
  if (!soundOn()) return;
  const ac = getAC();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    if (f >= 800 && d >= 0.2) SFX.win(ac, t);
    else if (f <= 120 && d >= 0.45) SFX.crash(ac, t);
    else if (f <= 150 && d >= 0.25) SFX.boom(ac, t);
    else if (f === 330 && d > 0.1) SFX.takeoff(ac, t);
    else if (f >= 500 && f <= 560) SFX.click(ac, t);
    else if (f >= 250 && f <= 310) SFX.deal(ac, t);
    else SFX.tick(ac, t);
  } catch {}
};
function SoundBtn() {
  const [on, setOn] = useState(soundOn);
  const toggle = () => {
    const n = !on;
    setOn(n);
    try { localStorage.setItem("x7_sound", n ? "on" : "off"); } catch {}
    if (n) playTone(660, 0.08);
  };
  return <button onClick={toggle} style={btn} aria-label="Sound on or off">{on ? "🔊" : "🔇"}</button>;
}
const actionBtn = { width: "100%", padding: "14px", borderRadius: 14, border: "none", fontSize: 17, fontWeight: 900, letterSpacing: 1,
  background: "linear-gradient(180deg,#fde68a,#d4af37)", color: "#111", cursor: "pointer", marginTop: 12 };

/* ================= MINES (server decides mine positions) ================= */
const MINE_OPTIONS = [1, 3, 5, 10, 15];
function Mines({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [chip, setChip] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [roundId, setRoundId] = useState(null);
  const [bet, setBet] = useState(0);
  const [cells, setCells] = useState([]);            // safe cells the player opened
  const [mines, setMines] = useState([]);            // filled in only when the round ends
  const [hitCell, setHitCell] = useState(null);
  const [mult, setMult] = useState(1);
  const [status, setStatus] = useState("idle");      // idle | playing | busted | cashed
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);

  const start = async () => {
    if (busy || status === "playing") return;
    if (chip < MIN) return flash(`Minimum bet ${R(MIN)}`);
    if (chip > MAX) return flash(`Max bet ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip); setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_mines_start", { p_bet: chip, p_mines: mineCount })); } catch (e) { error = e; }
    setBusy(false);
    if (error || !data?.success) { setBal(before); return say ? say(friendly(error), 1) : flash(friendly(error)); }
    setRoundId(data.round_id); setBet(chip); setCells([]); setMines([]); setHitCell(null); setMult(1); setStatus("playing");
    if (data.new_balance != null) setBal(num(data.new_balance, 0));
    playSfx(440, 0.05);
  };

  const open = async cell => {
    if (status !== "playing" || busy || cells.includes(cell)) return;
    setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_mines_reveal", { p_round: roundId, p_cell: cell })); } catch (e) { error = e; }
    setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : flash(friendly(error));
    if (data.hit) {
      setHitCell(cell); setCells(c => [...c, cell]); setMines(data.mines || []); setStatus("busted");
      if (data.new_balance != null) setBal(num(data.new_balance, 0));
      reload && reload();
      playSfx(140, 0.3);
    } else {
      setCells(c => [...c, cell]); setMult(num(data.multiplier, 1));
      playSfx(880, 0.06);
    }
  };

  const cashOut = async () => {
    if (status !== "playing" || busy || cells.length < 1) return;
    setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_mines_cashout", { p_round: roundId })); } catch (e) { error = e; }
    setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : flash(friendly(error));
    setMines(data.mines || []); setStatus("cashed");
    if (data.new_balance != null) setBal(num(data.new_balance, 0));
    setBurst(b => b + 1); playSfx(1040, 0.25); reload && reload();
  };

  const cellView = i => {
    const isMine = mines.includes(i), opened = cells.includes(i);
    let content = "", bg = "#1e293b", border = "#334155", color = "#94a3b8";
    if (opened) { bg = "#064e3b"; border = "#10b981"; color = "#d1fae5"; content = "💎"; }
    if (isMine) { bg = i === hitCell ? "#7f1d1d" : "#3f1d1d"; border = "#ef4444"; color = "#fecaca"; content = "💣"; }
    return (
      <button key={i} onClick={() => open(i)} disabled={status !== "playing" || opened || busy}
        style={{ aspectRatio: "1", borderRadius: 10, border: `1px solid ${border}`, background: bg, color, fontSize: 22, fontWeight: 900,
          cursor: status === "playing" && !opened ? "pointer" : "default" }}>{content}</button>
    );
  };

  const payout = Math.round(bet * mult);
  return (
    <Shell title="Mines" onBack={onBack} right={<SoundBtn />}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, opacity: .8 }}>Mines {mineCount}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#facc15" }}>{fx(mult)}x</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        {Array.from({ length: 25 }, (_, i) => cellView(i))}
      </div>
      {status === "busted" && <div style={{ marginTop: 12, textAlign: "center", color: "#fca5a5", fontWeight: 900 }}>Mine! Lost {R(bet)}</div>}
      {status === "cashed" && <div style={{ marginTop: 12, textAlign: "center", color: "#86efac", fontWeight: 900 }}>Cashed out {R(payout)}</div>}
      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {MINE_OPTIONS.map(n => (
          <button key={n} disabled={status === "playing"} onClick={() => setMineCount(n)}
            style={{ ...btn, background: mineCount === n ? "#facc15" : btn.background, color: mineCount === n ? "#111" : btn.color }}>{n} mines</button>
        ))}
      </div>
      <Chips value={chip} onChange={setChip} />
      {status === "playing" ? (
        <button onClick={cashOut} disabled={busy || cells.length < 1} style={{ ...actionBtn, background: "#f97316", color: "#fff" }}>
          CASH OUT {R(payout)}
        </button>
      ) : (
        <button onClick={start} disabled={busy} style={actionBtn}>{busy ? "..." : `BET ${R(chip)}`}</button>
      )}
      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </Shell>
  );
}

/* ================= VORTEX (server decides the slot) ================= */
const VORTEX = [
  { m: 0, t: "0x" }, { m: 0.5, t: "0.5x" }, { m: 1.5, t: "1.5x" }, { m: 2, t: "2x" }, { m: 3.9, t: "3.9x" },
  { m: 7, t: "7x" }, { m: 12.5, t: "12.5x" }, { m: 27.5, t: "27.5x" }, { m: 50, t: "50x" },
];
const VSEG = 360 / VORTEX.length;
const VCOL = ["#374151", "#92400e", "#1d4ed8", "#7c2d12", "#0f766e", "#7e22ce", "#b45309", "#be123c", "#facc15"];
function Vortex({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [chip, setChip] = useState(10);
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0);
  const [anim, setAnim] = useState(false);
  const [res, setRes] = useState(null);             // { slot, mult, net }
  const [burst, setBurst] = useState(0);
  const [recent, setRecent] = useState([]);

  const spin = async () => {
    if (busy) return;
    if (chip < MIN) return flash(`Minimum bet ${R(MIN)}`);
    if (chip > MAX) return flash(`Max bet ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip); setBusy(true); setRes(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_vortex_spin", { p_bet: chip })); } catch (e) { error = e; }
    if (error || !data?.success) { setBusy(false); setBal(before); return say ? say(friendly(error), 1) : flash(friendly(error)); }

    const idx = Math.min(VORTEX.length - 1, Math.max(0, Math.round(num(data.slot, 0))));
    const center = idx * VSEG + VSEG / 2;
    setAnim(true);
    setRot(r => r + 1800 + mod(-center - r, 360));       // turns, then stops on the server's slot
    setTimeout(() => {
      const mult = VORTEX[idx].m;
      const net = num(data.won_amount, 0) - chip;
      setRes({ slot: idx, mult, net });
      setRecent(h => [idx, ...h].slice(0, 12));
      if (data.new_balance != null) setBal(num(data.new_balance, 0));
      setBusy(false);
      if (net > 0) setBurst(b => b + 1);
      playSfx(net > 0 ? 880 : 220, net > 0 ? 0.25 : 0.12);
      reload && reload();
    }, 3600);
  };

  return (
    <Shell title="Vortex" onBack={onBack} right={<SoundBtn />}>
      <div style={{ position: "relative", width: "min(78vw,300px)", aspectRatio: "1", margin: "10px auto 0" }}>
        <div style={{ position: "absolute", left: "50%", top: -10, transform: "translateX(-50%)", width: 0, height: 0,
          borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "18px solid #fde68a", zIndex: 3,
          filter: "drop-shadow(0 0 6px #facc15)" }} />
        <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", display: "block", transform: `rotate(${rot}deg)`,
          transition: anim ? "transform 3.5s cubic-bezier(.17,.67,.2,1)" : "none", filter: "drop-shadow(0 18px 24px #000c)" }}>
          <defs>
            <radialGradient id="vxCore" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#fff7c2" /><stop offset=".35" stopColor="#c084fc" /><stop offset="1" stopColor="#2e1065" />
            </radialGradient>
          </defs>
          <circle cx="150" cy="150" r="148" fill="#14081f" />
          <circle cx="150" cy="150" r="146" fill="none" stroke={GOLD_L} strokeWidth="3" />
          {VORTEX.map((v, i) => {
            const a1 = i * VSEG, a2 = (i + 1) * VSEG;
            const [x1, y1] = pt(140, a1), [x2, y2] = pt(140, a2);
            const [ix1, iy1] = pt(96, a1), [ix2, iy2] = pt(96, a2);
            const [tx, ty] = pt(118, a1 + VSEG / 2);
            return (
              <g key={i}>
                <path d={`M${x1} ${y1} A140 140 0 0 1 ${x2} ${y2} L${ix2} ${iy2} A96 96 0 0 0 ${ix1} ${iy1} Z`} fill={VCOL[i]} opacity=".92" stroke={GOLD_L} strokeWidth="1" />
                <text x={tx} y={ty} fill="#fff" fontSize="11" fontWeight="900" textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${a1 + VSEG / 2} ${tx} ${ty})`}>{v.t}</text>
              </g>
            );
          })}
          <circle cx="150" cy="150" r="92" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="6 8" opacity=".7" />
          <circle cx="150" cy="150" r="62" fill="url(#vxCore)" />
          <circle cx="150" cy="150" r="26" fill={GOLD_L} />
        </svg>
      </div>

      <div style={{ minHeight: 26, marginTop: 10, textAlign: "center", fontWeight: 900 }}>
        {res && (res.net > 0 ? <span style={{ color: "#86efac" }}>{VORTEX[res.slot].t} · WON {R(res.net)}</span>
          : res.net < 0 ? <span style={{ color: "#fca5a5" }}>{VORTEX[res.slot].t} · LOST {R(-res.net)}</span>
          : <span>{VORTEX[res.slot].t} · RETURNED</span>)}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 8 }}>
        {recent.map((idx, i) => (
          <span key={i} style={{ flex: "0 0 auto", padding: "3px 9px", borderRadius: 99, fontSize: 12, fontWeight: 800, background: VCOL[idx], color: "#fff" }}>{VORTEX[idx].t}</span>
        ))}
      </div>

      <Chips value={chip} onChange={setChip} />
      <button onClick={spin} disabled={busy} style={{ ...actionBtn, opacity: busy ? .6 : 1 }}>{busy ? "SPINNING..." : `SPIN ${R(chip)}`}</button>

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </Shell>
  );
}

/* ================= DICE (3 dice, server rolls them) ================= */
const DICE_BG = "radial-gradient(ellipse at 50% -12%, #1e3a5f 0%, #0b1a2e 46%, #050b14 100%)";
const DICE_PATTERN = "repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 2px, transparent 2px 14px)";
const DICE_SUM_PAY = { 4: 61, 17: 61, 5: 31, 16: 31, 6: 18, 15: 18, 7: 13, 14: 13, 8: 9, 13: 9, 9: 7, 10: 7, 11: 7, 12: 7 };
const PIPS = {
  1: [[.5, .5]],
  2: [[.28, .28], [.72, .72]],
  3: [[.28, .28], [.5, .5], [.72, .72]],
  4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]],
  5: [[.28, .28], [.72, .28], [.5, .5], [.28, .72], [.72, .72]],
  6: [[.28, .25], [.72, .25], [.28, .5], [.72, .5], [.28, .75], [.72, .75]],
};
// the cube angle that brings each face to the front
const FACE_ROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
const settleRot = (prev, v) => {
  const [bx, by] = FACE_ROT[v] || [0, 0];
  return { x: prev.x + 1080 + mod(bx - prev.x, 360), y: prev.y + 1080 + mod(by - prev.y, 360) };
};
const CUBE = 78;
const FACES = [
  { v: 1, t: `translateZ(${CUBE / 2}px)` },
  { v: 6, t: `rotateY(180deg) translateZ(${CUBE / 2}px)` },
  { v: 3, t: `rotateY(90deg) translateZ(${CUBE / 2}px)` },
  { v: 4, t: `rotateY(-90deg) translateZ(${CUBE / 2}px)` },
  { v: 2, t: `rotateX(90deg) translateZ(${CUBE / 2}px)` },
  { v: 5, t: `rotateX(-90deg) translateZ(${CUBE / 2}px)` },
];
function Cube({ rot, rolling }) {
  return (
    <div style={{ width: CUBE, height: CUBE, position: "relative", transformStyle: "preserve-3d",
      transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
      transition: rolling ? "none" : "transform 1.2s cubic-bezier(.2,1.5,.4,1)",
      animation: rolling ? "x7tumble .9s linear infinite" : "none" }}>
      {FACES.map(f => (
        <div key={f.v} style={{ position: "absolute", inset: 0, transform: f.t, borderRadius: 14, boxSizing: "border-box",
          background: "linear-gradient(145deg,#ffffff,#d5dde7)", boxShadow: "inset 0 0 0 1px #b8c4d2" }}>
          {(PIPS[f.v] || []).map(([x, y], i) => (
            <span key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: 14, height: 14,
              marginLeft: -7, marginTop: -7, borderRadius: "50%", background: "#0f172a", boxShadow: "inset 0 -2px 2px #0006" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
const tileStyle = on => ({
  position: "relative", padding: "10px 4px", borderRadius: 12, cursor: "pointer", fontWeight: 900, fontSize: 13, color: "#f8fafc",
  textAlign: "center", boxSizing: "border-box", border: `2px solid ${on ? "#facc15" : "rgba(148,163,184,.22)"}`,
  background: "linear-gradient(180deg,#1e293b,#0f172a)", boxShadow: "0 4px 10px #0008",
});
function Dice({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [chip, setChip] = useState(10);
  const [stack, setStack] = useState([]);           // placed bets, in order (undo removes the last)
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rot, setRot] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  const [res, setRes] = useState(null);             // { dice, total, net }
  const [burst, setBurst] = useState(0);

  const bets = useMemo(() => {
    const m = new Map();
    stack.forEach(b => {
      const k = `${b.type}:${b.value ?? ""}`;
      const c = m.get(k) || { type: b.type, value: b.value, amount: 0 };
      c.amount += b.amount;
      m.set(k, c);
    });
    return [...m.values()];
  }, [stack]);
  const total = bets.reduce((a, b) => a + b.amount, 0);
  const onAmt = (type, value) => bets.find(b => b.type === type && b.value === value)?.amount || 0;

  const place = (type, value = null) => {
    if (busy || rolling) return;
    if (total + chip > bal) return flash("Balance too low");
    if (total + chip > MAX) return flash(`Max bet ${R(MAX)}`);
    setStack(s => [...s, { type, value, amount: chip }]);
    playSfx(520, 0.03);
  };
  const undo = () => { if (!busy && !rolling) setStack(s => s.slice(0, -1)); };
  const clear = () => { if (!busy && !rolling) setStack([]); };

  const roll = async () => {
    if (busy || rolling) return;
    if (!stack.length) return flash("Place a bet first");
    if (total < MIN) return flash(`Minimum bet ${R(MIN)}`);
    if (total > bal) return flash("Balance too low");
    const before = bal, list = bets;
    setBal(before - total); setBusy(true); setRes(null); setRolling(true);
    playSfx(260, 0.05);
    let data = null, error = null;
    try {
      ({ data, error } = await supabase.rpc("casino_dice_roll", {
        p_bets: list.map(b => ({ type: b.type, value: b.value, amount: b.amount })),
      }));
    } catch (e) { error = e; }
    if (error || !data?.success) {
      setRolling(false); setBusy(false); setBal(before);
      return say ? say(friendly(error), 1) : flash(friendly(error));
    }
    const d = [num(data.d1, 1), num(data.d2, 1), num(data.d3, 1)];
    setTimeout(() => {
      setRolling(false);
      setRot(prev => prev.map((r, i) => settleRot(r, d[i])));
      const net = num(data.won_amount, 0) - total;
      setRes({ dice: d, total: num(data.total, 0), net });
      setStack([]);
      if (data.new_balance != null) setBal(num(data.new_balance, 0));
      setBusy(false);
      if (net > 0) setBurst(b => b + 1);
      playSfx(net > 0 ? 880 : 180, net > 0 ? 0.25 : 0.15);
      reload && reload();
    }, 950);
  };

  const tile = (type, value, label, sub) => {
    const amt = onAmt(type, value);
    return (
      <div key={`${type}:${value ?? ""}`} onClick={() => place(type, value)} style={tileStyle(amt > 0)}>
        <div>{label}</div>
        {sub && <div style={{ fontSize: 10, fontWeight: 700, opacity: .75, marginTop: 2 }}>{sub}</div>}
        {amt > 0 && (
          <span style={{ position: "absolute", top: -8, right: -6, background: "radial-gradient(circle at 35% 30%,#fff7c2,#d4af37)",
            color: "#1a1200", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "2px 6px", boxShadow: "0 2px 4px #000" }}>{amt}</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: `${DICE_PATTERN}, ${DICE_BG}`, color: "#f3efe0", fontFamily: "system-ui,sans-serif",
      padding: "8px 10px 120px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button onClick={onBack} style={btn}>← Lobby</button>
        <b style={{ flex: 1, color: GOLD_L, letterSpacing: .5 }}>Dice</b>
        <SoundBtn />
      </div>

      {/* table */}
      <div style={{ position: "relative", borderRadius: 22, padding: "26px 10px 18px", boxSizing: "border-box",
        background: "radial-gradient(ellipse at 50% 30%,#1b5e3b,#0c3a24 65%,#072316)", border: "2px solid #d4af37",
        boxShadow: "inset 0 0 40px #000a, 0 14px 30px #000b" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, perspective: 600, minHeight: CUBE + 20 }}>
          {rot.map((r, i) => (
            <div key={i} style={{ width: CUBE, height: CUBE, margin: "10px 0" }}>
              <Cube rot={r} rolling={rolling} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", minHeight: 50, marginTop: 10 }}>
          {rolling && <span style={{ fontWeight: 900, opacity: .85 }}>Rolling…</span>}
          {!rolling && res && (
            <>
              <div style={{ fontSize: 20, fontWeight: 900 }}>Total {res.total}</div>
              <div style={{ fontWeight: 900, color: res.net > 0 ? "#86efac" : res.net < 0 ? "#fca5a5" : "#e5e7eb" }}>
                {res.net > 0 ? `WON ${R(res.net)}` : res.net < 0 ? `LOST ${R(-res.net)}` : "RETURNED"}
              </div>
            </>
          )}
          {!rolling && !res && <span style={{ opacity: .7 }}>Place your bets</span>}
        </div>
      </div>

      {/* bet board */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {tile("small", null, "SMALL", "4-10 · 2x")}
          {tile("big", null, "BIG", "11-17 · 2x")}
          {tile("odd", null, "ODD", "2x")}
          {tile("even", null, "EVEN", "2x")}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, opacity: .7 }}>TOTAL</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {Array.from({ length: 14 }, (_, i) => i + 4).map(n => tile("sum", n, String(n), `${DICE_SUM_PAY[n]}x`))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, opacity: .7 }}>SINGLE FACE (1 · 2 · 3 dice)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
          {[1, 2, 3, 4, 5, 6].map(n => tile("single", n, String(n), "2x·3x·4x"))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {tile("triple", null, "ANY TRIPLE", "31x")}
        </div>
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button onClick={undo} disabled={busy || rolling} style={btn}>UNDO</button>
        <button onClick={clear} disabled={busy || rolling} style={btn}>CLEAR</button>
      </div>
      <button onClick={roll} disabled={busy || rolling} style={{ ...actionBtn, opacity: busy || rolling ? .6 : 1 }}>
        {rolling ? "ROLLING…" : `ROLL ${R(total)}`}
      </button>

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </div>
  );
}

/* ================= CHICKEN ROAD 2 (server decides each lane) ================= */
const CR_LANES = 10;
const CR_DIFF = {
  easy:   { label: "Easy",   survive: 0.9, color: "#22c55e" },
  medium: { label: "Medium", survive: 0.8, color: "#facc15" },
  hard:   { label: "Hard",   survive: 0.7, color: "#f87171" },
};
const crMult = (diff, k) => Math.round((0.97 / Math.pow(CR_DIFF[diff].survive, k)) * 100) / 100;

/* ---------- sound (Web Audio) ---------- */
let _crAc = null;
const crAudio = () => {
  try {
    _crAc = _crAc || new (window.AudioContext || window.webkitAudioContext)();
    if (_crAc.state === "suspended") _crAc.resume();
    return _crAc;
  } catch { return null; }
};
const crOn = () => { try { return localStorage.getItem("x7_sound") !== "off"; } catch { return true; } };
const crTone = (f, d, type = "sine", peak = 0.16, delay = 0) => {
  const ac = crAudio(); if (!ac || !crOn()) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.03);
};
const crSfx = {
  click: () => crTone(560, 0.05, "triangle", 0.14),
  step:  () => { crTone(190, 0.1, "square", 0.08); crTone(120, 0.14, "sine", 0.12, 0.03); },
  win:   () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => crTone(f, 0.6, "sine", 0.2, i * 0.09)),
  lose:  () => { crTone(160, 0.5, "sawtooth", 0.14); crTone(90, 0.6, "sine", 0.24, 0.05); },
};

/* ---------- styles ---------- */
const CS = {
  page: { minHeight: "100vh", background: "radial-gradient(ellipse at 50% -10%,#1a2332 0%,#0a0f18 55%,#05080d 100%)",
    color: "#e5e7eb", fontFamily: "system-ui,sans-serif", padding: "10px 12px 130px", boxSizing: "border-box" },
  bar: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  back: { padding: "9px 14px", borderRadius: 12, border: "1px solid #3f4a5a", background: "#111827", color: "#f1f5f9",
    fontWeight: 800, fontSize: 14, cursor: "pointer" },
  title: { flex: 1, textAlign: "center", fontWeight: 900, fontSize: 18, color: "#facc15", letterSpacing: 0.5 },
  icon: { width: 40, height: 40, borderRadius: 12, border: "1px solid #3f4a5a", background: "#111827", color: "#f1f5f9", cursor: "pointer", fontSize: 18 },
  road: { position: "relative", height: 420, borderRadius: 18, overflow: "hidden", border: "1px solid #1f2937",
    background: "linear-gradient(180deg,#0f1419 0%,#1b2129 40%,#1f2629 100%)", boxShadow: "inset 0 0 40px #000" },
  curb: { position: "absolute", top: 0, bottom: 0, width: 26, background: "repeating-linear-gradient(180deg,#6b7280 0 10px,#374151 10px 20px)" },
  laneLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 4, marginLeft: -2,
    background: "repeating-linear-gradient(180deg,#e5e7eb 0 22px,transparent 22px 44px)", opacity: 0.55 },
  manhole: { position: "absolute", left: "50%", transform: "translate(-50%,-50%)", width: 96, height: 46, borderRadius: "50%",
    border: "2px solid #4b5563", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13, transition: "all .35s",
    boxShadow: "inset 0 4px 10px #000a, 0 4px 10px #0008" },
  chicken: { position: "absolute", left: "50%", transform: "translate(-50%,-50%)", fontSize: 40, transition: "top .55s cubic-bezier(.3,1.4,.5,1)",
    filter: "drop-shadow(0 6px 6px #000a)", zIndex: 3 },
  tree: { position: "absolute", fontSize: 26, opacity: 0.85 },
  lamp: { position: "absolute", fontSize: 22, opacity: 0.9 },
  card: { marginTop: 14, borderRadius: 18, padding: 14, background: "#0f1520", border: "1px solid #1f2937" },
  row: { display: "flex", alignItems: "center", gap: 10 },
  betBox: { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12,
    background: "#020617", border: "1px solid #334155" },
  stepBtn: { width: 44, height: 44, borderRadius: 12, border: "1px solid #374151", background: "#1f2937", color: "#f8fafc",
    fontSize: 22, fontWeight: 900, cursor: "pointer" },
  chipBtn: { flex: 1, padding: "9px 0", borderRadius: 12, border: "1px solid #374151", background: "#111827", color: "#e5e7eb",
    fontWeight: 800, fontSize: 14, cursor: "pointer" },
  diffBtn: { flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid #374151", background: "#111827", fontWeight: 800,
    fontSize: 14, cursor: "pointer" },
  primary: { width: "100%", padding: "18px", borderRadius: 16, border: "none", fontSize: 19, fontWeight: 900, letterSpacing: 1,
    color: "#052e16", background: "linear-gradient(180deg,#4ade80,#16a34a)", boxShadow: "0 8px 22px #16a34a55", cursor: "pointer", marginTop: 12 },
  cash: { width: "100%", padding: "16px", borderRadius: 16, border: "none", fontSize: 17, fontWeight: 900, color: "#fff",
    background: "linear-gradient(180deg,#fb923c,#ea580c)", boxShadow: "0 8px 22px #ea580c55", cursor: "pointer", marginTop: 10 },
  msg: { minHeight: 26, textAlign: "center", fontWeight: 900, marginTop: 10 },
  footer: { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,15,24,.97)", borderTop: "1px solid #1f2937",
    padding: "12px 16px calc(12px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: 14, boxSizing: "border-box" },
};

function ChickenRoad({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const [bal, setBal] = useState((+me.balance || 0) + (+me.winnings || 0));
  useEffect(() => { setBal((+me.balance || 0) + (+me.winnings || 0)); }, [me.balance, me.winnings]);

  const [bet, setBet] = useState(10);
  const [diff, setDiff] = useState("medium");
  const [round, setRound] = useState(null);          // { id, step, alive, reached }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [bust, setBust] = useState(false);
  const [sound, setSound] = useState(crOn);
  const busyRef = useRef(false);

  const active = !!round && round.alive && !round.reached;
  const stepNow = round?.step || 0;
  const mult = stepNow ? crMult(diff, stepNow) : 1;
  const payout = Math.floor(bet * mult * 100) / 100;

  const clampBet = v => Math.min(MAX, Math.max(MIN, Math.round(v)));
  const setBetSafe = v => { if (!active && !busy) { setBet(clampBet(v)); if (round) setRound(null); } };

  const toggleSound = () => {
    const n = !sound; setSound(n);
    try { localStorage.setItem("x7_sound", n ? "on" : "off"); } catch {}
    if (n) crTone(660, 0.08);
  };

  const play = async () => {
    if (busyRef.current || active) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    busyRef.current = true; setBusy(true); setBust(false); setMsg("");
    crSfx.click();
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_chicken_start", { p_bet: bet, p_difficulty: diff })); } catch (e) { error = e; }
    busyRef.current = false; setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : setMsg(friendly(error));
    setRound({ id: data.round_id, step: 0, alive: true, reached: false });
    if (data.new_balance != null) setBal(num(data.new_balance, bal));
    reload && reload();
  };

  const cross = async () => {
    if (busyRef.current || !active) return;
    busyRef.current = true; setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_chicken_step", { p_round: round.id })); } catch (e) { error = e; }
    busyRef.current = false; setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : setMsg(friendly(error));
    if (!data.alive) {
      setRound(r => ({ ...r, alive: false }));
      setBust(true);
      setMsg("The chicken got hit!");
      crSfx.lose();
      if (data.new_balance != null) setBal(num(data.new_balance, bal));
      reload && reload();
      return;
    }
    const step = num(data.step, stepNow + 1);
    const reached = step >= CR_LANES;
    setRound(r => ({ ...r, step, reached }));
    crSfx.step();
    setMsg(reached ? "Reached the end — cash out!" : `${RM(bet * crMult(diff, step))} if you cash out now`);
  };

  const cashOut = async () => {
    if (busyRef.current || !round || !round.alive || stepNow < 1) return;
    busyRef.current = true; setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_chicken_cashout", { p_round: round.id })); } catch (e) { error = e; }
    busyRef.current = false; setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : setMsg(friendly(error));
    setRound(r => ({ ...r, alive: false, reached: true }));
    setMsg(`Won ${RM(data.won_amount)}`);
    crSfx.win();
    if (data.new_balance != null) setBal(num(data.new_balance, bal));
    reload && reload();
  };

  const newRound = () => { setRound(null); setBust(false); setMsg(""); };

  // chicken position: 0 = bottom (start), CR_LANES = top (finish)
  const chickenPos = Math.round(((CR_LANES - stepNow + 1) / (CR_LANES + 1)) * 100);
  const idle = !active;

  return (
    <div style={CS.page}>
      <div style={CS.bar}>
        <button style={CS.back} onClick={onBack}>« Lobby</button>
        <div style={CS.title}>Chicken Road 2</div>
        <button style={CS.icon} onClick={toggleSound} aria-label="Sound">{sound ? "🔊" : "🔇"}</button>
      </div>

      {/* road */}
      <div style={CS.road}>
        <div style={{ ...CS.curb, left: 0 }} />
        <div style={{ ...CS.curb, right: 0 }} />
        <div style={CS.laneLine} />
        {[18, 46, 74].map(x => <div key={x} style={{ ...CS.laneLine, left: `${x}%`, opacity: 0.25 }} />)}
        <span style={{ ...CS.tree, left: 6, top: 30 }}>🌳</span>
        <span style={{ ...CS.tree, right: 6, top: 150 }}>🌲</span>
        <span style={{ ...CS.tree, left: 6, top: 290 }}>🌳</span>
        <span style={{ ...CS.lamp, right: 8, top: 80 }}>💡</span>
        <span style={{ ...CS.lamp, left: 8, top: 220 }}>💡</span>

        {Array.from({ length: CR_LANES }, (_, i) => {
          const k = i + 1;
          const top = Math.round(((CR_LANES - k + 1) / (CR_LANES + 1)) * 100);
          const lit = stepNow >= k;
          return (
            <div key={k} style={{ ...CS.manhole, top: `${top}%`,
              background: lit ? `radial-gradient(circle,#4ade80,#166534)` : "radial-gradient(circle,#374151,#111827)",
              color: lit ? "#f0fdf4" : "#cbd5e1", borderColor: lit ? "#4ade80" : "#4b5563",
              boxShadow: lit ? "0 0 18px #4ade80aa, inset 0 4px 10px #000a" : CS.manhole.boxShadow }}>
              {crMult(diff, k).toFixed(2)}x
            </div>
          );
        })}

        <div style={{ ...CS.chicken, top: `${chickenPos}%`, opacity: bust ? 0.35 : 1,
          transform: `translate(-50%,-50%) ${bust ? "rotate(90deg) scale(.7)" : ""}` }}>🐔</div>

        {bust && (
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, textAlign: "center", fontSize: 30, fontWeight: 900, color: "#f87171",
            textShadow: "0 3px 10px #000" }}>BUSTED</div>
        )}
      </div>

      {/* controls */}
      <div style={CS.card}>
        <div style={CS.row}>
          <div style={CS.betBox}>
            <span style={{ color: "#64748b", fontWeight: 800, fontSize: 13 }}>
              {round?.id ? `Bet ID #${round.id}` : "Bet"}
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#f8fafc" }}>{R(bet)}</span>
          </div>
          <button style={CS.stepBtn} disabled={!idle} onClick={() => setBetSafe(bet - 10)}>−</button>
          <button style={CS.stepBtn} disabled={!idle} onClick={() => setBetSafe(bet + 10)}>+</button>
        </div>

        <div style={{ ...CS.row, marginTop: 10 }}>
          <button style={CS.chipBtn} disabled={!idle} onClick={() => setBetSafe(bet * 0.5)}>x0.5</button>
          <button style={CS.chipBtn} disabled={!idle} onClick={() => setBetSafe(bet * 2)}>x2.0</button>
        </div>

        <div style={{ ...CS.row, marginTop: 10 }}>
          {Object.entries(CR_DIFF).map(([k, d]) => (
            <button key={k} disabled={!idle} onClick={() => { if (!active && !busy) { setDiff(k); if (round) setRound(null); } }}
              style={{ ...CS.diffBtn, color: diff === k ? "#0a0f18" : d.color,
                background: diff === k ? d.color : "#111827", borderColor: diff === k ? d.color : "#374151" }}>
              {d.label}
            </button>
          ))}
        </div>

        {idle && (
          <button style={CS.primary} onClick={play} disabled={busy}>PLAY {R(bet)}</button>
        )}
        {active && (
          <>
            <button style={CS.primary} onClick={cross} disabled={busy}>CROSS</button>
            <button style={{ ...CS.cash, opacity: stepNow < 1 ? 0.5 : 1 }} onClick={cashOut} disabled={busy || stepNow < 1}>
              CASH OUT {RM(payout)}
            </button>
          </>
        )}
        <div style={CS.msg}>{msg}</div>
      </div>

      <div style={CS.footer}>
        <div>Balance <b style={{ color: "#4ade80" }}>{R(bal)}</b></div>
        <div style={{ color: "#94a3b8" }}>{R(MIN)} - {R(MAX)}</div>
      </div>
    </div>
  );
}

/* ================= LOBBY ================= */
const CardArt = memo(function CardArt({ kind }) {
  if (kind === "chicken") {
    return <div style={{ position: "absolute", right: 6, top: 6, fontSize: 96, opacity: .9, filter: "drop-shadow(0 8px 10px #000a)" }}>🐔</div>;
  }
  if (kind === "dice") {
    return (
      <svg viewBox="0 0 200 200" style={{ position: "absolute", right: -16, top: -10, width: 190, height: 190 }}>
        <rect x="20" y="40" width="80" height="80" rx="14" fill="#f8fafc" transform="rotate(-10 60 80)" />
        <rect x="100" y="60" width="80" height="80" rx="14" fill="#e2e8f0" transform="rotate(12 140 100)" />
        <circle cx="45" cy="65" r="7" fill="#0f172a" /><circle cx="75" cy="95" r="7" fill="#0f172a" /><circle cx="105" cy="125" r="7" fill="#0f172a" />
        <circle cx="125" cy="85" r="7" fill="#0f172a" /><circle cx="155" cy="115" r="7" fill="#0f172a" />
      </svg>
    );
  }
  if (kind === "mines") {
    return (
      <svg viewBox="0 0 200 200" style={{ position: "absolute", right: -10, top: -10, width: 180, height: 180, opacity: .9 }}>
        {Array.from({ length: 25 }, (_, i) => (
          <rect key={i} x={20 + (i % 5) * 32} y={20 + Math.floor(i / 5) * 32} width="26" height="26" rx="6"
            fill={i % 4 === 1 ? "#f97316" : "#166534"} opacity={i % 4 === 1 ? .9 : .6} />
        ))}
      </svg>
    );
  }
  if (kind === "vortex") {
    return (
      <svg viewBox="0 0 200 200" style={{ position: "absolute", right: -30, top: -30, width: 200, height: 200 }}>
        <circle cx="100" cy="100" r="90" fill="#2e1065" stroke="#facc15" strokeWidth="4" />
        <circle cx="100" cy="100" r="50" fill="#7e22ce" />
        <circle cx="100" cy="100" r="14" fill="#facc15" />
      </svg>
    );
  }
  if (kind === "roulette") {
    return (
      <svg viewBox="0 0 200 200" style={{ position: "absolute", right: -40, top: -36, width: 200, height: 200 }}>
        <defs>
          <radialGradient id="lbWood" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#7a4a22" /><stop offset="1" stopColor="#1f1008" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#lbWood)" stroke="#d4af37" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={wedge(100, 100, 44, 86, i * 30, i * 30 + 30)} fill={i % 2 ? "#111318" : "#b91c1c"} stroke="#d4af37" strokeWidth=".6" />
        ))}
        <circle cx="100" cy="100" r="34" fill="#1f2937" stroke="#facc15" strokeWidth="2" />
        <circle cx="100" cy="100" r="12" fill="#facc15" />
        <circle cx="100" cy="18" r="5" fill="#fff" />
      </svg>
    );
  }
  if (kind === "dragon") {
    return (
      <svg viewBox="0 0 200 200" style={{ position: "absolute", right: -20, top: -14, width: 190, height: 190 }}>
        <g transform="rotate(-12 70 100)">
          <rect x="22" y="40" width="82" height="120" rx="10" fill="#b91c1c" stroke="#facc15" strokeWidth="2.5" />
          <text x="63" y="112" textAnchor="middle" fill="#facc15" fontSize="40" fontWeight="900">D</text>
        </g>
        <g transform="rotate(12 130 100)">
          <rect x="96" y="40" width="82" height="120" rx="10" fill="#b45309" stroke="#facc15" strokeWidth="2.5" />
          <text x="137" y="112" textAnchor="middle" fill="#fff7c2" fontSize="40" fontWeight="900">T</text>
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="lbTrail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0" /><stop offset="1" stopColor="#fde68a" stopOpacity="1" />
        </linearGradient>
      </defs>
      {[30, 70, 110, 150].map(y => <line key={y} x1="0" x2="200" y1={y} y2={y} stroke="#ffffff10" />)}
      <path d="M-10 185 Q 80 170 130 100 T 215 25" fill="none" stroke="url(#lbTrail)" strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(160 40) rotate(-32)">
        <path d="M-16 0 L16 -4 L24 0 L16 4 Z" fill="#fff" />
        <path d="M-6 0 L-22 -10 L-18 0 L-22 10 Z" fill="#fde68a" />
      </g>
    </svg>
  );
});

export default function CasinoHub({ supabase, me, reload, say, cfg }) {
  const C = cfg || {};
  const games = C.games || {};
  const images = C.images || {};
  const [view, setView] = useState("lobby");
  useEffect(() => {
    // native WebViews do not always send pointer events, so listen for every kind of tap
    const evs = ["pointerdown", "touchstart", "touchend", "click", "keydown"];
    const u = () => { unlockAudio(); evs.forEach(e => window.removeEventListener(e, u, true)); };
    evs.forEach(e => window.addEventListener(e, u, true));
    return () => evs.forEach(e => window.removeEventListener(e, u, true));
  }, []);
  const common = { supabase, me, reload, say, cfg: C, onBack: () => setView("lobby") };

  if (view === "roulette") return <Roulette {...common} />;
  if (view === "dragon") return <DragonTiger {...common} />;
  if (view === "aviator") return <Aviator {...common} />;
  if (view === "mines") return <Mines {...common} />;
  if (view === "vortex") return <Vortex {...common} />;
  if (view === "dice") return <Dice {...common} />;
  if (view === "chicken") return <ChickenRoad supabase={supabase} me={me} reload={reload} say={say} cfg={C} onBack={() => setView("lobby")} />;

  const cards = [
    ["roulette", "roulette", "Auto Roulette", "The wheel turns by itself. Place your bets while the timer runs.", "linear-gradient(135deg,#3f0a0f,#b91c1c)"],
    ["dragon", "dragon_tiger", "Dragon Tiger", "Higher card wins. Tie pays 11 : 1.", "linear-gradient(135deg,#0b1d3a,#1e40af)"],
    ["aviator", "aviator", "Aviator", "Cash out before the plane flies away.", "linear-gradient(135deg,#4a1d06,#ea580c)"],
    ["mines", "mines", "Mines", "Pick safe cells. Cash out before you hit a mine.", "linear-gradient(135deg,#052e16,#166534)"],
    ["vortex", "vortex", "Vortex", "Spin the multiplier wheel. Land on 50x.", "linear-gradient(135deg,#2e1065,#7e22ce)"],
    ["dice", "dice", "Dice", "Roll two dice. Under 7, seven, or over 7.", "linear-gradient(135deg,#0c4a6e,#0284c7)"],
    ["chicken", "chicken", "Chicken Road 2", "Cross the road lane by lane. Cash out before you get hit.", "linear-gradient(135deg,#3f2a05,#ca8a04)"],
  ].filter(([, key]) => games[key]);

  return (
    <div style={{ background: "linear-gradient(180deg,#0a1f14 0%,#050d09 100%)", minHeight: "100vh", color: "#f3efe0",
      padding: "14px 12px 40px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", margin: "6px 0 16px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 0 4px" }}><SoundBtn /></div>
        <h2 style={{ color: GOLD_L, margin: 0, letterSpacing: 1 }}>Casino</h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, opacity: .7 }}>Pick a table to play</p>
      </div>
      {cards.length === 0 && <p style={{ textAlign: "center", opacity: .7 }}>No games are open right now.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {cards.map(([v, , name, desc, bg]) => {
          const img = images[v];
          return (
            <div key={v} onClick={() => setView(v)} style={{ position: "relative", overflow: "hidden", background: bg, borderRadius: 18,
              padding: 14, minHeight: 176, cursor: "pointer", border: `1px solid ${GOLD}`, boxShadow: "0 10px 26px #000c",
              gridColumn: cards.length === 1 || (v === "aviator" && cards.length === 3) ? "1 / -1" : undefined }}>
              {img
                ? <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .5 }} />
                : <CardArt kind={v} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 25%,#000d 100%)" }} />
              <div style={{ position: "relative", maxWidth: "70%" }}>
                <div style={{ fontWeight: 900, fontSize: 18, textShadow: "0 2px 8px #000" }}>{name}</div>
                <div style={{ fontSize: 12, opacity: .92, marginTop: 6, textShadow: "0 1px 4px #000" }}>{desc}</div>
                <div style={{ marginTop: 16, fontSize: 12, fontWeight: 900, color: GOLD_L }}>PLAY ›</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
