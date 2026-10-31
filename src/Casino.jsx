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
const CHIPS = [1, 5, 10, 25, 100, 500];
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
@keyframes x7pulse{0%,100%{box-shadow:0 0 0 0 #facc1566}50%{box-shadow:0 0 0 10px #facc1500}}
`;

const colorName = n => (n === 0 ? "green" : RED.includes(n) ? "red" : "black");
const numColor = n => (n === 0 ? C_GRN : RED.includes(n) ? C_RED : C_BLK);
const R = n => "₹" + Math.round(+n || 0).toLocaleString("en-IN");
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
  <div style={{ display: "flex", justifyContent: "center", gap: 9, flexWrap: "wrap", margin: "12px 0" }}>
    {CHIPS.map(c => {
      const on = c === value, col = CHIP_COL[c];
      return (
        <button key={c} onClick={() => onChange(c)} style={{ width: 48, height: 48, borderRadius: "50%",
          border: `3px dashed ${on ? GOLD_L : "rgba(255,255,255,.6)"}`,
          background: `radial-gradient(circle at 35% 30%, ${col[0]}, ${col[1]})`, color: c === 1 ? "#111" : "#fff",
          fontWeight: 900, fontSize: 12, cursor: "pointer", boxShadow: on ? `0 0 0 3px ${GOLD_L}, 0 6px 14px #000` : "0 4px 10px #000a",
          transform: on ? "translateY(-3px)" : "none", transition: "transform .15s" }}>{c}</button>
      );
    })}
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
   Spin: wheel turns and the ball runs the other way, then drops from the track into the server's pocket with bounces. */
