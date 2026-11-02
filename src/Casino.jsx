import React, { useEffect, useMemo, useRef, useState } from "react";

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const weightedOutcome = (playerWeight = 0.4, houseWeight = 0.6) => {
  const roll = Math.random();
  if (roll < playerWeight) return "player";
  if (roll < playerWeight + houseWeight) return "house";
  return "draw";
};

const computePayout = (stake, multiplier, outcome = "player") => {
  if (outcome === "player") return Number((stake * (multiplier || 1)).toFixed(2));
  return 0;
};

const GOLD = "#d4af37";
const GREEN = "#1f8f5f";
const DARK = "#07130f";
const SOFT = "#f3f6f4";

const winColor = (n) => {
  if (n === 0) return "#1f8f5f";
  if ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n)) return "#d73b4d";
  return "#1f2430";
};

const makeTone = (ctx, freq, duration = 0.1, type = "sine", gainValue = 0.04) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  const stopAt = ctx.currentTime + duration;
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  osc.stop(stopAt);
};

const buildAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  return new AudioCtor();
};

const createButtonStyle = (variant = "default") => {
  const base = {
    borderRadius: 12,
    padding: "10px 14px",
    border: `1px solid ${GOLD}`,
    background: variant === "primary" ? "linear-gradient(180deg, #f6d76d, #d4af37)" : "#0d1d18",
    color: variant === "primary" ? "#0f172a" : SOFT,
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    transition: "transform 0.12s ease, opacity 0.12s ease",
  };
  return base;
};

const gameCardStyle = (bg) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: 18,
  padding: 16,
  minHeight: 180,
  border: `1px solid ${GOLD}`,
  background: bg,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "flex-start",
  transition: "transform 0.15s ease",
  color: SOFT,
});

function LobbyCard({ title, description, accent, onClick, icon }) {
  return (
    <div style={gameCardStyle(accent)} onClick={onClick}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.7))" }} />
      <div style={{ position: "absolute", right: 12, top: 10, fontSize: 72, opacity: 0.8 }}>{icon}</div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "68%" }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>{description}</div>
        <div style={{ marginTop: 12, fontSize: 12, color: GOLD, fontWeight: 800 }}>PLAY →</div>
      </div>
    </div>
  );
}

function GameShell({ title, onBack, right, children, soundOn, onToggleSound }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0d1d18 0%, #07130f 100%)", color: SOFT, padding: "12px 12px 100px", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button style={createButtonStyle()} onClick={onBack}>« Lobby</button>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 900, letterSpacing: 1, color: GOLD }}>{title}</div>
        <button style={createButtonStyle()} onClick={onToggleSound}>{soundOn ? "🔊" : "🔇"}</button>
      </div>
      {children}
    </div>
  );
}

function BalanceBar({ balance, text }) {
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#091610", borderTop: `1px solid ${GOLD}`, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50, boxSizing: "border-box" }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>Balance <span style={{ color: GOLD, fontWeight: 900 }}>{formatMoney(balance)}</span></div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{text}</div>
    </div>
  );
}

