import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";

/* ClashX7 Casino v3
   Lobby -> Auto Roulette | Dragon Tiger | Aviator
   - Every result is decided on the server (one RPC per action). The client never picks a result.
   - Stats/history come from localStorage only. No DB calls for stats.
   - Optimistic balance: deducted at once, reverted if the RPC fails.
   - Wallet refresh only after a settled round.
   - Props: supabase, me, reload (App load), say (App toast), cfg (app_settings 'casino_config') */

const HIST_KEY = "x7_casino_hist", DT_KEY = "x7_dt_hist", HIST_MAX = 50;
const BET_SECONDS = 12;
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const SEG = 360 / 37;
const CHIPS = [1, 5, 10, 25, 100, 500];
const GOLD = "#f5c518", GOLD2 = "#d4a017", C_RED = "#c0392b", C_BLK = "#161b2e", C_GRN = "#0f7a3c";
const RANK = ["", "A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const colorName = n => (n === 0 ? "green" : RED.includes(n) ? "red" : "black");
const numColor = n => (n === 0 ? C_GRN : RED.includes(n) ? C_RED : "#0b0e18");
const R = n => "₹" + Math.round(+n || 0).toLocaleString("en-IN");
const mod = (x, m) => ((x % m) + m) % m;
const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [150 + r * Math.sin(a), 150 - r * Math.cos(a)]; };
const btn = { background: "#1f2937", color: "#f5f0d8", border: `1px solid ${GOLD2}`, borderRadius: 8, padding: "9px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" };
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

/* ---------- shared hooks / small UI ---------- */
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
  <div style={{ position: "fixed", top: "42%", left: "50%", transform: "translateX(-50%)", background: "rgba(10,12,22,.95)",
    border: `1px solid ${GOLD2}`, color: "#fff", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
    zIndex: 80, whiteSpace: "nowrap", boxShadow: "0 6px 20px #000" }}>{t}</div>
);
const chipStyle = on => ({ width: 46, height: 46, borderRadius: 99, border: `3px solid ${on ? GOLD : "#555"}`,
  background: on ? "radial-gradient(circle,#fff3b0,#d4a017)" : "radial-gradient(circle,#2d3650,#111827)",
  color: on ? "#1a1200" : "#eee", fontWeight: 900, fontSize: 12, cursor: "pointer", boxShadow: on ? `0 0 12px ${GOLD}` : "0 2px 6px #000" });