const Wheel = memo(function Wheel({ target, spinId, spinning }) {
  const wheelRef = useRef(null), ballRef = useRef(null), dropRef = useRef(null);
  const rotRef = useRef(0), ballRotRef = useRef(0);

  const setDom = (el, deg, dur) => {
    if (!el) return;
    el.style.transition = dur ? `transform ${dur} cubic-bezier(.17,.67,.2,1)` : "none";
    el.style.transform = `rotate(${deg}deg)`;
  };

  useEffect(() => {
    if (spinning) return;
    if (dropRef.current) { dropRef.current.style.animation = "none"; dropRef.current.style.transform = "none"; }
    const id = setInterval(() => {
      rotRef.current += 0.4;
      ballRotRef.current -= 0.9;
      setDom(wheelRef.current, rotRef.current, null);
      setDom(ballRef.current, ballRotRef.current, null);
    }, 50);
    return () => clearInterval(id);
  }, [spinning]);

  useEffect(() => {
    if (spinId === 0 || target == null) return;
    const idx = ORDER.indexOf(target);
    const cur = rotRef.current;
    const next = cur + 1800 + mod(-(idx * SEG) - cur, 360);
    rotRef.current = next;
    setDom(wheelRef.current, next, "3.6s");
    const bcur = ballRotRef.current;
    const bnext = bcur - 2160 - mod(bcur, 360);     // ball ends at the top pocket
    ballRotRef.current = bnext;
    setDom(ballRef.current, bnext, "3.8s");
    const d = dropRef.current;
    if (d) {
      d.style.animation = "none";
      void d.getBoundingClientRect();
      d.style.animation = "x7drop 1.6s 2.2s forwards";   // drop from track into the pocket at the end of the turn
    }
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
        <circle cx="150" cy="150" r="133" fill="#0a0a0a" />
        {pockets}
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
        <g ref={dropRef}>
          <circle cx="150" cy="22" r="5.5" fill="url(#x7ball)" stroke="#374151" strokeWidth=".6" />
        </g>
      </svg>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle at 32% 22%, #ffffff2e, transparent 42%)" }} />
    </div>
  );
});

/* ---------- one betting cell (memo) ---------- */
const Cell = memo(function Cell({ type, value, label, bg, amount, win, onPlace, vertical, flexy, tall, fs }) {
  return (
    <div onClick={() => onPlace(type, value)}
      style={{ position: "relative", background: bg, color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 4,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: fs || 12,
        cursor: "pointer", userSelect: "none", boxSizing: "border-box", height: tall || undefined,
        flex: flexy ? 1 : undefined, writingMode: vertical ? "vertical-rl" : undefined, letterSpacing: vertical ? 1 : 0,
        boxShadow: win ? `0 0 0 2px ${GOLD_L}, 0 0 14px ${GOLD_L}` : "inset 0 1px 0 rgba(255,255,255,.15)",
        animation: win ? "x7pulse 1s ease-in-out infinite" : "none", transition: "box-shadow .3s" }}>
      {label}
      {amount > 0 && (
        <span style={{ position: "absolute", top: -7, right: -5, background: `radial-gradient(circle at 35% 30%,#fff7c2,${GOLD})`,
          color: "#1a1200", borderRadius: 99, fontSize: 9, fontWeight: 900, padding: "2px 5px", boxShadow: "0 2px 4px #000" }}>{amount}</span>
      )}
    </div>
  );
});

/* ---------- statistics modal (local history only) ---------- */
function StatsModal({ hist, onClose }) {
  const n = hist.length;
  const pct = c => (n ? Math.round((hist.filter(x => x.color === c).length / n) * 100) : 0);
  const freq = Array(37).fill(0);
  hist.forEach(x => { freq[x.n]++; });
  const ranked = freq.map((c, i) => ({ i, c })).sort((a, b) => b.c - a.c || a.i - b.i);
  const hot = ranked.slice(0, 5), cold = ranked.slice(-5).reverse();
  const row = (l, v) => (
    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #ffffff14" }}>
      <span>{l}</span><b>{v}</b>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0a1f14", border: `1px solid ${GOLD}`, borderRadius: 14, padding: 16, width: "min(92vw,360px)", maxHeight: "80vh", overflow: "auto", color: "#f3efe0" }}>
        <h3 style={{ margin: "0 0 8px", color: GOLD_L }}>Statistics · last {n}</h3>
        {n === 0 ? <p style={{ fontSize: 13, opacity: .7 }}>No spins yet on this device.</p> : (
          <>
            {row("Red", pct("red") + "%")}{row("Black", pct("black") + "%")}{row("Green (0)", pct("green") + "%")}
            <p style={{ margin: "12px 0 4px", fontWeight: 800 }}>Hot</p>{hot.map(h => row(`#${h.i}`, `${h.c}×`))}
            <p style={{ margin: "12px 0 4px", fontWeight: 800 }}>Cold</p>{cold.map(h => row(`#${h.i}`, `${h.c}×`))}
          </>
        )}
        <button onClick={onClose} style={{ ...btn, width: "100%", marginTop: 12 }}>Close</button>
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

  const undo = () => { if (phase === "bet") setStack(s => s.slice(0, -1)); };
  const clear = () => { if (phase === "bet") setStack([]); };
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
    setPhase("spinning"); setWinNum(null); setBal(before - sum);
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
      setLast({ n: data.number, net });
      if (net > 0) setBurst(b => b + 1);
      setPhase("result");
      reload && reload();
      setTimeout(() => { setWinNum(null); setPhase("bet"); setCount(BET_SECONDS); }, 3200);
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
      win={winNum !== null && hits(type, value, winNum)} onPlace={place} {...opts} />
  );
  const numRows = Array.from({ length: 12 }, (_, r) => [3, 2, 1].map(k => 3 * r + k));
  const statusBg = phase === "result" && last ? (last.net > 0 ? "#14532d" : last.net < 0 ? "#7f1d1d" : "#374151") : "rgba(0,0,0,.35)";

  return (
    <Shell title="Auto Roulette" onBack={onBack}
      right={<>
        <button onClick={() => setAuto(a => !a)} style={{ ...btn, background: auto ? GOLD : "#16291d", color: auto ? "#111" : "#f3efe0" }}>AUTO {auto ? "ON" : "OFF"}</button>
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
        {phase === "result" && last && (
          <span>#{last.n} · {last.net > 0 ? <>WON <CountUp value={last.net} /></> : last.net < 0 ? <>LOST <CountUp value={last.net} /></> : "RETURNED ₹0"}</span>
        )}
      </div>

      <Wheel target={target} spinId={spinId} spinning={phase === "spinning"} />

      <div style={{ marginTop: 16, background: FELT, borderRadius: 14, padding: 10, border: `2px solid ${GOLD}`, boxShadow: "inset 0 0 30px #0008" }}>
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
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={undo} style={btn}>UNDO</button>
        <button onClick={dbl} style={btn}>x2 DOUBLE</button>
        <button onClick={clear} style={btn}>CLEAR</button>
        <button onClick={spin} disabled={phase !== "bet"} style={{ ...btn, background: `linear-gradient(180deg,#fde68a,${GOLD})`, color: "#111", padding: "10px 22px", opacity: phase !== "bet" ? .5 : 1 }}>SPIN NOW</button>
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
    setBusy(true); setRes(null); setShown(false); setCards(null); setBal(before - chip); setDeal(d => d + 1);
    const { data, error } = await supabase.rpc("casino_dragon_tiger", { p_bet: chip, p_side: side });
    if (error || !data?.success) { setBal(before); setBusy(false); return say ? say(friendly(error), 1) : flash(friendly(error)); }
    setCards({ dragon: data.dragon, tiger: data.tiger });
    setTimeout(() => setShown(true), 600);          // flip after the deal animation
    setTimeout(() => {
      const net = data.won_amount - chip;
      setRes({ winner: data.winner, net });
      setBal(data.new_balance);
      if (net > 0) setBurst(b => b + 1);
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
              {res.winner === "tie" ? "TIE" : res.winner.toUpperCase() + " WINS"} · {res.net > 0 ? <>WON <CountUp value={res.net} /></> : res.net < 0 ? <>LOST <CountUp value={res.net} /></> : "RETURNED ₹0"}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {sideBtn("dragon", "DRAGON", "1 : 1")}
        {sideBtn("tie", "TIE", "11 : 1")}
        {sideBtn("tiger", "TIGER", "1 : 1")}
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={dealCards} disabled={busy} style={{ ...btn, background: `linear-gradient(180deg,#fde68a,${GOLD})`, color: "#111", padding: "12px 34px", fontSize: 15, opacity: busy ? .5 : 1 }}>
          DEAL {R(chip)}
        </button>
      </div>

      <p style={{ fontSize: 12, opacity: .7, textAlign: "center", marginTop: 14 }}>
        Recent: {hist.slice(0, 15).map((h, i) => <span key={i} style={{ marginRight: 6, fontWeight: 800, color: h.w === "dragon" ? "#f87171" : h.w === "tiger" ? GOLD_L : "#e5e7eb" }}>{h.w[0].toUpperCase()}</span>)}
      </p>

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </Shell>
  );
}

/* ================= AVIATOR ================= */
const AV_W = 300, AV_H = 170;
function Aviator({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal, realBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [phase, setPhase] = useState("idle");     // idle | flying | done
  const [chip, setChip] = useState(10);
  const [autoAt, setAutoAt] = useState("");
  const [m, setM] = useState(1);
  const [pts, setPts] = useState([1]);
  const [res, setRes] = useState(null);
  const [boom, setBoom] = useState(false);        // plane exploded at the end of the curve
  const [shake, setShake] = useState(false);
  const [burst, setBurst] = useState(0);

  const mRef = useRef(1), roundRef = useRef(null), timer = useRef(null), t0 = useRef(0), doneRef = useRef(false), stakeRef = useRef(0), autoRef = useRef(0), finRef = useRef(null);
  autoRef.current = parseFloat(autoAt) || 0;

  useEffect(() => () => { clearInterval(timer.current); clearInterval(finRef.current); }, []);

  // display only: the crash point stays hidden on the server until the round settles
  function tick() {
    const el = (Date.now() - t0.current) / 1000;
    const v = Math.max(1, Math.exp(0.07 * el));
    mRef.current = v;
    setM(v);
    setPts(p => (p.length > 500 ? [...p.slice(-499), v] : [...p, v]));
    if (autoRef.current && v >= autoRef.current) cashOut();
    if (v >= 100) cashOut();
  }

  function explode() {
    setBoom(true); setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  // after the server answers: a win keeps flying to the real crash point, a loss crashes at that point
  function finish(crash, won) {
    clearInterval(timer.current);
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

  async function cashOut() {
    if (!roundRef.current || doneRef.current) return;
    doneRef.current = true;
    clearInterval(timer.current);
    const id = roundRef.current;
    const mult = Math.min(100, Math.round(mRef.current * 100) / 100);
    const { data, error } = await supabase.rpc("casino_aviator_cashout", { p_round: id, p_mult: mult });
    roundRef.current = null;
    setPhase("done");
    if (error || !data?.success) { say ? say(friendly(error), 1) : flash(friendly(error)); return; }
    const net = data.won_amount - stakeRef.current;
    setRes({ won: data.won, crash: data.crash, mult, net });
    setBal(data.new_balance);
    if (data.won) setBurst(b => b + 1);
    reload && reload();
    finish(data.crash, data.won);
  }

  const start = async () => {
    if (phase === "flying") return;
    if (chip < MIN || chip > MAX) return flash(`Bet between ${R(MIN)} and ${R(MAX)}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip);
    const { data, error } = await supabase.rpc("casino_aviator_start", { p_bet: chip });
    if (error || !data?.success) { setBal(before); return say ? say(friendly(error), 1) : flash(friendly(error)); }
    roundRef.current = data.round_id; stakeRef.current = chip; doneRef.current = false;
    clearInterval(finRef.current);
    mRef.current = 1; t0.current = Date.now();
    setRes(null); setPts([1]); setM(1); setBoom(false); setPhase("flying");
    clearInterval(timer.current);
    timer.current = setInterval(tick, 100);
  };

  // chart geometry
  const maxV = Math.max(2, ...pts);
  const xy = (i, v) => {
    const x = (i / Math.max(pts.length - 1, 1)) * AV_W;
    const y = AV_H - 12 - ((Math.log(v) / Math.log(maxV)) * (AV_H - 24));
    return [x, y];
  };
  const path = pts.map((v, i) => { const [x, y] = xy(i, v); return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(" ");
  const [px, py] = xy(pts.length - 1, pts[pts.length - 1]);
  const crashed = res && !res.won;

  return (
    <Shell title="Aviator" onBack={onBack}>
      <div style={{ position: "relative", height: AV_H + 10, borderRadius: 14, overflow: "hidden",
        background: "radial-gradient(ellipse at 50% 120%,#0b3b2a,#071a2e 70%)", border: `1px solid ${GOLD}`,
        animation: shake ? "x7shake .5s linear" : "none" }}>
        <svg viewBox={`0 0 ${AV_W} ${AV_H}`} style={{ width: "100%", height: "100%", display: "block" }}>
          {[40, 80, 120, 160].map(y => <line key={y} x1="0" x2={AV_W} y1={y} y2={y} stroke="#ffffff0d" />)}
          {pts.length > 1 && <path d={path} fill="none" stroke="#fb923c" strokeWidth="3" strokeLinejoin="round" />}
          {pts.length > 1 && !boom && (
            <g transform={`translate(${px} ${py}) rotate(-28)`}>
              <path d="M-14 0 L14 -4 L22 0 L14 4 Z" fill="#fff" />
              <path d="M-5 0 L-20 -9 L-16 0 L-20 9 Z" fill="#fde68a" />
            </g>
          )}
          {boom && (
            <g transform={`translate(${px} ${py})`}>
              <circle r="14" fill="#fb923c" style={{ transformOrigin: "0 0", animation: "x7boom .8s ease-out forwards" }} />
              <circle r="9" fill="#fde68a" style={{ transformOrigin: "0 0", animation: "x7boom .6s ease-out forwards" }} />
              <circle r="22" fill="none" stroke="#fca5a5" strokeWidth="3" style={{ transformOrigin: "0 0", animation: "x7boom 1s ease-out forwards" }} />
            </g>
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 46, fontWeight: 900, color: crashed ? "#fca5a5" : "#fff", textShadow: "0 3px 10px #000" }}>
            {phase === "idle" ? "Ready" : crashed && boom ? `${res.crash.toFixed(2)}x` : `${m.toFixed(2)}x`}
          </div>
        </div>
      </div>

      <div style={{ minHeight: 40, textAlign: "center", marginTop: 10, fontWeight: 900, fontSize: 15 }}>
        {phase === "flying" && <span>Cash out before it flies away</span>}
        {res && res.won && <span style={{ color: "#86efac" }}>CASHED OUT {res.mult.toFixed(2)}x · WON <CountUp value={res.net} /></span>}
        {res && !res.won && <span style={{ color: "#fca5a5" }}>FLEW AWAY at {res.crash.toFixed(2)}x · LOST <CountUp value={res.net} /></span>}
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <input type="number" min="1.1" step="0.1" placeholder="Auto x" value={autoAt} onChange={e => setAutoAt(e.target.value)}
          style={{ width: 90, padding: 10, borderRadius: 10, border: `1px solid ${GOLD}`, background: "#0a1f14", color: "#f3efe0" }} />
        {phase === "flying"
          ? <button onClick={cashOut} style={{ ...btn, background: "#16a34a", color: "#fff", padding: "12px 30px", fontSize: 15, animation: "x7pulse 1.2s infinite" }}>CASH OUT {R(stakeRef.current * m)}</button>
          : <button onClick={start} style={{ ...btn, background: `linear-gradient(180deg,#fde68a,${GOLD})`, color: "#111", padding: "12px 30px", fontSize: 15 }}>BET {R(chip)}</button>}
      </div>

      <BalBar bal={bal} extra={<>{R(MIN)} - {R(MAX)}</>} />
      <Tip t={tip} />
      {burst > 0 && <Confetti key={burst} />}
    </Shell>
  );
}

/* ================= LOBBY ================= */
const CardArt = memo(function CardArt({ kind }) {
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
  const common = { supabase, me, reload, say, cfg: C, onBack: () => setView("lobby") };

  if (view === "roulette") return <Roulette {...common} />;
  if (view === "dragon") return <DragonTiger {...common} />;
  if (view === "aviator") return <Aviator {...common} />;

  const cards = [
    ["roulette", "roulette", "Auto Roulette", "The wheel turns by itself. Place your bets while the timer runs.", "linear-gradient(135deg,#3f0a0f,#b91c1c)"],
    ["dragon", "dragon_tiger", "Dragon Tiger", "Higher card wins. Tie pays 11 : 1.", "linear-gradient(135deg,#0b1d3a,#1e40af)"],
    ["aviator", "aviator", "Aviator", "Cash out before the plane flies away.", "linear-gradient(135deg,#4a1d06,#ea580c)"],
  ].filter(([, key]) => games[key]);

  return (
    <div style={{ background: "linear-gradient(180deg,#0a1f14 0%,#050d09 100%)", minHeight: "100vh", color: "#f3efe0",
      padding: "14px 12px 40px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", margin: "6px 0 16px" }}>
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
