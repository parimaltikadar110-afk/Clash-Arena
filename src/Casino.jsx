import { useState, useEffect, useMemo, useCallback, memo } from "react";

/* ClashX7 Casino v2, Roulette
   - Result is decided on the server: ONE RPC call per spin (casino_spin)
   - Stats/history come from localStorage only ('x7_casino_hist', max 50). Zero DB calls for stats.
   - Optimistic balance: deducted instantly, reverted if the RPC fails
   - Wallet refresh only after a settled spin (no realtime, no polling)
   - Mounted only when appMode === 'casino' (App unmounts it otherwise)
   - Props: supabase, me, reload (App load), say (App toast), cfg (app_settings 'casino_config') */

const HIST_KEY = "x7_casino_hist", HIST_MAX = 50;
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const SEG = 360 / 37;
const CHIPS = [1, 5, 10, 25, 100, 500];
const GOLD = "#f5c518", GOLD2 = "#d4a017", C_RED = "#c0392b", C_BLK = "#161b2e", C_GRN = "#0f7a3c";

const colorName = n => (n === 0 ? "green" : RED.includes(n) ? "red" : "black");
const numColor = n => (n === 0 ? C_GRN : RED.includes(n) ? C_RED : "#0b0e18");
const R = n => "₹" + Math.round(+n || 0).toLocaleString("en-IN");
const mod = (x, m) => ((x % m) + m) % m;
const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [150 + r * Math.sin(a), 150 - r * Math.cos(a)]; };
const btn = { background: "#1f2937", color: "#f5f0d8", border: `1px solid ${GOLD2}`, borderRadius: 8, padding: "9px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" };

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

