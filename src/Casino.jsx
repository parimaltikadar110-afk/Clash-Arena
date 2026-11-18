import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import SafeVault from "./SafeVault";

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
        {sideBtn("tie", "TIE", "9 : 1")}
        {sideBtn("tiger", "TIGER", "1 : 1")}
        {sideBtn("suited_tie", "SUITED TIE", "40 : 1")}
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
    poll.current = setInterval(pollStatus, 3000);     // check the server twice a second so the crash shows right away        // one light status call every 2 seconds while flying
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
    : res ? (res.won ? `CASHED OUT · Won ${RM(res.net + stakeRef.current)}` : `FLEW AWAY AT ${fx(res.crash)} · Lost ${R(-res.net)}`)
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
  { m: 7, t: "7x" }, { m: 12.5, t: "12.5x" }, { m: 27.5, t: "27.5x" },
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
        <div style={CS.title}>Chicken Road</div>
        <button style={CS.icon} onClick={toggleSound} aria-label="Sound">{sound ? "🔊" : "🔇"}</button>
      </div>

      {/* road */}
      <div style={CS.road}>
        <div style={{ ...CS.curb, left: 0 }} />
        <div style={{ ...CS.curb, right: 0 }} />
        <div style={CS.laneLine} />
        {[18, 46, 74].map(x => <div key={x} style={{ ...CS.laneLine, left: `${x}%`, opacity: 0.25 }} />)}
        <style>{`@keyframes crDown{from{top:-12%}to{top:105%}}@keyframes crUp{from{top:105%}to{top:-12%}}`}</style>
        {[
          { x: 30, a: "crDown", t: 2.4, d: 0, c: "🚙" }, { x: 30, a: "crDown", t: 3.2, d: 1.5, c: "🚗" },
          { x: 62, a: "crUp", t: 2.8, d: 0.7, c: "🚕" }, { x: 62, a: "crUp", t: 3.6, d: 2.2, c: "🚌" },
        ].map((car, i) => (
          <span key={i} style={{ position: "absolute", left: `${car.x}%`, top: "0%", fontSize: 24, transform: "translateX(-50%)", animation: `${car.a} ${car.t}s linear ${car.d}s infinite`, pointerEvents: "none", zIndex: 1 }}>{car.c}</span>
        ))}
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

