/* ============================================================
   Casino.jsx — multi-game mobile casino lounge
   Games: Aviator · Auto Roulette · Dragon Tiger · Vortex · Mines
   Balance and outcomes are simulated in the browser. For real-money
   use, outcomes must be generated and settled on the server.
   ============================================================ */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plane, CircleDot, Swords, Orbit, Gem, Bomb, Undo2, Minus, Plus, X, Check, Hand } from "lucide-react";

/* ---------------------------- constants ---------------------------- */

const START_BALANCE = 44016727;
const LIMITS = {
  aviator: [10, 50000],
  roulette: [10, 50000],
  dragon: [10, 100000],
  vortex: [10, 25000],
  mines: [10, 20000],
};
const CHIP_VALUES = [10, 25, 100, 500];
const CHIP_COLORS = {
  10: ["#2563eb", "#1e3a8a"],
  25: ["#16a34a", "#14532d"],
  100: ["#1f2937", "#030712"],
  500: ["#9333ea", "#4c1d95"],
};
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const SEG = 360 / 37;
const BET_SECS = 12;
const GROWTH = 0.085; // Aviator: multiplier = e^(GROWTH * seconds)
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const VORTEX_RING = ["0x", "0.5x", "1x", "0x", "2x", "0.5x", "0x", "5x", "200x", "0.5x", "50x", "10x"];
const VORTEX_TABLE = [
  { label: "0x", p: 0.7015 }, { label: "0.5x", p: 0.2 }, { label: "1x", p: 0.05 }, { label: "2x", p: 0.02 },
  { label: "5x", p: 0.02 }, { label: "10x", p: 0.005 }, { label: "50x", p: 0.003 }, { label: "200x", p: 0.0005 },
];
const INNER_MULTS = [1, 2, 1, 3, 1, 2];
const VORTEX_COLORS = {
  "0x": "#3f3f46", "0.5x": "#0e7490", "1x": "#047857", "2x": "#2563eb",
  "5x": "#7c3aed", "10x": "#c026d3", "50x": "#ea580c", "200x": "#eab308",
};
const MINE_OPTIONS = [3, 5, 10, 15];
const FELT = "radial-gradient(ellipse at 50% 30%, #17703f 0%, #0d4a2a 60%, #082f1b 100%)";

const GAMES = [
  { id: "aviator", label: "Aviator", icon: Plane },
  { id: "roulette", label: "Roulette", icon: CircleDot },
  { id: "dragon", label: "Dragon Tiger", icon: Swords },
  { id: "vortex", label: "Vortex", icon: Orbit },
  { id: "mines", label: "Mines", icon: Gem },
];

/* ---------------------------- style tokens ---------------------------- */

const STEP_BTN = "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-600/60 bg-[#16291d] text-amber-200 transition active:scale-95 disabled:opacity-40";
const PANEL = "rounded-2xl border border-amber-800/40 bg-[#07130d]/90 p-3 shadow-[0_10px_30px_#000a]";
const ACTION = "w-full rounded-2xl py-4 text-base font-black tracking-wide text-white shadow-[0_6px_0_#0006] transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:active:translate-y-0";
const GREEN = "bg-gradient-to-r from-emerald-500 to-green-600";
const ORANGE = "bg-gradient-to-r from-amber-400 to-orange-600";
const TOOL = "flex items-center justify-center gap-1 rounded-xl border border-amber-600/50 bg-[#16291d] py-2.5 text-xs font-black text-amber-100 transition active:scale-95 disabled:opacity-40";

/* ---------------------------- helpers ---------------------------- */

const round2 = v => Math.round(v * 100) / 100;
const inrFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const fmt = v => `₹${inrFormat.format(round2(v))}`;
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mod = (x, m) => ((x % m) + m) % m;
const rand = n => Math.floor(Math.random() * n);
const sumAmt = list => list.reduce((s, b) => s + b.amt, 0);
const colorName = n => (n === 0 ? "green" : RED_NUMS.has(n) ? "red" : "black");
const numFill = n => (n === 0 ? "#0f7a3c" : RED_NUMS.has(n) ? "#b91c1c" : "#111318");
const polar = (r, deg) => { const t = (deg * Math.PI) / 180; return [150 + r * Math.sin(t), 150 - r * Math.cos(t)]; };
const wedge = (r1, r2, a1, a2) => {
  const [x1, y1] = polar(r2, a1), [x2, y2] = polar(r2, a2), [x3, y3] = polar(r1, a2), [x4, y4] = polar(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
};
const multFor = (k, m) => {
  let p = 1;
  for (let i = 0; i < k; i++) p *= (25 - i) / (25 - m - i);
  return p * 0.97;
};
const grossOf = key => (key.startsWith("n:") ? 36 : key.startsWith("d:") || key.startsWith("c:") ? 3 : 2);
const hitKey = (key, n) => {
  if (key.startsWith("n:")) return n === +key.slice(2);
  if (key.startsWith("d:")) { const d = +key.slice(2); return n !== 0 && n >= (d - 1) * 12 + 1 && n <= d * 12; }
  if (key.startsWith("c:")) { const c = +key.slice(2); return n !== 0 && (n - 1) % 3 === c - 1; }
  switch (key) {
    case "red": return RED_NUMS.has(n);
    case "black": return n !== 0 && !RED_NUMS.has(n);
    case "even": return n !== 0 && n % 2 === 0;
    case "odd": return n % 2 === 1;
    case "low": return n >= 1 && n <= 18;
    case "high": return n >= 19;
    default: return false;
  }
};
const crashPoint = () => {
  const r = Math.random();
  return clampN(Math.floor(97 / (1 - r)) / 100, 1, 500);
};

/* ---------------------------- hooks ---------------------------- */

// Web Audio synth: no audio files, created lazily after the first user gesture
function useSound(enabled) {
  const enabledRef = useRef(enabled);
  const ctxRef = useRef(null);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  return useMemo(() => {
    const ctx = () => {
      if (!enabledRef.current) return null;
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctxRef.current = new AC();
      }
      if (ctxRef.current.state === "suspended") ctxRef.current.resume();
      return ctxRef.current;
    };
    const tone = (c, { f, to, at = 0, dur = 0.12, type = "sine", vol = 0.08 }) => {
      const t0 = c.currentTime + at;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };
    return {
      click() {
        const c = ctx();
        if (c) tone(c, { f: 1500, to: 700, dur: 0.05, type: "triangle", vol: 0.06 });
      },
      deal() {
        const c = ctx();
        if (!c) return;
        const len = Math.floor(c.sampleRate * 0.035);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = c.createBufferSource();
        const band = c.createBiquadFilter();
        const g = c.createGain();
        band.type = "bandpass";
        band.frequency.value = 2600;
        band.Q.value = 1.4;
        g.gain.value = 0.7;
        src.buffer = buf;
        src.connect(band).connect(g).connect(c.destination);
        src.start();
      },
      win() {
        const c = ctx();
        if (c) [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, { f, at: i * 0.1, dur: 0.4, vol: 0.07 }));
      },
      lose() {
        const c = ctx();
        if (c) tone(c, { f: 220, to: 85, dur: 0.45, type: "sawtooth", vol: 0.035 });
      },
    };
  }, []);
}