function Chips({ value, onChange, min = 10, max = 50000 }) {
  const options = [10, 25, 100, 500, 1000];
  const other = useRef("");

  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              border: value === option ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.25)",
              background: "radial-gradient(circle at 30% 30%, #8cc7a9, #1f5b43)",
              color: SOFT,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: value === option ? "0 0 0 4px rgba(212,175,55,0.18)" : "none",
            }}
          >
            {option}
          </button>
        ))}
        <input
          type="number"
          min={min}
          max={max}
          placeholder="Other ₹"
          value={other.current}
          onChange={(e) => {
            other.current = e.target.value;
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
          }}
          style={{
            width: 108,
            height: 42,
            borderRadius: 12,
            border: `1px solid ${GOLD}`,
            background: "#0d1d18",
            color: SOFT,
            padding: "0 10px",
            fontWeight: 800,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

function RouletteGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const [bet, setBet] = useState(25);
  const [selection, setSelection] = useState("red");
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [history, setHistory] = useState([]);

  const ctxRef = useRef(null);
  useEffect(() => {
    if (!soundOn) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctxRef.current = new AudioCtx();
    return () => {
      if (ctxRef.current && ctxRef.current.state !== "closed") ctxRef.current.close();
    };
  }, [soundOn]);

  const playSound = (freq, duration = 0.1, type = "sine") => {
    if (!soundOn || !ctxRef.current) return;
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    makeTone(ctx, freq, duration, type, 0.05);
  };

  const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const colorMap = { 0: "green", 1: "red", 2: "black", 3: "red", 4: "black", 5: "red", 6: "black", 7: "red", 8: "black", 9: "red", 10: "black", 11: "black", 12: "red", 13: "black", 14: "red", 15: "black", 16: "red", 17: "black", 18: "red", 19: "black", 20: "red", 21: "black", 22: "red", 23: "black", 24: "red", 25: "black", 26: "red", 27: "black", 28: "red", 29: "black", 30: "red", 31: "black", 32: "red", 33: "black", 34: "red", 35: "black", 36: "red" };

  const getColorName = (n) => colorMap[n] || "green";

  const handleSpin = () => {
    if (spinning || bet > balance) return;
    setSpinning(true);
    const outcome = numbers[Math.floor(Math.random() * numbers.length)];
    const houseWeight = 0.6;
    const playerWeight = 0.4;
    const side = weightedOutcome(playerWeight, houseWeight);

    const selectedColor = selection;
    const pickedColor = getColorName(outcome);
    const isColorMatch = selectedColor === pickedColor;
    const isEven = outcome !== 0 && outcome % 2 === 0;
    const isOdd = outcome !== 0 && outcome % 2 !== 0;
    const isHigh = outcome >= 19 && outcome <= 36;
    const isLow = outcome >= 1 && outcome <= 18;

    let winAmount = 0;
    let won = false;

    if (selection === "red" && isColorMatch) { winAmount = computePayout(bet, 1.9, "player"); won = true; }
    if (selection === "black" && isColorMatch) { winAmount = computePayout(bet, 1.9, "player"); won = true; }
    if (selection === "even" && isEven) { winAmount = computePayout(bet, 1.9, "player"); won = true; }
    if (selection === "odd" && isOdd) { winAmount = computePayout(bet, 1.9, "player"); won = true; }
    if (selection === "low" && isLow) { winAmount = computePayout(bet, 1.85, "player"); won = true; }
    if (selection === "high" && isHigh) { winAmount = computePayout(bet, 1.85, "player"); won = true; }
    if (String(outcome) === selection) { winAmount = computePayout(bet, 35, "player"); won = true; }

    const finalOutcome = side === "player" ? (won ? "player" : "house") : "house";

    setTimeout(() => {
      setResult({ number: outcome, color: pickedColor, won: finalOutcome === "player" && won, payout: finalOutcome === "player" && won ? winAmount : 0, bet });
      setHistory((prev) => [{ number: outcome, color: pickedColor }, ...prev].slice(0, 10));
      setBalance((prev) => {
        const next = prev - bet + (finalOutcome === "player" && won ? winAmount : 0);
        return clamp(next, 0, 1e12);
      });
      setSpinning(false);
      setWheelRotation((prev) => prev + 2200 + Math.random() * 900);
      playSound(finalOutcome === "player" && won ? 660 : 220, finalOutcome === "player" && won ? 0.15 : 0.2, finalOutcome === "player" && won ? "triangle" : "square");
    }, 3000);
  };

  const rouletteCells = [
    [0, 32, 15, 19, 4, 21, 2, 25],
    [17, 34, 6, 27, 13, 36, 11, 30],
    [8, 23, 10, 5, 24, 16, 33, 1],
    [20, 14, 31, 9, 22, 18, 29, 7],
    [28, 12, 35, 3, 26],
  ];

  const wheelStyle = {
    width: 280,
    height: 280,
    borderRadius: "50%",
    border: `4px solid ${GOLD}`,
    background: "radial-gradient(circle at 50% 50%, #193b2d 0%, #0d231b 36%, #060d0b 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    boxShadow: "0 18px 42px rgba(0,0,0,0.35)",
    transform: `rotate(${wheelRotation}deg)`,
    transition: spinning ? "transform 3s cubic-bezier(0.12, 0.8, 0.18, 1)" : "transform 0.4s ease",
  };

  const wheelInner = {
    width: 226,
    height: 226,
    borderRadius: "50%",
    position: "relative",
    background: "#10171f",
    border: `2px solid rgba(255,255,255,0.18)`,
    overflow: "hidden",
  };

  return (
    <GameShell title="Auto Roulette" onBack={onBack} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 12 }}>
        {history.map((entry, index) => (
          <div key={`${entry.number}-${index}`} style={{ width: 26, height: 26, borderRadius: "50%", background: winColor(entry.number), border: "1px solid rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11 }}>{entry.number}</div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 18px" }}>
        <div style={wheelStyle}>
          <div style={wheelInner}>
            <svg viewBox="0 0 226 226" width="100%" height="100%">
              {Array.from({ length: 37 }).map((_, index) => {
                const angle = (index / 37) * 360;
                const color = getColorName(index) === "red" ? "#d73b4d" : getColorName(index) === "black" ? "#1f2430" : "#1f8f5f";
                return (
                  <g key={index} transform={`rotate(${angle} 113 113)`}>
                    <path d="M113 113 L113 20 A93 93 0 0 1 158 26 Z" fill={color} opacity={0.92} />
                  </g>
                );
              })}
              <circle cx="113" cy="113" r="30" fill="#d4af37" />
              <circle cx="113" cy="113" r="9" fill="#f7f8f9" />
              <path d="M113 0 L120 30 L106 30 Z" fill="#d4af37" style={{ transform: "translateY(-6px)" }} />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(8, 15, 12, 0.75)", borderRadius: 16, border: `1px solid ${GOLD}`, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            ["red", "Red"],
            ["black", "Black"],
            ["even", "Even"],
            ["odd", "Odd"],
            ["low", "Low 1-18"],
            ["high", "High 19-36"],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setSelection(value)} style={{ ...createButtonStyle(), background: selection === value ? "linear-gradient(180deg, #f9d76d, #d4af37)" : "#0d1d18", color: selection === value ? "#111827" : SOFT, borderColor: selection === value ? GOLD : "rgba(255,255,255,0.18)", opacity: spinning ? 0.5 : 1 }} disabled={spinning}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {rouletteCells.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 4 }}>
              {row.map((num) => (
                <button key={num} onClick={() => setSelection(String(num))} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: winColor(num), color: SOFT, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                  {num}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, margin: "8px 0 4px" }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 18px" }} onClick={handleSpin} disabled={spinning}>Spin {formatMoney(bet)}</button>
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ marginTop: 12, textAlign: "center", minHeight: 36, fontWeight: 800 }}>
        {result ? (
          <span style={{ color: result.won ? "#7ae6a7" : "#ffc7c7" }}>
            {result.won ? `Win: ${formatMoney(result.payout)}` : `House wins: ${result.number}`} · {result.color}
          </span>
        ) : (
          <span style={{ opacity: 0.8 }}>Place your bet and spin</span>
        )}
      </div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

function DragonTigerGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const [bet, setBet] = useState(25);
  const [side, setSide] = useState("dragon");
  const [cards, setCards] = useState({ dragon: 10, tiger: 8 });
  const [result, setResult] = useState(null);
  const [dealing, setDealing] = useState(false);

  const handleDeal = () => {
    if (dealing || bet > balance) return;
    setDealing(true);
    const d = Math.floor(Math.random() * 13) + 1;
    const t = Math.floor(Math.random() * 13) + 1;
    setCards({ dragon: d, tiger: t });
    const outcome = weightedOutcome(0.4, 0.6);
    const winner = d === t ? "tie" : d > t ? "dragon" : "tiger";
    const isPlayerWin = side === winner || (side === "tie" && d === t);
    const finalOutcome = outcome === "player" ? (isPlayerWin ? "player" : "house") : "house";
    const payout = finalOutcome === "player" ? computePayout(bet, side === "tie" ? 8.5 : 1.95, "player") : 0;

    setTimeout(() => {
      setResult({ winner, payout, house: finalOutcome === "house" });
      setBalance((prev) => clamp(prev - bet + payout, 0, 1e12));
      setDealing(false);
    }, 1000);
  };

  return (
    <GameShell title="Dragon Tiger" onBack={onBack} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>}>
      <div style={{ background: "rgba(12, 28, 23, 0.9)", border: `1px solid ${GOLD}`, borderRadius: 16, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 16, marginBottom: 12 }}>
          {["dragon", "tiger"].map((name) => (
            <div key={name} style={{ width: 112, minHeight: 146, borderRadius: 14, border: `1px solid ${GOLD}`, background: name === "dragon" ? "rgba(214,59,77,0.18)" : "rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: name === "dragon" ? "#ffd6dc" : "#f5e7a8" }}>
              {name === "dragon" ? "D" : "T"}
              <div style={{ fontSize: 11, position: "absolute", marginTop: 68, color: SOFT }}>{cards[name]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          {[
            ["dragon", "Dragon"],
            ["tiger", "Tiger"],
            ["tie", "Tie"],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setSide(key)} style={{ flex: 1, borderRadius: 12, background: side === key ? "linear-gradient(180deg, #f5d56a, #d4af37)" : "#0d1d18", color: side === key ? "#111827" : SOFT, border: `1px solid ${side === key ? GOLD : "rgba(255,255,255,0.12)"}`, padding: "12px 10px", fontWeight: 900, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 22px" }} onClick={handleDeal} disabled={dealing}>{dealing ? "Dealing..." : `Deal ${formatMoney(bet)}`}</button>
      </div>

      <div style={{ marginTop: 12, textAlign: "center", fontWeight: 800, minHeight: 26 }}>
        {result ? (
          <span style={{ color: result.house ? "#ffc7c7" : "#7ae6a7" }}>{result.house ? "House wins" : `Player wins ${formatMoney(result.payout)}`} · {result.winner.toUpperCase()}</span>
        ) : (
          <span style={{ opacity: 0.75 }}>Choose a side and deal</span>
        )}
      </div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

function AviatorGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const [bet, setBet] = useState(50);
  const [flight, setFlight] = useState(1);
  const [status, setStatus] = useState("Ready");
  const [isFlying, setIsFlying] = useState(false);
  const [cashoutValue, setCashoutValue] = useState(0);
  const [recent, setRecent] = useState([1.2, 1.6, 2.2, 3.1]);

  const timerRef = useRef();

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const handleLaunch = () => {
    if (isFlying || bet > balance) return;
    setBalance((prev) => clamp(prev - bet, 0, 1e12));
    setIsFlying(true);
    setStatus("Flight in progress");
    setFlight(1);
    const target = Number((1.35 + Math.random() * 3.7).toFixed(2));
    const start = performance.now();

    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const next = Math.min(1 + Math.exp(0.18 * elapsed), target);
      setFlight(Number(next.toFixed(2)));
      if (next >= target) {
        const playerWon = weightedOutcome(0.4, 0.6) === "player";
        const payout = playerWon ? computePayout(bet, target, "player") : 0;
        setRecent((prev) => [Number(target.toFixed(2)), ...prev].slice(0, 8));
        setCashoutValue(payout);
        setStatus(playerWon ? `Crashed at ${target.toFixed(2)}x` : `House wins at ${target.toFixed(2)}x`);
        setBalance((prev) => clamp(prev + payout, 0, 1e12));
        setIsFlying(false);
        clearInterval(timerRef.current);
      }
    }, 50);
  };

  const handleCashout = () => {
    if (!isFlying) return;
    const cash = computePayout(bet, flight, "player");
    setStatus(`Cashout ${formatMoney(cash)}`);
    setBalance((prev) => clamp(prev + cash, 0, 1e12));
    setIsFlying(false);
    clearInterval(timerRef.current);
  };

  return (
    <GameShell title="Aviator" onBack={onBack} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>}>
      <div style={{ background: "rgba(12, 23, 33, 0.94)", border: `1px solid ${GOLD}`, borderRadius: 18, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Recent</div>
          <div style={{ color: GOLD, fontWeight: 900 }}>{status}</div>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
          {recent.map((value, index) => (
            <span key={`${value}-${index}`} style={{ borderRadius: 999, background: "#13212d", border: `1px solid ${GOLD}`, padding: "6px 10px", fontSize: 11, fontWeight: 800, color: SOFT }}>{value.toFixed(2)}x</span>
          ))}
        </div>
        <div style={{ height: 220, borderRadius: 16, border: `1px solid rgba(255,255,255,0.12)`, background: "radial-gradient(circle at 50% 20%, #112434 0%, #0a1723 40%, #050b11 100%)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(14, 116, 144, 0.25) 100%)" }} />
          <div style={{ position: "absolute", left: `${Math.min(90, 10 + flight * 7)}%`, top: `${Math.max(10, 70 - flight * 18)}%`, width: 12, height: 12, borderRadius: "50%", background: "#facc15", boxShadow: "0 0 18px rgba(250,204,21,0.9)", transform: `translate(-50%, -50%)` }} />
        </div>
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 22px" }} onClick={handleLaunch} disabled={isFlying}>{isFlying ? "Flying..." : `Start ${formatMoney(bet)}`}</button>
        <button style={{ ...createButtonStyle(), fontSize: 14, padding: "12px 20px" }} onClick={handleCashout} disabled={!isFlying}>Cashout</button>
      </div>

      <div style={{ marginTop: 12, textAlign: "center", fontWeight: 800 }}>
        <span style={{ color: GOLD }}>{flight.toFixed(2)}x</span>
        {cashoutValue ? <span style={{ marginLeft: 8, color: "#7ae6a7" }}>Payout {formatMoney(cashoutValue)}</span> : null}
      </div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

function MinesGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const [bet, setBet] = useState(20);
  const [mineCount, setMineCount] = useState(3);
  const [selected, setSelected] = useState([]);
  const [cashout, setCashout] = useState(1);
  const [gameState, setGameState] = useState("idle");
  const [board, setBoard] = useState(Array(25).fill(false));

  const startRound = () => {
    const mines = new Set();
    while (mines.size < mineCount) {
      mines.add(Math.floor(Math.random() * 25));
    }
    setSelected([]);
    setCashout(1);
    setGameState("playing");
    setBoard(Array.from(mines));
    setBalance((prev) => clamp(prev - bet, 0, 1e12));
  };

  const revealTile = (index) => {
    if (gameState !== "playing" || selected.includes(index)) return;
    if (board.includes(index)) {
      setSelected((prev) => [...prev, index]);
      setGameState("lost");
      return;
    }
    const nextSelected = [...selected, index];
    setSelected(nextSelected);
    const multiplier = Number((1 + nextSelected.length * 0.35).toFixed(2));
    setCashout(multiplier);
    if (nextSelected.length >= 20) {
      const payout = computePayout(bet, multiplier, "player");
      setBalance((prev) => clamp(prev + payout, 0, 1e12));
      setGameState("won");
    }
  };

  return (
    <GameShell title="Mines" onBack={onBack} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ color: GOLD, fontWeight: 800 }}>Mines: {mineCount}</div>
        <div style={{ color: GOLD, fontWeight: 900 }}>{cashout.toFixed(2)}x</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8 }}>
        {Array.from({ length: 25 }, (_, index) => {
          const isSelected = selected.includes(index);
          const isMine = board.includes(index) && gameState !== "idle";
          return (
            <button
              key={index}
              onClick={() => revealTile(index)}
              disabled={gameState !== "playing" || isSelected}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 10,
                border: `1px solid ${isMine ? "#f87171" : isSelected ? "#7ae6a7" : "rgba(255,255,255,0.18)"}`,
                background: isMine ? "rgba(248,113,113,0.25)" : isSelected ? "rgba(122,230,167,0.18)" : "#132117",
                color: SOFT,
                fontWeight: 900,
                cursor: gameState === "playing" && !isSelected ? "pointer" : "default",
              }}
            >
              {isMine ? "💣" : isSelected ? "✅" : ""}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", margin: "16px 0" }}>
        {[1, 3, 5, 10, 15].map((count) => (
          <button key={count} onClick={() => setMineCount(count)} style={{ ...createButtonStyle(), background: mineCount === count ? "linear-gradient(180deg, #f5d56a, #d4af37)" : "#0d1d18", color: mineCount === count ? "#111827" : SOFT }}>{count}</button>
        ))}
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 22px" }} onClick={startRound} disabled={gameState === "playing"}>{gameState === "playing" ? "Round active" : `Start ${formatMoney(bet)}`}</button>
      </div>

      <div style={{ marginTop: 16, textAlign: "center", fontWeight: 800, minHeight: 24 }}>
        {gameState === "lost" && <span style={{ color: "#ffc7c7" }}>Mine hit — you lost</span>}
        {gameState === "won" && <span style={{ color: "#7ae6a7" }}>Won {formatMoney(computePayout(bet, cashout, "player"))}</span>}
        {gameState === "idle" && <span style={{ opacity: 0.8 }}>Pick safe tiles and cash out</span>}
      </div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

function VortexGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const [bet, setBet] = useState(25);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  const sectors = [0.5, 1.5, 2.5, 4.5, 7.5, 12.5, 27.5, 50, 0.5];

  const handleSpin = () => {
    if (spinning || bet > balance) return;
    const sectorIndex = Math.floor(Math.random() * sectors.length);
    const multiplier = sectors[sectorIndex];
    const outcome = weightedOutcome(0.4, 0.6);
    const houseWin = outcome === "house";
    const payout = houseWin ? 0 : computePayout(bet, multiplier, "player");

    setSpinning(true);
    setRotation((prev) => prev + 1900 + (360 - ((sectorIndex * 360) / sectors.length)));
    setTimeout(() => {
      setResult({ sectorIndex, multiplier, payout, houseWin });
      setBalance((prev) => clamp(prev - bet + payout, 0, 1e12));
      setSpinning(false);
    }, 2800);
  };

  return (
    <GameShell title="Vortex" onBack={onBack} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>}>
      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 18px" }}>
        <div style={{ position: "relative", width: 280, height: 280, borderRadius: "50%", border: `4px solid ${GOLD}`, background: "radial-gradient(circle at center, #220e46, #0a0d18 62%)", boxShadow: "0 18px 44px rgba(0,0,0,0.35)" }}>
          <div style={{ position: "absolute", left: "50%", top: -12, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: `16px solid ${GOLD}` }} />
          <div style={{ width: "100%", height: "100%", transform: `rotate(${rotation}deg)`, transition: "transform 2.8s cubic-bezier(0.12, 0.8, 0.18, 1)" }}>
            <svg viewBox="0 0 280 280" width="100%" height="100%">
              {sectors.map((multiplier, index) => {
                const angle = (index / sectors.length) * 360;
                const color = ["#1e3a8a", "#4d1d63", "#1b5f4d", "#a16207", "#bb2e3a", "#7c3aed", "#0f766e", "#d97706", "#1e3a8a"][index];
                return (
                  <g key={`${multiplier}-${index}`} transform={`rotate(${angle} 140 140)`}>
                    <path d="M140 140 L140 18 A122 122 0 0 1 219 42 Z" fill={color} opacity={0.9} />
                    <text x="140" y="78" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="900" transform={`rotate(${index * 40} 140 78)`}>{multiplier.toFixed(1)}x</text>
                  </g>
                );
              })}
              <circle cx="140" cy="140" r="32" fill="#facc15" />
            </svg>
          </div>
        </div>
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 22px" }} onClick={handleSpin} disabled={spinning}>{spinning ? "Spinning..." : `Spin ${formatMoney(bet)}`}</button>
      </div>

      <div style={{ minHeight: 28, marginTop: 12, textAlign: "center", fontWeight: 800 }}>
        {result ? (
          <span style={{ color: result.houseWin ? "#ffc7c7" : "#7ae6a7" }}>{result.houseWin ? "House wins" : `You won ${formatMoney(result.payout)}`} · {result.multiplier.toFixed(1)}x</span>
        ) : (
          <span style={{ opacity: 0.8 }}>Watch the vortex and hit the multiplier</span>
        )}
      </div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

function ChickenRoadGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const [bet, setBet] = useState(20);
  const [difficulty, setDifficulty] = useState("medium");
  const [stage, setStage] = useState(0);
  const [alive, setAlive] = useState(true);
  const [status, setStatus] = useState("Ready");

  const difficultyMap = { easy: 1.4, medium: 2.2, hard: 3.2 };

  const handleMove = () => {
    if (!alive || stage >= 10) return;
    const nextStage = stage + 1;
    const houseOutcome = weightedOutcome(0.4, 0.6);
    if (houseOutcome === "player") {
      const payout = computePayout(bet, Number((1 + nextStage * difficultyMap[difficulty]).toFixed(2)), "player");
      setBalance((prev) => clamp(prev + payout, 0, 1e12));
      setStage(nextStage);
      setStatus(`Safe! ${payout.toFixed(2)} payout`);
    } else {
      setAlive(false);
      setStatus("Chicken hit");
      setBalance((prev) => clamp(prev - bet, 0, 1e12));
    }
  };

  const resetRound = () => {
    setStage(0);
    setAlive(true);
    setStatus("Ready");
  };

  const manholes = Array.from({ length: 10 }, (_, index) => {
    const value = Number((1 + (index + 1) * difficultyMap[difficulty] * 0.5).toFixed(2));
    return { index, value };
  });

  return (
    <GameShell title="Chicken Road 2" onBack={onBack} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>}>
      <div style={{ position: "relative", height: 420, borderRadius: 18, border: `1px solid rgba(255,255,255,0.12)`, overflow: "hidden", background: "linear-gradient(180deg,#0d1a20 0%,#0a1017 100%)" }}>
        {manholes.map((item) => (
          <div key={item.index} style={{ position: "absolute", top: `${18 + item.index * 8}%`, left: "50%", transform: "translate(-50%, -50%)", width: 90, height: 38, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, background: item.index <= stage ? "radial-gradient(circle at center, #1dc86d, #0b5f3d)" : "radial-gradient(circle at center, #1f2937, #111827)", border: `1px solid ${GOLD}` }}>{item.value.toFixed(2)}x</div>
        ))}
        <div style={{ position: "absolute", left: "50%", top: `${16 + stage * 8}%`, transform: "translate(-50%, -50%)", width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, background: "#f8d57e", boxShadow: "0 8px 18px rgba(0,0,0,0.2)" }}>🐔</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
        {Object.entries({ easy: "Easy", medium: "Medium", hard: "Hard" }).map(([key, label]) => (
          <button key={key} onClick={() => { setDifficulty(key); resetRound(); }} style={{ ...createButtonStyle(), background: difficulty === key ? "linear-gradient(180deg, #f9d76d, #d4af37)" : "#0d1d18", color: difficulty === key ? "#111827" : SOFT }}>{label}</button>
        ))}
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 18px" }} onClick={handleMove} disabled={!alive}>{alive ? "Cross" : "Reset"}</button>
        <button style={{ ...createButtonStyle(), fontSize: 14, padding: "12px 18px" }} onClick={resetRound}>Reset</button>
      </div>

      <div style={{ textAlign: "center", fontWeight: 800, marginTop: 14, minHeight: 24 }}>{status}</div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

function LudoGame({ balance, setBalance, soundOn, setSoundOn, config, onBack }) {
  const boardSize = 15;
  const board = Array.from({ length: boardSize * boardSize }, (_, index) => index);
  const [bet, setBet] = useState(20);
  const [turn, setTurn] = useState("human");
  const [humanTokens, setHumanTokens] = useState([0, 0, 0, 0]);
  const [botTokens, setBotTokens] = useState([0, 0, 0, 0]);
  const [message, setMessage] = useState("Your move");

  const rollDie = () => Math.floor(Math.random() * 6) + 1;

  const handleHumanMove = () => {
    if (turn !== "human") return;
    const die = rollDie();
    const outcome = weightedOutcome(0.4, 0.6);
    const nextHuman = [...humanTokens];
    const nextBot = [...botTokens];
    const tokenIndex = nextHuman.findIndex((value) => value === 0);
    if (tokenIndex >= 0) nextHuman[tokenIndex] = die;
    else nextHuman[0] = nextHuman[0] + die;
    const botDie = rollDie();
    const botIndex = nextBot.findIndex((value) => value === 0);
    if (botIndex >= 0) nextBot[botIndex] = botDie;
    else nextBot[0] = nextBot[0] + botDie;

    setHumanTokens(nextHuman);
    setBotTokens(nextBot);
    setTurn("bot");

    if (outcome === "player") {
      const payout = computePayout(bet, 1.8, "player");
      setBalance((prev) => clamp(prev + payout, 0, 1e12));
      setMessage(`You rolled ${die}. You win ${formatMoney(payout)}`);
    } else {
      setBalance((prev) => clamp(prev - bet, 0, 1e12));
      setMessage(`You rolled ${die}. Bot steals the round`);
    }

    setTimeout(() => setTurn("human"), 700);
  };

  return (
    <GameShell title="Ludo" onBack={onBack} soundOn={soundOn} onToggleSound={() => setSoundOn((s) => !s)} right={<button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gap: 4, background: "rgba(9,14,18,0.9)", border: `1px solid ${GOLD}`, borderRadius: 16, padding: 10 }}>
        {board.map((cell) => (
          <div key={cell} style={{ width: 18, height: 18, borderRadius: 6, background: "#182229", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: 8, color: SOFT }}>
            {cell % 5 === 0 ? "•" : ""}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
        <div style={{ background: "rgba(0,0,0,0.22)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>You</div>
          <div style={{ fontWeight: 900, color: "#7ae6a7" }}>{humanTokens.join(" • ")}</div>
        </div>
        <div style={{ background: "rgba(0,0,0,0.22)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Bot</div>
          <div style={{ fontWeight: 900, color: "#f9d76d" }}>{botTokens.join(" • ")}</div>
        </div>
      </div>

      <Chips value={bet} onChange={setBet} min={10} max={50000} />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <button style={{ ...createButtonStyle("primary"), fontSize: 14, padding: "12px 22px" }} onClick={handleHumanMove} disabled={turn !== "human"}>{turn === "human" ? `Roll ${formatMoney(bet)}` : "Bot turn"}</button>
      </div>

      <div style={{ textAlign: "center", minHeight: 24, marginTop: 10, fontWeight: 800 }}>{message}</div>

      <BalanceBar balance={balance} text={"Min 10 Max 50000"} />
    </GameShell>
  );
}

export default function Casino(props) {
  const { me, cfg, supabase, reload, say } = props || {};
  const safeCfg = cfg || {};
  const defaultBalance = Number(me?.balance || 0) + Number(me?.winnings || 0);
  const [balance, setBalance] = useState(defaultBalance);
  const [soundOn, setSoundOn] = useState(true);
  const [view, setView] = useState("lobby");
  const audioRef = useRef(null);

  useEffect(() => {
    setBalance(defaultBalance);
  }, [defaultBalance]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("casino_sound");
      if (saved === "off") setSoundOn(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("casino_sound", soundOn ? "on" : "off");
    }
    if (soundOn) {
      if (!audioRef.current) audioRef.current = buildAudioContext();
      if (audioRef.current && audioRef.current.state === "suspended") audioRef.current.resume();
    }
  }, [soundOn]);

  const common = {
    balance,
    setBalance,
    soundOn,
    setSoundOn,
    config: safeCfg,
    onBack: () => setView("lobby"),
    supabase,
    me,
    reload,
    say,
  };

  if (view === "roulette") return <RouletteGame {...common} />;
  if (view === "dragon") return <DragonTigerGame {...common} />;
  if (view === "aviator") return <AviatorGame {...common} />;
  if (view === "mines") return <MinesGame {...common} />;
  if (view === "vortex") return <VortexGame {...common} />;
  if (view === "chicken") return <ChickenRoadGame {...common} />;
  if (view === "ludo") return <LudoGame {...common} />;

  const games = [
    { key: "roulette", label: "Auto Roulette", description: "Realtime wheel and 60/40 weighted house logic.", accent: "linear-gradient(135deg, #1d4035, #0f1c1a)", icon: "🎰" },
    { key: "dragon", label: "Dragon Tiger", description: "Live felt, card flips, and fast table payouts.", accent: "linear-gradient(135deg, #162e56, #0f172a)", icon: "🂡" },
    { key: "aviator", label: "Aviator", description: "Rocket up, cash out before the crash window closes.", accent: "linear-gradient(135deg, #3d220f, #1a0e0a)", icon: "🚀" },
    { key: "mines", label: "Mines", description: "Map safe tiles and avoid bombs with dynamic multiplier play.", accent: "linear-gradient(135deg, #102d20, #0c1f17)", icon: "💣" },
    { key: "vortex", label: "Vortex", description: "Spinning wheel with multi-tier multiplier stop logic.", accent: "linear-gradient(135deg, #2c1458, #1b0d2d)", icon: "🌀" },
    { key: "chicken", label: "Chicken Road 2", description: "Arcade lane crossing with difficulty tap play.", accent: "linear-gradient(135deg, #3d2b0b, #18140a)", icon: "🐔" },
    { key: "ludo", label: "Ludo", description: "Classic board with digital bot counterplay and balance logic.", accent: "linear-gradient(135deg, #3b1b1c, #190d0d)", icon: "🎲" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0b1a15 0%, #06120e 100%)", color: SOFT, padding: "16px 12px 84px", boxSizing: "border-box", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 0 12px" }}>
        <button style={createButtonStyle()} onClick={() => setSoundOn((s) => !s)}>{soundOn ? "🔊" : "🔇"}</button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: GOLD }}>Casino</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Choose a game</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        {games.map((game) => (
          <LobbyCard key={game.key} title={game.label} description={game.description} accent={game.accent} icon={game.icon} onClick={() => setView(game.key)} />
        ))}
      </div>
      <BalanceBar balance={balance} text={"House edge 60/40"} />
    </div>
  );
}

export { Casino };