const Chips = ({ value, onChange }) => (
  <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
    {CHIPS.map(c => <button key={c} onClick={() => onChange(c)} style={chipStyle(c === value)}>{c}</button>)}
  </div>
);
const Shell = ({ title, onBack, right, children }) => (
  <div style={{ background: "linear-gradient(180deg,#1a1f35 0%,#0a0e1a 100%)", minHeight: "100vh", color: "#f5f0d8",
    padding: "8px 10px 110px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <button onClick={onBack} style={btn}>← Lobby</button>
      <b style={{ flex: 1, color: GOLD }}>{title}</b>
      {right}
    </div>
    {children}
  </div>
);
const BalBar = ({ bal, extra }) => (
  <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#0a0e1a", borderTop: `1px solid ${GOLD2}`,
    padding: "8px 12px calc(8px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: 12, zIndex: 50 }}>
    <div>Balance <b>{R(bal)}</b></div>
    <div style={{ opacity: .85, textAlign: "right" }}>{extra}</div>
  </div>
);

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

/* ---------- roulette wheel: wood rim, gold pocket dividers, ball ---------- */
const Wheel = memo(function Wheel({ target, spinId }) {
  const [rot, setRot] = useState(0);
  const [ball, setBall] = useState(0);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (spinId === 0 || target == null) return;
    const idx = ORDER.indexOf(target);
    setAnim(true);
    setRot(r => r + 1800 + mod(-(idx * SEG) - r, 360));  // wheel turns clockwise and stops on the number
    setBall(b => b - 2880);                              // ball turns the other way and ends at the top pocket
  }, [spinId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pockets = useMemo(() => ORDER.map((n, i) => {
    const a1 = i * SEG - SEG / 2, a2 = i * SEG + SEG / 2;
    const [x1, y1] = pt(128, a1), [x2, y2] = pt(128, a2), [x3, y3] = pt(60, a2), [x4, y4] = pt(60, a1);
    const d = `M${x1} ${y1} A128 128 0 0 1 ${x2} ${y2} L${x3} ${y3} A60 60 0 0 0 ${x4} ${y4} Z`;
    const [sx, sy] = pt(60, a1), [ex, ey] = pt(128, a1);
    const [tx, ty] = pt(100, i * SEG);
    return (
      <g key={n}>
        <path d={d} fill={numColor(n)} stroke="none" />
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={GOLD} strokeWidth="1" />
        <text x={tx} y={ty} fill="#fff" fontSize="9" fontWeight="800" textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(${i * SEG} ${tx} ${ty})`}>{n}</text>
      </g>
    );
  }), []);

  const trans = dur => (anim ? `transform ${dur} cubic-bezier(.17,.67,.2,1)` : "none");

  return (
    <div style={{ position: "relative", width: "min(76vw,290px)", margin: "0 auto" }}>
      <div style={{ position: "absolute", left: "50%", top: -10, transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${GOLD}`,
        zIndex: 3, filter: "drop-shadow(0 2px 2px #000)" }} />
      <svg viewBox="0 0 300 300" style={{ width: "100%", height: "auto", display: "block", transform: `rotate(${rot}deg)`, transition: trans("3.6s") }}>
        <defs>
          <radialGradient id="x7wood" cx="50%" cy="40%" r="65%">
            <stop offset="0" stopColor="#8b5a2b" /><stop offset=".6" stopColor="#4a2a10" /><stop offset="1" stopColor="#23120a" />
          </radialGradient>
          <radialGradient id="x7hub" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff7c2" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#8a5a00" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="148" fill="url(#x7wood)" />
        <circle cx="150" cy="150" r="138" fill="none" stroke={GOLD} strokeWidth="2" />
        <circle cx="150" cy="150" r="130" fill="#0d0d0d" />
        {pockets}
        <circle cx="150" cy="150" r="60" fill="#1f2937" stroke={GOLD} strokeWidth="2" />
        <circle cx="150" cy="150" r="46" fill="url(#x7hub)" />
        <circle cx="150" cy="150" r="10" fill="#6b4300" />
      </svg>
      <svg viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none",
        transform: `rotate(${ball}deg)`, transition: trans("3.8s") }}>
        <circle cx="150" cy="28" r="5.5" fill="#fff" stroke="#9ca3af" strokeWidth="1" />
      </svg>
    </div>
  );
});

/* ---------- one betting cell (memo) ---------- */
const Cell = memo(function Cell({ type, value, label, bg, amount, win, onPlace, vertical, flexy, tall, fs }) {
  return (
    <div onClick={() => onPlace(type, value)}
      style={{ position: "relative", background: bg, color: "#fff", border: `1px solid ${GOLD2}88`, borderRadius: 5,
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: fs || 12,
        cursor: "pointer", userSelect: "none", boxSizing: "border-box", height: tall || undefined,
        flex: flexy ? 1 : undefined, writingMode: vertical ? "vertical-rl" : undefined,
        boxShadow: win ? `0 0 0 3px ${GOLD}, 0 0 16px ${GOLD}` : "none", transition: "box-shadow .3s" }}>
      {label}
      {amount > 0 && (
        <span style={{ position: "absolute", top: -6, right: -4, background: GOLD, color: "#1a1200", borderRadius: 99,
          fontSize: 9, fontWeight: 900, padding: "1px 4px", boxShadow: "0 1px 3px #000" }}>{amount}</span>
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0f1424", border: `1px solid ${GOLD2}`, borderRadius: 14, padding: 16, width: "min(92vw,360px)", maxHeight: "80vh", overflow: "auto", color: "#f5f0d8" }}>
        <h3 style={{ margin: "0 0 8px", color: GOLD }}>📊 Statistics (last {n})</h3>
        {n === 0 ? <p style={{ fontSize: 13, opacity: .7 }}>No spins yet on this device.</p> : (
          <>
            {row("Red", pct("red") + "%")}{row("Black", pct("black") + "%")}{row("Green (0)", pct("green") + "%")}
            <p style={{ margin: "12px 0 4px", fontWeight: 800 }}>🔥 Hot</p>{hot.map(h => row(`#${h.i}`, `${h.c}×`))}
            <p style={{ margin: "12px 0 4px", fontWeight: 800 }}>🧊 Cold</p>{cold.map(h => row(`#${h.i}`, `${h.c}×`))}
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
  const [stack, setStack] = useState([]);        // chips placed this window (UNDO pops last)
  const [lastBets, setLastBets] = useState([]); // aggregated bets of the last settled round (AUTO repeats them)
  const [chip, setChip] = useState(10);
  const [auto, setAuto] = useState(false);
  const [phase, setPhase] = useState("bet");     // bet | spinning | result
  const [count, setCount] = useState(BET_SECONDS);
  const [target, setTarget] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [winNum, setWinNum] = useState(null);
  const [last, setLast] = useState(null);
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
    if (total + chip > MAX) return flash(`Max bet ₹${MAX.toLocaleString("en-IN")}`);
    setStack(s => [...s, { key: `${type}:${value ?? ""}`, type, value, amount: chip }]);
  }, [phase, total, chip, bal, MAX]); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = () => { if (phase === "bet") setStack(s => s.slice(0, -1)); };
  const clear = () => { if (phase === "bet") setStack([]); };
  const dbl = () => {
    if (phase !== "bet" || !bets.length) return;
    if (total * 2 > bal) return flash("Balance too low");
    if (total * 2 > MAX) return flash(`Max bet ₹${MAX.toLocaleString("en-IN")}`);
    setStack(s => [...s, ...bets.map(b => ({ ...b }))]);
  };

  // one spin = one RPC. Called when the bet window ends.
  const spin = async () => {
    if (phase !== "bet") return;
    let list = bets;
    if (!list.length && auto && lastBets.length) list = lastBets;   // AUTO: repeat last round's bets
    if (!list.length) { setCount(BET_SECONDS); return; }             // no bets: open a new window
    const sum = list.reduce((a, b) => a + b.amount, 0);
    if (sum < MIN) { setCount(BET_SECONDS); return flash(`Minimum bet ₹${MIN}`); }
    if (sum > bal) { setAuto(false); setCount(BET_SECONDS); return flash("Balance too low for AUTO"); }

    const before = bal;
    setPhase("spinning"); setWinNum(null); setBal(before - sum);     // optimistic
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
      setPhase("result");
      reload && reload();
      setTimeout(() => { setWinNum(null); setPhase("bet"); setCount(BET_SECONDS); }, 3000);
    }, 3800);
  };

  const spinRef = useRef(spin);
  spinRef.current = spin;

  // bet-window countdown (one timer at a time)
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

  const status = phase === "bet" ? `Place your bets · ${count}s`
    : phase === "spinning" ? "No more bets"
    : last ? `#${last.n} · ${last.net > 0 ? `WON ${R(last.net)}` : last.net < 0 ? `LOST ${R(-last.net)}` : "RETURNED ₹0"}` : "";
  const statusBg = phase === "result" && last ? (last.net > 0 ? "#14532d" : last.net < 0 ? "#7f1d1d" : "#374151") : "#111827";

  return (
    <Shell title="Auto Roulette" onBack={onBack}
      right={<>
        <button onClick={() => setAuto(a => !a)} style={{ ...btn, background: auto ? GOLD : "#1f2937", color: auto ? "#1a1200" : "#f5f0d8" }}>AUTO {auto ? "ON" : "OFF"}</button>
        <button onClick={() => setShowStats(true)} style={btn}>📊</button>
      </>}>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 0 8px" }}>
        {hist.length === 0 && <span style={{ fontSize: 12, opacity: .6 }}>No spins yet</span>}
        {hist.slice(0, 20).map((h, i) => (
          <span key={h.ts + "-" + i} style={{ minWidth: 28, height: 28, borderRadius: 99, display: "grid", placeItems: "center",
            fontSize: 12, fontWeight: 800, background: numColor(h.n), color: "#fff", border: `1px solid ${GOLD2}`, flex: "0 0 auto" }}>{h.n}</span>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "8px 10px", borderRadius: 10, fontWeight: 900, fontSize: 14, background: statusBg, border: `1px solid ${GOLD2}`, marginBottom: 10 }}>
        {status}
      </div>

      <Wheel target={target} spinId={spinId} />

      <div style={{ marginTop: 12 }}>
        {cell("straight", 0, "0", C_GRN, { tall: 34 })}
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 50px", gap: 4, marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cell("low", null, "1-18", C_BLK, { flexy: true })}{cell("even", null, "EVEN", C_BLK, { flexy: true })}
            {cell("red", null, "◆", C_RED, { flexy: true, fs: 16 })}{cell("black", null, "◆", "#0b0e18", { flexy: true, fs: 16 })}
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
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 50px", gap: 4, marginTop: 4 }}>
          <div />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
            {[3, 2, 1].map(c => cell("column", c, "2 TO 1", C_BLK, { tall: 30 }))}
          </div>
          <div />
        </div>
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={undo} style={btn}>↶ UNDO</button>
        <button onClick={dbl} style={btn}>×2 DOUBLE</button>
        <button onClick={clear} style={btn}>CLEAR</button>
        <button onClick={spin} disabled={phase !== "bet"} style={{ ...btn, background: `linear-gradient(180deg,#ffe066,${GOLD2})`, color: "#1a1200", padding: "10px 22px", opacity: phase !== "bet" ? .5 : 1 }}>SPIN NOW</button>
      </div>

      <BalBar bal={bal} extra={<>Bet <b>{R(total)}</b> · {MIN}-{MAX.toLocaleString("en-IN")}</>} />
      <Tip t={tip} />
      {showStats && <StatsModal hist={hist} onClose={() => setShowStats(false)} />}
    </Shell>
  );
}

/* ================= DRAGON TIGER ================= */
function PlayCard({ rank, label, color, shown }) {
  return (
    <div style={{ width: 96, height: 136, borderRadius: 12, border: `2px solid ${GOLD}`,
      background: shown ? "#fff" : `linear-gradient(135deg,${color},#111)`, color: shown ? "#111" : "#f5f0d8",
      display: "grid", placeItems: "center", fontSize: shown ? 36 : 14, fontWeight: 900, boxShadow: "0 8px 20px #000a",
      transition: "background .4s" }}>
      {shown ? RANK[rank] : label}
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
  const [cards, setCards] = useState(null);      // {dragon, tiger} ranks from server
  const [res, setRes] = useState(null);          // {winner, net}
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem(DT_KEY) || "[]"); } catch { return []; } });

  const deal = async () => {
    if (busy) return;
    if (chip < MIN || chip > MAX) return flash(`Bet between ₹${MIN} and ₹${MAX.toLocaleString("en-IN")}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBusy(true); setRes(null); setCards(null); setBal(before - chip);
    const { data, error } = await supabase.rpc("casino_dragon_tiger", { p_bet: chip, p_side: side });
    if (error || !data?.success) { setBal(before); setBusy(false); return say ? say(friendly(error), 1) : flash(friendly(error)); }
    setCards({ dragon: data.dragon, tiger: data.tiger });
    setTimeout(() => {
      setRes({ winner: data.winner, net: data.won_amount - chip });
      setBal(data.new_balance);
      const nh = [{ w: data.winner, ts: Date.now() }, ...hist].slice(0, 50);
      setHist(nh);
      try { localStorage.setItem(DT_KEY, JSON.stringify(nh)); } catch {}
      setBusy(false);
      reload && reload();
    }, 1200);
  };

  const sideBtn = (k, label, odds) => (
    <button key={k} onClick={() => setSide(k)} style={{ flex: 1, padding: "12px 6px", borderRadius: 10, fontWeight: 900, cursor: "pointer",
      border: `2px solid ${side === k ? GOLD : "#444"}`, background: side === k ? "linear-gradient(180deg,#ffe066,#d4a017)" : "#111827",
      color: side === k ? "#1a1200" : "#eee" }}>
      {label}<div style={{ fontSize: 11, fontWeight: 700 }}>{odds}</div>
    </button>
  );

  return (
    <Shell title="Dragon Tiger" onBack={onBack}>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 14 }}>
        <div style={{ textAlign: "center" }}>
          <PlayCard rank={cards?.dragon} label="DRAGON" color="#b91c1c" shown={!!cards} />
        </div>
        <div style={{ textAlign: "center" }}>
          <PlayCard rank={cards?.tiger} label="TIGER" color="#b45309" shown={!!cards} />
        </div>
      </div>

      <div style={{ textAlign: "center", minHeight: 44, marginTop: 14, fontWeight: 900, fontSize: 16 }}>
        {busy && !res && "Dealing…"}
        {res && (
          <span style={{ color: res.net > 0 ? "#4ade80" : res.net < 0 ? "#f87171" : "#e5e7eb" }}>
            {res.winner === "tie" ? "TIE" : res.winner.toUpperCase() + " WINS"} · {res.net > 0 ? `WON ${R(res.net)}` : res.net < 0 ? `LOST ${R(-res.net)}` : "RETURNED ₹0"}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        {sideBtn("dragon", "DRAGON", "1 : 1")}
        {sideBtn("tie", "TIE", "11 : 1")}
        {sideBtn("tiger", "TIGER", "1 : 1")}
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={deal} disabled={busy} style={{ ...btn, background: `linear-gradient(180deg,#ffe066,${GOLD2})`, color: "#1a1200", padding: "12px 34px", fontSize: 15, opacity: busy ? .5 : 1 }}>
          DEAL {R(chip)}
        </button>
      </div>

      <p style={{ fontSize: 11, opacity: .6, textAlign: "center", marginTop: 14 }}>
        Recent: {hist.slice(0, 15).map((h, i) => <span key={i} style={{ marginRight: 6, fontWeight: 800, color: h.w === "dragon" ? "#f87171" : h.w === "tiger" ? GOLD : "#e5e7eb" }}>{h.w[0].toUpperCase()}</span>)}
      </p>

      <BalBar bal={bal} extra={<>{MIN}-{MAX.toLocaleString("en-IN")}</>} />
      <Tip t={tip} />
    </Shell>
  );
}

/* ================= AVIATOR ================= */
function Aviator({ supabase, me, reload, say, cfg, onBack }) {
  const MIN = +cfg.min_bet || 10, MAX = +cfg.max_bet || 50000;
  const [bal, setBal, realBal] = useBal(me);
  const [tip, flash] = useFlash();
  const [phase, setPhase] = useState("idle");    // idle | flying | done
  const [chip, setChip] = useState(10);
  const [autoAt, setAutoAt] = useState("");      // optional auto cash-out multiplier
  const [m, setM] = useState(1);
  const [pts, setPts] = useState([1]);
  const [res, setRes] = useState(null);

  const mRef = useRef(1), roundRef = useRef(null), timer = useRef(null), t0 = useRef(0), doneRef = useRef(false), stakeRef = useRef(0), autoRef = useRef(0);
  autoRef.current = parseFloat(autoAt) || 0;

  useEffect(() => () => clearInterval(timer.current), []);

  // Multiplier display only. The real crash point is hidden on the server until the round settles.
  function tick() {
    const el = (Date.now() - t0.current) / 1000;
    const v = Math.max(1, Math.exp(0.07 * el));
    mRef.current = v;
    setM(v);
    setPts(p => (p.length > 500 ? [...p.slice(-499), v] : [...p, v]));
    if (autoRef.current && v >= autoRef.current) cashOut();
    if (v >= 100) cashOut();
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
    setRes({ won: data.won, crash: data.crash, mult, net: data.won_amount - stakeRef.current });
    setBal(data.new_balance);
    reload && reload();
  }

  const start = async () => {
    if (phase === "flying") return;
    if (chip < MIN || chip > MAX) return flash(`Bet between ₹${MIN} and ₹${MAX.toLocaleString("en-IN")}`);
    if (chip > bal) return flash("Balance too low");
    const before = bal;
    setBal(before - chip);
    const { data, error } = await supabase.rpc("casino_aviator_start", { p_bet: chip });
    if (error || !data?.success) { setBal(before); return say ? say(friendly(error), 1) : flash(friendly(error)); }
    roundRef.current = data.round_id; stakeRef.current = chip; doneRef.current = false;
    mRef.current = 1; t0.current = Date.now();
    setRes(null); setPts([1]); setM(1); setPhase("flying");
    clearInterval(timer.current);
    timer.current = setInterval(tick, 100);
  };

  // chart path
  const W = 300, H = 160;
  const maxV = Math.max(2, ...pts);
  const path = pts.map((v, i) => {
    const x = (i / Math.max(pts.length - 1, 1)) * W;
    const y = H - 10 - ((Math.log(v) / Math.log(maxV)) * (H - 20));
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <Shell title="Aviator" onBack={onBack}>
      <div style={{ position: "relative", height: H + 10, borderRadius: 14, overflow: "hidden", background: "linear-gradient(180deg,#0b1020,#1e1b4b)", border: `1px solid ${GOLD2}66` }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
          <path d={path} fill="none" stroke="#f97316" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: res && !res.won ? "#f87171" : "#fff", textShadow: "0 3px 10px #000" }}>
            {phase === "idle" ? "Ready" : `${m.toFixed(2)}x`}
          </div>
        </div>
      </div>

      <div style={{ minHeight: 40, textAlign: "center", marginTop: 10, fontWeight: 900, fontSize: 15 }}>
        {phase === "flying" && "Cash out before it flies away"}
        {res && res.won && <span style={{ color: "#4ade80" }}>CASHED OUT {res.mult.toFixed(2)}x · WON {R(res.net)}</span>}
        {res && !res.won && <span style={{ color: "#f87171" }}>FLEW AWAY at {res.crash.toFixed(2)}x · LOST {R(-res.net)}</span>}
      </div>

      <Chips value={chip} onChange={setChip} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
        <input type="number" min="1.1" step="0.1" placeholder="Auto x" value={autoAt} onChange={e => setAutoAt(e.target.value)}
          style={{ width: 90, padding: 10, borderRadius: 8, border: `1px solid ${GOLD2}`, background: "#111827", color: "#fff" }} />
        {phase === "flying"
          ? <button onClick={cashOut} style={{ ...btn, background: "#16a34a", color: "#fff", padding: "12px 30px", fontSize: 15 }}>CASH OUT {R(stakeRef.current * m)}</button>
          : <button onClick={start} style={{ ...btn, background: `linear-gradient(180deg,#ffe066,${GOLD2})`, color: "#1a1200", padding: "12px 30px", fontSize: 15 }}>BET {R(chip)}</button>}
      </div>

      <BalBar bal={bal} extra={<>{MIN}-{MAX.toLocaleString("en-IN")}</>} />
      <Tip t={tip} />
    </Shell>
  );
}

/* ================= LOBBY ================= */
export default function CasinoHub({ supabase, me, reload, say, cfg }) {
  const C = cfg || {};
  const games = C.games || {};
  const [view, setView] = useState("lobby");
  const common = { supabase, me, reload, say, cfg: C, onBack: () => setView("lobby") };

  if (view === "roulette") return <Roulette {...common} />;
  if (view === "dragon") return <DragonTiger {...common} />;
  if (view === "aviator") return <Aviator {...common} />;

  const cards = [
    ["roulette", "roulette", "🎡", "Auto Roulette", "Wheel spins by itself. Bet in the window.", "linear-gradient(135deg,#7f1d1d,#c0392b)"],
    ["dragon", "dragon_tiger", "🐉", "Dragon Tiger", "Higher card wins. Tie pays 11 : 1.", "linear-gradient(135deg,#1e3a8a,#0f172a)"],
    ["aviator", "aviator", "✈️", "Aviator", "Cash out before the plane flies away.", "linear-gradient(135deg,#7c2d12,#f97316)"],
  ].filter(([, key]) => games[key]);

  return (
    <div style={{ background: "linear-gradient(180deg,#1a1f35 0%,#0a0e1a 100%)", minHeight: "100vh", color: "#f5f0d8",
      padding: "12px 12px 40px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>
      <h2 style={{ textAlign: "center", color: GOLD, margin: "6px 0 14px" }}>🎰 Casino Lobby</h2>
      {cards.length === 0 && <p style={{ textAlign: "center", opacity: .7 }}>No games are open right now.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {cards.map(([v, , ic, name, desc, bg]) => (
          <div key={v} onClick={() => setView(v)} style={{ background: bg, borderRadius: 14, padding: 14, minHeight: 150, cursor: "pointer",
            border: `1px solid ${GOLD2}`, boxShadow: "0 6px 18px #000a", gridColumn: cards.length === 1 ? "1 / -1" : undefined }}>
            <div style={{ fontSize: 40 }}>{ic}</div>
            <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>{name}</div>
            <div style={{ fontSize: 12, opacity: .85, marginTop: 4 }}>{desc}</div>
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, color: GOLD }}>PLAY ›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