// Timeouts scheduled through this helper are cleared on unmount
function useTimers() {
  const ids = useRef([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return useCallback((fn, ms) => { ids.current.push(setTimeout(fn, ms)); }, []);
}

/* ---------------------------- shared UI ---------------------------- */

function Chip({ value, size = 46, active = false }) {
  const [a, b] = CHIP_COLORS[value] || ["#64748b", "#334155"];
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `repeating-conic-gradient(${a} 0deg 15deg, #f8fafc 15deg 22.5deg)`,
        boxShadow: active ? "0 0 0 2px #fde68a, 0 6px 14px #000a" : "0 4px 10px #0009",
      }}
    >
      <span
        className="grid place-items-center rounded-full font-black text-white"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          background: `radial-gradient(circle at 35% 30%, #ffffff55, transparent 45%), ${b}`,
          border: "2px dashed #ffffffcc",
          fontSize: size * 0.22,
          textShadow: "0 1px 2px #000",
        }}
      >
        {value}
      </span>
    </span>
  );
}

function ChipRail({ value, onPick, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {CHIP_VALUES.map(v => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => onPick(v)}
          aria-label={`Chip ${v}`}
          className={`rounded-full transition-transform disabled:opacity-40 ${v === value ? "-translate-y-1 scale-110" : ""}`}
        >
          <Chip value={v} active={v === value} />
        </button>
      ))}
    </div>
  );
}

function AmountControl({ value, onChange, min, max, disabled }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const step = value >= 500 ? 100 : value >= 100 ? 50 : 10;
  const set = v => onChange(clampN(Math.round(v), min, max));

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={STEP_BTN} disabled={disabled} onClick={() => set(value - step)} aria-label="Decrease bet">
        <Minus size={18} />
      </button>
      <label className="flex flex-1 items-center rounded-xl border border-amber-500/60 bg-black px-3 py-2 focus-within:border-amber-300">
        <span className="mr-1 font-black text-amber-300">₹</span>
        <input
          type="number"
          inputMode="numeric"
          disabled={disabled}
          placeholder="Other ₹"
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            const n = Math.floor(Number(e.target.value));
            if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => {
            const n = Math.floor(Number(draft));
            const v = clampN(Number.isFinite(n) ? n : value, min, max);
            onChange(v);
            setDraft(String(v));
          }}
          onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="w-full min-w-0 bg-transparent text-lg font-black text-white outline-none placeholder:text-zinc-500 disabled:opacity-50"
        />
      </label>
      <button type="button" className={STEP_BTN} disabled={disabled} onClick={() => set(value + step)} aria-label="Increase bet">
        <Plus size={18} />
      </button>
    </div>
  );
}

function Notice({ text }) {
  if (!text) return null;
  return <p className="mt-2 text-center text-xs font-semibold text-amber-100/85">{text}</p>;
}

/* ============================================================
   AVIATOR
   ============================================================ */