/* ================= ELEMENTS (original ClashX7 game) ================= */
const EL = [
  { id: 1, name: "Earth", color: "#a16207", glow: "#eab308", icon: "🪨" },
  { id: 2, name: "Water", color: "#1d4ed8", glow: "#38bdf8", icon: "💧" },
  { id: 3, name: "Fire", color: "#b91c1c", glow: "#fb923c", icon: "🔥" },
];
const EL_PAY = { 1: "0.5x", 2: "2.5x", 3: "5x" };
function Elements({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [chip, setChip] = useState(10);
  const [pick, setPick] = useState(1);
  const [busy, setBusy] = useState(false);
  const [draw, setDraw] = useState([null, null, null]);   // element ids shown after the roll
  const [res, setRes] = useState(null);                   // { matches, net, won }
  const [burst, setBurst] = useState(0);

  const roll = async () => {
    if (busy) return;
    if (chip < MIN) return flash(`Minimum bet ${R(MIN)}`);
    if (chip > MAX) return flash(`Max bet ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip); setBusy(true); setRes(null); setDraw([null, null, null]);
    playSfx(260, 0.05);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_elements_roll", { p_bet: chip, p_element: pick })); } catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false); setBal(before);
      return say ? say(friendly(error), 1) : flash(friendly(error));
    }
    const d = Array.isArray(data.draw) ? data.draw.map(v => num(v, 1)) : [1, 1, 1];
    setTimeout(() => {
      setDraw(d);
      const won = num(data.won_amount, 0);
      const net = won - chip;
      setRes({ matches: num(data.matches, 0), net, won });
      if (data.new_balance != null) setBal(num(data.new_balance, 0));
      setBusy(false);
      if (net > 0) setBurst(b => b + 1);
      playSfx(net > 0 ? 880 : 180, net > 0 ? 0.25 : 0.15);
      reload && reload();
    }, 900);
  };

  return (
    <Shell title="Elements" onBack={onBack} right={<SoundBtn />}>
      <div style={{ background: "radial-gradient(ellipse at 50% 20%,#1e293b,#0b1120 70%)", border: "1px solid #334155", borderRadius: 18, padding: "18px 10px 14px" }}>
        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: 2, opacity: .7 }}>PICK AN ELEMENT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 10 }}>
          {EL.map(e => {
            const on = pick === e.id;
            return (
              <button key={e.id} disabled={busy} onClick={() => { playSfx(520, 0.03); setPick(e.id); }}
                style={{ padding: "12px 4px", borderRadius: 14, cursor: "pointer", border: `2px solid ${on ? e.glow : "#334155"}`,
                  background: on ? `linear-gradient(180deg,${e.color},#0f172a)` : "#0f172a", color: "#f8fafc",
                  boxShadow: on ? `0 0 16px ${e.glow}88` : "none", fontWeight: 900 }}>
                <div style={{ fontSize: 28 }}>{e.icon}</div>
                <div style={{ marginTop: 4 }}>{e.name}</div>
                <div style={{ fontSize: 10, opacity: .75 }}>1 match {EL_PAY[1]}</div>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: 2, opacity: .7, marginTop: 18 }}>THREE DRAWS</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 10, minHeight: 92 }}>
          {[0, 1, 2].map(i => {
            const v = draw[i];
            const e = v ? EL.find(x => x.id === v) : null;
            const hit = e && e.id === pick;
            return (
              <div key={i} style={{ width: 84, height: 92, borderRadius: 16, display: "grid", placeItems: "center",
                border: `2px solid ${hit ? "#facc15" : "#334155"}`,
                background: e ? `linear-gradient(180deg,${e.color},#0f172a)` : "repeating-linear-gradient(45deg,#1e293b 0 8px,#0f172a 8px 16px)",
                boxShadow: hit ? "0 0 18px #facc1566" : "0 6px 14px #000a", fontSize: 40, transition: "all .3s" }}>
                {busy && !e ? <span style={{ fontSize: 22, opacity: .6 }}>?</span> : e ? e.icon : ""}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", minHeight: 44, marginTop: 12, fontWeight: 900 }}>
          {busy && <span style={{ opacity: .8 }}>Drawing…</span>}
          {!busy && res && (
            <span style={{ color: res.net > 0 ? "#86efac" : res.net < 0 ? "#fca5a5" : "#e5e7eb" }}>
              {res.matches} match{res.matches === 1 ? "" : "es"} · {res.net > 0 ? `WON ${R(res.won)}` : res.net < 0 ? `LOST ${R(-res.net)}` : "RETURNED"}
            </span>
          )}
        </div>
      </div>

      <Chips value={chip} onChange={setChip} />
      <button onClick={roll} disabled={busy} style={{ ...actionBtn, opacity: busy ? .6 : 1 }}>
        {busy ? "DRAWING…" : `DRAW ${R(chip)}`}
      </button>

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </Shell>
  );
}

/* ================= LUDO (player vs player, entry + 90% payout) =================
   This screen handles entries, matching, cancel and the winner report.
   The Ludo board itself is not included yet (it must run on the server side). */
const LUDO_ENTRIES = [5, 10, 25, 50];
function Ludo({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 5, MAX = +cfg.max_bet || 50000;
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [entry, setEntry] = useState(5);
  const [uid, setUid] = useState(null);
  const [match, setMatch] = useState(null);    // { id, status, p1, p2, entry }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data?.user?.id || null)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // while waiting for an opponent, check every 3 seconds (only this screen, only while waiting)
  useEffect(() => {
    if (!match || match.status !== "waiting") return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("ludo_matches").select("id,status,p1,p2,entry").eq("id", match.id).maybeSingle();
      if (data && data.status !== "waiting") { setMatch(data); playSfx(660, 0.12); }
    }, 8000);
    return () => clearInterval(t);
  }, [match, supabase]);

  const join = async () => {
    if (busy) return;
    if (entry < MIN) return flash(`Minimum entry ${R(MIN)}`);
    if (entry > MAX) return flash(`Max entry ${R(MAX)}`);
    if (entry > bal) return flash("Balance too low");
    setBusy(true); setMsg("");
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("ludo_join", { p_entry: entry })); } catch (e) { error = e; }
    setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : flash(friendly(error));
    const { data: row } = await supabase.from("ludo_matches").select("id,status,p1,p2,entry").eq("id", data.match_id).maybeSingle();
    setMatch(row || { id: data.match_id, status: data.status, entry });
    playSfx(440, 0.05);
    reload && reload();
  };

  const cancel = async () => {
    if (busy || !match) return;
    setBusy(true);
    let error = null;
    try { ({ error } = await supabase.rpc("ludo_cancel", { p_match: match.id })); } catch (e) { error = e; }
    setBusy(false);
    if (error) return say ? say(friendly(error), 1) : flash(friendly(error));
    setMatch(null); setMsg("Entry returned.");
    reload && reload();
  };

  const report = async winnerIsMe => {
    if (busy || !match || !uid) return;
    const winner = winnerIsMe ? uid : (uid === match.p1 ? match.p2 : match.p1);
    setBusy(true);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("ludo_report", { p_match: match.id, p_winner: winner })); } catch (e) { error = e; }
    setBusy(false);
    if (error || !data?.success) return say ? say(friendly(error), 1) : flash(friendly(error));
    if (data.status === "waiting_for_other_player") { setMsg("Waiting for the other player to report."); return; }
    if (data.status === "finished") {
      setMsg(winnerIsMe ? "You won! Payout added." : "Opponent won.");
      playSfx(winnerIsMe ? 880 : 180, winnerIsMe ? 0.25 : 0.15);
      if (winnerIsMe) speakWin(Math.round(match.entry * 2 * 0.9));
    } else {
      setMsg("Results did not match. Both entries refunded.");
    }
    setMatch(m => (m ? { ...m, status: data.status === "finished" ? "finished" : "cancelled" } : m));
    reload && reload();
  };

  const waiting = match?.status === "waiting";
  const playing = match?.status === "playing";
  const done = match && !waiting && !playing;

  return (
    <Shell title="Ludo" onBack={onBack} right={<SoundBtn />}>
      <div style={{ background: "radial-gradient(ellipse at 50% 20%,#1e293b,#0b1120 70%)", border: "1px solid #334155", borderRadius: 18, padding: 16 }}>
        <div style={{ textAlign: "center", fontSize: 13, opacity: .8 }}>Player vs player · 2 players · winner gets 90% of the pot</div>

        {!match && (
          <>
            <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: 2, opacity: .7, marginTop: 14 }}>CHOOSE ENTRY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10 }}>
              {LUDO_ENTRIES.map(v => (
                <button key={v} disabled={busy} onClick={() => { playSfx(520, 0.03); setEntry(v); }}
                  style={{ padding: "12px 0", borderRadius: 12, cursor: "pointer", fontWeight: 900,
                    border: `2px solid ${entry === v ? "#facc15" : "#334155"}`,
                    background: entry === v ? "linear-gradient(180deg,#fde68a,#d4af37)" : "#0f172a",
                    color: entry === v ? "#111" : "#f8fafc" }}>{R(v)}</button>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
              Pot <b>{R(entry * 2)}</b> · Winner gets <b style={{ color: "#86efac" }}>{R(Math.round(entry * 2 * 0.9))}</b> · House <b>{R(Math.round(entry * 2 * 0.1))}</b>
            </div>
          </>
        )}

        {waiting && (
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Looking for an opponent…</div>
            <div style={{ fontSize: 13, opacity: .75, marginTop: 6 }}>Entry {R(match.entry)} is held until a match is found.</div>
            <button onClick={cancel} disabled={busy} style={{ ...btn, marginTop: 14 }}>Cancel and get entry back</button>
          </div>
        )}

        {playing && (
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Match found · play the board</div>
            <div style={{ fontSize: 13, opacity: .75, marginTop: 6 }}>When the game ends, both players report the winner.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              <button onClick={() => report(true)} disabled={busy} style={actionBtn}>I WON</button>
              <button onClick={() => report(false)} disabled={busy} style={{ ...actionBtn, background: "#1f2937", color: "#f8fafc" }}>OPPONENT WON</button>
            </div>
          </div>
        )}

        {done && <div style={{ textAlign: "center", marginTop: 18, fontWeight: 900 }}>{match.status === "finished" ? "Match finished" : "Match closed"}</div>}
        {msg && <div style={{ textAlign: "center", marginTop: 12, fontWeight: 800, color: "#fde68a" }}>{msg}</div>}
      </div>

      {!match && <button onClick={join} disabled={busy} style={{ ...actionBtn, opacity: busy ? .6 : 1 }}>{busy ? "…" : `FIND MATCH ${R(entry)}`}</button>}
      {done && <button onClick={() => { setMatch(null); setMsg(""); }} style={actionBtn}>PLAY AGAIN</button>}

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
    </Shell>
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

/* ---------- Goal Wave (penalty shoot-out, virtual points) ---------- */
const GW_DIRS = ["left", "center", "right"];
const GW_NAME = { left: "Left", center: "Center", right: "Right" };
const GW_X = { left: "24%", center: "50%", right: "76%" };
const GW_EDGE = 0.04;
const GW_TABLE = [1.3, 1.7, 2.1, 2.8];
// payout multiplier after k goals in a row (k = 0 means no goal yet)
const gwMult = k => {
  if (k <= 0) return 1;
  if (k <= GW_TABLE.length) return GW_TABLE[k - 1];
  let m = GW_TABLE[GW_TABLE.length - 1];
  for (let i = GW_TABLE.length; i < k; i++) m *= 1.3;
  return Math.round(m * 100) / 100;
};
// chance that the next shot scores after k goals: house edge + step risk built in
const gwChance = k => (1 - GW_EDGE) * gwMult(k) / gwMult(k + 1);
// keeper dives to a corner other than the shot's corner when a goal is scored
const gwOther = d => { const o = GW_DIRS.filter(x => x !== d); return o[Math.floor(Math.random() * o.length)]; };

const GW = {
  page: { background: "linear-gradient(180deg,#0a1f14 0%,#050d09 100%)", minHeight: "100vh", color: "#f3efe0", padding: "14px 12px 40px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" },
  bar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  back: { padding: "8px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontWeight: 800, fontSize: 14, cursor: "pointer" },
  title: { color: GOLD_L, fontWeight: 900, fontSize: 18, letterSpacing: 1 },
  balTag: { fontSize: 13, fontWeight: 900, color: GOLD_L, background: "#000a", border: `1px solid ${GOLD}`, borderRadius: 10, padding: "6px 10px" },
  field: { position: "relative", height: 260, borderRadius: 18, overflow: "hidden", border: `1px solid ${GOLD}`, background: "repeating-linear-gradient(180deg,#15803d 0px,#15803d 40px,#166534 40px,#166534 80px)", boxShadow: "0 10px 26px #000c", marginBottom: 12 },
  goalFrame: { position: "absolute", top: "6%", left: "14%", width: "72%", height: "22%", boxSizing: "border-box", border: "4px solid #f8fafc", borderBottom: "none", backgroundImage: "repeating-linear-gradient(0deg,#ffffff26 0px,#ffffff26 2px,transparent 2px,transparent 10px),repeating-linear-gradient(90deg,#ffffff26 0px,#ffffff26 2px,transparent 2px,transparent 10px)" },
  spot: { position: "absolute", left: "50%", top: "84%", width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: "50%", background: "#fff" },
  keeper: { position: "absolute", fontSize: 40, transform: "translate(-50%,-50%)", transition: "left .55s ease-out, top .55s ease-out", filter: "drop-shadow(0 4px 6px #000a)" },
  ball: { position: "absolute", fontSize: 26, transform: "translate(-50%,-50%)", transition: "left .55s ease-out, top .55s ease-out", filter: "drop-shadow(0 3px 4px #000a)" },
  statRow: { display: "flex", gap: 8, marginBottom: 12 },
  stat: { flex: 1, background: "#0b1d12", border: "1px solid #1f3d2a", borderRadius: 12, padding: "8px 6px", textAlign: "center" },
  statLabel: { fontSize: 10, opacity: 0.7, letterSpacing: 0.5, textTransform: "uppercase" },
  statVal: { fontSize: 16, fontWeight: 900, marginTop: 2, color: GOLD_L },
  dirRow: { display: "flex", gap: 8, marginBottom: 12 },
  betRow: { display: "flex", gap: 6, alignItems: "center", marginBottom: 10 },
  input: { flex: 1, minWidth: 0, padding: "10px", borderRadius: 10, border: `1px solid ${GOLD}`, background: "#0b1d12", color: "#f8fafc", fontWeight: 800, fontSize: 15, boxSizing: "border-box" },
  quick: { padding: "8px 10px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#f8fafc", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  primary: { width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${GOLD},${GOLD_L})`, color: "#1a1300", fontWeight: 900, fontSize: 16, cursor: "pointer" },
  row: { display: "flex", gap: 8 },
  shoot: { flex: 1, padding: "14px 0", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${GOLD},${GOLD_L})`, color: "#1a1300", fontWeight: 900, fontSize: 15, cursor: "pointer" },
  cash: { flex: 1, padding: "14px 0", borderRadius: 14, border: `1px solid ${GOLD_L}`, background: "#14532d", color: "#f0fdf4", fontWeight: 900, fontSize: 14, cursor: "pointer" },
  msg: { minHeight: 20, textAlign: "center", fontSize: 13, fontWeight: 700, margin: "10px 0 0", color: GOLD_L },
  hist: { display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 10 },
  rules: { fontSize: 11, opacity: 0.7, textAlign: "center", marginTop: 14, lineHeight: 1.5 },
};
const gwDirBtn = (sel, busy) => ({ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${sel ? GOLD_L : "#334155"}`, background: sel ? "#14532d" : "#0f172a", color: "#f8fafc", fontWeight: 900, fontSize: 14, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 });
const gwDot = g => ({ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, background: g ? "#16a34a" : "#b91c1c", color: "#fff" });

function GoalWave({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (+me.balance || 0) + (+me.winnings || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState("center");
  const [round, setRound] = useState(null);     // { id, goals, alive }
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);       // { dir, keeper, scored }
  const [history, setHistory] = useState([]);   // newest first: "G" or "S"
  const [msg, setMsg] = useState("");
  const busyRef = useRef(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // resume a round left open (e.g. the player left the screen mid-streak)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.from("casino_goal_rounds")
          .select("id,bet,goals").eq("status", "active").maybeSingle();
        if (alive && data) {
          setRound({ id: data.id, goals: +data.goals || 0, alive: true });
          setBet(+data.bet || MIN);
          setMsg("Your open round was restored. Shoot or cash out.");
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [supabase]);

  const active = !!round && round.alive;
  const goals = round ? round.goals : 0;
  const mult = gwMult(goals);
  const payout = Math.round(bet * mult * 100) / 100;
  const chance = gwChance(goals);

  const clamp = v => Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN));
  const changeBet = v => { if (!active && !busy) setBet(clamp(v)); };

  const rpc = async (fn, args) => {
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc(fn, args)); } catch (e) { error = e; }
    if (error || !data?.success) throw new Error(error?.message || "Connection lost");
    return data;
  };

  const startGame = async () => {
    if (active || busyRef.current) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    busyRef.current = true; setBusy(true); setMsg("");
    try {
      const data = await rpc("casino_goal_start", { p_bet: bet });
      setRound({ id: data.round_id, goals: 0, alive: true });
      setBal(num(data.new_balance, bal));
      setLast(null);
      setHistory([]);
      setMsg("Pick a corner and shoot.");
      reload && reload();
    } catch (e) {
      say ? say(e.message, 1) : setMsg(e.message);
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const shoot = async () => {
    if (!active || busyRef.current) return;
    busyRef.current = true; setBusy(true); setMsg("Shot taken...");
    try {
      const data = await rpc("casino_goal_shot", { p_round: round.id, p_dir: pick });
      const id = round.id;
      const goalsNow = num(data.goals, goals + (data.scored ? 1 : 0));
      setLast({ dir: pick, keeper: data.keeper, scored: !!data.scored });
      timerRef.current = setTimeout(() => {
        setHistory(h => [data.scored ? "G" : "S", ...h].slice(0, 12));
        if (data.scored) {
          setRound({ id, goals: goalsNow, alive: true });
          setMsg(`Goal! Streak at ${gwMult(goalsNow)}x. Cash out or keep shooting.`);
        } else {
          setRound({ id, goals: goalsNow, alive: false });
          setMsg("Saved! Streak lost.");
          reload && reload();
        }
        busyRef.current = false; setBusy(false);
      }, 900);
    } catch (e) {
      busyRef.current = false; setBusy(false);
      say ? say(e.message, 1) : setMsg(e.message);
    }
  };

  const cashOut = async () => {
    if (!active || busyRef.current || goals < 1) return;
    busyRef.current = true; setBusy(true);
    try {
      const data = await rpc("casino_goal_cashout", { p_round: round.id });
      setRound({ id: round.id, goals, alive: false });
      setBal(num(data.new_balance, bal));
      setMsg(`Cashed out ${RM(data.won_amount)} at ${mult.toFixed(2)}x`);
      reload && reload();
    } catch (e) {
      say ? say(e.message, 1) : setMsg(e.message);
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const ballPos = last
    ? { left: GW_X[last.dir], top: last.scored ? "16%" : "32%" }
    : { left: "50%", top: "84%" };
  const keeperPos = last ? { left: GW_X[last.keeper], top: "32%" } : { left: "50%", top: "32%" };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Goal Wave</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={GW.field}>
        <div style={GW.goalFrame} />
        <div style={GW.spot} />
        <div style={{ ...GW.keeper, ...keeperPos }}>🧤</div>
        <div style={{ ...GW.ball, ...ballPos }}>⚽</div>
      </div>

      <div style={GW.statRow}>
        <div style={GW.stat}>
          <div style={GW.statLabel}>Streak</div>
          <div style={GW.statVal}>{goals}</div>
        </div>
        <div style={GW.stat}>
          <div style={GW.statLabel}>Multiplier</div>
          <div style={GW.statVal}>{mult.toFixed(2)}x</div>
        </div>
        <div style={GW.stat}>
          <div style={GW.statLabel}>Goal chance</div>
          <div style={GW.statVal}>{active ? `${Math.round(chance * 100)}%` : "—"}</div>
        </div>
      </div>

      <div style={GW.dirRow}>
        {GW_DIRS.map(d => (
          <button key={d} disabled={busy} onClick={() => setPick(d)} style={gwDirBtn(pick === d, busy)}>
            {GW_NAME[d]}
          </button>
        ))}
      </div>

      {!active && (
        <div style={GW.betRow}>
          <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
          <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
            onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
          <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
          {[10, 50, 100, 500].map(v => (
            <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>
          ))}
        </div>
      )}

      {!active ? (
        <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={startGame}>
          {round ? "Play again" : "Start"} · Stake {R(bet)}
        </button>
      ) : (
        <div style={GW.row}>
          <button style={{ ...GW.shoot, opacity: busy ? 0.5 : 1, cursor: busy ? "not-allowed" : "pointer" }}
            disabled={busy} onClick={shoot}>
            Shoot {GW_NAME[pick]}
          </button>
          <button style={{ ...GW.cash, opacity: goals < 1 || busy ? 0.45 : 1, cursor: goals < 1 || busy ? "not-allowed" : "pointer" }}
            disabled={goals < 1 || busy} onClick={cashOut}>
            Cash out {RM(payout)}
          </button>
        </div>
      )}

      <div style={GW.msg}>{msg}</div>

      {history.length > 0 && (
        <div style={GW.hist}>
          {history.map((h, i) => <div key={i} style={gwDot(h === "G")}>{h}</div>)}
        </div>
      )}

      <div style={GW.rules}>
        Choose a corner, then shoot. Each goal raises the multiplier (1.3x, 1.7x, 2.1x, 2.8x, then higher).
        A save ends the streak and the stake is lost. Cash out any time after your first goal.
        Virtual points only.
      </div>
    </div>
  );
}

/* ---------- VIP ---------- */
const VIP_BTN = { width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${GOLD},${GOLD_L})`, color: "#1a1300", fontWeight: 900, fontSize: 15, cursor: "pointer" };
const VIP_CARD = { background: "#0b1d12", border: "1px solid #1f3d2a", borderRadius: 14, padding: 14, marginBottom: 12 };
const VIP_BAR = { height: 8, borderRadius: 8, background: "#1f2937", overflow: "hidden", marginTop: 6 };
const vipFill = p => ({ height: "100%", width: `${Math.max(0, Math.min(100, p))}%`, background: `linear-gradient(90deg,${GOLD},${GOLD_L})`, transition: "width .5s" });

function VipPage({ supabase, me, reload, say, onBack }) {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("vip_status");
      if (error) throw error;
      setSt(data || {});
    } catch (e) { setMsg(e?.message || "Could not load VIP"); }
  }, [supabase]);
  useEffect(() => { load(); }, [load, me.balance, me.winnings]);

  const levels = st?.levels || [];
  const cur = +st?.level || 0;
  const curRow = levels.find(l => l.level === cur);
  const nextRow = levels.find(l => l.level === st?.next_level);
  const claimed = st?.claimed || [];
  const claimable = levels.filter(l => l.level <= cur && l.levelup_bonus > 0 && !claimed.includes(l.level));
  const claimTotal = claimable.reduce((a, l) => a + Number(l.levelup_bonus), 0);
  const expPct = nextRow ? (+st.exp / nextRow.exp_needed) * 100 : 100;
  const maintPct = curRow && curRow.maintain_exp > 0 ? (+st.period_exp / curRow.maintain_exp) * 100 : 100;

  const claim = async () => {
    if (busy || claimTotal <= 0) return;
    setBusy(true); setMsg("");
    try {
      const { data, error } = await supabase.rpc("vip_claim_levelup");
      if (error || !data?.success) throw error || new Error("Could not claim");
      setMsg(`Claimed ${RM(data.claimed)} to Winnings`);
      reload && reload();
      load();
    } catch (e) {
      const m = e?.message || "Could not claim";
      say ? say(m, 1) : setMsg(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "linear-gradient(180deg,#0a1f14 0%,#050d09 100%)", minHeight: "100vh", color: "#f3efe0", padding: "14px 12px 40px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>« Lobby</button>
        <div style={{ color: GOLD_L, fontWeight: 900, fontSize: 18 }}>VIP</div>
        <div style={{ width: 70 }} />
      </div>

      {!st ? <p style={{ textAlign: "center", opacity: .7 }}>{msg || "Loading…"}</p> : (
        <>
          <div style={{ ...VIP_CARD, textAlign: "center", background: "linear-gradient(135deg,#3f2a05,#ca8a04)", border: `1px solid ${GOLD}` }}>
            <div style={{ fontSize: 12, opacity: .9 }}>Your level</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fff7c2", textShadow: "0 2px 8px #000" }}>{cur ? `VIP ${cur}` : "No VIP yet"}</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>{+st.exp} EXP · Rebate {((+st.rebate_rate || 0) * 100).toFixed(2)}% / month</div>
          </div>

          <div style={VIP_CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{nextRow ? `Progress to VIP ${nextRow.level}` : "Top level reached"}</span>
              <b style={{ color: GOLD_L }}>{nextRow ? `${+st.exp} / ${nextRow.exp_needed}` : `${+st.exp} EXP`}</b>
            </div>
            <div style={VIP_BAR}><div style={vipFill(expPct)} /></div>
            {curRow && curRow.maintain_exp > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 14 }}>
                  <span>Keep VIP {cur} this month</span>
                  <b style={{ color: GOLD_L }}>{+st.period_exp} / {curRow.maintain_exp}</b>
                </div>
                <div style={VIP_BAR}><div style={vipFill(maintPct)} /></div>
                <div style={{ fontSize: 11, opacity: .7, marginTop: 6 }}>If you miss the target on the 1st, your level drops to the highest one you still qualify for.</div>
              </>
            )}
          </div>

          <div style={VIP_CARD}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Level-up reward</div>
            <div style={{ fontSize: 12, opacity: .8, marginBottom: 10 }}>
              {claimTotal > 0 ? `You can claim ${RM(claimTotal)} now. Each level pays only once.` : "No level-up reward to claim right now."}
            </div>
            <button style={{ ...VIP_BTN, opacity: claimTotal > 0 && !busy ? 1 : .45, cursor: claimTotal > 0 && !busy ? "pointer" : "not-allowed" }}
              disabled={claimTotal <= 0 || busy} onClick={claim}>
              Claim {claimTotal > 0 ? RM(claimTotal) : ""}
            </button>
            {msg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: GOLD_L, textAlign: "center" }}>{msg}</div>}
          </div>

          <div style={VIP_CARD}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>All levels</div>
            {levels.map(l => {
              const done = l.level <= cur;
              const got = claimed.includes(l.level);
              return (
                <div key={l.level} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid #1f3d2a", opacity: done ? 1 : .6 }}>
                  <div>
                    <div style={{ fontWeight: 900, color: done ? GOLD_L : "#f8fafc" }}>VIP {l.level} {done ? "✓" : ""}</div>
                    <div style={{ fontSize: 11, opacity: .75 }}>
                      {Number(l.exp_needed).toLocaleString("en-IN")} EXP · Rebate {(Number(l.rebate_rate) * 100).toFixed(2)}%
                      {l.maintain_exp > 0 ? ` · keep ${Number(l.maintain_exp).toLocaleString("en-IN")} EXP/month` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, textAlign: "right" }}>
                    {l.levelup_bonus > 0 ? R(l.levelup_bonus) : ""}
                    <div style={{ fontSize: 11, opacity: .7 }}>{got ? "Claimed" : done ? "Ready" : "Locked"}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, opacity: .7, textAlign: "center" }}>
            1 EXP for every ₹10 staked. Rebate and rewards are credited to Winnings. Settled at 2:00 am on the 1st of every month. Virtual points only.
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Plinko (server decides the path and the bin) ---------- */
const PL_TABLE = {
  8: [10.26, 4.49, 1.53, 0.43, 0.28, 0.43, 1.53, 4.49, 10.26],
  12: [15.09, 8.91, 4.76, 2.24, 0.95, 0.48, 0.41, 0.48, 0.95, 2.24, 4.76, 8.91, 15.09],
  16: [18.86, 12.8, 8.25, 4.99, 2.8, 1.48, 0.8, 0.55, 0.51, 0.55, 0.8, 1.48, 2.8, 4.99, 8.25, 12.8, 18.86],
};
const plBinColor = m => (m >= 5 ? "#dc2626" : m >= 2 ? "#f59e0b" : m >= 1 ? "#16a34a" : "#334155");
const PL = {
  board: { position: "relative", width: "100%", height: 380, borderRadius: 16, overflow: "hidden", border: `1px solid ${GOLD}`, background: "radial-gradient(circle at 50% 0%,#1e1b4b 0%,#0b0a1f 70%)", boxShadow: "0 10px 26px #000c", marginBottom: 12 },
  peg: { position: "absolute", width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: "50%", background: "#c4b5fd" },
  ball: { position: "absolute", width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%,#fff,#facc15)", boxShadow: "0 0 10px #facc15", transition: "left .12s linear, top .12s linear" },
  bin: { position: "absolute", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, borderRadius: 4, boxSizing: "border-box", border: "1px solid #0009" },
  rowBtn: (sel, busy) => ({ flex: 1, padding: "10px 0", borderRadius: 12, border: `1px solid ${sel ? GOLD_L : "#334155"}`, background: sel ? "#14532d" : "#0f172a", color: "#f8fafc", fontWeight: 900, fontSize: 14, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }),
};

function Plinko({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [bet, setBet] = useState(10);
  const [rows, setRows] = useState(12);
  const [busy, setBusy] = useState(false);
  const [drop, setDrop] = useState(null);       // { id, path, bin, multiplier, payout }
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);       // finished drop
  const [history, setHistory] = useState([]);   // newest first multipliers
  const [msg, setMsg] = useState("");
  const busyRef = useRef(false);
  const dropSeq = useRef(0);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  // walk the ball down the server-decided path
  useEffect(() => {
    if (!drop) return;
    let i = 0;
    setStep(0);
    setDone(null);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= drop.path.length) {
        clearInterval(timer.current);
        setDone(drop);
        setHistory(h => [drop.multiplier, ...h].slice(0, 12));
        busyRef.current = false;
        setBusy(false);
      }
    }, 130);
    return () => clearInterval(timer.current);
  }, [drop]);

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const dropBall = async () => {
    if (busyRef.current) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    busyRef.current = true; setBusy(true); setMsg("");
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_plinko_drop", { p_bet: bet, p_rows: rows })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      busyRef.current = false; setBusy(false);
      const m = error?.message || "Could not drop the ball";
      return say ? say(m, 1) : setMsg(m);
    }
    setBal(Number(data.new_balance) || 0);
    dropSeq.current += 1;
    setDrop({ id: dropSeq.current, path: data.path, bin: data.bin, multiplier: Number(data.multiplier) || 0, payout: Number(data.payout) || 0 });
    reload && reload();
  };

  // board geometry (percent of the board box)
  const n = rows;
  const rowH = 100 / (n + 3);
  const h = 50 / (n + 2);
  const k = drop ? drop.path.slice(0, step).split("").filter(c => c === "R").length : 0;
  const ballX = drop ? 50 + (2 * k - step) * h : 50;
  const ballY = drop ? step * rowH : 0;

  const pegs = [];
  for (let r = 0; r < n; r++) {
    for (let j = 0; j <= r + 1; j++) {
      pegs.push(<div key={`${r}-${j}`} style={{ ...PL.peg, left: `${50 + (2 * j - r - 1) * h}%`, top: `${(r + 1) * rowH}%` }} />);
    }
  }
  const bins = (PL_TABLE[n] || []).map((m, idx) => (
    <div key={idx} style={{ ...PL.bin, left: `${50 + (2 * idx - n) * h - h}%`, width: `${2 * h}%`, top: `${(n + 1) * rowH}%`, height: `${rowH * 1.5}%`, background: plBinColor(m), fontSize: n > 12 ? 8 : 10 }}>
      {m}x
    </div>
  ));

  const finished = done && drop && done.id === drop.id;
  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Plinko</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={PL.board}>
        {pegs}
        {bins}
        {drop && <div style={{ ...PL.ball, left: `${ballX}%`, top: `${ballY}%` }} />}
        {!drop && <div style={{ ...PL.ball, left: "50%", top: "2%" }} />}
      </div>

      <div style={GW.statRow}>
        {[8, 12, 16].map(r => (
          <button key={r} disabled={busy} onClick={() => setRows(r)} style={{ ...PL.rowBtn(rows === r, busy), flex: 1 }}>
            {r} rows
          </button>
        ))}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={dropBall}>
        Drop ball · Stake {R(bet)}
      </button>

      <div style={GW.msg}>
        {finished
          ? `Landed ${done.multiplier}x · ${done.payout > 0 ? `Won ${RM(done.payout)}` : "No win this time"}`
          : msg}
      </div>

      {history.length > 0 && (
        <div style={GW.hist}>
          {history.map((m, i) => (
            <div key={i} style={{ padding: "4px 8px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#fff", background: plBinColor(m) }}>{m}x</div>
          ))}
        </div>
      )}

      <div style={GW.rules}>
        Each ball bounces down {rows} rows and lands in a bin. Edge bins pay the most, centre bins pay less. Return is about 96%. Virtual points only.
      </div>
    </div>
  );
}

