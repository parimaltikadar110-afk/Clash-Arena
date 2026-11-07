import React, { useState, useEffect } from "react";

/*
  SafeVault - virtual in-game Coin Vault / Piggy Bank.
  Uses virtual game tokens only. No real money involved.

  Daily interest is credited automatically at each day boundary (midnight, Asia/Kolkata).
  Interest compounds per credited day. If the player was away for several days,
  all missed days are credited the next time the vault is loaded.

  Props:
    initialBalance  number  starting main game balance (tokens)
    dailyRate       number  daily arcade bonus rate (0.025 = 2.5%)
    lockPeriodMs    number  lock-in period before withdrawals are allowed (ms)
    onBalanceChange (next:number) => void   called when main balance changes
*/

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const EPS = 1e-9;

const floorTokens = (n) => Math.floor(n + EPS);

// Index of the IST calendar day a timestamp falls on
const dayIndexOf = (ts) => Math.floor((ts + IST_OFFSET_MS) / DAY_MS);

// Timestamp of the next IST midnight after `ts`
const nextMidnightAfter = (ts) => (dayIndexOf(ts) + 1) * DAY_MS - IST_OFFSET_MS;

const formatCountdown = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Scoped override: the host app's global input CSS was winning over inline colour, so the typed amount looked dark-on-dark.
const INPUT_FIX = `
  .sv-amount, .sv-amount:focus { color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; caret-color:#ffffff !important; background:#120b26 !important; opacity:1 !important; }
  .sv-amount::placeholder { color:#a897d6 !important; -webkit-text-fill-color:#a897d6 !important; opacity:1 !important; }
`;

const S = {
  wrapper: {
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    background: "linear-gradient(160deg, #1a1033 0%, #0f0a1f 100%)",
    color: "#f5f0ff",
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "460px",
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
    border: "1px solid #3b2a6b",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
    gap: "8px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "#ffd166",
  },
  badge: {
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "999px",
    background: "#2d1f57",
    color: "#c9b8ff",
    border: "1px solid #4c3a8a",
    whiteSpace: "nowrap",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "18px",
  },
  statCard: {
    background: "#21153f",
    borderRadius: "12px",
    padding: "12px 8px",
    textAlign: "center",
    border: "1px solid #332463",
    minWidth: 0,
  },
  statLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "#a897d6",
    marginBottom: "6px",
  },
  statValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#ffffff",
    wordBreak: "break-word",
  },
  statValueAccent: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#06d6a0",
    wordBreak: "break-word",
  },
  tabRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "14px",
    background: "#120b26",
    borderRadius: "10px",
    padding: "4px",
    border: "1px solid #2e2057",
  },
  tab: (active) => ({
    flex: 1,
    padding: "8px 0",
    borderRadius: "8px",
    border: "none",
    background: active ? "linear-gradient(90deg, #7b5cff, #b06bff)" : "transparent",
    color: active ? "#ffffff" : "#a897d6",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  }),
  section: {
    background: "#1b1236",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    border: "1px solid #2e2057",
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: 600,
    color: "#d8ccff",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "10px",
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #4c3a8a",
    background: "#120b26",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    caretColor: "#ffffff",
    colorScheme: "dark",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  inputLabel: {
    display: "block",
    fontSize: "12px",
    color: "#a897d6",
    marginBottom: "6px",
  },
  quickRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "12px",
  },
  quickButton: {
    flex: 1,
    padding: "6px 0",
    borderRadius: "8px",
    border: "1px solid #4c3a8a",
    background: "#2a1d4f",
    color: "#c9b8ff",
    fontSize: "12px",
    cursor: "pointer",
  },
  primaryButton: {
    padding: "0 18px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(90deg, #7b5cff, #b06bff)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  claimButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(90deg, #06d6a0, #ffd166)",
    color: "#1a1033",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  disabledButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #3b2a6b",
    background: "#2a1d4f",
    color: "#7d6fa6",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "not-allowed",
  },
  timerText: {
    fontSize: "26px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    textAlign: "center",
    margin: "4px 0 10px 0",
    color: "#ffd166",
  },
  progressTrack: {
    width: "100%",
    height: "8px",
    background: "#2e2057",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "12px",
  },
  progressFill: (pct) => ({
    width: `${pct}%`,
    height: "100%",
    background: "linear-gradient(90deg, #7b5cff, #ffd166)",
    transition: "width 0.9s linear",
  }),
  creditBox: {
    marginTop: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#21153f",
    border: "1px solid #332463",
    fontSize: "12px",
    color: "#c9b8ff",
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  muted: {
    fontSize: "12px",
    color: "#a897d6",
    textAlign: "center",
    margin: "0 0 4px 0",
  },
  message: (type) => ({
    padding: "10px 12px",
    borderRadius: "10px",
    fontSize: "13px",
    marginBottom: "14px",
    background: type === "error" ? "#3d1a2a" : "#12332b",
    color: type === "error" ? "#ff8fab" : "#06d6a0",
    border: `1px solid ${type === "error" ? "#7a2d4c" : "#1d6b55"}`,
  }),
  logList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    maxHeight: "140px",
    overflowY: "auto",
  },
  logItem: {
    fontSize: "12px",
    padding: "6px 0",
    borderBottom: "1px solid #2e2057",
    color: "#c9b8ff",
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  logTime: {
    color: "#7d6fa6",
    whiteSpace: "nowrap",
  },
};