function Aviator({ credit, debit, sfx }) {
  const later = useTimers();
  const [min, max] = LIMITS.aviator;
  const [phase, setPhase] = useState("wait");     // wait | fly | crash
  const [count, setCount] = useState(5);
  const [elapsed, setElapsed] = useState(0);
  const [crashAt, setCrashAt] = useState(1);
  const [bet, setBet] = useState(null);
  const [amount, setAmount] = useState(100);
  const [autoOn, setAutoOn] = useState(false);
  const [autoAt, setAutoAt] = useState("2.00");
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState("");
  const betRef = useRef(null);
  const crashRef = useRef(1);
  const startRef = useRef(0);
  const autoRef = useRef({ on: false, at: 2 });

  useEffect(() => {
    autoRef.current = { on: autoOn, at: Math.max(1.01, parseFloat(autoAt) || 2) };
  }, [autoOn, autoAt]);

  // Countdown while waiting for takeoff
  useEffect(() => {
    if (phase !== "wait") return;
    const id = setInterval(() => setCount(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Takeoff when the countdown reaches zero
  useEffect(() => {
    if (phase === "wait" && count <= 0) {
      crashRef.current = crashPoint();
      startRef.current = performance.now();
      setCrashAt(crashRef.current);
      setElapsed(0);
      setPhase("fly");
    }
  }, [phase, count]);

  const cashOut = m => {
    const b = betRef.current;
    if (!b || b.cashed || b.lost) return;
    const payout = round2(b.amt * m);
    credit(payout);
    const done = { ...b, cashed: true, payout };
    betRef.current = done;
    setBet(done);
    sfx.win();
    setMsg(`Cashed out at ${m.toFixed(2)}x · +${fmt(payout - b.amt)}`);
  };

  const crashNow = () => {
    const cp = crashRef.current;
    setElapsed(Math.log(cp) / GROWTH);
    setPhase("crash");
    const b = betRef.current;
    if (b && !b.cashed) {
      const lost = { ...b, lost: true };
      betRef.current = lost;
      setBet(lost);
      sfx.lose();
    }
    setHistory(h => [cp, ...h].slice(0, 12));
    setMsg(b && !b.cashed ? `Flew away — lost ${fmt(b.amt)}` : "Round over");
    later(() => {
      betRef.current = null;
      setBet(null);
      setMsg("");
      setCount(5);
      setPhase("wait");
    }, 3200);
  };

  // Flight loop: updates elapsed time, checks crash point and auto cash-out
  useEffect(() => {
    if (phase !== "fly") return;
    let raf;
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000;
      const m = Math.exp(GROWTH * t);
      if (m >= crashRef.current) { crashNow(); return; }
      const b = betRef.current;
      if (b && !b.cashed && !b.lost && autoRef.current.on && m >= autoRef.current.at) cashOut(autoRef.current.at);
      setElapsed(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const placeBet = () => {
    if (phase !== "wait" || betRef.current) return;
    if (!debit(amount)) { setMsg("Insufficient balance"); return; }
    const b = { amt: amount, cashed: false, lost: false };
    betRef.current = b;
    setBet(b);
    sfx.click();
    setMsg("Bet placed for the next takeoff");
  };

  const mult = phase === "fly" ? Math.exp(GROWTH * elapsed) : phase === "crash" ? crashAt : 1;
  const shown = Math.floor(mult * 100) / 100;
  const canEdit = phase === "wait" && !bet;

  // Curve geometry (viewBox 320 x 170)
  const W = 320, H = 170;
  const T = Math.max(6, elapsed);
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const s = (elapsed * i) / 48;
    const m = Math.exp(GROWTH * s);
    pts.push([12 + (s / T) * (W - 34), H - 14 - (H - 40) * ((m - 1) / (m - 1 + 4))]);
  }
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - 14} L12 ${H - 14} Z`;
  const [px, py] = pts[pts.length - 1];
  const [qx, qy] = pts[pts.length - 2];
  const heading = (Math.atan2(py - qy, px - qx) * 180) / Math.PI;

  const status = phase === "wait"
    ? { text: `WAITING · ${Math.max(0, count)}s`, cls: "text-amber-200" }
    : phase === "fly"
      ? { text: "FLYING", cls: "text-emerald-300" }
      : { text: `FLEW AWAY AT ${crashAt.toFixed(2)}x`, cls: "text-rose-400" };

  const cashing = phase === "fly" && bet && !bet.cashed && !bet.lost;
  let action;
  if (cashing) {
    action = { text: `CASH OUT ${fmt(bet.amt * shown)}`, run: () => cashOut(shown), tone: ORANGE };
  } else if (phase === "wait") {
    action = bet
      ? { text: "BET PLACED", run: null, tone: GREEN }
      : { text: `BET ${fmt(amount)}`, run: placeBet, tone: GREEN };
  } else if (bet && bet.cashed) {
    action = { text: `CASHED OUT ${fmt(bet.payout)}`, run: null, tone: GREEN };
  } else {
    action = { text: "WAIT FOR NEXT ROUND", run: null, tone: GREEN };
  }

  return (
    <div className="space-y-4">
      <div className="relative h-64 overflow-hidden rounded-3xl border border-amber-900/50 bg-[radial-gradient(ellipse_at_bottom_left,#1e293b,#020617_70%)]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="avLine" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#22c55e" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="avArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" stopOpacity=".35" />
              <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#avArea)" />
          <path
            d={line}
            fill="none"
            stroke="url(#avLine)"
            strokeWidth="3.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ filter: "drop-shadow(0 0 6px #fbbf24)" }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className={`text-6xl font-black tabular-nums transition-transform duration-150 ${phase === "crash" ? "text-rose-500" : "text-white"}`}
            style={{
              transform: `scale(${1 + Math.min(0.15, (shown - 1) * 0.015)})`,
              textShadow: phase === "crash" ? "0 0 22px #e11d48" : "0 0 22px #fbbf2466",
            }}
          >
            {shown.toFixed(2)}x
          </div>
        </div>

        {phase === "fly" && (
          <div
            className="absolute"
            style={{ left: `${(px / W) * 100}%`, top: `${(py / H) * 100}%`, transform: `translate(-50%, -50%) rotate(${heading + 45}deg)` }}
          >
            <Plane size={34} className="fill-amber-100/20 text-amber-200 drop-shadow-[0_0_10px_#fde68a]" />
          </div>
        )}

        <div className={`absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-black tracking-widest ${status.cls}`}>
          {status.text}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {history.map((h, i) => (
          <span
            key={i}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${h >= 2 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      <div className={PANEL}>
        <ChipRail value={amount} onPick={setAmount} disabled={!canEdit} />
        <div className="mt-3">
          <AmountControl value={amount} onChange={setAmount} min={min} max={max} disabled={!canEdit} />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-black/40 px-3 py-2">
          <label className="flex items-center gap-2 text-sm font-bold text-amber-100">
            <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={autoOn} onChange={e => setAutoOn(e.target.checked)} />
            Auto x
          </label>
          <input
            type="number"
            step="0.01"
            min="1.01"
            value={autoAt}
            disabled={!autoOn}
            onChange={e => setAutoAt(e.target.value)}
            onBlur={() => {
              const v = parseFloat(autoAt);
              setAutoAt(Number.isFinite(v) && v >= 1.01 ? v.toFixed(2) : "2.00");
            }}
            className="w-24 rounded-lg border border-amber-500/50 bg-black px-2 py-1 text-right font-black text-white outline-none disabled:opacity-40"
          />
        </div>

        <button
          type="button"
          onClick={action.run || undefined}
          disabled={!action.run}
          className={`${ACTION} mt-3 ${action.tone}`}
        >
          {action.text}
        </button>
        <Notice text={msg} />
      </div>
    </div>
  );
}

/* ============================================================
   AUTO ROULETTE
   ============================================================ */

function Roulette({ credit, debit, sfx }) {
  const [min, max] = LIMITS.roulette;
  const [phase, setPhase] = useState("bet");      // bet | spin | result
  const [secs, setSecs] = useState(BET_SECS);
  const [rot, setRot] = useState(0);
  const [ball, setBall] = useState(0);
  const [pending, setPendingState] = useState([]);
  const [locked, setLockedState] = useState([]);
  const [recent, setRecent] = useState([]);
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState("");
  const pendRef = useRef([]);
  const lockRef = useRef([]);
  const resultRef = useRef(0);

  const setPending = list => { pendRef.current = list; setPendingState(list); };
  const setLocked = list => { lockRef.current = list; setLockedState(list); };
  const canBet = phase === "bet";

  const totals = {};
  [...locked, ...pending].forEach(b => { totals[b.key] = (totals[b.key] || 0) + b.amt; });

  // Betting countdown
  useEffect(() => {
    if (phase !== "bet") return;
    const id = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Close betting and lock pending bets
  useEffect(() => {
    if (phase === "bet" && secs <= 0) {
      setLocked([...lockRef.current, ...pendRef.current]);
      setPending([]);
      setPhase("spin");
    }
  }, [phase, secs]);

  // Pick the winning pocket and animate wheel and ball
  useEffect(() => {
    if (phase !== "spin") return;
    const k = rand(37);
    resultRef.current = ORDER[k];
    setRot(r => r + 360 * 6 + mod(-k * SEG - r, 360));
    setBall(b => b - 360 * 8 - mod(b, 360));
    const id = setTimeout(() => setPhase("result"), 6200);
    return () => clearTimeout(id);
  }, [phase]);

  // Settle the round
  useEffect(() => {
    if (phase !== "result") return;
    const n = resultRef.current;
    const bets = lockRef.current;
    const stake = sumAmt(bets);
    const ret = round2(bets.reduce((s, b) => s + (hitKey(b.key, n) ? b.amt * grossOf(b.key) : 0), 0));
    if (ret > 0) { credit(ret); sfx.win(); } else if (stake > 0) { sfx.lose(); }
    const net = round2(ret - stake);
    setRecent(r => [n, ...r].slice(0, 12));
    setMsg(
      stake === 0
        ? `Ball landed on ${n} ${colorName(n)}`
        : `${n} ${colorName(n)} — ${net >= 0 ? `won ${fmt(net)}` : `lost ${fmt(-net)}`}`
    );
    setLocked([]);
    const id = setTimeout(() => { setSecs(BET_SECS); setPhase("bet"); }, 3200);
    return () => clearTimeout(id);
  }, [phase]);

  const place = key => {
    if (!canBet) { setMsg("Bets are closed for this spin"); return; }
    const current = [...lockRef.current, ...pendRef.current].reduce((s, b) => s + (b.key === key ? b.amt : 0), 0);
    if (current + amount > max) { setMsg(`Max ${fmt(max)} per spot`); return; }
    if (!debit(amount)) { setMsg("Insufficient balance"); return; }
    setPending([...pendRef.current, { key, amt: amount }]);
    setMsg("");
    sfx.click();
  };

  const undo = () => {
    if (!canBet || !pendRef.current.length) return;
    const list = pendRef.current;
    credit(list[list.length - 1].amt);
    setPending(list.slice(0, -1));
    sfx.click();
  };

  const double = () => {
    if (!canBet) return;
    const list = pendRef.current;
    const cost = sumAmt(list);
    if (!cost) return;
    if (!debit(cost)) { setMsg("Insufficient balance"); return; }
    setPending([...list, ...list.map(b => ({ ...b }))]);
    sfx.click();
  };

  const clear = () => {
    if (!canBet) return;
    const cost = sumAmt(pendRef.current);
    if (!cost) return;
    credit(cost);
    setPending([]);
    sfx.click();
  };

  const apply = () => {
    if (!canBet || !pendRef.current.length) return;
    setLocked([...lockRef.current, ...pendRef.current]);
    setPending([]);
    setMsg("Bets locked in");
    sfx.click();
  };

  const spot = (key, label, bg, gridColumn, gridRow) => (
    <button
      key={key}
      type="button"
      onClick={() => place(key)}
      className="relative flex h-9 items-center justify-center rounded-md border border-white/15 text-[11px] font-black text-white transition active:scale-95"
      style={{ background: bg, gridColumn, gridRow }}
    >
      {label}
      {totals[key] > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-amber-300 px-1 text-[9px] font-black leading-4 text-black">
          {totals[key]}
        </span>
      )}
    </button>
  );

  const pendingTotal = sumAmt(pending);
  const lockedTotal = sumAmt(locked);

  return (
    <div className="space-y-4">
      {/* Live wheel */}
      <div className="relative mx-auto aspect-square w-72">
        <div
          className="absolute left-1/2 -top-1 z-20 -translate-x-1/2"
          style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "18px solid #fcd34d", filter: "drop-shadow(0 2px 2px #000)" }}
        />
        <svg
          viewBox="0 0 300 300"
          className="absolute inset-0 h-full w-full drop-shadow-2xl"
          style={{ transform: `rotate(${rot}deg)`, transition: "transform 6s cubic-bezier(.15,.7,.1,1)" }}
        >
          <circle cx="150" cy="150" r="148" fill="#2a1507" stroke="#d4af37" strokeWidth="4" />
          {ORDER.map((n, i) => (
            <path key={`w${n}`} d={wedge(70, 140, i * SEG - SEG / 2, i * SEG + SEG / 2)} fill={numFill(n)} stroke="#d4af37" strokeWidth=".7" />
          ))}
          {ORDER.map((n, i) => {
            const [x, y] = polar(122, i * SEG);
            return (
              <text key={`t${n}`} x={x} y={y} fill="#fff" fontSize="9" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * SEG} ${x} ${y})`}>
                {n}
              </text>
            );
          })}
          <circle cx="150" cy="150" r="66" fill="#3b1f0c" stroke="#facc15" strokeWidth="3" />
          <circle cx="150" cy="150" r="46" fill="#7f1d1d" opacity=".6" />
        </svg>

        <div className="pointer-events-none absolute inset-0" style={{ transform: `rotate(${ball}deg)`, transition: "transform 6s cubic-bezier(.12,.6,.2,1)" }}>
          <span className="absolute left-1/2 top-[14px] h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          {phase === "bet" && (
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums text-amber-200">{Math.max(0, secs)}</div>
              <div className="text-[10px] tracking-widest text-amber-100/70">PLACE BETS</div>
            </div>
          )}
          {phase === "spin" && <div className="text-xs font-black tracking-widest text-amber-100">NO MORE BETS</div>}
          {phase === "result" && (
            <div className="rounded-full px-3 py-1 text-lg font-black text-white shadow-[0_0_14px_#000]" style={{ background: numFill(resultRef.current) }}>
              {resultRef.current}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {recent.map((n, i) => (
          <span key={i} className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-black text-white" style={{ background: numFill(n) }}>
            {n}
          </span>
        ))}
      </div>

      {/* Full betting grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: "34px repeat(12, minmax(0,1fr)) 40px" }}>
        <button
          type="button"
          onClick={() => place("n:0")}
          className="relative flex items-center justify-center rounded-md border border-white/15 text-[11px] font-black text-white active:scale-95"
          style={{ background: numFill(0), gridColumn: "1", gridRow: "1 / span 3" }}
        >
          0
          {totals["n:0"] > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-300 px-1 text-[9px] font-black leading-4 text-black">{totals["n:0"]}</span>
          )}
        </button>

        {[0, 1, 2].map(r =>
          Array.from({ length: 12 }, (_, c) => {
            const n = 3 * c + (3 - r);
            return spot(`n:${n}`, n, numFill(n), `${c + 2}`, `${r + 1}`);
          })
        )}

        {[0, 1, 2].map(r => spot(`c:${3 - r}`, "2:1", "#1f2937", "14", `${r + 1}`))}

        {spot("d:1", "1st 12", "#14532d", "2 / span 4", "4")}
        {spot("d:2", "2nd 12", "#14532d", "6 / span 4", "4")}
        {spot("d:3", "3rd 12", "#14532d", "10 / span 4", "4")}

        {spot("low", "1-18", "#1f2937", "2 / span 2", "5")}
        {spot("even", "EVEN", "#1f2937", "4 / span 2", "5")}
        {spot("red", "RED", "#b91c1c", "6 / span 2", "5")}
        {spot("black", "BLACK", "#111318", "8 / span 2", "5")}
        {spot("odd", "ODD", "#1f2937", "10 / span 2", "5")}
        {spot("high", "19-36", "#1f2937", "12 / span 2", "5")}
      </div>

      {/* Chip panel */}
      <div className={PANEL}>
        <ChipRail value={amount} onPick={setAmount} disabled={!canBet} />
        <div className="mt-3">
          <AmountControl value={amount} onChange={setAmount} min={min} max={max} disabled={!canBet} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <button type="button" onClick={undo} disabled={!canBet || !pending.length} className={TOOL}><Undo2 size={15} />Undo</button>
          <button type="button" onClick={double} disabled={!canBet || !pending.length} className={TOOL}>2×</button>
          <button type="button" onClick={clear} disabled={!canBet || !pending.length} className={TOOL}><X size={15} />Clear</button>
          <button type="button" onClick={apply} disabled={!canBet || !pending.length} className={TOOL}><Check size={15} />Apply</button>
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-amber-100/70">
          <span>Pending {fmt(pendingTotal)}</span>
          <span>Locked {fmt(lockedTotal)}</span>
        </div>
        <Notice text={msg} />
      </div>
    </div>
  );
}