/* ---------- Limbo (server rolls the result) ---------- */
const LB = {
  screen: { textAlign: "center", padding: "22px 10px", borderRadius: 18, border: "1px solid #334155", background: "radial-gradient(circle at 50% 0%,#0c4a6e 0%,#020617 75%)", boxShadow: "0 10px 26px #000c", marginBottom: 12 },
  chip: (won) => ({ padding: "4px 8px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#fff", background: won ? "#16a34a" : "#b91c1c" }),
};

function Limbo({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(1);
  const [res, setRes] = useState(null);         // { result, won, payout, target }
  const [history, setHistory] = useState([]);   // newest first { result, won }
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const t = Math.round((Number(target) || 0) * 100) / 100;
  const validTarget = t >= 1.01 && t <= 1000;
  const winChance = validTarget ? Math.min(99, 96 / t) : 0;

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const play = async () => {
    if (busy) return;
    if (!validTarget) return setMsg("Target must be between 1.01x and 1000x");
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setRes(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_limbo_play", { p_bet: bet, p_target: t })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false);
      const m = error?.message || "Could not play";
      return say ? say(m, 1) : setMsg(m);
    }
    setBal(Number(data.new_balance) || 0);
    const result = Number(data.result) || 1;
    const won = !!data.won;
    const t0 = Date.now(), DUR = 700;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / DUR);
      setShown(1 + (result - 1) * p);
      if (p >= 1) {
        clearInterval(timer.current);
        setRes({ result, won, payout: Number(data.payout) || 0, target: t });
        setHistory(h => [{ result, won }, ...h].slice(0, 12));
        setBusy(false);
        reload && reload();
      }
    }, 30);
  };

  const color = res ? (res.won ? "#4ade80" : "#f87171") : GOLD_L;
  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Limbo</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ ...LB.screen, borderColor: res ? (res.won ? "#16a34a" : "#b91c1c") : "#334155" }}>
        <div style={{ fontSize: 56, fontWeight: 900, color, textShadow: "0 4px 18px #000" }}>{shown.toFixed(2)}x</div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 6 }}>
          {res ? (res.won ? `Hit ${res.target.toFixed(2)}x · Won ${RM(res.payout)}` : `Missed ${res.target.toFixed(2)}x`) : `Target ${validTarget ? t.toFixed(2) : "—"}x`}
        </div>
      </div>

      <div style={GW.statRow}>
        <div style={GW.stat}>
          <div style={GW.statLabel}>Win chance</div>
          <div style={GW.statVal}>{validTarget ? `${winChance.toFixed(2)}%` : "—"}</div>
        </div>
        <div style={GW.stat}>
          <div style={GW.statLabel}>Payout</div>
          <div style={GW.statVal}>{validTarget ? RM(Math.round(bet * t * 100) / 100) : "—"}</div>
        </div>
        <div style={GW.stat}>
          <div style={GW.statLabel}>Target</div>
          <div style={GW.statVal}>{validTarget ? `${t.toFixed(2)}x` : "—"}</div>
        </div>
      </div>

      <div style={GW.betRow}>
        <span style={{ fontSize: 12, opacity: .8 }}>Target</span>
        <input type="number" step="0.01" value={target} disabled={busy} style={GW.input}
          onChange={e => setTarget(e.target.value)} />
        {[1.5, 2, 5, 10].map(v => (
          <button key={v} disabled={busy} style={GW.quick} onClick={() => setTarget(v)}>{v}x</button>
        ))}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={play}>
        Play · Stake {R(bet)}
      </button>

      <div style={GW.msg}>{msg}</div>

      {history.length > 0 && (
        <div style={GW.hist}>
          {history.map((h, i) => <div key={i} style={LB.chip(h.won)}>{h.result.toFixed(2)}x</div>)}
        </div>
      )}

      <div style={GW.rules}>
        The server rolls a result. If it reaches your target you get stake × target. Otherwise you lose the stake. Return is about 96%. Virtual points only.
      </div>
    </div>
  );
}