export default function SafeVault({
  initialBalance = 1000,
  dailyRate = 0.025,
  lockPeriodMs = DAY_MS,
  onBalanceChange,
}) {
  const [mode, setMode] = useState("deposit"); // "deposit" | "withdraw"
  const [mainBalance, setMainBalance] = useState(initialBalance);

  // Vault position or null:
  //   base       = tokens in the vault, including all interest credited so far (float)
  //   lastDay    = IST day index up to which interest has been credited
  //   lockStart  = timestamp of the last deposit
  //   lockUntil  = timestamp when withdrawals become allowed
  const [vault, setVault] = useState(null);
  const [totalEarned, setTotalEarned] = useState(0); // lifetime interest credited this session

  const [now, setNow] = useState(() => Date.now());
  const [amountInput, setAmountInput] = useState("");
  const [message, setMessage] = useState(null);
  const [log, setLog] = useState([]);

  const t = now;

  // Tick every second so timers stay live and day boundaries are detected
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-hide messages after 3 seconds
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(id);
  }, [message]);

  // Credit interest for every completed day since the last credit.
  // Compounding: base grows by (1 + dailyRate) per day.
  const applyInterest = (v, at) => {
    const today = dayIndexOf(at);
    const days = today - v.lastDay;
    if (days <= 0) return { v, gained: 0 };
    const newBase = v.base * Math.pow(1 + dailyRate, days);
    return { v: { ...v, base: newBase, lastDay: today }, gained: newBase - v.base };
  };

  // Automatic daily credit: runs whenever the clock crosses an IST midnight
  useEffect(() => {
    if (!vault) return;
    if (dayIndexOf(t) <= vault.lastDay) return;
    const { v: next, gained } = applyInterest(vault, t);
    setVault(next);
    setTotalEarned((prev) => prev + gained);
    pushLog(`Daily interest credited: +${floorTokens(gained).toLocaleString()} tokens`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, vault]);

  const current = vault ? applyInterest(vault, t).v : null;
  const vaultTotal = current ? floorTokens(current.base) : 0;
  const isLocked = vault ? t < vault.lockUntil : false;
  const remainingLock = vault ? Math.max(0, vault.lockUntil - t) : 0;
  const lockSpan = vault ? Math.max(1, vault.lockUntil - vault.lockStart) : 1;
  const lockPct = vault ? Math.min(100, Math.max(0, ((t - vault.lockStart) / lockSpan) * 100)) : 0;
  const nextCreditIn = nextMidnightAfter(t) - t;

  const pushLog = (text) => {
    setLog((prev) =>
      [{ id: `${Date.now()}-${Math.random()}`, text, time: Date.now() }, ...prev].slice(0, 8)
    );
  };

  const notify = (type, text) => setMessage({ type, text });

  const updateMain = (next) => {
    setMainBalance(next);
    if (typeof onBalanceChange === "function") onBalanceChange(next);
  };

  const handleDeposit = () => {
    const amt = Math.floor(Number(amountInput));
    if (!Number.isFinite(amt) || amt <= 0) {
      notify("error", "Enter a whole number of tokens greater than 0.");
      return;
    }
    if (amt > mainBalance) {
      notify("error", "Not enough tokens in your main balance.");
      return;
    }

    const base = current ? current.base : 0;
    const lastDay = current ? current.lastDay : dayIndexOf(t);
    setVault({
      base: base + amt,
      lastDay,
      lockStart: t,
      lockUntil: t + lockPeriodMs,
    });
    updateMain(mainBalance - amt);
    setAmountInput("");
    pushLog(`Deposited ${amt} tokens (lock restarted)`);
    notify("success", `Deposited ${amt} tokens. Interest starts at the next midnight.`);
  };

  const handleWithdraw = (rawAmount = amountInput) => {
    if (!vault) {
      notify("error", "The vault is empty.");
      return;
    }
    if (isLocked) {
      notify("error", `Still locked. ${formatCountdown(remainingLock)} remaining.`);
      return;
    }
    const amt = Math.floor(Number(rawAmount));
    if (!Number.isFinite(amt) || amt <= 0) {
      notify("error", "Enter a whole number of tokens greater than 0.");
      return;
    }

    const max = floorTokens(current.base);
    if (amt > max) {
      notify("error", `You can withdraw at most ${max} tokens.`);
      return;
    }

    if (amt === max) {
      // Full withdrawal: fractional dust below 1 token is forfeited
      setVault(null);
    } else {
      setVault({ ...current, base: current.base - amt });
    }
    updateMain(mainBalance + amt);
    setAmountInput("");
    pushLog(`Withdrew ${amt} tokens (principal + interest)`);
    notify("success", `Withdrew ${amt} tokens to your main balance.`);
  };

  const handleSubmit = () => {
    if (mode === "deposit") handleDeposit();
    else handleWithdraw();
  };

  const setQuickAmount = (fraction) => {
    const source = mode === "deposit" ? mainBalance : vaultTotal;
    setAmountInput(String(Math.floor(source * fraction)));
  };

  const switchMode = (next) => {
    setMode(next);
    setAmountInput("");
    setMessage(null);
  };

  const withdrawBlocked = !vault || isLocked;
  const submitDisabled = mode === "withdraw" ? withdrawBlocked : mainBalance <= 0;

  return (
    <div style={S.wrapper}>
      <style>{INPUT_FIX}</style>
      <div style={S.header}>
        <h2 style={S.title}>Coin Vault</h2>
        <span style={S.badge}>{(dailyRate * 100).toFixed(1)}% daily interest</span>
      </div>

      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statLabel}>Main Balance</div>
          <div style={S.statValue}>{mainBalance.toLocaleString()}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>In Vault</div>
          <div style={S.statValue}>{vaultTotal.toLocaleString()}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Total Earned</div>
          <div style={S.statValueAccent}>+{floorTokens(totalEarned).toLocaleString()}</div>
        </div>
      </div>

      {message && <div style={S.message(message.type)}>{message.text}</div>}

      <div style={S.section}>
        <div style={S.tabRow}>
          <button style={S.tab(mode === "deposit")} onClick={() => switchMode("deposit")}>
            Deposit
          </button>
          <button style={S.tab(mode === "withdraw")} onClick={() => switchMode("withdraw")}>
            Withdraw
          </button>
        </div>

        <label style={S.inputLabel}>
          {mode === "deposit" ? "Tokens to deposit" : "Tokens to withdraw"}
        </label>
        <div style={S.inputRow}>
          <input
            className="sv-amount"
            type="number"
            min="1"
            placeholder={mode === "deposit" ? "Tokens to deposit" : "Tokens to withdraw"}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            style={S.input}
          />
          <button style={S.primaryButton} onClick={handleSubmit} disabled={submitDisabled}>
            {mode === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        </div>

        <div style={S.quickRow}>
          {[0.25, 0.5, 1].map((f) => (
            <button key={f} style={S.quickButton} onClick={() => setQuickAmount(f)}>
              {f === 1 ? "Max" : `${f * 100}%`}
            </button>
          ))}
        </div>

        <p style={S.muted}>
          {mode === "deposit"
            ? `Each deposit restarts the ${formatCountdown(lockPeriodMs)} lock period.`
            : withdrawBlocked
            ? "Withdrawals unlock when the lock timer reaches zero."
            : `Available to withdraw: ${vaultTotal.toLocaleString()} tokens.`}
        </p>
      </div>

      <div style={S.section}>
        <h3 style={S.sectionTitle}>Lock Timer</h3>
        <div style={S.timerText}>
          {vault ? (isLocked ? formatCountdown(remainingLock) : "UNLOCKED") : "--:--:--"}
        </div>
        <div style={S.progressTrack}>
          <div style={S.progressFill(vault ? lockPct : 0)} />
        </div>
        <p style={S.muted}>
          {vault
            ? isLocked
              ? "Tokens can be withdrawn once the timer reaches zero."
              : "Unlocked. You can withdraw your tokens now."
            : "Deposit tokens to start a lock period."}
        </p>

        {vault && (
          <div style={S.creditBox}>
            <span>Next interest credit</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#ffd166", fontWeight: 700 }}>
              {formatCountdown(nextCreditIn)}
            </span>
          </div>
        )}

        <div style={{ height: "12px" }} />
        <button
          style={withdrawBlocked ? S.disabledButton : S.claimButton}
          onClick={() => {
            setMode("withdraw");
            setAmountInput("");
            handleWithdraw(vaultTotal);
          }}
          disabled={withdrawBlocked}
        >
          {vault ? `Withdraw All ${vaultTotal.toLocaleString()} Tokens` : "Nothing to Withdraw"}
        </button>
      </div>

      <div style={S.section}>
        <h3 style={S.sectionTitle}>Activity</h3>
        {log.length === 0 ? (
          <p style={S.muted}>No vault activity yet.</p>
        ) : (
          <ul style={S.logList}>
            {log.map((entry) => (
              <li key={entry.id} style={S.logItem}>
                <span>{entry.text}</span>
                <span style={S.logTime}>{formatTime(entry.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