/* ============================================================
   DRAGON TIGER
   ============================================================ */

const draw = () => ({ r: 1 + rand(13), s: rand(4) });

function PlayingCard({ card, flipped }) {
  const red = card && (card.s === 1 || card.s === 2);
  const face = card ? RANKS[card.r] : "";
  const suit = card ? SUITS[card.s] : "";
  return (
    <div className="h-28 w-20" style={{ perspective: 800 }}>
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <div
          className="absolute inset-0 rounded-xl border-2 border-amber-200 shadow-[0_6px_14px_#000a]"
          style={{ backfaceVisibility: "hidden", background: "repeating-linear-gradient(45deg,#1e3a8a 0 6px,#1d4ed8 6px 12px)" }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-xl bg-white p-1.5 shadow-[0_6px_14px_#000a]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", color: red ? "#b91c1c" : "#111" }}
        >
          <span className="text-base font-black leading-none">{face}</span>
          <span className="text-center text-3xl leading-none">{suit}</span>
          <span className="self-start rotate-180 text-base font-black leading-none">{face}</span>
        </div>
      </div>
    </div>
  );
}

function Side({ title, card, flipped, win }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`rounded-full px-3 py-1 text-[11px] font-black tracking-widest ${win ? "bg-amber-300 text-black" : "bg-black/40 text-amber-100/80"}`}>
        {title}{flipped && card ? ` · ${RANKS[card.r]}` : ""}
      </div>
      <PlayingCard card={card} flipped={flipped} />
    </div>
  );
}