/* ---------- local history (localStorage only) ---------- */
function readHist() {
  try { const a = JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); return Array.isArray(a) ? a.slice(0, HIST_MAX) : []; }
  catch { return []; }
}
function useLocalHistory() {
  const [hist, setHist] = useState(readHist);   // read once on mount
  const push = useCallback(n => {
    setHist(h => {
      const next = [{ n, color: colorName(n), ts: Date.now() }, ...h].slice(0, HIST_MAX);  // newest first, old ones shifted out
      try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [hist, push];
}

/* ---------- wheel (memo: only re-renders when target/spinId change) ---------- */
const Wheel = memo(function Wheel({ target, spinId }) {
  const [rot, setRot] = useState(0);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (spinId === 0 || target == null) return;
    const idx = ORDER.indexOf(target);
    setAnim(true);
    setRot(r => r + 1800 + mod(-(idx * SEG) - r, 360));   // 5 full turns, land on the server number
  }, [spinId]); // eslint-disable-line react-hooks/exhaustive-deps

  const segs = useMemo(() => ORDER.map((n, i) => {
    const a1 = i * SEG - SEG / 2, a2 = i * SEG + SEG / 2;
    const [x1, y1] = pt(140, a1), [x2, y2] = pt(140, a2), [x3, y3] = pt(62, a2), [x4, y4] = pt(62, a1);
    const d = `M${x1} ${y1} A140 140 0 0 1 ${x2} ${y2} L${x3} ${y3} A62 62 0 0 0 ${x4} ${y4} Z`;
    const [tx, ty] = pt(112, i * SEG);
    return (
      <g key={n}>
        <path d={d} fill={numColor(n)} stroke={GOLD2} strokeWidth=".6" />
        <text x={tx} y={ty} fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(${i * SEG} ${tx} ${ty})`}>{n}</text>
      </g>
    );
  }), []);

  return (
    <div style={{ position: "relative", width: "min(74vw,280px)", margin: "0 auto" }}>
      <div style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${GOLD}`,
        zIndex: 2, filter: "drop-shadow(0 2px 2px #000)" }} />
      <svg viewBox="0 0 300 300" style={{ width: "100%", height: "auto", display: "block",
        transform: `rotate(${rot}deg)`, transition: anim ? "transform 3.6s cubic-bezier(.17,.67,.2,1)" : "none" }}>
        <defs>
          <radialGradient id="x7hub" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff7c2" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#8a5a00" />
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="148" fill="#2a1a05" />
        <circle cx="150" cy="150" r="143" fill="none" stroke={GOLD} strokeWidth="3" />
        {segs}
        <circle cx="150" cy="150" r="58" fill="#1f2937" stroke={GOLD} strokeWidth="2" />
        <circle cx="150" cy="150" r="44" fill="url(#x7hub)" />
        <circle cx="150" cy="150" r="10" fill="#8a5a00" />
      </svg>
    </div>
  );
});

/* ---------- one betting cell (memo: re-renders only when its own props change) ---------- */
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

/* ---------- stats modal: reads ONLY the local history array ---------- */
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
            {row("Red", pct("red") + "%")}
            {row("Black", pct("black") + "%")}
            {row("Green (0)", pct("green") + "%")}
            <p style={{ margin: "12px 0 4px", fontWeight: 800 }}>🔥 Hot</p>
            {hot.map(h => row(`#${h.i}`, `${h.c}×`))}
            <p style={{ margin: "12px 0 4px", fontWeight: 800 }}>🧊 Cold</p>
            {cold.map(h => row(`#${h.i}`, `${h.c}×`))}
          </>
        )}
        <button onClick={onClose} style={{ ...btn, width: "100%", marginTop: 12 }}>Close</button>
      </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function CasinoHome({ supabase, me, reload, say, cfg }) {
  const C = cfg || {};
  const MIN = +C.min_bet || 10, MAX = +C.max_bet || 50000;
  const rouletteOn = !!C.games?.roulette;

  const [hist, pushHist] = useLocalHistory();
  const [stack, setStack] = useState([]);     // every chip placed, in order (UNDO pops the last one)
  const [chip, setChip] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [target, setTarget] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [winNum, setWinNum] = useState(null);
  const [tip, setTip] = useState(null);
  const [last, setLast] = useState(null);     // last settled spin, shown under the wheel
  const [showStats, setShowStats] = useState(false);

  const realBal = (+me.balance || 0) + (+me.winnings || 0);
  const [bal, setBal] = useState(realBal);    // optimistic display balance
  useEffect(() => { setBal(realBal); }, [realBal]);

  const bets = useMemo(() => {
    const m = new Map();
    stack.forEach(s => {
      const c = m.get(s.key) || { key: s.key, type: s.type, value: s.value, amount: 0 };
      c.amount += s.amount;
      m.set(s.key, c);
    });
    return [...m.values()];
  }, [stack]);
  const total = useMemo(() => bets.reduce((a, b) => a + b.amount, 0), [bets]);
  const amounts = useMemo(() => { const o = {}; bets.forEach(b => { o[b.key] = b.amount; }); return o; }, [bets]);

  const flash = t => { setTip(t); setTimeout(() => setTip(null), 3000); };

  const place = useCallback((type, value = null) => {
    if (spinning) return;
    if (total + chip > bal) return flash("Balance too low");
    if (total + chip > MAX) return flash(`Max bet ₹${MAX.toLocaleString("en-IN")}`);
    setStack(s => [...s, { key: `${type}:${value ?? ""}`, type, value, amount: chip }]);
  }, [spinning, total, chip, bal, MAX]);

  const undo = () => { if (!spinning) setStack(s => s.slice(0, -1)); };
  const clear = () => { if (!spinning) setStack([]); };
  const dbl = () => {
    if (spinning || !bets.length) return;
    if (total * 2 > bal) return flash("Balance too low");
    if (total * 2 > MAX) return flash(`Max bet ₹${MAX.toLocaleString("en-IN")}`);
    setStack(s => [...s, ...bets.map(b => ({ ...b }))]);
  };

  const spin = async () => {
    if (spinning) return;
    if (!bets.length) return flash("Place a bet first");
    if (total < MIN) return flash(`Minimum bet ₹${MIN}`);
    if (total > MAX) return flash(`Max bet ₹${MAX.toLocaleString("en-IN")}`);

    const before = bal;
    setSpinning(true); setWinNum(null);
    setBal(before - total);                    // optimistic deduction

    const { data, error } = await supabase.rpc("casino_spin", {
      p_game: "roulette",
      p_bet: total,
      p_choice: bets.map(b => ({ type: b.type, value: b.value, amount: b.amount })),
    });

    if (error || !data?.success) {
      setBal(before);                          // revert optimistic change
      setSpinning(false);
      const m = error?.message || "";
      const known = /closed|not available|Insufficient|Bet|Place|Too many|Unknown|login/i.test(m);
      return say ? say(known ? m : "Connection lost", 1) : flash(known ? m : "Connection lost");
    }

    setTarget(data.number);
    setSpinId(x => x + 1);

    setTimeout(() => {                         // wait for the wheel animation
      setWinNum(data.number);
      pushHist(data.number);
      setStack([]);
      setSpinning(false);
      setBal(data.new_balance);                // server value is the truth
      const net = data.won_amount - total;
      setLast({ n: data.number, net });        // persistent banner, does not disappear like a toast
      flash(net > 0 ? `🎉 ${data.number} · WON ${R(net)}` : net < 0 ? `${data.number} · LOST ${R(-net)}` : `${data.number} · Returned`);
      reload && reload();                      // single wallet refresh after settlement
      setTimeout(() => setWinNum(null), 2500);
    }, 3700);
  };

  if (!rouletteOn) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#f5f0d8", background: "#0a0e1a", padding: 20, textAlign: "center" }}>
        <div><div style={{ fontSize: 40 }}>🎰</div><h3>Roulette: Coming Soon</h3><p style={{ opacity: .7, fontSize: 13 }}>This game is not open right now.</p></div>
      </div>
    );
  }

  const cell = (type, value, label, bg, opts = {}) => (
    <Cell key={`${type}:${value ?? ""}`} type={type} value={value} label={label} bg={bg}
      amount={amounts[`${type}:${value ?? ""}`] || 0}
      win={winNum !== null && hits(type, value, winNum)} onPlace={place} {...opts} />
  );

  const numRows = Array.from({ length: 12 }, (_, r) => [3, 2, 1].map(k => 3 * r + k));

  return (
    <div style={{ background: "linear-gradient(180deg,#1a1f35 0%,#0a0e1a 100%)", minHeight: "100vh", color: "#f5f0d8",
      padding: "8px 8px 110px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif" }}>

      {/* top: local history + stats button */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 2px 10px" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1 }}>
          {hist.length === 0 && <span style={{ fontSize: 12, opacity: .6 }}>No spins yet</span>}
          {hist.slice(0, 20).map((h, i) => (
            <span key={h.ts + "-" + i} style={{ minWidth: 28, height: 28, borderRadius: 99, display: "grid", placeItems: "center",
              fontSize: 12, fontWeight: 800, background: numColor(h.n), color: "#fff", border: `1px solid ${GOLD2}`, flex: "0 0 auto" }}>{h.n}</span>
          ))}
        </div>
        <button onClick={() => setShowStats(true)} style={{ ...btn, flex: "0 0 auto" }}>📊</button>
      </div>

      <Wheel target={target} spinId={spinId} />

      {last && (() => {
        const k = last.net > 0 ? "win" : last.net < 0 ? "loss" : "push";
        const bg = k === "win" ? "#14532d" : k === "loss" ? "#7f1d1d" : "#374151";
        const txt = k === "win" ? `🎉 WON ${R(last.net)}` : k === "loss" ? `LOST ${R(-last.net)}` : "RETURNED ₹0";
        return (
          <div style={{ textAlign: "center", marginTop: 10, padding: "9px 12px", borderRadius: 10, fontWeight: 900,
            fontSize: 16, color: "#fff", background: bg, border: `1px solid ${GOLD2}`, boxShadow: "0 4px 14px #000a" }}>
            #{last.n} · {txt}
          </div>
        );
      })()}

      {/* betting table */}
      <div style={{ marginTop: 12 }}>
        {cell("straight", 0, "0", C_GRN, { tall: 34, fs: 12 })}
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 50px", gap: 4, marginTop: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cell("low", null, "1-18", C_BLK, { flexy: true })}
            {cell("even", null, "EVEN", C_BLK, { flexy: true })}
            {cell("red", null, "◆", C_RED, { flexy: true, fs: 16 })}
            {cell("black", null, "◆", "#0b0e18", { flexy: true, fs: 16 })}
            {cell("odd", null, "ODD", C_BLK, { flexy: true })}
            {cell("high", null, "19-36", C_BLK, { flexy: true })}
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

      {/* chips */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {CHIPS.map(c => (
          <button key={c} onClick={() => setChip(c)} style={{ width: 46, height: 46, borderRadius: 99,
            border: `3px solid ${chip === c ? GOLD : "#555"}`,
            background: chip === c ? "radial-gradient(circle,#fff3b0,#d4a017)" : "radial-gradient(circle,#2d3650,#111827)",
            color: chip === c ? "#1a1200" : "#eee", fontWeight: 900, fontSize: 12, cursor: "pointer",
            boxShadow: chip === c ? `0 0 12px ${GOLD}` : "0 2px 6px #000", transform: chip === c ? "scale(1.08)" : "none" }}>{c}</button>
        ))}
      </div>

      {/* controls */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button onClick={undo} style={btn}>↶ UNDO</button>
        <button onClick={dbl} style={btn}>×2 DOUBLE</button>
        <button onClick={clear} style={btn}>CLEAR</button>
        <button onClick={spin} disabled={spinning}
          style={{ ...btn, background: `linear-gradient(180deg,#ffe066,${GOLD2})`, color: "#1a1200", padding: "10px 26px", opacity: spinning ? .6 : 1 }}>
          {spinning ? "SPINNING…" : "SPIN"}
        </button>
      </div>

      {/* bottom bar */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#0a0e1a", borderTop: `1px solid ${GOLD2}`,
        padding: "8px 12px calc(8px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 12, zIndex: 50 }}>
        <div>
          <div style={{ color: GOLD, fontWeight: 800 }}>Auto-Roulette</div>
          <div>Total Bet <b>{R(total)}</b> · Balance <b>{R(bal)}</b></div>
        </div>
        <div style={{ opacity: .8, textAlign: "right" }}>₹{MIN} - {MAX.toLocaleString("en-IN")}</div>
      </div>

      {tip && (
        <div style={{ position: "fixed", top: "42%", left: "50%", transform: "translateX(-50%)", background: "rgba(10,12,22,.95)",
          border: `1px solid ${GOLD2}`, color: "#fff", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
          zIndex: 80, whiteSpace: "nowrap", boxShadow: "0 6px 20px #000" }}>{tip}</div>
      )}

      {showStats && <StatsModal hist={hist} onClose={() => setShowStats(false)} />}
    </div>
  );
}