/* ---------- Vortex 2 (same server RPC as Vortex, refined ring dial) ---------- */
const initials = (n) => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const V2 = {
  page: { minHeight: "100vh", padding: "12px 12px 40px", boxSizing: "border-box", color: "#e5e7eb", background: "radial-gradient(120% 70% at 50% 0%,#1b1f2a 0%,#07090e 70%)", fontFamily: "system-ui,sans-serif" },
  panel: { background: "linear-gradient(180deg,#121621,#0b0e15)", border: "1px solid #232a3a", borderRadius: 16, padding: 12, marginBottom: 10 },
  label: { fontSize: 11, letterSpacing: 1, color: "#8b93a7", marginBottom: 6 },
  quick: { flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid #2a3345", background: "#0e1219", color: "#cbd5e1", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  step: { width: 40, height: 40, borderRadius: 10, border: "1px solid #2a3345", background: "#0e1219", color: "#e2e8f0", fontSize: 18, fontWeight: 800, cursor: "pointer" },
  input: { flex: 1, minWidth: 0, padding: "10px", borderRadius: 10, border: "1px solid #2a3345", background: "#0a0d14", color: "#f8fafc", fontWeight: 800, fontSize: 15, textAlign: "center", boxSizing: "border-box" },
  spin: (dis) => ({ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", cursor: dis ? "not-allowed" : "pointer", color: "#fff", fontWeight: 900, fontSize: 15, letterSpacing: 1, opacity: dis ? 0.5 : 1, background: "linear-gradient(90deg,#6d28d9,#a855f7)", boxShadow: "0 8px 22px #6d28d966" }),
  display: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", minWidth: 110, padding: "10px 12px", borderRadius: 12, background: "rgba(6,8,14,.94)", border: "1px solid #3b2a6b", textAlign: "center", boxShadow: "0 0 26px #7c3aed55" },
};

function Vortex2({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = num(cfg?.min_bet, 10), MAX = num(cfg?.max_bet, 50000);
  const [bal, setBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [chip, setChip] = useState(10);
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0);
  const [anim, setAnim] = useState(false);
  const [res, setRes] = useState(null);
  const [recent, setRecent] = useState([]);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const changeStake = v => { if (!busy) setChip(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const spin = async () => {
    if (busy) return;
    if (chip < MIN) return flash(`Minimum bet ${R(MIN)}`);
    if (chip > MAX) return flash(`Max bet ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip); setBusy(true); setRes(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_vortex_spin", { p_bet: chip })); } catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false); setBal(before);
      const m = friendly(error);
      return say ? say(m, 1) : flash(m);
    }
    const idx = Math.min(VORTEX.length - 1, Math.max(0, Math.round(num(data.slot, 0))));
    const center = idx * VSEG + VSEG / 2;
    setAnim(true);
    setRot(r => r + 2160 + mod(-center - r, 360));
    timer.current = setTimeout(() => {
      const net = num(data.won_amount, 0) - chip;
      setRes({ idx, mult: VORTEX[idx].m, net });
      setRecent(h => [idx, ...h].slice(0, 10));
      if (data.new_balance != null) setBal(num(data.new_balance, 0));
      setBusy(false);
      reload && reload();
    }, 3800);
  };

  const RIN = 146, HUB = 58;
  return (
    <div style={V2.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ ...V2.quick, flex: "none", padding: "8px 14px" }}>‹ Lobby</button>
        <div style={{ fontWeight: 900, letterSpacing: 1.5, color: "#e9d5ff" }}>VORTEX 2</div>
        <div style={{ fontWeight: 800, color: "#fde68a", fontSize: 13 }}>{R(bal)}</div>
      </div>

      <div style={{ position: "relative", width: "min(86vw,340px)", aspectRatio: "1", margin: "0 auto 12px" }}>
        <div style={{ position: "absolute", left: "50%", top: -6, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "16px solid #e879f9", zIndex: 3, filter: "drop-shadow(0 0 6px #e879f9)" }} />
        <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", display: "block", transform: `rotate(${rot}deg)`, transition: anim ? "transform 3.8s cubic-bezier(.12,.7,.15,1)" : "none" }}>
          <defs>
            <radialGradient id="v2hub" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#1f1338" /><stop offset="1" stopColor="#07050d" />
            </radialGradient>
          </defs>
          <circle cx="150" cy="150" r="149" fill="#0a0c12" stroke="#2a3345" strokeWidth="1" />
          {VORTEX.map((v, i) => {
            const a1 = i * VSEG, a2 = (i + 1) * VSEG;
            const [x1, y1] = pt(RIN, a1), [x2, y2] = pt(RIN, a2);
            const [ix1, iy1] = pt(HUB, a1), [ix2, iy2] = pt(HUB, a2);
            const [tx, ty] = pt(104, a1 + VSEG / 2);
            return (
              <g key={i}>
                <path d={`M${x1} ${y1} A${RIN} ${RIN} 0 0 1 ${x2} ${y2} L${ix2} ${iy2} A${HUB} ${HUB} 0 0 0 ${ix1} ${iy1} Z`}
                  fill={VCOL[i]} fillOpacity="0.9" stroke="#0a0c12" strokeWidth="2" />
                <text x={tx} y={ty} fill="#fff" fontSize="11" fontWeight="800" textAnchor="middle" dominantBaseline="middle">{v.t}</text>
              </g>
            );
          })}
          {[70, 96, 126].map(r => <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="#ffffff10" strokeWidth="1" />)}
          <circle cx="150" cy="150" r={HUB} fill="url(#v2hub)" stroke="#a855f7" strokeWidth="2" />
        </svg>
        <div style={V2.display}>
          {res ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, color: res.net > 0 ? "#4ade80" : res.net === 0 ? "#facc15" : "#f87171" }}>{VORTEX[res.idx].t}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1" }}>{res.net > 0 ? `+${RM(res.net)}` : res.net === 0 ? "Stake returned" : `-${RM(-res.net)}`}</div>
            </>
          ) : (
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#8b93a7" }}>{busy ? "SPINNING" : "READY"}</div>
          )}
        </div>
      </div>

      <div style={V2.panel}>
        <div style={V2.label}>STAKE</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button style={V2.step} disabled={busy} onClick={() => changeStake(chip - 10)}>−</button>
          <input type="number" value={chip} disabled={busy} style={V2.input}
            onChange={e => setChip(+e.target.value || 0)} onBlur={e => changeStake(e.target.value)} />
          <button style={V2.step} disabled={busy} onClick={() => changeStake(chip + 10)}>+</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[10, 50, 100, 500].map(v => <button key={v} disabled={busy} style={{ ...V2.quick, borderColor: chip === v ? "#a855f7" : "#2a3345", color: chip === v ? "#e9d5ff" : "#cbd5e1" }} onClick={() => changeStake(v)}>{v}</button>)}
        </div>
        <button style={V2.spin(busy)} disabled={busy} onClick={spin}>{busy ? "SPINNING…" : `SPIN · ${R(chip)}`}</button>
        {tip && <div style={{ marginTop: 10, textAlign: "center", fontWeight: 700, color: "#fde68a", fontSize: 13 }}>{tip}</div>}
      </div>

      {recent.length > 0 && (
        <div style={V2.panel}>
          <div style={V2.label}>RECENT</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {recent.map((i, k) => (
              <div key={k} style={{ padding: "5px 9px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#fff", background: VCOL[i] }}>{VORTEX[i].t}</div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>Each spin is settled by the server. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- Coin Flip (server flips the coin) ---------- */
const CF = {
  coin: (rot) => ({ position: "relative", width: 120, height: 120, margin: "8px auto 14px", transformStyle: "preserve-3d", transform: `rotateY(${rot}deg)`, transition: "transform 1.1s cubic-bezier(.2,.7,.2,1)" }),
  face: (back) => ({ position: "absolute", inset: 0, borderRadius: "50%", display: "grid", placeItems: "center", background: back ? "radial-gradient(circle at 35% 30%,#fef3c7,#b45309)" : "radial-gradient(circle at 35% 30%,#fef9c3,#ca8a04)", color: "#422006", fontWeight: 900, fontSize: 18, letterSpacing: 1, border: "4px solid #fde68a", boxShadow: "0 10px 24px #000a", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : "none" }),
  side: (sel, busy) => ({ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${sel ? "#fde68a" : "#334155"}`, background: sel ? "#4a3206" : "#0f172a", color: "#f8fafc", fontWeight: 900, fontSize: 14, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }),
};

function CoinFlip({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [side, setSide] = useState("heads");
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0);
  const [res, setRes] = useState(null);          // { result, won, payout }
  const [history, setHistory] = useState([]);    // newest first { result, won }
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const flip = async () => {
    if (busy) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setRes(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_coinflip_play", { p_bet: bet, p_side: side })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false);
      const m = error?.message || "Could not flip";
      return say ? say(m, 1) : setMsg(m);
    }
    setBal(Number(data.new_balance) || 0);
    const tails = data.result === "tails";
    setRot(r => Math.floor(r / 360) * 360 + 1800 + (tails ? 180 : 0));
    timer.current = setTimeout(() => {
      const won = !!data.won;
      setRes({ result: data.result, won, payout: Number(data.payout) || 0 });
      setHistory(h => [{ result: data.result, won }, ...h].slice(0, 12));
      setBusy(false);
      reload && reload();
    }, 1150);
  };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Coin Flip</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ perspective: 600, marginBottom: 4 }}>
        <div style={CF.coin(rot)}>
          <div style={CF.face(false)}>HEADS</div>
          <div style={CF.face(true)}>TAILS</div>
        </div>
      </div>

      <div style={{ textAlign: "center", minHeight: 26, marginBottom: 8, fontWeight: 900, color: res ? (res.won ? "#4ade80" : "#f87171") : GOLD_L }}>
        {res ? (res.won ? `${res.result.toUpperCase()} · Won ${RM(res.payout)}` : `${res.result.toUpperCase()} · Lost`) : "Pick a side"}
      </div>

      <div style={GW.dirRow}>
        {["heads", "tails"].map(s => (
          <button key={s} disabled={busy} onClick={() => setSide(s)} style={CF.side(side === s, busy)}>{s.toUpperCase()}</button>
        ))}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={flip}>
        Flip · Stake {R(bet)} · Pays 1.92x
      </button>

      <div style={GW.msg}>{msg}</div>

      {history.length > 0 && (
        <div style={GW.hist}>
          {history.map((h, i) => (
            <div key={i} style={{ padding: "4px 8px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#fff", background: h.won ? "#16a34a" : "#b91c1c" }}>
              {h.result[0].toUpperCase()}
            </div>
          ))}
        </div>
      )}

      <div style={GW.rules}>Pick heads or tails. A correct call pays 1.92× the stake. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- Lucky Wheel (server picks the segment) ---------- */
const WHEEL = [
  { t: "0x", m: 0, c: "#374151" }, { t: "0.5x", m: 0.5, c: "#1d4ed8" }, { t: "1.5x", m: 1.5, c: "#0f766e" },
  { t: "2x", m: 2, c: "#7e22ce" }, { t: "3x", m: 3, c: "#b45309" }, { t: "5x", m: 5, c: "#be123c" }, { t: "10x", m: 10, c: "#ca8a04" },
];
const WSEG = 360 / WHEEL.length;

function LuckyWheel({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0);
  const [res, setRes] = useState(null);          // { idx, mult, net }
  const [recent, setRecent] = useState([]);
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const spin = async () => {
    if (busy) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setRes(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_wheel_spin", { p_bet: bet })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false);
      const m = error?.message || "Could not spin";
      return say ? say(m, 1) : setMsg(m);
    }
    const idx = Math.min(WHEEL.length - 1, Math.max(0, Math.round(Number(data.slot) || 0)));
    const center = idx * WSEG + WSEG / 2;
    setRot(r => r + 2160 + mod(-center - r, 360));
    timer.current = setTimeout(() => {
      const payout = Number(data.payout) || 0;
      setRes({ idx, mult: WHEEL[idx].m, net: payout - bet });
      setRecent(h => [idx, ...h].slice(0, 12));
      setBal(Number(data.new_balance) || 0);
      setBusy(false);
      reload && reload();
    }, 3800);
  };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Lucky Wheel</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ position: "relative", width: "min(80vw,320px)", aspectRatio: "1", margin: "4px auto 10px" }}>
        <div style={{ position: "absolute", left: "50%", top: -10, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "18px solid #fde68a", zIndex: 3 }} />
        <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", display: "block", transform: `rotate(${rot}deg)`, transition: "transform 3.8s cubic-bezier(.12,.7,.15,1)", filter: "drop-shadow(0 12px 18px #000c)" }}>
          <circle cx="150" cy="150" r="148" fill="#111827" />
          {WHEEL.map((w, i) => {
            const a1 = i * WSEG, a2 = (i + 1) * WSEG;
            const [x1, y1] = pt(140, a1), [x2, y2] = pt(140, a2);
            const [tx, ty] = pt(92, a1 + WSEG / 2);
            return (
              <g key={i}>
                <path d={`M150 150 L${x1} ${y1} A140 140 0 0 1 ${x2} ${y2} Z`} fill={w.c} stroke="#fef3c7" strokeWidth="1.5" />
                <text x={tx} y={ty} fill="#fff" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="middle">{w.t}</text>
              </g>
            );
          })}
          <circle cx="150" cy="150" r="22" fill="#fde68a" stroke="#92400e" strokeWidth="3" />
        </svg>
      </div>

      <div style={{ textAlign: "center", minHeight: 44 }}>
        {res && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, color: res.net > 0 ? "#4ade80" : res.net === 0 ? "#facc15" : "#f87171" }}>{WHEEL[res.idx].t}</div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{res.net > 0 ? `Won ${RM(res.net)}` : res.net === 0 ? "Stake returned" : `Lost ${RM(-res.net)}`}</div>
          </>
        )}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={spin}>
        {busy ? "Spinning…" : `Spin · Stake ${R(bet)}`}
      </button>

      <div style={GW.msg}>{msg}</div>

      {recent.length > 0 && (
        <div style={GW.hist}>
          {recent.map((i, k) => (
            <div key={k} style={{ padding: "4px 8px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#fff", background: WHEEL[i].c }}>{WHEEL[i].t}</div>
          ))}
        </div>
      )}

      <div style={GW.rules}>The server picks the segment by weight. Segments on the wheel are drawn the same size. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- Keno (player picks, server draws 10 of 40) ---------- */
const KN = {
  cell: (picked, drawn, hit) => ({
    aspectRatio: "1", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900, cursor: "pointer", userSelect: "none",
    border: `1px solid ${hit ? "#16a34a" : picked ? "#c084fc" : "#334155"}`,
    background: hit ? "#15803d" : drawn ? "#4a3206" : picked ? "#4c1d95" : "#0f172a",
    color: hit || picked || drawn ? "#fff" : "#94a3b8",
  }),
};

function Keno({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [count, setCount] = useState(4);
  const [picks, setPicks] = useState([]);
  const [draw, setDraw] = useState(null);
  const [res, setRes] = useState(null);          // { hits, multiplier, payout }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };
  const changeCount = c => { if (busy) return; setCount(c); setPicks([]); setDraw(null); setRes(null); };
  const toggle = n => {
    if (busy) return;
    if (draw) { setDraw(null); setRes(null); }
    setPicks(p => (p.includes(n) ? p.filter(x => x !== n) : p.length < count ? [...p, n] : p));
  };

  const play = async () => {
    if (busy) return;
    if (picks.length !== count) return setMsg(`Pick ${count} numbers (${picks.length}/${count})`);
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setDraw(null); setRes(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_keno_play", { p_bet: bet, p_picks: picks })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false);
      const m = error?.message || "Could not play";
      return say ? say(m, 1) : setMsg(m);
    }
    setBal(Number(data.new_balance) || 0);
    setDraw((data.draw || []).map(Number));
    setRes({ hits: Number(data.hits) || 0, multiplier: Number(data.multiplier) || 0, payout: Number(data.payout) || 0 });
    setBusy(false);
    reload && reload();
  };

  const cells = Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Keno</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={GW.dirRow}>
        {[4, 6, 8, 10].map(c => (
          <button key={c} disabled={busy} onClick={() => changeCount(c)} style={CF.side(count === c, busy)}>Pick {c}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 5, marginBottom: 10 }}>
        {cells.map(n => {
          const picked = picks.includes(n);
          const drawn = !!draw && draw.includes(n);
          const hit = picked && drawn;
          return (
            <div key={n} onClick={() => toggle(n)} style={{ ...KN.cell(picked, drawn, hit), fontSize: 11 }}>{n}</div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", minHeight: 26, fontWeight: 900, color: res ? (res.payout > 0 ? "#4ade80" : "#f87171") : GOLD_L }}>
        {res ? `${res.hits} hit · ${res.multiplier}x · ${res.payout > 0 ? `Won ${RM(res.payout)}` : "No win"}` : `Picked ${picks.length}/${count}`}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={play}>
        {busy ? "Drawing…" : `Play · Stake ${R(bet)}`}
      </button>

      <div style={GW.msg}>{msg}</div>

      <div style={GW.rules}>Pick numbers from 1 to 40. The server draws 10. More hits pay more. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- Hi-Lo (server draws the next card) ---------- */
const HL_LABEL = (n) => (n === 1 ? "A" : n === 11 ? "J" : n === 12 ? "Q" : n === 13 ? "K" : String(n));
const HL = {
  card: { width: 110, height: 150, margin: "8px auto 14px", borderRadius: 14, display: "grid", placeItems: "center", background: "linear-gradient(160deg,#ffffff,#e2e8f0)", color: "#111827", fontSize: 56, fontWeight: 900, border: "4px solid #fde68a", boxShadow: "0 12px 26px #000a" },
  btn: (dis, tone) => ({ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", cursor: dis ? "not-allowed" : "pointer", color: "#fff", fontWeight: 900, fontSize: 14, opacity: dis ? 0.4 : 1, background: tone === "hi" ? "linear-gradient(135deg,#15803d,#22c55e)" : "linear-gradient(135deg,#b91c1c,#f43f5e)" }),
};

function HiLo({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [round, setRound] = useState(null);     // { id, bet, card, steps, multiplier, status, payout }
  const [trail, setTrail] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // restore a round that was left open
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.rpc("casino_hilo_active");
        if (alive && data?.round_id) {
          setRound({ id: data.round_id, bet: Number(data.bet), card: Number(data.card), steps: Number(data.steps), multiplier: Number(data.multiplier), status: "active" });
          setTrail([Number(data.card)]);
          setMsg("Your open round was restored.");
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [supabase]);

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };
  const active = round?.status === "active";
  const c = round?.card || 0;
  const pHigher = c ? (13 - c) / 13 : 0;
  const pLower = c ? (c - 1) / 13 : 0;
  const mult = round?.multiplier || 1;

  const callRpc = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error || !data?.success) throw new Error(error?.message || "Request failed");
    return data;
  };

  const deal = async () => {
    if (busy) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg("");
    try {
      const d = await callRpc("casino_hilo_start", { p_bet: bet });
      setRound({ id: d.round_id, bet, card: Number(d.card), steps: 0, multiplier: 1, status: "active" });
      setTrail([Number(d.card)]);
      setBal(Number(d.new_balance) || 0);
      setMsg("Higher or lower?");
      reload && reload();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const guess = async dir => {
    if (busy || !active) return;
    setBusy(true); setMsg("");
    try {
      const d = await callRpc("casino_hilo_guess", { p_round: round.id, p_dir: dir });
      const nc = Number(d.card);
      setTrail(t => [...t, nc]);
      if (d.won) {
        setRound(r => ({ ...r, card: nc, steps: Number(d.steps), multiplier: Number(d.multiplier) }));
        setMsg("Correct. Cash out or keep going.");
      } else {
        setRound(r => ({ ...r, card: nc, status: "lost" }));
        setBal(Number(d.new_balance) || 0);
        setMsg("Wrong guess. Stake lost.");
        reload && reload();
      }
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const cash = async () => {
    if (busy || !active || round.steps < 1) return;
    setBusy(true); setMsg("");
    try {
      const d = await callRpc("casino_hilo_cashout", { p_round: round.id });
      setRound(r => ({ ...r, status: "cashed", payout: Number(d.won_amount) }));
      setBal(Number(d.new_balance) || 0);
      setMsg(`Cashed out ${RM(Number(d.won_amount))}`);
      reload && reload();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Hi-Lo</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={HL.card}>{c ? HL_LABEL(c) : "?"}</div>

      <div style={GW.statRow}>
        <div style={GW.stat}><div style={GW.statLabel}>Multiplier</div><div style={GW.statVal}>{mult.toFixed(2)}x</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Steps</div><div style={GW.statVal}>{round?.steps || 0}</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Cash out</div><div style={GW.statVal}>{RM(round ? Math.round(round.bet * mult * 100) / 100 : 0)}</div></div>
      </div>

      {active ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button style={HL.btn(busy || pLower <= 0, "lo")} disabled={busy || pLower <= 0} onClick={() => guess("lower")}>
            Lower · {(pLower * 100).toFixed(0)}%
          </button>
          <button style={HL.btn(busy || pHigher <= 0, "hi")} disabled={busy || pHigher <= 0} onClick={() => guess("higher")}>
            Higher · {(pHigher * 100).toFixed(0)}%
          </button>
        </div>
      ) : (
        <>
          <div style={GW.betRow}>
            <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
            <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
              onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
            <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
            {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
          </div>
          <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={deal}>
            Deal · Stake {R(bet)}
          </button>
        </>
      )}

      {active && round.steps >= 1 && (
        <button style={{ ...GW.cash, width: "100%", marginTop: 10, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={cash}>
          Cash out {RM(Math.round(round.bet * mult * 100) / 100)}
        </button>
      )}

      <div style={GW.msg}>{msg}</div>

      {trail.length > 0 && (
        <div style={GW.hist}>
          {trail.map((n, i) => (
            <div key={i} style={{ padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: "#1e293b", color: "#fff" }}>{HL_LABEL(n)}</div>
          ))}
        </div>
      )}

      <div style={GW.rules}>Guess whether the next card is higher or lower. Each correct guess multiplies the stake. A tie loses. Return is about 96% per step. Virtual points only.</div>
    </div>
  );
}

/* ---------- Tower (8 floors, 3 tiles, 1 bomb per floor) ---------- */
const TW = {
  cell: (state) => ({
    height: 44, borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 16,
    cursor: state === "pickable" ? "pointer" : "default",
    border: `1px solid ${state === "safe" ? "#16a34a" : state === "bomb" ? "#dc2626" : state === "pickable" ? "#a78bfa" : "#334155"}`,
    background: state === "safe" ? "#14532d" : state === "bomb" ? "#7f1d1d" : state === "pickable" ? "#2e1065" : "#0f172a",
    color: state === "bomb" ? "#fecaca" : "#f8fafc",
    opacity: state === "dim" ? 0.45 : 1,
  }),
};

function Tower({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [round, setRound] = useState(null);     // { id, bet, floors, multiplier, status, bombs, payout }
  const [picks, setPicks] = useState([]);       // tile picked on each cleared floor
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.rpc("casino_tower_active");
        if (alive && data?.round_id) {
          setRound({ id: data.round_id, bet: Number(data.bet), floors: Number(data.floors), multiplier: Number(data.multiplier), status: "active", bombs: null });
          setMsg("Your open round was restored.");
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [supabase]);

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };
  const active = round?.status === "active";
  const floors = round?.floors || 0;
  const mult = round ? round.multiplier : 1;

  const callRpc = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error || !data?.success) throw new Error(error?.message || "Request failed");
    return data;
  };

  const climb = async () => {
    if (busy) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setPicks([]);
    try {
      const d = await callRpc("casino_tower_start", { p_bet: bet });
      setRound({ id: d.round_id, bet, floors: 0, multiplier: 1, status: "active", bombs: null });
      setBal(Number(d.new_balance) || 0);
      setMsg("Pick a safe tile on the first floor.");
      reload && reload();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const pick = async tile => {
    if (busy || !active) return;
    setBusy(true); setMsg("");
    try {
      const d = await callRpc("casino_tower_pick", { p_round: round.id, p_tile: tile });
      if (d.hit_bomb) {
        setRound(r => ({ ...r, status: "lost", bombs: d.bombs, floors: Number(d.floors) }));
        setBal(Number(d.new_balance) || 0);
        setMsg("Bomb! Stake lost.");
        reload && reload();
      } else if (d.top) {
        setPicks(p => [...p, tile]);
        setRound(r => ({ ...r, status: "cashed", bombs: d.bombs, floors: Number(d.floors), multiplier: Number(d.multiplier), payout: Number(d.payout) }));
        setBal(Number(d.new_balance) || 0);
        setMsg(`Top floor! Paid ${RM(Number(d.payout))}`);
        reload && reload();
      } else {
        setPicks(p => [...p, tile]);
        setRound(r => ({ ...r, floors: Number(d.floors), multiplier: Number(d.multiplier) }));
        setMsg("Safe. Climb again or cash out.");
      }
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const cash = async () => {
    if (busy || !active || floors < 1) return;
    setBusy(true); setMsg("");
    try {
      const d = await callRpc("casino_tower_cashout", { p_round: round.id });
      setRound(r => ({ ...r, status: "cashed", bombs: d.bombs, payout: Number(d.payout), multiplier: Number(d.multiplier) }));
      setBal(Number(d.new_balance) || 0);
      setMsg(`Cashed out ${RM(Number(d.payout))}`);
      reload && reload();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const floorRows = [];
  for (let f = 8; f >= 1; f--) {
    const cleared = f <= floors;
    const isNext = active && f === floors + 1;
    const floorMult = Math.round(Math.pow(1.44, f) * 100) / 100;
    const tiles = [1, 2, 3].map(t => {
      const revealedBomb = round?.bombs && round.bombs[f - 1] === t;
      let state = "idle";
      if (revealedBomb) state = "bomb";
      else if (cleared && picks[f - 1] === t) state = "safe";
      else if (cleared) state = "dim";
      else if (isNext) state = "pickable";
      return (
        <div key={t} style={TW.cell(state)} onClick={() => { if (state === "pickable") pick(t); }}>
          {state === "bomb" ? "✕" : state === "safe" ? "◆" : ""}
        </div>
      );
    });
    floorRows.push(
      <div key={f} style={{ display: "grid", gridTemplateColumns: "58px repeat(3,1fr)", gap: 6, marginBottom: 6, alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: isNext ? "#c4b5fd" : "#94a3b8" }}>{floorMult.toFixed(2)}x</div>
        {tiles}
      </div>
    );
  }

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Tower</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ marginBottom: 10 }}>{floorRows}</div>

      <div style={GW.statRow}>
        <div style={GW.stat}><div style={GW.statLabel}>Floor</div><div style={GW.statVal}>{floors}/8</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Multiplier</div><div style={GW.statVal}>{mult.toFixed(2)}x</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Cash out</div><div style={GW.statVal}>{RM(round ? Math.round(round.bet * mult * 100) / 100 : 0)}</div></div>
      </div>

      {!active ? (
        <>
          <div style={GW.betRow}>
            <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
            <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
              onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
            <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
            {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
          </div>
          <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={climb}>
            Start · Stake {R(bet)}
          </button>
        </>
      ) : (
        <button style={{ ...GW.cash, width: "100%", opacity: busy || floors < 1 ? 0.45 : 1 }} disabled={busy || floors < 1} onClick={cash}>
          Cash out {RM(Math.round(round.bet * mult * 100) / 100)}
        </button>
      )}

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>Each floor has three tiles and one bomb. A safe tile multiplies the stake by 1.44x. Cash out any time after the first floor. Virtual points only.</div>
    </div>
  );
}

/* ---------- Color Lottery (Win Go style layout, server-generated results) ---------- */
const CLW = {
  page: { minHeight: "100vh", padding: "12px 12px 40px", boxSizing: "border-box", color: "#e5e7eb", background: "linear-gradient(180deg,#0e1624,#060a12)", fontFamily: "system-ui,sans-serif" },
  card: { background: "#0f1725", border: "1px solid #1e2a3d", borderRadius: 14, padding: 12, marginBottom: 10 },
  label: { fontSize: 11, letterSpacing: 1, color: "#8b9bb4", marginBottom: 8 },
  digit: { width: 34, height: 44, borderRadius: 8, background: "#0b1220", border: "1px solid #22304a", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#f8fafc" },
  colour: (c, on) => ({ flex: 1, padding: "12px 0", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 800, fontSize: 13, border: on ? "2px solid #f8fafc" : "2px solid transparent", background: c === "green" ? "#16a34a" : c === "violet" ? "#7c3aed" : "#dc2626", opacity: on ? 1 : 0.85 }),
  ball: (n, on) => ({ aspectRatio: "1", borderRadius: "50%", cursor: "pointer", color: "#fff", fontWeight: 900, fontSize: 15, border: on ? "3px solid #f8fafc" : "2px solid #0006", boxShadow: on ? "0 0 0 2px #38bdf8" : "none", background: clBall(n) }),
  seg: (on) => ({ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, borderRadius: 8, color: on ? "#fff" : "#8b9bb4", background: on ? "#1d4ed8" : "transparent" }),
  qty: (on) => ({ padding: "7px 0", flex: 1, borderRadius: 8, border: `1px solid ${on ? "#38bdf8" : "#22304a"}`, background: on ? "#0c2a44" : "#0b1220", color: "#e2e8f0", fontWeight: 800, fontSize: 12, cursor: "pointer" }),
  tab: (on) => ({ flex: 1, padding: "9px 0", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12, color: on ? "#fff" : "#8b9bb4", borderBottom: on ? "2px solid #38bdf8" : "2px solid transparent", background: "transparent" }),
};
const clBall = (n) => (n === 0 ? "linear-gradient(135deg,#dc2626 50%,#7c3aed 50%)" : n === 5 ? "linear-gradient(135deg,#16a34a 50%,#7c3aed 50%)" : [2, 4, 6, 8].includes(n) ? "#dc2626" : "#16a34a");

function ColorLottery({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [base, setBase] = useState(10);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState({ kind: "color", pick: "green" });
  const [pane, setPane] = useState("history");
  const [st, setSt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [outcome, setOutcome] = useState(null);   // last settled order shown as a win/lose card
  const seenRef = useRef(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("casino_lottery_state", { p_game: "color" });
    if (!error && data?.success) {
      setSt({ ...data, fetchedAt: Date.now() });
      const ls = data.last_settled;
      if (ls) {
        if (seenRef.current === null) seenRef.current = ls.period;          // first open: do not replay old results
        else if (ls.period !== seenRef.current) { seenRef.current = ls.period; setOutcome(ls); }
      }
    }
  }, [supabase]);

  useEffect(() => {
    if (!outcome) return undefined;
    const id = setTimeout(() => setOutcome(null), 3200);
    return () => clearTimeout(id);
  }, [outcome]);

  useEffect(() => {
    load();
    const poll = setInterval(load, 3000);
    const clock = setInterval(() => setNow(Date.now()), 250);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);

  const secsLeft = st ? Math.max(0, Math.ceil(st.seconds_left - (now - st.fetchedAt) / 1000)) : 0;
  const open = secsLeft >= 6;
  const hist = st?.history || [];
  const mine = st?.my_bet;
  const myHist = st?.my_history || [];
  const last = hist[0];
  const total = base * qty;
  const odds = sel.kind === "number" ? 9.6 : sel.kind === "color" && sel.pick === "violet" ? 4.8 : 1.92;
  const potential = Math.round(total * odds * 100) / 100;
  const selLabel = sel.kind === "number" ? `Number ${sel.pick}` : sel.kind === "size" ? (sel.pick === "big" ? "Big" : "Small") : sel.pick.charAt(0).toUpperCase() + sel.pick.slice(1);
  const digits = String(secsLeft).padStart(2, "0").split("");

  const changeBase = v => { if (!busy) setBase(Math.max(1, Math.round(+v) || 1)); };
  const isSel = (k, p) => sel.kind === k && sel.pick === p;

  const askConfirm = () => {
    if (!open) return setMsg("Betting is closed for this period.");
    if (total < MIN) return setMsg(`Minimum total ${R(MIN)}`);
    if (total > MAX) return setMsg(`Maximum total ${R(MAX)}`);
    if (total > bal) return setMsg("Balance too low");
    setMsg(""); setConfirm(true);
  };

  const place = async () => {
    setConfirm(false);
    if (busy) return;
    setBusy(true); setMsg("");
    try {
      const { data, error } = await supabase.rpc("casino_lottery_bet", { p_game: "color", p_kind: sel.kind, p_pick: sel.pick, p_bet: total });
      if (error || !data?.success) throw new Error(error?.message || "Could not place order");
      setBal(Number(data.new_balance) || 0);
      setMsg("Order placed for this period.");
      reload && reload();
      load();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={CLW.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ ...CLW.qty(false), flex: "none", padding: "8px 14px" }}>‹ Lobby</button>
        <div style={{ fontWeight: 900, letterSpacing: 1.2 }}>COLOUR · 60 SEC</div>
        <div style={{ fontWeight: 800, color: "#fde68a", fontSize: 13 }}>{R(bal)}</div>
      </div>

      <div style={CLW.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={CLW.label}>PERIOD</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{st?.period ?? "—"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={CLW.label}>{open ? "TIME REMAINING" : "BETTING CLOSED"}</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
              <div style={CLW.digit}>0</div><div style={CLW.digit}>0</div>
              <span style={{ color: "#8b9bb4", fontWeight: 900 }}>:</span>
              <div style={CLW.digit}>{digits[0]}</div><div style={CLW.digit}>{digits[1]}</div>
            </div>
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 4, background: "#1e2a3d", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(secsLeft / 60) * 100}%`, background: open ? "#38bdf8" : "#ef4444", transition: "width .25s linear" }} />
        </div>
      </div>

      <div style={{ ...CLW.card, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 900, color: "#fff", border: "3px solid #f8fafc", background: last ? clBall(last.number) : "#1e2a3d" }}>
          {last ? last.number : "–"}
        </div>
        <div>
          <div style={CLW.label}>LAST RESULT</div>
          <div style={{ fontWeight: 800 }}>{last ? `${last.number} · ${last.number >= 5 ? "Big" : "Small"} · ${(last.colors || []).join(" / ")}` : "Waiting for first draw"}</div>
        </div>
      </div>

      <div style={CLW.card}>
        <div style={CLW.label}>COLOUR</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["green", "violet", "red"].map(c => (
            <button key={c} disabled={busy} onClick={() => setSel({ kind: "color", pick: c })} style={CLW.colour(c, isSel("color", c))}>{c.toUpperCase()}</button>
          ))}
        </div>
        <div style={CLW.label}>NUMBER</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} disabled={busy} onClick={() => setSel({ kind: "number", pick: String(n) })} style={CLW.ball(n, isSel("number", String(n)))}>{n}</button>
          ))}
        </div>
        <div style={CLW.label}>BIG / SMALL</div>
        <div style={{ display: "flex", gap: 6, background: "#0b1220", borderRadius: 10, padding: 3 }}>
          {[["big", "BIG 5–9"], ["small", "SMALL 0–4"]].map(([s, l]) => (
            <button key={s} disabled={busy} onClick={() => setSel({ kind: "size", pick: s })} style={CLW.seg(isSel("size", s))}>{l}</button>
          ))}
        </div>
      </div>

      <div style={CLW.card}>
        <div style={CLW.label}>QUANTITY</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[1, 5, 10, 20, 50, 100].map(q => (
            <button key={q} disabled={busy} onClick={() => setQty(q)} style={CLW.qty(qty === q)}>×{q}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={busy} onClick={() => changeBase(base - 10)} style={{ ...CLW.qty(false), flex: "none", width: 40 }}>−</button>
          <input type="number" value={base} disabled={busy} onChange={e => setBase(+e.target.value || 0)} onBlur={e => changeBase(e.target.value)}
            style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 8, border: "1px solid #22304a", background: "#0b1220", color: "#f8fafc", fontWeight: 800, textAlign: "center", boxSizing: "border-box" }} />
          <button disabled={busy} onClick={() => changeBase(base + 10)} style={{ ...CLW.qty(false), flex: "none", width: 40 }}>+</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b9bb4", margin: "10px 0" }}>
          <span>Order</span><b style={{ color: "#e5e7eb" }}>{selLabel} · {odds.toFixed(2)}×</b>
        </div>
        <button disabled={busy || !open} onClick={askConfirm}
          style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", cursor: busy || !open ? "not-allowed" : "pointer", color: "#fff", fontWeight: 900, fontSize: 15, background: "linear-gradient(90deg,#0ea5e9,#2563eb)", opacity: busy || !open ? 0.5 : 1 }}>
          TOTAL {RM(total)}
        </button>
        <div style={{ textAlign: "center", minHeight: 18, marginTop: 8, fontSize: 12, color: "#fde68a", fontWeight: 700 }}>{msg}</div>
      </div>

      <div style={CLW.card}>
        <div style={{ display: "flex", borderBottom: "1px solid #1e2a3d", marginBottom: 10 }}>
          <button style={CLW.tab(pane === "history")} onClick={() => setPane("history")}>Game history</button>
          <button style={CLW.tab(pane === "mine")} onClick={() => setPane("mine")}>My order</button>
        </div>

        {pane === "history" && (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr", fontSize: 11, color: "#8b9bb4", padding: "4px 0", fontWeight: 700 }}>
              <span>Period</span><span>Number</span><span>Size</span><span>Colour</span>
            </div>
            {hist.length === 0 && <div style={{ fontSize: 12, color: "#64748b", padding: "10px 0" }}>No results yet.</div>}
            {hist.map((h, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr", fontSize: 12, padding: "8px 0", borderTop: "1px solid #1e2a3d", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: "#94a3b8" }}>{String(h.period).slice(-5)}</span>
                <span style={{ fontWeight: 800 }}>{h.number}</span>
                <span>{h.number >= 5 ? "Big" : "Small"}</span>
                <span style={{ display: "flex", gap: 4 }}>
                  {(h.colors || []).map(c => <i key={c} style={{ width: 9, height: 9, borderRadius: "50%", display: "inline-block", background: c === "green" ? "#16a34a" : c === "violet" ? "#7c3aed" : "#dc2626" }} />)}
                </span>
              </div>
            ))}
          </div>
        )}

        {pane === "mine" && (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 0.9fr 1fr", fontSize: 11, color: "#8b9bb4", padding: "4px 0", fontWeight: 700 }}>
              <span>Period</span><span>Order</span><span>Stake</span><span>Result</span>
            </div>
            {myHist.length === 0 && <div style={{ fontSize: 12, color: "#64748b", padding: "10px 0" }}>No orders yet.</div>}
            {myHist.map((o, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 0.9fr 1fr", fontSize: 12, padding: "8px 0", borderTop: "1px solid #1e2a3d", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: "#94a3b8" }}>{String(o.period).slice(-5)}</span>
                <span style={{ fontWeight: 800 }}>{String(o.kind) === "number" ? `No. ${o.pick}` : String(o.pick).toUpperCase()}</span>
                <span>{RM(Number(o.bet))}</span>
                <span style={{ fontWeight: 800, color: o.status === "won" ? "#4ade80" : o.status === "lost" ? "#f87171" : "#fde68a" }}>
                  {o.status === "won" ? `+${RM(Number(o.payout) - Number(o.bet))}` : o.status === "lost" ? `-${RM(Number(o.bet))}` : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {outcome && (
        <div onClick={() => setOutcome(null)} style={{ position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", background: "rgba(2,6,12,.72)", animation: "clFade .2s ease" }}>
          <style>{`@keyframes clFade{from{opacity:0}to{opacity:1}}@keyframes clPop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}@keyframes clShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}@keyframes clBurst{from{transform:translate(0,0) scale(1);opacity:1}to{transform:translate(var(--dx),var(--dy)) scale(.4);opacity:0}}`}</style>
          {outcome.status === "won" && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
            <span key={i} style={{ position: "absolute", left: "50%", top: "42%", width: 8, height: 8, borderRadius: "50%", background: i % 2 ? "#fde68a" : "#4ade80", ["--dx"]: `${Math.cos(i * 0.52) * 150}px`, ["--dy"]: `${Math.sin(i * 0.52) * 150}px`, animation: "clBurst .9s ease-out forwards" }} />
          ))}
          <div onClick={e => e.stopPropagation()} style={{ width: "min(86vw,340px)", borderRadius: 22, padding: "26px 22px", textAlign: "center", color: "#fff", boxShadow: "0 24px 60px #000c", animation: outcome.status === "won" ? "clPop .35s cubic-bezier(.2,1.3,.4,1)" : "clShake .5s ease", background: outcome.status === "won" ? "radial-gradient(120% 90% at 50% 0%,#bbf7d0 0%,#16a34a 45%,#052e16 100%)" : "linear-gradient(180deg,#334155,#0b1220)" }}>
            <div style={{ fontSize: 12, letterSpacing: 2, opacity: .9 }}>PERIOD {outcome.period}</div>
            <div style={{ fontSize: 46, fontWeight: 900, margin: "6px 0 2px", letterSpacing: 1, textShadow: outcome.status === "won" ? "0 4px 18px #0008" : "none" }}>
              {outcome.status === "won" ? "YOU WIN" : "YOU LOSE"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: outcome.status === "won" ? "#fef9c3" : "#fca5a5" }}>
              {outcome.status === "won" ? `+${RM(Number(outcome.payout) - Number(outcome.bet))}` : `-${RM(Number(outcome.bet))}`}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "center", marginTop: 18 }}>
              <div style={{ width: 66, height: 66, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 900, border: "3px solid #fff", color: "#fff", background: clBall(Number(outcome.number)) }}>{outcome.number}</div>
              <div style={{ textAlign: "left", fontSize: 12, lineHeight: 1.7 }}>
                <div>{String(outcome.kind).toUpperCase()} · {String(outcome.pick).toUpperCase()}</div>
                <div>Stake {RM(Number(outcome.bet))}</div>
                <div>{outcome.status === "won" ? `Returned ${RM(Number(outcome.payout))}` : "Stake lost"}</div>
              </div>
            </div>
            <div style={{ marginTop: 18, fontSize: 11, opacity: .7 }}>Tap to continue</div>
          </div>
        </div>
      )}

      {confirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,12,.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={() => setConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#0f1725", borderRadius: "18px 18px 0 0", padding: 18, boxSizing: "border-box", border: "1px solid #1e2a3d" }}>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>Confirm order</div>
            <div style={{ fontSize: 13, lineHeight: 1.9, color: "#cbd5e1" }}>
              <div>Selection: <b style={{ color: "#fff" }}>{selLabel}</b></div>
              <div>Quantity: <b style={{ color: "#fff" }}>×{qty}</b></div>
              <div>Stake: <b style={{ color: "#fff" }}>{RM(base)}</b></div>
              <div>Total: <b style={{ color: "#fff" }}>{RM(total)}</b></div>
              <div>Potential return: <b style={{ color: "#4ade80" }}>{RM(potential)}</b></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setConfirm(false)} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid #22304a", background: "#0b1220", color: "#cbd5e1", fontWeight: 800, cursor: "pointer" }}>Cancel</button>
              <button onClick={place} style={{ flex: 1, padding: 13, borderRadius: 10, border: "none", background: "linear-gradient(90deg,#0ea5e9,#2563eb)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#6b7280", textAlign: "center", lineHeight: 1.5, marginTop: 6 }}>
        One order per period. Results are generated when a period closes. 0 is red and violet, 5 is green and violet. Virtual points only.
      </div>
    </div>
  );
}

/* ---------- Slots (server picks the reels) ---------- */
const SYM = { cherry: "🍒", lemon: "🍋", bell: "🔔", diamond: "💎", seven: "7" };
const SYM_KEYS = Object.keys(SYM);

function Slots({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState(["seven", "seven", "seven"]);
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState(null);           // { multiplier, payout }
  const [msg, setMsg] = useState("");
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const changeBet = v => { if (!spinning) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const spin = async () => {
    if (spinning) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setSpinning(true); setMsg(""); setRes(null);

    // cosmetic shuffle while the server works
    const ids = [0, 1, 2].map(i => setInterval(() => {
      setReels(r => r.map((v, j) => (j === i ? SYM_KEYS[Math.floor(Math.random() * SYM_KEYS.length)] : v)));
    }, 80));
    timers.current = ids;

    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_slots_spin", { p_bet: bet })); }
    catch (e) { error = e; }

    if (error || !data?.success) {
      ids.forEach(clearInterval);
      setSpinning(false);
      const m = error?.message || "Could not spin";
      return say ? say(m, 1) : setMsg(m);
    }

    const final = (data.reels || []).map(String);
    // stop reels one by one
    [0, 1, 2].forEach(i => setTimeout(() => {
      clearInterval(ids[i]);
      setReels(r => r.map((v, j) => (j === i ? final[i] : v)));
      if (i === 2) {
        setBal(Number(data.new_balance) || 0);
        setRes({ multiplier: Number(data.multiplier) || 0, payout: Number(data.payout) || 0 });
        setSpinning(false);
        reload && reload();
      }
    }, 900 + i * 500));
  };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Slots</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", padding: "18px 12px", borderRadius: 18, border: "2px solid #facc15", background: "linear-gradient(180deg,#1e1b4b,#0b0a1f)", marginBottom: 12, boxShadow: "0 10px 26px #000c" }}>
        {reels.map((s, i) => (
          <div key={i} style={{ width: 88, height: 110, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 52, background: "linear-gradient(180deg,#f8fafc,#cbd5e1)", boxShadow: "inset 0 -6px 12px #0006", border: "2px solid #64748b" }}>
            {SYM[s]}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", minHeight: 26, fontWeight: 900, color: res ? (res.payout > 0 ? "#4ade80" : "#f87171") : GOLD_L }}>
        {res ? (res.payout > 0 ? `${res.multiplier}x · Won ${RM(res.payout)}` : "No win") : "Spin the reels"}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: spinning ? 0.5 : 1 }} disabled={spinning} onClick={spin}>
        {spinning ? "Spinning…" : `Spin · Stake ${R(bet)}`}
      </button>

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>Three of a kind pays up to 45x. Two cherries pay 3x. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- Fishing (one shot per bet) ---------- */
const FISH_TXT = {
  miss: ["💨", "Missed"], small: ["🐟", "Small fish · 1.92x"], medium: ["🐠", "Medium fish · 3.2x"],
  big: ["🐡", "Big fish · 6.4x"], shark: ["🦈", "Shark! · 16x"],
};

function Fishing({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState(null);         // catch key
  const [payout, setPayout] = useState(0);
  const [msg, setMsg] = useState("");

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const fire = async () => {
    if (busy) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setShot(null);
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_fish_shot", { p_bet: bet })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false);
      const m = error?.message || "Could not fire";
      return say ? say(m, 1) : setMsg(m);
    }
    setTimeout(() => {
      setShot(data.catch);
      setPayout(Number(data.payout) || 0);
      setBal(Number(data.new_balance) || 0);
      setBusy(false);
      reload && reload();
    }, 700);
  };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Fishing</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ position: "relative", height: 240, borderRadius: 18, overflow: "hidden", marginBottom: 12, border: "1px solid #0ea5e9", background: "linear-gradient(180deg,#0c4a6e,#082f49)", boxShadow: "0 10px 26px #000c" }}>
        {["🐟", "🐠", "🐡", "🐟"].map((f, i) => (
          <div key={i} style={{ position: "absolute", fontSize: 26, top: 30 + i * 42, left: "-10%", animation: `fishSwim ${5 + i}s linear ${i * 0.7}s infinite` }}>{f}</div>
        ))}
        <div style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", fontSize: 34 }}>🎣</div>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 54, opacity: shot ? 1 : 0, transition: "opacity .3s" }}>
          {shot ? FISH_TXT[shot][0] : ""}
        </div>
        <style>{`@keyframes fishSwim{from{transform:translateX(0)}to{transform:translateX(130%)}}`}</style>
      </div>

      <div style={{ textAlign: "center", minHeight: 26, fontWeight: 900, color: shot ? (payout > 0 ? "#4ade80" : "#f87171") : GOLD_L }}>
        {shot ? `${FISH_TXT[shot][1]}${payout > 0 ? ` · Won ${RM(payout)}` : ""}` : "Cast your line"}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={fire}>
        {busy ? "Casting…" : `Cast · Stake ${R(bet)}`}
      </button>

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>Each cast is one shot. Most casts miss. Bigger catches pay more. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- MotoRace (pick a bike, server picks the winner) ---------- */
const BIKES = [
  { k: "A", c: "#ef4444", m: "2.4x" }, { k: "B", c: "#3b82f6", m: "3.2x" },
  { k: "C", c: "#22c55e", m: "4.8x" }, { k: "D", c: "#eab308", m: "9.6x" },
];

function MotoRace({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);
  const [bet, setBet] = useState(10);
  const [pick, setPick] = useState("A");
  const [prog, setProg] = useState({ A: 0, B: 0, C: 0, D: 0 });
  const [race, setRace] = useState(null);         // { winner, won, payout }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const changeBet = v => { if (!busy) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const race_ = async () => {
    if (busy) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setRace(null);
    setProg({ A: 0, B: 0, C: 0, D: 0 });
    let data = null, error = null;
    try { ({ data, error } = await supabase.rpc("casino_moto_race", { p_bet: bet, p_bike: pick })); }
    catch (e) { error = e; }
    if (error || !data?.success) {
      setBusy(false);
      const m = error?.message || "Could not start race";
      return say ? say(m, 1) : setMsg(m);
    }
    // every bike drives; the server's winner crosses the line first
    const win = data.winner;
    setTimeout(() => {
      setProg(BIKES.reduce((o, b) => ({ ...o, [b.k]: b.k === win ? 100 : 60 + Math.round(Math.random() * 30) }), {}));
    }, 50);
    timer.current = setTimeout(() => {
      setRace({ winner: win, won: !!data.won, payout: Number(data.payout) || 0 });
      setBal(Number(data.new_balance) || 0);
      setBusy(false);
      reload && reload();
    }, 2600);
  };

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>MotoRace</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ borderRadius: 16, padding: 10, marginBottom: 10, background: "#111827", border: "1px solid #334155" }}>
        {BIKES.map(b => (
          <div key={b.k} onClick={() => { if (!busy) setPick(b.k); }} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: busy ? "default" : "pointer", opacity: pick === b.k ? 1 : 0.75 }}>
            <div style={{ width: 22, fontWeight: 900, color: b.c }}>{b.k}</div>
            <div style={{ flex: 1, height: 16, borderRadius: 8, background: "#1f2937", overflow: "hidden", border: pick === b.k ? "1px solid #fde68a" : "1px solid #334155" }}>
              <div style={{ width: `${prog[b.k]}%`, height: "100%", background: b.c, transition: "width 2.4s ease-out" }} />
            </div>
            <div style={{ width: 40, fontSize: 11, fontWeight: 800, textAlign: "right" }}>{b.m}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", minHeight: 26, fontWeight: 900, color: race ? (race.won ? "#4ade80" : "#f87171") : GOLD_L }}>
        {race ? `Bike ${race.winner} won. ${race.won ? `You won ${RM(race.payout)}` : "Your bike did not win"}` : `Bike ${pick} selected`}
      </div>

      <div style={GW.betRow}>
        <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
        <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
          onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
        <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
        {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
      </div>

      <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={race_}>
        {busy ? "Racing…" : `Race on bike ${pick} · Stake ${R(bet)}`}
      </button>

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>Pick one bike. Payouts are 2.4x, 3.2x, 4.8x or 9.6x depending on the bike. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

/* ---------- Crash (Aviator 2 and Space Crash share this engine) ---------- */
const CRASH_SKIN = {
  aviator2: { icon: "🛩️", title: "Aviator 2", bg: "linear-gradient(180deg,#1e3a8a,#0b1120)" },
  space: { icon: "🛸", title: "Space Crash", bg: "radial-gradient(circle at 50% 0%,#4c1d95,#020617 70%)" },
  dcrash: { icon: "🐉", title: "Dragon Crash", bg: "radial-gradient(circle at 50% 100%,#7f1d1d,#0b0a10 70%)" },
};

function CrashGame({ variant, supabase, me, reload, say, cfg, onBack }) {
  const skin = CRASH_SKIN[variant] || CRASH_SKIN.aviator2;
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [bet, setBet] = useState(10);
  const [round, setRound] = useState(null);     // { id, bet, startMs }
  const [offset, setOffset] = useState(0);      // server clock minus device clock
  const [now, setNow] = useState(() => Date.now());
  const [end, setEnd] = useState(null);         // { kind, multiplier, payout, crash_point }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const running = !!round && !end;
  const elapsed = running ? Math.max(0, (now + offset - round.startMs) / 1000) : 0;
  const mult = running ? Math.floor(Math.exp(0.07 * elapsed) * 100) / 100 : (end?.multiplier || 1);

  // redraw while running
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  // ask the server whether the craft has crashed
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(async () => {
      const { data } = await supabase.rpc("casino_crash_status", { p_round: round.id });
      if (data?.crashed) {
        setEnd({ kind: "crashed", crash_point: Number(data.crash_point), multiplier: 0, payout: 0 });
        setMsg(`Crashed at ${Number(data.crash_point).toFixed(2)}x. Stake lost.`);
        reload && reload();
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, round, supabase, reload]);

  const changeBet = v => { if (!busy && !running) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const launch = async () => {
    if (busy || running) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg(""); setEnd(null);
    try {
      const { data, error } = await supabase.rpc("casino_crash_start", { p_game: variant, p_bet: bet });
      if (error || !data?.success) throw new Error(error?.message || "Could not start");
      setOffset(Number(data.server_ms) - Date.now());
      setNow(Date.now());
      setRound({ id: data.round_id, bet, startMs: Number(data.started_ms) });
      setBal(Number(data.new_balance) || 0);
      setMsg("Cash out before it flies away.");
      reload && reload();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const cash = async () => {
    if (busy || !running) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("casino_crash_cashout", { p_round: round.id });
      if (error || !data?.success) throw new Error(error?.message || "Cash-out failed");
      if (data.crashed) {
        setEnd({ kind: "crashed", crash_point: Number(data.crash_point), multiplier: 0, payout: 0 });
        setMsg(`Too late. It crashed at ${Number(data.crash_point).toFixed(2)}x.`);
      } else {
        setEnd({ kind: "cashed", multiplier: Number(data.multiplier), payout: Number(data.payout) });
        setBal(Number(data.new_balance) || 0);
        setMsg(`Cashed out at ${Number(data.multiplier).toFixed(2)}x · ${RM(Number(data.payout))}`);
      }
      reload && reload();
    } catch (e) { say ? say(e.message, 1) : setMsg(e.message); }
    finally { setBusy(false); }
  };

  const crashed = end?.kind === "crashed";
  const lift = Math.min(70, (mult - 1) * 22);
  const sideways = Math.min(70, elapsed * 6);

  return (
    <div style={{ ...GW.page, background: skin.bg }}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>{skin.title}</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ position: "relative", height: 260, borderRadius: 18, overflow: "hidden", border: "1px solid #334155", marginBottom: 12, background: "radial-gradient(120% 90% at 50% 100%,#0ea5e922,transparent)" }}>
        <div style={{ position: "absolute", left: `${sideways}%`, bottom: `${lift}%`, fontSize: 44, transition: "left .1s linear, bottom .1s linear", transform: "translate(-50%,50%)", opacity: crashed ? 0.2 : 1 }}>
          {skin.icon}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 56, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: crashed ? "#f87171" : end?.kind === "cashed" ? "#4ade80" : "#fff", textShadow: "0 4px 18px #000" }}>
            {crashed ? "CRASHED" : `${mult.toFixed(2)}x`}
          </div>
        </div>
      </div>

      {!running ? (
        <>
          <div style={GW.betRow}>
            <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
            <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
              onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
            <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
            {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
          </div>
          <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={launch}>
            Fly · Stake {R(bet)}
          </button>
        </>
      ) : (
        <button style={{ ...GW.cash, width: "100%", padding: "16px 0", fontSize: 16, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={cash}>
          Cash out {RM(Math.round(round.bet * mult * 100) / 100)}
        </button>
      )}

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>The multiplier rises until the craft flies away. The crash point is set when you launch and is hidden until the round ends. Return is about 96%. Virtual points only.</div>
    </div>
  );
}

const LOBBY_CATS = [["all", "All"], ["table", "Table"], ["crash", "Crash"], ["lottery", "Lottery"], ["slots", "Slots"], ["originals", "Originals"]];
const LOBBY_SETS = {
  table: ["roulette", "dragon", "dice", "mines", "minespro", "chicken", "chicken2", "vortex", "ludo"],
  crash: ["aviator", "aviator2", "space", "dcrash"],
  lottery: ["color"],
  slots: ["slots"],
  originals: ["plinko", "limbo", "vortex2", "coinflip", "wheel", "keno", "hilo", "tower", "goal", "fishing", "moto"],
};
const lobbyMatches = (cat, v) => cat === "all" || (LOBBY_SETS[cat] || []).includes(v);
const LOBBY_ICON = { roulette: "🎡", dragon: "🐉", dice: "🎲", aviator: "✈️", aviator2: "🛩️", space: "🛸", dcrash: "🐉", minespro: "💠", chicken2: "🐓", mines: "💣", vortex: "🌀", vortex2: "🌪️", chicken: "🐔", ludo: "🎯", plinko: "🔻", limbo: "🚀", coinflip: "🪙", wheel: "🎡", keno: "🔢", hilo: "🃏", tower: "🏰", goal: "⚽", color: "🎨", slots: "🎰", fishing: "🎣", moto: "🏍️" };

/* ---------- Mines Pro (new skin, same server RPCs as Mines) ---------- */
const MP_COUNTS = [3, 5, 8, 12, 16];
const MP = {
  cell: (state) => ({
    aspectRatio: "1", borderRadius: 12, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 900, color: "#fff",
    border: `1px solid ${state === "gem" ? "#22d3ee" : state === "mine" ? "#f43f5e" : "#1e3a5f"}`,
    background: state === "gem" ? "radial-gradient(circle,#0e7490,#042f2e)" : state === "mine" ? "radial-gradient(circle,#9f1239,#1f0a14)" : "linear-gradient(180deg,#0f2748,#081426)",
    boxShadow: state === "gem" ? "0 0 14px #22d3ee55" : "inset 0 1px 0 #ffffff14",
    cursor: state === "hidden" ? "pointer" : "default",
  }),
};

function MinesPro({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [bet, setBet] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [roundId, setRoundId] = useState(null);
  const [opened, setOpened] = useState([]);
  const [mines, setMines] = useState([]);
  const [mult, setMult] = useState(1);
  const [status, setStatus] = useState("idle");   // idle | playing | busted | cashed
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const playing = status === "playing";

  const call = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error || !data?.success) throw new Error(error?.message || "Request failed");
    return data;
  };
  const failed = e => (say ? say(e.message, 1) : setMsg(e.message));
  const changeBet = v => { if (!busy && !playing) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const start_ = async () => {
    if (busy || playing) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg("");
    try {
      const d = await call("casino_mines_start", { p_bet: bet, p_mines: mineCount });
      setRoundId(d.round_id); setOpened([]); setMines([]); setMult(1); setStatus("playing");
      setBal(Number(d.new_balance) || 0);
      reload && reload();
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  };

  const reveal = async i => {
    if (!playing || busy || opened.includes(i)) return;
    setBusy(true);
    try {
      const d = await call("casino_mines_reveal", { p_round: roundId, p_cell: i });
      setOpened(o => [...o, i]);
      if (d.hit) {
        setMines(d.mines || []); setStatus("busted");
        setBal(Number(d.new_balance) || 0);
        setMsg("Boom. Stake lost.");
        reload && reload();
      } else {
        setMult(Number(d.multiplier) || 1);
      }
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  };

  const cashOut = async () => {
    if (!playing || busy || opened.length < 1) return;
    setBusy(true);
    try {
      const d = await call("casino_mines_cashout", { p_round: roundId });
      setMines(d.mines || []); setStatus("cashed");
      setBal(Number(d.new_balance) || 0);
      setMsg(`Cashed out ${RM(Math.round(bet * mult * 100) / 100)}`);
      reload && reload();
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  };

  const cellState = i => (mines.includes(i) ? "mine" : opened.includes(i) ? "gem" : "hidden");
  const payout = Math.round(bet * mult * 100) / 100;

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Mines Pro</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={GW.statRow}>
        <div style={GW.stat}><div style={GW.statLabel}>Mines</div><div style={GW.statVal}>{mineCount}</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Multiplier</div><div style={GW.statVal}>{mult.toFixed(2)}x</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Cash out</div><div style={GW.statVal}>{RM(payout)}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
        {Array.from({ length: 25 }, (_, i) => {
          const st = cellState(i);
          return (
            <div key={i} onClick={() => reveal(i)} style={MP.cell(st)}>
              {st === "gem" ? "💠" : st === "mine" ? "💥" : ""}
            </div>
          );
        })}
      </div>

      {!playing && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {MP_COUNTS.map(c => (
            <button key={c} disabled={busy} onClick={() => setMineCount(c)} style={{ ...GW.quick, flex: 1, border: `1px solid ${mineCount === c ? "#22d3ee" : "#334155"}` }}>{c}</button>
          ))}
        </div>
      )}

      {!playing ? (
        <>
          <div style={GW.betRow}>
            <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
            <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
              onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
            <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
            {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
          </div>
          <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={start_}>
            Deal · Stake {R(bet)}
          </button>
        </>
      ) : (
        <button style={{ ...GW.cash, width: "100%", opacity: busy || opened.length < 1 ? 0.45 : 1 }} disabled={busy || opened.length < 1} onClick={cashOut}>
          Cash out {RM(payout)}
        </button>
      )}

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>Reveal gems and avoid the mines. Each gem raises the multiplier. Cash out any time after your first gem. Virtual points only.</div>
    </div>
  );
}

/* ---------- Chicken Road 2 (new skin, same server RPCs as Chicken Road) ---------- */
function ChickenRoad2({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg?.min_bet || 10, MAX = +cfg?.max_bet || 50000;
  const start = (Number(me.balance) || 0) + (Number(me.winnings) || 0);
  const [bal, setBal] = useState(start);
  useEffect(() => { setBal(start); }, [start]);

  const [bet, setBet] = useState(10);
  const [diff, setDiff] = useState("medium");
  const [round, setRound] = useState(null);       // { id, step, alive, done, hitAt }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const playing = !!round && round.alive;

  const call = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error || !data?.success) throw new Error(error?.message || "Request failed");
    return data;
  };
  const failed = e => (say ? say(e.message, 1) : setMsg(e.message));
  const changeBet = v => { if (!busy && !playing) setBet(Math.min(MAX, Math.max(MIN, Math.round(+v) || MIN))); };

  const start_ = async () => {
    if (busy || playing) return;
    if (bet < MIN) return setMsg(`Minimum bet ${R(MIN)}`);
    if (bet > bal) return setMsg("Balance too low");
    setBusy(true); setMsg("");
    try {
      const d = await call("casino_chicken_start", { p_bet: bet, p_difficulty: diff });
      setRound({ id: d.round_id, step: 0, alive: true, done: false, hitAt: null });
      setBal(Number(d.new_balance) || 0);
      setMsg("Cross the first lane.");
      reload && reload();
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  };

  const cross = async () => {
    if (!playing || busy) return;
    setBusy(true);
    try {
      const d = await call("casino_chicken_step", { p_round: round.id });
      if (!d.alive) {
        setRound(r => ({ ...r, alive: false, hitAt: r.step + 1 }));
        if (d.new_balance != null) setBal(Number(d.new_balance) || 0);
        setMsg("The chicken got hit.");
        reload && reload();
      } else {
        const step = Number(d.step) || 0;
        setRound(r => ({ ...r, step }));
        setMsg(step >= CR_LANES ? "Top of the road. Cash out now." : `Cash out now for ${RM(Math.round(bet * crMult(diff, step) * 100) / 100)}`);
      }
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  };

  const cash = async () => {
    if (!playing || busy || round.step < 1) return;
    setBusy(true);
    try {
      const d = await call("casino_chicken_cashout", { p_round: round.id });
      setRound(r => ({ ...r, alive: false, done: true }));
      setBal(Number(d.new_balance) || 0);
      setMsg(`Won ${RM(Number(d.won_amount) || 0)}`);
      reload && reload();
    } catch (e) { failed(e); }
    finally { setBusy(false); }
  };

  const rows = Array.from({ length: CR_LANES + 1 }, (_, i) => CR_LANES - i);
  const chickenRow = round ? round.step : 0;
  const curMult = round && round.step > 0 ? crMult(diff, round.step) : 1;

  return (
    <div style={GW.page}>
      <div style={GW.bar}>
        <button style={GW.back} onClick={onBack}>« Lobby</button>
        <div style={GW.title}>Chicken Road 2</div>
        <div style={GW.balTag}>{R(bal)}</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {Object.entries(CR_DIFF).map(([k, d]) => (
          <button key={k} disabled={busy || playing} onClick={() => setDiff(k)}
            style={{ ...GW.quick, flex: 1, border: `1px solid ${diff === k ? d.color : "#334155"}`, color: diff === k ? d.color : "#f8fafc" }}>
            {d.label}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 16, padding: "8px 12px", marginBottom: 12, background: "linear-gradient(180deg,#2a1d07,#140e04)", border: "1px solid #78350f" }}>
        {rows.map(r => {
          const here = round && r === chickenRow && !round.hitAt;
          const hitHere = round && round.hitAt === r;
          return (
            <div key={r} style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", height: 26, borderBottom: "1px dashed #78350f66" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#fcd34d" }}>{r === 0 ? "START" : `${crMult(diff, r).toFixed(2)}x`}</div>
              <div style={{ fontSize: 18 }}>
                {hitHere ? "💥" : here ? (round.done ? "🏁" : "🐓") : r === CR_LANES ? "🏁" : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div style={GW.statRow}>
        <div style={GW.stat}><div style={GW.statLabel}>Lane</div><div style={GW.statVal}>{round ? `${round.step}/${CR_LANES}` : "0"}</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Multiplier</div><div style={GW.statVal}>{curMult.toFixed(2)}x</div></div>
        <div style={GW.stat}><div style={GW.statLabel}>Cash out</div><div style={GW.statVal}>{RM(Math.round(bet * curMult * 100) / 100)}</div></div>
      </div>

      {!playing ? (
        <>
          <div style={GW.betRow}>
            <button style={GW.quick} onClick={() => changeBet(bet - 10)}>−</button>
            <input type="number" value={bet} min={MIN} max={MAX} style={GW.input}
              onChange={e => setBet(+e.target.value || 0)} onBlur={e => changeBet(e.target.value)} />
            <button style={GW.quick} onClick={() => changeBet(bet + 10)}>+</button>
            {[10, 50, 100, 500].map(v => <button key={v} style={GW.quick} onClick={() => changeBet(v)}>{v}</button>)}
          </div>
          <button style={{ ...GW.primary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={start_}>
            Start · Stake {R(bet)}
          </button>
        </>
      ) : (
        <div style={GW.row}>
          <button style={{ ...GW.shoot, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={cross}>Cross</button>
          <button style={{ ...GW.cash, opacity: busy || round.step < 1 ? 0.45 : 1 }} disabled={busy || round.step < 1} onClick={cash}>
            Cash out {RM(Math.round(bet * curMult * 100) / 100)}
          </button>
        </div>
      )}

      <div style={GW.msg}>{msg}</div>
      <div style={GW.rules}>Cross each lane. Harder difficulty means lower survival per lane and higher multipliers. Cash out before you get hit. Virtual points only.</div>
    </div>
  );
}

const LOBBY_SECTIONS = [
  { key: "table", label: "Table games" },
  { key: "crash", label: "Crash" },
  { key: "lottery", label: "Lottery" },
  { key: "slots", label: "Slots" },
  { key: "originals", label: "Originals" },
];
// Put your own artwork here, e.g. LOBBY_IMG.vortex2 = "https://.../vortex2.png"
const LOBBY_IMG = {};

// original flat icons (64x64). Replace with real artwork via LOBBY_IMG if you have it.
const LOBBY_GLYPH = {
  roulette: '<circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="32" r="8" fill="#fff"/><path d="M32 8v12M32 44v12M8 32h12M44 32h12" stroke="#fff" stroke-width="3"/>',
  dragon: '<circle cx="22" cy="32" r="13" fill="#fff"/><circle cx="42" cy="32" r="13" fill="#fff" opacity=".55"/>',
  dice: '<rect x="12" y="12" width="40" height="40" rx="9" fill="none" stroke="#fff" stroke-width="3"/><circle cx="23" cy="23" r="3.5" fill="#fff"/><circle cx="32" cy="32" r="3.5" fill="#fff"/><circle cx="41" cy="41" r="3.5" fill="#fff"/>',
  aviator: '<path d="M6 34 L58 22 L58 27 L38 34 L58 41 L58 46 L6 34Z" fill="#fff"/>',
  aviator2: '<path d="M6 34 L58 22 L58 27 L38 34 L58 41 L58 46 L6 34Z" fill="#fff"/>',
  space: '<path d="M32 6 C44 18 46 36 40 50 L24 50 C18 36 20 18 32 6Z" fill="#fff"/><circle cx="32" cy="28" r="5" fill="#0b1020"/><path d="M24 50 L18 58 L28 54ZM40 50 L46 58 L36 54Z" fill="#fff"/>',
  dcrash: '<path d="M32 8 C40 22 52 26 46 44 C42 56 22 56 18 44 C14 32 24 28 32 8Z" fill="#fff"/>',
  mines: '<circle cx="32" cy="34" r="15" fill="#fff"/><path d="M32 8v8M32 52v4M8 34h8M48 34h8" stroke="#fff" stroke-width="4"/>',
  minespro: '<path d="M32 10 L52 28 L32 56 L12 28Z" fill="none" stroke="#fff" stroke-width="3"/><path d="M12 28H52" stroke="#fff" stroke-width="2"/>',
  vortex: '<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="90 20"/><circle cx="32" cy="32" r="9" fill="none" stroke="#fff" stroke-width="3"/>',
  vortex2: '<circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="60 40"/>',
  chicken: '<circle cx="30" cy="30" r="15" fill="#fff"/><path d="M42 28 L56 32 L42 36Z" fill="#fff"/><circle cx="25" cy="26" r="2.5" fill="#0b1020"/>',
  chicken2: '<circle cx="30" cy="30" r="15" fill="#fff"/><path d="M42 28 L56 32 L42 36Z" fill="#fff"/><circle cx="25" cy="26" r="2.5" fill="#0b1020"/><path d="M8 52H56" stroke="#fff" stroke-width="3" stroke-dasharray="6 6"/>',
  ludo: '<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="10" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="32" r="3" fill="#fff"/>',
  plinko: '<path d="M32 8 L56 52 L8 52Z" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="22" r="3" fill="#fff"/><circle cx="24" cy="36" r="3" fill="#fff"/><circle cx="40" cy="36" r="3" fill="#fff"/><circle cx="32" cy="50" r="3" fill="#fff"/>',
  limbo: '<path d="M32 8 L50 30 H38 V56 H26 V30 H14Z" fill="#fff"/>',
  coinflip: '<circle cx="32" cy="32" r="22" fill="#fff"/><circle cx="32" cy="32" r="13" fill="none" stroke="#0b1020" stroke-width="3"/>',
  wheel: '<circle cx="32" cy="32" r="24" fill="none" stroke="#fff" stroke-width="3"/><path d="M32 32V8M32 32L52 44M32 32L12 44" stroke="#fff" stroke-width="3"/><circle cx="32" cy="32" r="4" fill="#fff"/>',
  keno: '<rect x="8" y="8" width="13" height="13" rx="3" fill="#fff"/><rect x="25" y="8" width="13" height="13" rx="3" fill="#fff" opacity=".5"/><rect x="42" y="8" width="13" height="13" rx="3" fill="#fff"/><rect x="8" y="25" width="13" height="13" rx="3" fill="#fff" opacity=".5"/><rect x="25" y="25" width="13" height="13" rx="3" fill="#fff"/><rect x="42" y="25" width="13" height="13" rx="3" fill="#fff" opacity=".5"/><rect x="8" y="42" width="13" height="13" rx="3" fill="#fff"/><rect x="25" y="42" width="13" height="13" rx="3" fill="#fff" opacity=".5"/><rect x="42" y="42" width="13" height="13" rx="3" fill="#fff"/>',
  hilo: '<path d="M20 22 L32 10 L44 22 H36 V40 H28 V22Z" fill="#fff"/><path d="M20 42 L32 54 L44 42 H36 V34 H28 V42Z" fill="#fff" opacity=".55"/>',
  tower: '<rect x="18" y="40" width="28" height="14" fill="#fff"/><rect x="22" y="26" width="20" height="12" fill="#fff" opacity=".85"/><rect x="26" y="14" width="12" height="10" fill="#fff" opacity=".7"/>',
  goal: '<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="3"/><path d="M32 20 L42 27 L38 39 H26 L22 27Z" fill="#fff"/>',
  color: '<circle cx="32" cy="32" r="22" fill="#fff"/><circle cx="32" cy="32" r="11" fill="#0b1020"/><circle cx="32" cy="32" r="5" fill="#fff"/>',
  slots: '<rect x="8" y="14" width="48" height="36" rx="6" fill="none" stroke="#fff" stroke-width="3"/><rect x="16" y="22" width="10" height="20" fill="#fff"/><rect x="27" y="22" width="10" height="20" fill="#fff"/><rect x="38" y="22" width="10" height="20" fill="#fff"/>',
  fishing: '<ellipse cx="30" cy="32" rx="18" ry="11" fill="#fff"/><path d="M46 32 L58 22 V42Z" fill="#fff"/><circle cx="22" cy="30" r="2.5" fill="#0b1020"/>',
  moto: '<circle cx="18" cy="42" r="10" fill="none" stroke="#fff" stroke-width="4"/><circle cx="46" cy="42" r="10" fill="none" stroke="#fff" stroke-width="4"/><path d="M18 42 L28 26 H42 L46 42 M28 26 L34 42" fill="none" stroke="#fff" stroke-width="4"/>',
  originals: '<path d="M32 8 L38 26 L57 26 L42 37 L48 56 L32 45 L16 56 L22 37 L7 26 L26 26Z" fill="#fff"/>',
};

function CasinoHubInner({ supabase, me, reload, say, cfg }) {
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
  const MIN_KEY = { dragon: "dragon_tiger" };
  const gameCfg = { ...C, min_bet: +(C.min_bets?.[MIN_KEY[view] || view]) || C.min_bet };
  const common = { supabase, me, reload, say, cfg: gameCfg, onBack: () => setView("lobby") };
  const [lobbyCat, setLobbyCat] = useState("all");

  if (view === "roulette") return <Roulette {...common} />;
  if (view === "dragon") return <DragonTiger {...common} />;
  if (view === "aviator") return <Aviator {...common} />;
  if (view === "mines") return <Mines {...common} />;
  if (view === "vortex") return <Vortex {...common} />;
  if (view === "dice") return <Dice {...common} />;
  if (view === "elements") return <Elements {...common} />;
  if (view === "ludo") return <Ludo {...common} />;
  if (view === "goal") return <GoalWave {...common} />;
  if (view === "vip") return <VipPage {...common} />;
  if (view === "plinko") return <Plinko {...common} />;
  if (view === "limbo") return <Limbo {...common} />;
  if (view === "vortex2") return <Vortex2 {...common} />;
  if (view === "coinflip") return <CoinFlip {...common} />;
  if (view === "wheel") return <LuckyWheel {...common} />;
  if (view === "keno") return <Keno {...common} />;
  if (view === "hilo") return <HiLo {...common} />;
  if (view === "tower") return <Tower {...common} />;
  if (view === "color") return <ColorLottery {...common} />;
  if (view === "slots") return <Slots {...common} />;
  if (view === "fishing") return <Fishing {...common} />;
  if (view === "moto") return <MotoRace {...common} />;
  if (view === "minespro") return <MinesPro {...common} />;
  if (view === "chicken2") return <ChickenRoad2 {...common} />;
  if (view === "aviator2" || view === "space" || view === "dcrash") return <CrashGame variant={view} supabase={supabase} me={me} reload={reload} say={say} cfg={gameCfg} onBack={() => setView("lobby")} />;
  if (view === "chicken") return <ChickenRoad supabase={supabase} me={me} reload={reload} say={say} cfg={gameCfg} onBack={() => setView("lobby")} />;
  if (view === "vault") return (
    <div style={{ background: "linear-gradient(180deg,#0a1f14 0%,#050d09 100%)", minHeight: "100vh", padding: "14px 12px 40px", boxSizing: "border-box" }}>
      <button onClick={() => setView("lobby")} style={{ padding: "8px 14px", borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 12 }}>« Lobby</button>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <SafeVault supabase={supabase} minDeposit={+C.vault_min || 0} />
      </div>
    </div>
  );

  const cards = [
    ["roulette", "roulette", "Auto Roulette", "The wheel turns by itself. Place your bets while the timer runs.", "linear-gradient(135deg,#3f0a0f,#b91c1c)"],
    ["dragon", "dragon_tiger", "Dragon Tiger", "Higher card wins. Tie pays 9 : 1.", "linear-gradient(135deg,#0b1d3a,#1e40af)"],
    ["aviator", "aviator", "Aviator", "Cash out before the plane flies away.", "linear-gradient(135deg,#4a1d06,#ea580c)"],
    ["mines", "mines", "Mines", "Pick safe cells. Cash out before you hit a mine.", "linear-gradient(135deg,#052e16,#166534)"],
    ["vortex", "vortex", "Vortex", "Spin the multiplier wheel. Land on up to 27.5x.", "linear-gradient(135deg,#2e1065,#7e22ce)"],
    ["dice", "dice", "Dice", "Roll two dice. Under 7, seven, or over 7.", "linear-gradient(135deg,#0c4a6e,#0284c7)"],
    ["chicken", "chicken", "Chicken Road", "Cross the road lane by lane. Cash out before you get hit.", "linear-gradient(135deg,#3f2a05,#ca8a04)"],
    ["elements", "elements", "Elements", "Pick Earth, Water or Fire. Match the draw.", "linear-gradient(135deg,#1e3a8a,#7c2d12)"],
    ["ludo", "ludo", "Ludo", "Player vs player. Winner takes 90% of the pot.", "linear-gradient(135deg,#14532d,#16a34a)"],
    ["goal", "goal", "Goal Wave", "Take penalties. Build a streak of goals and cash out before the keeper saves one.", "linear-gradient(135deg,#052e16,#15803d)"],
    ["plinko", "plinko", "Plinko", "Drop the ball and land a multiplier. Pick 8, 12 or 16 rows.", "linear-gradient(135deg,#1e1b4b,#7c3aed)"],
    ["vortex2", "vortex2", "Vortex 2", "Spin the ring. Same server-side payout table as Vortex, with a new look.", "linear-gradient(135deg,#4a044e,#a21caf)"],
    ["limbo", "limbo", "Limbo", "Set a target multiplier. Beat it and your stake multiplies.", "linear-gradient(135deg,#0c4a6e,#0284c7)"],
    ["coinflip", "coinflip", "Coin Flip", "Heads or tails. A correct call pays 1.92x.", "linear-gradient(135deg,#78350f,#ca8a04)"],
    ["wheel", "wheel", "Lucky Wheel", "Spin the wheel. Land a segment and multiply your stake.", "linear-gradient(135deg,#0f766e,#1d4ed8)"],
    ["keno", "keno", "Keno", "Pick 4 to 10 numbers from 1 to 40. More hits pay more.", "linear-gradient(135deg,#14532d,#16a34a)"],
    ["hilo", "hilo", "Hi-Lo", "Is the next card higher or lower? Each correct guess multiplies.", "linear-gradient(135deg,#1e293b,#475569)"],
    ["tower", "tower", "Tower", "Climb 8 floors. Find the safe tile on each floor.", "linear-gradient(135deg,#312e81,#6366f1)"],
    ["slots", "slots", "Slots", "Spin three reels. Three of a kind pays up to 45x.", "linear-gradient(135deg,#7c2d12,#f59e0b)"],
    ["fishing", "fishing", "Fishing", "Cast your line. Catch a fish or a shark.", "linear-gradient(135deg,#0c4a6e,#0ea5e9)"],
    ["moto", "moto", "MotoRace", "Pick a bike. The fastest bike wins your stake back multiplied.", "linear-gradient(135deg,#7f1d1d,#ef4444)"],
    ["aviator2", "aviator2", "Aviator 2", "Cash out before the craft flies away. Fair server-side crash point.", "linear-gradient(135deg,#1e3a8a,#0b1120)"],
    ["space", "space", "Space Crash", "Ride the rocket and cash out before it crashes.", "linear-gradient(135deg,#4c1d95,#020617)"],
    ["minespro", "minespro", "Mines Pro", "Reveal gems, avoid the mines, cash out anytime.", "linear-gradient(135deg,#0c4a6e,#0f172a)"],
    ["chicken2", "chicken2", "Chicken Road 2", "Cross the lanes. Pick a difficulty and cash out in time.", "linear-gradient(135deg,#78350f,#f59e0b)"],
    ["dcrash", "dcrash", "Dragon Crash", "Cash out before the dragon flies away.", "linear-gradient(135deg,#7f1d1d,#0b0a10)"],
    ["color", "color", "Color Lottery", "Bet on the colour or number of the next 60-second draw.", "linear-gradient(135deg,#4c1d95,#be185d)"],
  ].filter(([, key]) => (["goal", "plinko", "limbo", "vortex2", "coinflip", "wheel", "keno", "hilo", "tower", "color", "slots", "fishing", "moto", "aviator2", "space", "minespro", "chicken2", "dcrash"].includes(key) ? games[key] !== false : games[key]));

  const visibleCards = cards.filter(([v]) => lobbyMatches(lobbyCat, v));
  const bannerRaw = C?.images?.banner;
  const bannerSrc = bannerRaw ? (/^https?:\/\//.test(bannerRaw) ? bannerRaw : supabase.storage.from("game-art").getPublicUrl(bannerRaw).data.publicUrl) : null;
  const bannerTargetRaw = C?.images?.banner_target === "dragon_tiger" ? "dragon" : C?.images?.banner_target;
  const bannerTarget = bannerTargetRaw && cards.some(([v]) => v === bannerTargetRaw) ? bannerTargetRaw : null;
  // admin stores either a full URL or a file name inside the game-art bucket; resolve both
  const lobbyImgSrc = (v) => {
    // the admin saves Dragon Tiger under "dragon_tiger"; the lobby card key is "dragon"
    const alias = { dragon: "dragon_tiger" }[v];
    const raw = C?.images?.[v] || (alias && C?.images?.[alias]) || LOBBY_IMG[v];
    if (!raw) return null;
    return /^https?:\/\//.test(raw) ? raw : supabase.storage.from("game-art").getPublicUrl(raw).data.publicUrl;
  };
  return (
    <div style={{ background: "radial-gradient(120% 60% at 50% 0%,#0f2a1d 0%,#06100b 65%)", minHeight: "100vh", color: "#f3efe0", padding: "14px 14px 48px", boxSizing: "border-box", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div onClick={() => setView("vip")} style={{ borderRadius: 16, padding: "14px 12px", cursor: "pointer", background: "linear-gradient(135deg,#3f2a05,#b45309)", border: "1px solid #facc1555" }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>VIP</div>
          <div style={{ fontSize: 11, opacity: .85, marginTop: 4 }}>Level rewards and rebate</div>
        </div>
        <div onClick={() => setView("vault")} style={{ borderRadius: 16, padding: "14px 12px", cursor: "pointer", background: "linear-gradient(135deg,#2e1065,#6d28d9)", border: "1px solid #c084fc55" }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>Coin Vault</div>
          <div style={{ fontSize: 11, opacity: .85, marginTop: 4 }}>Lock and earn daily</div>
        </div>
      </div>

      {bannerSrc && (
        <div onClick={bannerTarget ? () => setView(bannerTarget) : undefined} style={{ borderRadius: 18, overflow: "hidden", marginBottom: 14, cursor: bannerTarget ? "pointer" : "default", boxShadow: "0 16px 34px #000b" }}>
          <img src={bannerSrc} alt="" style={{ width: "100%", display: "block", aspectRatio: "2.2 / 1", objectFit: "cover" }} />
        </div>
      )}

      <div onClick={() => setView("color")} style={{ position: "relative", overflow: "hidden", borderRadius: 20, padding: "18px 18px 16px", marginBottom: 16, cursor: "pointer", background: "linear-gradient(120deg,#4c1d95 0%,#be185d 55%,#0e7490 100%)", boxShadow: "0 18px 40px #000b" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.6, fontWeight: 800, opacity: .85 }}>NEW DRAW EVERY 60 SECONDS</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>Colour Lottery</div>
        <div style={{ fontSize: 12, opacity: .9, marginTop: 4, maxWidth: "80%", lineHeight: 1.4 }}>Pick a colour, a number, or big or small. Results are created when each period closes.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#16a34a", border: "2px solid #fff8" }} />
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#7c3aed", border: "2px solid #fff8" }} />
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#dc2626", border: "2px solid #fff8" }} />
          <span style={{ marginLeft: "auto", padding: "9px 16px", borderRadius: 999, background: "#fff", color: "#111827", fontWeight: 900, fontSize: 13 }}>Play now</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14, paddingBottom: 4 }}>
        {LOBBY_CATS.map(([k, label]) => (
          <button key={k} onClick={() => setLobbyCat(k)} style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12, color: "#f8fafc", border: `1px solid ${lobbyCat === k ? "#fbbf24" : "#1f2937"}`, background: lobbyCat === k ? "#14532d" : "#0f172a" }}>{label}</button>
        ))}
      </div>
      {visibleCards.length === 0 && <p style={{ textAlign: "center", opacity: .7 }}>No games in this category right now.</p>}

      {LOBBY_SECTIONS.filter(sec => lobbyCat === "all" || sec.key === lobbyCat).map(sec => {
        const items = visibleCards.filter(([v]) => (LOBBY_SETS[sec.key] || []).includes(v));
        if (!items.length) return null;
        return (
          <div key={sec.key} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: "#f8fafc" }}>{sec.label}</div>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: .8 }}>{items.length} GAMES</div>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x mandatory" }}>
              {items.map(([v, , name, desc, bg]) => {
                const src = lobbyImgSrc(v);
                const min = +C?.min_bets?.[v === "dragon" ? "dragon_tiger" : v] || +C?.min_bet || 10;
                return (
                  <div key={v} onClick={() => setView(v)} style={{ flex: "0 0 196px", scrollSnapAlign: "start", borderRadius: 18, overflow: "hidden", cursor: "pointer", background: "#0c1219", border: "1px solid #1c2633", boxShadow: "0 12px 26px #0009" }}>
                    <div style={{ height: 146, position: "relative", display: "grid", placeItems: "center", background: `radial-gradient(120% 90% at 30% 0%,rgba(255,255,255,.22),transparent 60%), ${bg}` }}>
                      {src
                        ? <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        : <svg viewBox="0 0 64 64" width="72" height="72" style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,.4))" }} dangerouslySetInnerHTML={{ __html: LOBBY_GLYPH[v] || LOBBY_GLYPH.originals }} />}
                      <span style={{ position: "absolute", right: 10, top: 10, fontSize: 10, fontWeight: 900, padding: "4px 8px", borderRadius: 999, background: "rgba(0,0,0,.55)", color: "#fde68a" }}>MIN {R(min)}</span>
                    </div>
                    <div style={{ padding: "11px 12px 13px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.35, height: 30, overflow: "hidden" }}>{desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CASINO_AMT_CSS = `
.cx-root input[type=number]{color:#f8fafc !important;-webkit-text-fill-color:#f8fafc !important;caret-color:#f8fafc !important;background:#0b1220 !important;opacity:1 !important;font-weight:800 !important;font-size:16px !important;border:1px solid #334155 !important;border-radius:10px !important;padding:8px 10px !important;text-align:center !important;-moz-appearance:textfield}
.cx-root input[type=number]::-webkit-outer-spin-button,.cx-root input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.cx-root input[type=number]::placeholder{color:#64748b !important;-webkit-text-fill-color:#64748b !important}
`;
export default function CasinoHub(props) {
  return (
    <div className="cx-root" style={{ minHeight: "100vh" }}>
      <style>{CASINO_AMT_CSS}</style>
      <CasinoHubInner {...props} />
    </div>
  );
}

const ATT_LADDER = [4, 20, 65, 180, 450, 2200, 6000];

export function ActivityPage({ supabase, me, reload, say, cfg }) {
  const [st, setSt] = useState(null);
  const [att, setAtt] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [gmsg, setGmsg] = useState("");

  const load = useCallback(async () => {
    const [v, a] = await Promise.all([supabase.rpc("vip_status"), supabase.rpc("attendance_state")]);
    if (v.error) setErr("VIP rewards are not set up yet."); else { setSt(v.data || {}); setErr(""); }
    if (!a.error && a.data) setAtt(a.data);
  }, [supabase]);
  useEffect(() => { load(); }, [load, me && me.balance, me && me.winnings]);

  const levels = st?.levels || [];
  const cur = +st?.level || 0;
  const claimed = st?.claimed || [];
  const claimable = levels.filter(l => l.level <= cur && l.levelup_bonus > 0 && !claimed.includes(l.level));
  const claimTotal = claimable.reduce((a, l) => a + Number(l.levelup_bonus), 0);
  const curRow = levels.find(l => l.level === cur);

  const claimAward = async () => {
    if (busy || claimTotal <= 0) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("vip_claim_levelup");
    setBusy(false);
    if (error || !data?.success) { say ? say(error?.message || "Could not claim", 1) : null; return; }
    say && say(`Claimed ${RM(data.claimed)}`);
    reload && reload(); load();
  };

  const checkIn = async () => {
    if (busy || !att || att.checked_today) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("attendance_claim");
    setBusy(false);
    if (error || !data?.success) { say ? say(error?.message || "Could not check in", 1) : null; return; }
    say && say(`Check-in done. +${RM(data.reward)}`);
    reload && reload(); load();
  };

  const redeem = async () => {
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true); setGmsg("");
    const { data, error } = await supabase.rpc("gift_redeem", { p_code: c });
    setBusy(false);
    if (error || !data?.success) { setGmsg(error?.message || "Could not redeem"); return; }
    setCode(""); setGmsg(`Redeemed ${RM(data.amount)}`);
    reload && reload(); load();
  };

  const ladder = att?.ladder || ATT_LADDER;
  const streak = +att?.streak || 0;
  const checked = !!att?.checked_today;
  const nextDay = +att?.next_day || 1;

  const card = { background: "#0c1219", border: "1px solid #1c2633", borderRadius: 18, padding: 16, marginBottom: 14, boxShadow: "0 10px 24px #0008" };
  const btn = (on) => ({ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", fontWeight: 900, color: "#fff", cursor: on ? "pointer" : "not-allowed", opacity: on ? 1 : .55, background: on ? "linear-gradient(90deg,#16a34a,#84cc16)" : "#1f2937" });

  return (
    <div style={{ minHeight: "100vh", padding: "14px 14px 48px", boxSizing: "border-box", color: "#f3efe0", background: "radial-gradient(120% 60% at 50% 0%,#0f2a1d 0%,#06100b 65%)", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif" }}>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Activity</div>
      {err && <div style={{ ...card, textAlign: "center", opacity: .8 }}>{err}</div>}

      <div style={{ ...card, background: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 60%,#f97316 100%)", border: "1px solid #fca5a555" }}>
        <div style={{ fontWeight: 900, fontSize: 20 }}>Attendance bonus</div>
        <div style={{ fontSize: 12, opacity: .92, marginTop: 4 }}>Check in every day. Rewards grow with each consecutive day.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "stretch" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,.25)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, opacity: .85 }}>Consecutive days</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{att ? `${streak} / 7` : "—"}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,.25)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, opacity: .85 }}>Total earned</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{RM(Number(att?.total_claimed || 0))}</div>
          </div>
        </div>
        {!att && <div style={{ fontSize: 12, marginTop: 12, opacity: .85 }}>Attendance is not set up yet.</div>}
      </div>

      {att && (
        <div style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {ladder.map((r, i) => {
              const d = i + 1;
              const done = d <= streak;
              const today = !checked && d === nextDay;
              return (
                <div key={d} style={{ borderRadius: 12, padding: "11px 6px", textAlign: "center", background: done ? "#1e293b" : "#0f1726", border: `1px solid ${done ? "#fbbf24" : today ? "#38bdf8" : "#1f2937"}`, opacity: done || today ? 1 : .7 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#fde68a" }}>{RM(r)}</div>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", margin: "8px auto", background: done ? "radial-gradient(circle at 30% 30%,#fff7c2,#f59e0b)" : "#1f2937", border: "2px solid #92400e55" }} />
                  <div style={{ fontSize: 11, opacity: .8 }}>{d} Day</div>
                </div>
              );
            })}
          </div>
          <button disabled={checked || busy} onClick={checkIn} style={{ ...btn(!checked && !busy), marginTop: 14 }}>
            {checked ? "Checked in today" : `Check in · ${RM(ladder[nextDay - 1])}`}
          </button>
        </div>
      )}

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Activity Award</div>
            <div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>Level-up rewards, paid once per level</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#fde68a" }}>{cur ? `VIP ${cur}` : "—"}</div>
        </div>
        <div style={{ fontSize: 12, marginTop: 12, opacity: .85 }}>
          {claimTotal > 0 ? `Ready to claim ${RM(claimTotal)}` : "Nothing to claim right now"}
        </div>
        <button disabled={claimTotal <= 0 || busy} onClick={claimAward} style={{ ...btn(claimTotal > 0 && !busy), marginTop: 12 }}>
          {claimTotal > 0 ? `Claim ${RM(claimTotal)}` : "Claim"}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Gift code</div>
        <div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>Enter a code to receive a gift reward in Winnings</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" disabled={busy}
            style={{ flex: 1, minWidth: 0, padding: "12px 12px", borderRadius: 12, border: "1px solid #22304a", background: "#0a0f18", color: "#f8fafc", fontWeight: 800, letterSpacing: 1, boxSizing: "border-box" }} />
          <button onClick={redeem} disabled={!code.trim() || busy}
            style={{ padding: "0 18px", borderRadius: 12, border: "none", fontWeight: 900, color: "#fff", cursor: code.trim() && !busy ? "pointer" : "not-allowed", opacity: code.trim() && !busy ? 1 : .55, background: "linear-gradient(90deg,#7c3aed,#db2777)" }}>
            Redeem
          </button>
        </div>
        {gmsg && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: gmsg.startsWith("Redeemed") ? "#4ade80" : "#fca5a5" }}>{gmsg}</div>}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Betting rebate</div>
        <div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>Paid to Winnings on the 1st of every month at 2:00 AM IST</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13 }}>
          <span>Your rebate rate</span>
          <b style={{ color: "#fde68a" }}>{curRow ? `${(Number(curRow.rebate_rate) * 100).toFixed(2)}%` : "—"}</b>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
          <span>Staked this month</span>
          <b>{RM(Number(st?.period_stake || 0))}</b>
        </div>
      </div>

      <div style={{ fontSize: 11, opacity: .6, textAlign: "center" }}>Virtual points only.</div>
    </div>
  );
}