function Bead({ o }) {
  const bg = o.outcome === "dragon" ? "#dc2626" : o.outcome === "tiger" ? "#2563eb" : "#16a34a";
  const label = o.outcome === "dragon" ? "D" : o.outcome === "tiger" ? "T" : "=";
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-black text-white"
      style={{ background: bg, boxShadow: o.suited ? "0 0 0 2px #fde68a" : "none" }}
    >
      {label}
    </span>
  );
}

const DT_ZONES = [
  { key: "dragon", title: "DRAGON", odds: "1 : 1", cls: "from-rose-700 to-red-900" },
  { key: "tie", title: "TIE", odds: "11 : 1", cls: "from-emerald-700 to-emerald-900" },
  { key: "tiger", title: "TIGER", odds: "1 : 1", cls: "from-sky-700 to-blue-900" },
];

function DragonTiger({ credit, debit, sfx }) {
  const later = useTimers();
  const [min, max] = LIMITS.dragon;
  const [amount, setAmount] = useState(100);
  const [phase, setPhase] = useState("bet");       // bet | dealing | done
  const [bets, setBets] = useState({});
  const [cards, setCards] = useState({ d: null, t: null });
  const [flip, setFlip] = useState({ d: false, t: false });
  const [last, setLast] = useState(null);
  const [beads, setBeads] = useState([]);
  const [msg, setMsg] = useState("");

  const total = Object.values(bets).reduce((s, v) => s + v, 0);
  const canBet = phase === "bet";

  const stake = key => {
    if (!canBet) return;
    const cur = bets[key] || 0;
    if (cur + amount > max) { setMsg(`Max ${fmt(max)} per zone`); return; }
    if (!debit(amount)) { setMsg("Insufficient balance"); return; }
    setBets(b => ({ ...b, [key]: (b[key] || 0) + amount }));
    setMsg("");
    sfx.click();
  };

  const clearBets = () => {
    if (!canBet || !total) return;
    credit(total);
    setBets({});
    sfx.click();
  };

  const settle = (d, t, placed) => {
    const tie = d.r === t.r;
    const suited = tie && d.s === t.s;
    const outcome = tie ? "tie" : d.r > t.r ? "dragon" : "tiger";
    const ret =
      (placed.dragon || 0) * (outcome === "dragon" ? 2 : outcome === "tie" ? 1 : 0) +
      (placed.tiger || 0) * (outcome === "tiger" ? 2 : outcome === "tie" ? 1 : 0) +
      (placed.tie || 0) * (tie ? 12 : 0) +
      (placed.suited || 0) * (suited ? 51 : 0);
    const staked = Object.values(placed).reduce((s, v) => s + v, 0);
    const payout = round2(ret);
    if (payout > 0) credit(payout);
    const net = round2(payout - staked);
    setLast({ outcome, suited, net });
    setBeads(b => [{ outcome, suited }, ...b].slice(0, 30));
    setMsg(net >= 0 ? `You won ${fmt(net)}` : `You lost ${fmt(-net)}`);
    if (net > 0) sfx.win(); else sfx.lose();
    setPhase("done");
  };

  const deal = () => {
    if (!canBet || total === 0) return;
    const d = draw(), t = draw();
    const placed = { ...bets };
    setCards({ d, t });
    setFlip({ d: false, t: false });
    setLast(null);
    setMsg("");
    setPhase("dealing");
    sfx.deal();
    later(() => { setFlip(f => ({ ...f, d: true })); sfx.deal(); }, 600);
    later(() => { setFlip(f => ({ ...f, t: true })); sfx.deal(); }, 1300);
    later(() => settle(d, t, placed), 2000);
  };

  const newRound = () => {
    setBets({});
    setCards({ d: null, t: null });
    setFlip({ d: false, t: false });
    setLast(null);
    setMsg("");
    setPhase("bet");
  };

  const resultText = last
    ? last.outcome === "tie"
      ? (last.suited ? "SUITED TIE · 50 : 1" : "TIE")
      : last.outcome === "dragon" ? "DRAGON WINS" : "TIGER WINS"
    : phase === "dealing" ? "Dealing…" : "Place your bets";

  const zoneBtn = (z, extra = "") => (
    <button
      key={z.key}
      type="button"
      onClick={() => stake(z.key)}
      disabled={!canBet}
      className={`relative flex flex-col items-center rounded-2xl border border-white/15 bg-gradient-to-b p-3 text-white transition active:scale-95 disabled:opacity-80 ${z.cls} ${extra}`}
    >
      <span className="text-xs font-black tracking-widest">{z.title}</span>
      <span className="mt-0.5 text-[11px] text-white/75">{z.odds}</span>
      {bets[z.key] > 0 && (
        <span className="mt-2 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-black text-black">{fmt(bets[z.key])}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] border-4 border-[#5b3a1e] p-4 shadow-[inset_0_0_40px_#000a,0_12px_30px_#000]" style={{ background: FELT }}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Side title="DRAGON" card={cards.d} flipped={flip.d} win={last?.outcome === "dragon"} />
          <div className="text-center text-xs font-black tracking-widest text-amber-200/80">VS</div>
          <Side title="TIGER" card={cards.t} flipped={flip.t} win={last?.outcome === "tiger"} />
        </div>
        <div className="mt-3 h-6 text-center text-sm font-black tracking-wide text-amber-200">{resultText}</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DT_ZONES.map(z => zoneBtn(z))}
      </div>
      <div className="grid grid-cols-1">
        {zoneBtn({ key: "suited", title: "SUITED TIE", odds: "50 : 1", cls: "from-amber-500 to-amber-800" }, "flex-row justify-center gap-3")}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
        {beads.length === 0 && <span className="text-[11px] text-amber-100/50">Bead plate will fill as rounds are played</span>}
        {[...beads].reverse().map((o, i) => <Bead key={i} o={o} />)}
      </div>

      <div className={PANEL}>
        <ChipRail value={amount} onPick={setAmount} disabled={!canBet} />
        <div className="mt-3">
          <AmountControl value={amount} onChange={setAmount} min={min} max={max} disabled={!canBet} />
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={clearBets} disabled={!canBet || !total} className={TOOL}><X size={15} />Clear</button>
          {phase === "done" ? (
            <button type="button" onClick={newRound} className={`${ACTION} ${GREEN}`}>NEW ROUND</button>
          ) : (
            <button type="button" onClick={deal} disabled={!canBet || total === 0} className={`${ACTION} ${ORANGE}`}>
              {phase === "dealing" ? "DEALING…" : `DEAL · ${fmt(total)}`}
            </button>
          )}
        </div>
        <Notice text={msg} />
      </div>
    </div>
  );
}

/* ============================================================
   VORTEX
   ============================================================ */

function Vortex({ credit, debit, sfx }) {
  const later = useTimers();
  const [min, max] = LIMITS.vortex;
  const [amount, setAmount] = useState(50);
  const [stake, setStake] = useState(0);
  const [phase, setPhase] = useState("idle");       // idle | holding | spinning | busted
  const [note, setNote] = useState("Hold the button to spin the vortex");
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const ang = useRef({ o: 0, i: 0 });
  const vel = useRef(0);
  const frame = useRef(0);
  const lastT = useRef(0);
  const stakeRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const paint = (o, i, transition) => {
    if (outerRef.current) {
      outerRef.current.style.transition = transition;
      outerRef.current.style.transform = `rotate(${o}deg)`;
    }
    if (innerRef.current) {
      innerRef.current.style.transition = transition;
      innerRef.current.style.transform = `rotate(${i}deg)`;
    }
  };

  const resolve = (label, innerM) => {
    const outer = parseFloat(label);
    const total = round2(outer * innerM);
    if (total <= 0) {
      stakeRef.current = 0;
      setStake(0);
      setPhase("busted");
      setNote(`${label} — busted`);
      sfx.lose();
      later(() => { setPhase("idle"); setNote("Hold to spin again"); }, 1600);
      return;
    }
    const next = round2(stakeRef.current * total);
    stakeRef.current = next;
    setStake(next);
    setPhase("idle");
    setNote(`${label} × bonus ${innerM}x = ${total}x`);
    sfx.win();
  };

  const startHold = () => {
    if (phase !== "idle") return;
    if (stakeRef.current === 0) {
      if (!debit(amount)) { setNote("Insufficient balance"); return; }
      stakeRef.current = amount;
      setStake(amount);
    }
    sfx.click();
    setPhase("holding");
    setNote("Release to stop the vortex");
    vel.current = 240;
    lastT.current = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - lastT.current) / 1000);
      lastT.current = now;
      vel.current = Math.min(1500, vel.current + 900 * dt);
      ang.current = {
        o: mod(ang.current.o + vel.current * dt, 360),
        i: mod(ang.current.i - vel.current * 1.7 * dt, 360),
      };
      paint(ang.current.o, ang.current.i, "none");
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  };

  const endHold = () => {
    if (phase !== "holding") return;
    cancelAnimationFrame(frame.current);

    let pick = VORTEX_TABLE[VORTEX_TABLE.length - 1];
    const roll = Math.random();
    let acc = 0;
    for (const e of VORTEX_TABLE) {
      acc += e.p;
      if (roll < acc) { pick = e; break; }
    }
    const slots = VORTEX_RING.map((l, idx) => (l === pick.label ? idx : -1)).filter(idx => idx >= 0);
    const j = slots[rand(slots.length)];
    const k = rand(INNER_MULTS.length);

    const curO = ang.current.o, curI = ang.current.i;
    const tO = curO + 1440 + mod(-(j * 30 + 15) - curO, 360);
    const tI = curI - 1080 - mod(curI + (k * 60 + 30), 360);
    ang.current = { o: tO, i: tI };
    if (outerRef.current) outerRef.current.getBoundingClientRect(); // flush before transitioning
    paint(tO, tI, "transform 2.8s cubic-bezier(.12,.7,.08,1)");

    setPhase("spinning");
    setNote("Spinning…");
    later(() => resolve(pick.label, INNER_MULTS[k]), 2900);
  };

  const partPayout = () => {
    if (phase !== "idle" || stakeRef.current <= 0) return;
    const half = round2(stakeRef.current / 2);
    const rest = round2(stakeRef.current - half);
    credit(half);
    stakeRef.current = rest;
    setStake(rest);
    sfx.click();
    setNote(`Paid out ${fmt(half)} · ${fmt(rest)} still in play`);
  };

  const cashOut = () => {
    if (phase !== "idle" || stakeRef.current <= 0) return;
    const out = stakeRef.current;
    credit(out);
    stakeRef.current = 0;
    setStake(0);
    sfx.win();
    setNote(`Cashed out ${fmt(out)}`);
  };

  const locked = stake > 0 || phase !== "idle";
  const holdText =
    phase === "holding" ? "RELEASE TO STOP"
      : phase === "spinning" ? "SPINNING…"
        : phase === "busted" ? "BUSTED"
          : stake > 0 ? "HOLD TO SPIN"
            : `HOLD TO SPIN · ${fmt(amount)}`;

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-72 select-none">
        <div
          className="absolute left-1/2 -top-1 z-20 -translate-x-1/2"
          style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "20px solid #fcd34d", filter: "drop-shadow(0 2px 3px #000)" }}
        />
        <svg ref={outerRef} viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" style={{ transformOrigin: "50% 50%" }}>
          <circle cx="150" cy="150" r="148" fill="#14081f" stroke="#d4af37" strokeWidth="4" />
          {VORTEX_RING.map((label, j) => {
            const a1 = j * 30, a2 = a1 + 30;
            const [x, y] = polar(120, a1 + 15);
            return (
              <g key={`o${j}`}>
                <path d={wedge(96, 140, a1, a2)} fill={VORTEX_COLORS[label]} stroke="#d4af37" strokeWidth=".8" />
                <text x={x} y={y} fill="#fff" fontSize="11" fontWeight="900" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${a1 + 15} ${x} ${y})`}>
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
        <svg ref={innerRef} viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" style={{ transformOrigin: "50% 50%" }}>
          {INNER_MULTS.map((m, k) => {
            const a1 = k * 60, a2 = a1 + 60;
            const [x, y] = polar(72, a1 + 30);
            return (
              <g key={`i${k}`}>
                <path d={wedge(50, 92, a1, a2)} fill={k % 2 ? "#7c2d12" : "#831843"} stroke="#fde68a" strokeWidth="1" />
                <text x={x} y={y} fill="#fde68a" fontSize="12" fontWeight="900" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${a1 + 30} ${x} ${y})`}>
                  {`×${m}`}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-[32%] grid place-items-center rounded-full border-2 border-amber-300 bg-black/80 text-center shadow-[0_0_24px_#fbbf2488]">
          <div>
            <div className="text-[10px] tracking-widest text-amber-200/80">LIVE STAKE</div>
            <div className="text-sm font-black tabular-nums text-white">{fmt(stake)}</div>
          </div>
        </div>
      </div>

      <div className={PANEL}>
        <ChipRail value={amount} onPick={setAmount} disabled={locked} />
        <div className="mt-3">
          <AmountControl value={amount} onChange={setAmount} min={min} max={max} disabled={locked} />
        </div>

        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={e => e.preventDefault()}
          disabled={phase === "spinning" || phase === "busted"}
          className={`${ACTION} mt-3 touch-none ${phase === "holding" ? ORANGE : GREEN}`}
        >
          <span className="inline-flex items-center justify-center gap-2"><Hand size={18} />{holdText}</span>
        </button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={partPayout} disabled={phase !== "idle" || stake <= 0} className={TOOL}>PART PAYOUT</button>
          <button type="button" onClick={cashOut} disabled={phase !== "idle" || stake <= 0} className={TOOL}>CASH OUT</button>
        </div>
        <Notice text={note} />
      </div>
    </div>
  );
}

/* ============================================================
   MINES
   ============================================================ */

function Mines({ credit, debit, sfx }) {
  const [min, max] = LIMITS.mines;
  const [amount, setAmount] = useState(50);
  const [mineCount, setMineCount] = useState(3);
  const [phase, setPhase] = useState("idle");       // idle | live | lost | cashed
  const [mines, setMines] = useState(() => new Set());
  const [opened, setOpened] = useState(() => new Set());
  const [stakeLive, setStakeLive] = useState(0);
  const [msg, setMsg] = useState("");

  const k = opened.size;
  const mult = k ? multFor(k, mineCount) : 1;
  const nextMult = multFor(k + 1, mineCount);
  const live = phase === "live";
  const ended = phase === "lost" || phase === "cashed";

  const reset = () => {
    setPhase("idle");
    setOpened(new Set());
    setMines(new Set());
    setMsg("");
  };

  const start = () => {
    if (!debit(amount)) { setMsg("Insufficient balance"); return; }
    const order = Array.from({ length: 25 }, (_, i) => i);
    for (let i = 24; i > 0; i--) {
      const j = rand(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    setMines(new Set(order.slice(0, mineCount)));
    setOpened(new Set());
    setStakeLive(amount);
    setPhase("live");
    setMsg("Find the gems and avoid the bombs");
    sfx.click();
  };

  const reveal = idx => {
    if (!live || opened.has(idx)) return;
    if (mines.has(idx)) {
      setPhase("lost");
      sfx.lose();
      setMsg(`Boom! Lost ${fmt(stakeLive)}`);
      return;
    }
    const next = new Set(opened);
    next.add(idx);
    setOpened(next);
    sfx.click();
    if (next.size === 25 - mineCount) {
      const payout = round2(stakeLive * multFor(next.size, mineCount));
      credit(payout);
      setPhase("cashed");
      sfx.win();
      setMsg(`Board cleared! Paid ${fmt(payout)}`);
    }
  };

  const cashOut = () => {
    if (!live || k === 0) return;
    const payout = round2(stakeLive * mult);
    credit(payout);
    setPhase("cashed");
    sfx.win();
    setMsg(`Cashed out ${fmt(payout)} at ${mult.toFixed(2)}x`);
  };

  const primary = live
    ? k > 0
      ? { text: `CASH OUT ${fmt(stakeLive * mult)}`, run: cashOut, tone: ORANGE }
      : { text: "REVEAL A TILE", run: null, tone: ORANGE }
    : ended
      ? { text: "NEW GAME", run: reset, tone: GREEN }
      : { text: `START · BET ${fmt(amount)}`, run: start, tone: GREEN };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-amber-800/40 bg-black/40 p-2">
          <div className="text-[10px] tracking-widest text-amber-100/60">MULTIPLIER</div>
          <div className="text-xl font-black tabular-nums text-emerald-300">{mult.toFixed(2)}x</div>
        </div>
        <div className="rounded-2xl border border-amber-800/40 bg-black/40 p-2">
          <div className="text-[10px] tracking-widest text-amber-100/60">NEXT</div>
          <div className="text-xl font-black tabular-nums text-amber-200">{live && k < 25 - mineCount ? `${nextMult.toFixed(2)}x` : "—"}</div>
        </div>
        <div className="rounded-2xl border border-amber-800/40 bg-black/40 p-2">
          <div className="text-[10px] tracking-widest text-amber-100/60">GEMS LEFT</div>
          <div className="text-xl font-black tabular-nums text-white">{25 - mineCount - k}</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }, (_, idx) => {
          const isOpen = opened.has(idx);
          const isMine = mines.has(idx);
          let cls = "border border-emerald-900/70 bg-gradient-to-br from-[#1f3b2c] to-[#0a1a11] hover:brightness-125";
          let content = null;
          if (isOpen) {
            cls = "bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-[0_0_14px_#34d39988]";
            content = <Gem size={22} className="text-white" />;
          } else if (ended && isMine) {
            cls = "bg-gradient-to-br from-rose-500 to-red-800";
            content = <Bomb size={20} className="text-white" />;
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={!live || isOpen}
              onClick={() => reveal(idx)}
              className={`grid aspect-square place-items-center rounded-xl transition active:scale-95 disabled:cursor-default ${cls}`}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className={PANEL}>
        <div className="grid grid-cols-4 gap-2">
          {MINE_OPTIONS.map(m => (
            <button
              key={m}
              type="button"
              disabled={live}
              onClick={() => setMineCount(m)}
              className={`rounded-xl py-2 text-xs font-black transition disabled:opacity-50 ${mineCount === m ? "bg-amber-300 text-black" : "border border-amber-700/50 bg-[#16291d] text-amber-100"}`}
            >
              {m} 💣
            </button>
          ))}
        </div>
        <div className="mt-3">
          <ChipRail value={amount} onPick={setAmount} disabled={live} />
        </div>
        <div className="mt-3">
          <AmountControl value={amount} onChange={setAmount} min={min} max={max} disabled={live} />
        </div>
        <button type="button" onClick={primary.run || undefined} disabled={!primary.run} className={`${ACTION} mt-3 ${primary.tone}`}>
          {primary.text}
        </button>
        <Notice text={msg} />
      </div>
    </div>
  );
}

/* ============================================================
   ROOT: navigation, sound toggle, shared balance, footer
   ============================================================ */

export default function Casino({ onLobby }) {
  const [game, setGame] = useState("aviator");
  const [soundOn, setSoundOn] = useState(true);
  const [balance, setBalance] = useState(START_BALANCE);
  const balRef = useRef(START_BALANCE);
  const sfx = useSound(soundOn);

  const credit = useCallback(a => {
    balRef.current = round2(balRef.current + a);
    setBalance(balRef.current);
  }, []);

  const debit = useCallback(a => {
    if (!(a > 0) || a > balRef.current + 1e-6) return false;
    credit(-a);
    return true;
  }, [credit]);

  const shared = { credit, debit, sfx };
  const [minBet, maxBet] = LIMITS[game];

  return (
    <div className="min-h-screen select-none bg-[radial-gradient(ellipse_at_top,#14532d_0%,#052e16_35%,#020c07_100%)] font-sans text-amber-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            onClick={() => (onLobby ? onLobby() : window.history.back())}
            className="rounded-full border border-amber-400/60 bg-black/40 px-4 py-2 text-sm font-black tracking-wide text-amber-200 active:scale-95"
          >
            « Lobby
          </button>
          <button
            type="button"
            onClick={() => setSoundOn(s => !s)}
            aria-label={soundOn ? "Mute sound" : "Unmute sound"}
            className="grid h-10 w-10 place-items-center rounded-full border border-amber-400/60 bg-black/40 text-lg active:scale-95"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GAMES.map(g => {
            const Icon = g.icon;
            const on = g.id === game;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGame(g.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black tracking-wide transition ${
                  on
                    ? "bg-gradient-to-r from-amber-300 to-amber-500 text-black shadow-[0_0_18px_#fbbf2466]"
                    : "border border-white/10 bg-white/5 text-amber-100/80"
                }`}
              >
                <Icon size={15} />
                {g.label}
              </button>
            );
          })}
        </nav>

        {/* Games stay mounted so bets and rounds are never orphaned when switching tabs */}
        <main className="flex-1 px-4 pt-4">
          <div hidden={game !== "aviator"}><Aviator {...shared} /></div>
          <div hidden={game !== "roulette"}><Roulette {...shared} /></div>
          <div hidden={game !== "dragon"}><DragonTiger {...shared} /></div>
          <div hidden={game !== "vortex"}><Vortex {...shared} /></div>
          <div hidden={game !== "mines"}><Mines {...shared} /></div>
        </main>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-amber-500/30 bg-[#04100a]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="text-amber-100/70">Balance</span>
          <span className="text-lg font-black tabular-nums text-emerald-300">{fmt(balance)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-amber-100/60">
          <span>Table limits</span>
          <span className="tabular-nums">{fmt(minBet)} – {fmt(maxBet)}</span>
        </div>
      </footer>
    </div>
  );
}
