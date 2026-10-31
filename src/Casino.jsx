import { useState, useEffect, useMemo } from "react";

/* ClashX7 Casino, Phase 1: Roulette
   - Inline styles only (does not depend on the .x7 CSS class)
   - The result is decided on the server (casino_roulette_spin RPC), the client only sends bets
   - Props: supabase, me (App's user object), reload (App's load), say (App's toast) */

const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const SEG = 360 / 37;
const CHIPS = [1, 5, 10, 25, 100, 500];
const MIN_TOTAL = 10, MAX_TOTAL = 500000;
const GOLD = "#f5c518", GOLD2 = "#d4a017", C_RED = "#c0392b", C_BLK = "#161b2e", C_GRN = "#0f7a3c";

const numColor = n => (n === 0 ? C_GRN : RED.includes(n) ? C_RED : "#0b0e18");
const R = n => "₹" + Math.round(+n || 0).toLocaleString("en-IN");
const mod = (x, m) => ((x % m) + m) % m;
const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [150 + r * Math.sin(a), 150 - r * Math.cos(a)]; };

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

const btn = {
  background: "#1f2937", color: "#f5f0d8", border: `1px solid ${GOLD2}`, borderRadius: 8,
  padding: "9px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer",
};

/* Wheel: 37 pockets, pointer at top. Spin is a CSS transition to the server's number. */
function Wheel({ target, spinId }) {
  const [rot, setRot] = useState(0);
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (spinId === 0 || target == null) return;
    const idx = ORDER.indexOf(target);
    setAnim(true);
    setRot(r => r + 1800 + mod(-(idx * SEG) - r, 360)); // 5 full turns, then land on the number
  }, [spinId]); // eslint-disable-line react-hooks/exhaustive-deps

  const segs = ORDER.map((n, i) => {
    const a1 = i * SEG - SEG / 2, a2 = i * SEG + SEG / 2;
    const [x1, y1] = pt(140, a1), [x2, y2] = pt(140, a2);
    const [x3, y3] = pt(62, a2), [x4, y4] = pt(62, a1);
    const d = `M${x1} ${y1} A140 140 0 0 1 ${x2} ${y2} L${x3} ${y3} A62 62 0 0 0 ${x4} ${y4} Z`;
    const [tx, ty] = pt(112, i * SEG);
    return (
      <g key={n}>
        <path d={d} fill={numColor(n)} stroke={GOLD2} strokeWidth=".6" />
        <text x={tx} y={ty} fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle"
          dominantBaseline="middle" transform={`rotate(${i * SEG} ${tx} ${ty})`}>{n}</text>
      </g>
    );
  });

  return (
    <div style={{ position: "relative", width: "min(74vw,280px)", margin: "0 auto" }}>
      <div style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${GOLD}`,
        zIndex: 2, filter: "drop-shadow(0 2px 2px #000)" }} />
      <svg viewBox="0 0 300 300" style={{ width: "100%", height: "auto", display: "block",
        transform: `rotate(${rot}deg)`, transition: anim ? "transform 3.6s cubic-bezier(.17,.67,.2,1)" : "none" }}>
        <defs>
          <radialGradient id="x7hub" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff7c2" />
            <stop offset=".5" stopColor={GOLD} />
            <stop offset="1" stopColor="#8a5a00" />
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
}

export default function CasinoHome({ supabase, me, reload, say }) {
  const [stack, setStack] = useState([]);       // every chip placed, in order (UNDO pops the last one)
  const [chip, setChip] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [target, setTarget] = useState(null);
  const [spinId, setSpinId] = useState(0);
  const [winNum, setWinNum] = useState(null);
  const [history, setHistory] = useState([]);
  const [tip, setTip] = useState(null);

  const balance = (+me.balance || 0) + (+me.winnings || 0);

  // aggregate the chip stack into one entry per bet cell
  const bets = useMemo(() => {
    const m = new Map();
    stack.forEach(s => {
      const c = m.get(s.key) || { key: s.key, type: s.type, value: s.value, amount: 0 };
      c.amount += s.amount;
      m.set(s.key, c);
    });
    return [...m.values()];
  }, [stack]);

  const total = bets.reduce((a, b) => a + b.amount, 0);
  const amtOn = (type, value) => bets.find(b => b.key === `${type}:${value ?? ""}`)?.amount || 0;

  useEffect(() => {
    supabase.from("casino_rounds").select("result").eq("game", "roulette")
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setHistory((data || []).map(r => r.result?.number).filter(n => typeof n === "number")));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = t => { setTip(t); setTimeout(() => setTip(null), 1800); };

  const place = (type, value = null) => {
    if (spinning) return;
    if (total + chip > balance) return flash("Balance too low");
    if (total + chip > MAX_TOTAL) return flash(`Max limit ₹${MAX_TOTAL.toLocaleString("en-IN")}`);
    setStack(s => [...s, { key: `${type}:${value ?? ""}`, type, value, amount: chip }]);
  };
  const undo = () => { if (!spinning) setStack(s => s.slice(0, -1)); };
  const clear = () => { if (!spinning) setStack([]); };
  const dbl = () => {
    if (spinning || !bets.length) return;
    if (total * 2 > balance) return flash("Balance too low");
    if (total * 2 > MAX_TOTAL) return flash(`Max limit ₹${MAX_TOTAL.toLocaleString("en-IN")}`);
    setStack(s => [...s, ...bets.map(b => ({ ...b }))]);
  };

  const spin = async () => {
    if (spinning) return;
    if (!bets.length) return flash("Place a bet first");
    if (total < MIN_TOTAL) return flash(`Minimum bet ₹${MIN_TOTAL}`);
    setSpinning(true);
    setWinNum(null);

    const { data, error } = await supabase.rpc("casino_roulette_spin", {
      p_bets: bets.map(b => ({ type: b.type, value: b.value, amount: b.amount })),
    });
    if (error || !data) {
      setSpinning(false);
      return say ? say(error?.message || "Spin failed", 1) : flash(error?.message || "Spin failed");
    }

    setTarget(data.number);
    setSpinId(x => x + 1);

    setTimeout(() => {
      setWinNum(data.number);
      setHistory(h => [data.number, ...h].slice(0, 30));
      setStack([]);
      setSpinning(false);
      const net = data.net;
      flash(net > 0 ? `🎉 ${data.number} · You won ${R(net)}`
        : net < 0 ? `${data.number} · Lost ${R(-net)}`
        : `${data.number} · Returned`);
      reload && reload();
      setTimeout(() => setWinNum(null), 2500);
    }, 3700);
  };

  // one cell; value is the number for straight/dozen/column, null for even-money bets
  const cell = (type, value, label, bg, extra = {}) => {
    const win = winNum !== null && hits(type, value, winNum);
    const a = amtOn(type, value);
    return (
      <div key={`${type}:${value ?? ""}`} onClick={() => place(type, value)}
        style={{ position: "relative", background: bg, color: "#fff", border: `1px solid ${GOLD2}88`, borderRadius: 5,
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12,
          cursor: spinning ? "wait" : "pointer", userSelect: "none", boxSizing: "border-box",
          boxShadow: win ? `0 0 0 3px ${GOLD}, 0 0 16px ${GOLD}` : "none", transition: "box-shadow .3s", ...extra }}>
        {label}
        {a > 0 && (
          <span style={{ position: "absolute", top: -6, right: -4, background: GOLD, color: "#1a1200", borderRadius: 99,
            fontSize: 9, fontWeight: 900, padding: "1px 4px", boxShadow: "0 1px 3px #000" }}>{a}</span>
        )}
      </div>
    );
  };

  const numRows = Array.from({ length: 12 }, (_, r) => [3, 2, 1].map(k => 3 * r + k));

  return (
    <div style={{ background: "linear-gradient(180deg,#1a1f35 0%,#0a0e1a 100%)", minHeight: "100vh", color: "#f5f0d8",
      padding: "8px 8px 110px", boxSizing: "border-box", fontFamily: "system-ui,sans-serif", position: "relative" }}>

      {/* recent results */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "4px 2px 10px" }}>
        {history.length === 0 && <span style={{ fontSize: 12, opacity: .6 }}>No spins yet</span>}
        {history.map((n, i) => (
          <span key={i} style={{ minWidth: 28, height: 28, borderRadius: 99, display: "grid", placeItems: "center",
            fontSize: 12, fontWeight: 800, background: numColor(n), color: "#fff", border: `1px solid ${GOLD2}`, flex: "0 0 auto" }}>{n}</span>
        ))}
      </div>

      <Wheel target={target} spinId={spinId} />

      {/* betting table */}
      <div style={{ marginTop: 12 }}>
        {cell("straight", 0, "0", C_GRN, { height: 34, marginBottom: 4 })}
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 50px", gap: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cell("low", null, "1-18", C_BLK, { flex: 1 })}
            {cell("even", null, "EVEN", C_BLK, { flex: 1 })}
            {cell("red", null, "◆", C_RED, { flex: 1, fontSize: 16 })}
            {cell("black", null, "◆", "#0b0e18", { flex: 1, fontSize: 16 })}
            {cell("odd", null, "ODD", C_BLK, { flex: 1 })}
            {cell("high", null, "19-36", C_BLK, { flex: 1 })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
            {numRows.flat().map(n => cell("straight", n, n, numColor(n), { height: 34 }))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cell("dozen", 1, "1ST 12", C_BLK, { flex: 1, writingMode: "vertical-rl" })}
            {cell("dozen", 2, "2ND 12", C_BLK, { flex: 1, writingMode: "vertical-rl" })}
            {cell("dozen", 3, "3RD 12", C_BLK, { flex: 1, writingMode: "vertical-rl" })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 50px", gap: 4, marginTop: 4 }}>
          <div />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
            {[3, 2, 1].map(c => cell("column", c, "2 TO 1", C_BLK, { height: 30 }))}
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
          style={{ ...btn, background: `linear-gradient(180deg,#ffe066,${GOLD2})`, color: "#1a1200",
            padding: "10px 26px", opacity: spinning ? .6 : 1 }}>{spinning ? "SPINNING…" : "SPIN"}</button>
      </div>

      {/* bottom bar */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#0a0e1a", borderTop: `1px solid ${GOLD2}`,
        padding: "8px 12px calc(8px + env(safe-area-inset-bottom,0px))", display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 12, zIndex: 50 }}>
        <div>
          <div style={{ color: GOLD, fontWeight: 800 }}>Auto-Roulette</div>
          <div>Total Bet <b>{R(total)}</b> · Balance <b>{R(balance)}</b></div>
        </div>
        <div style={{ opacity: .8, textAlign: "right" }}>₹{MIN_TOTAL} - {MAX_TOTAL.toLocaleString("en-IN")}</div>
      </div>

      {tip && (
        <div style={{ position: "fixed", top: "42%", left: "50%", transform: "translateX(-50%)", background: "rgba(10,12,22,.95)",
          border: `1px solid ${GOLD2}`, color: "#fff", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
          zIndex: 80, whiteSpace: "nowrap", boxShadow: "0 6px 20px #000" }}>{tip}</div>
      )}
    </div>
  );
}
