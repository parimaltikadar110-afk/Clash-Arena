import React, { useState, useEffect, useCallback } from "react";

/*
  SafeVault - virtual Coin Vault (play-money "vault coins" only).

  Every balance, interest credit and lock is decided by the database:
    vault_get_state()        -> load state, settles missed interest days
    vault_deposit(p_amount)  -> move vault coins into the vault, restarts lock
    vault_withdraw(p_amount) -> move whole tokens back to vault coins, only after lock

  This component never touches the rupee wallet (profiles.balance / winnings).

  Props:
    supabase       Supabase client (required)
    dailyRatePct   number, display only (default 2.5). Real rate lives in vault_config.
*/

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const POLL_MS = 60 * 1000;

const floorTokens = (n) => Math.floor(Number(n) + 1e-9);

// Timestamp of the next IST midnight after `ts` (display only; interest is credited on the server)
const nextMidnightAfter = (ts) => {
  const dayIndex = Math.floor((ts + IST_OFFSET_MS) / DAY_MS);
  return (dayIndex + 1) * DAY_MS - IST_OFFSET_MS;
};

const formatCountdown = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// Scoped override: the host app's global input CSS was winning over inline colour,
// so the typed amount looked dark-on-dark.
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
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", gap: "8px" },
  title: { margin: 0, fontSize: "22px", fontWeight: 700, letterSpacing: "0.5px", color: "#ffd166" },
  badge: {
    fontSize: "12px", padding: "4px 10px", borderRadius: "999px", background: "#2d1f57",
    color: "#c9b8ff", border: "1px solid #4c3a8a", whiteSpace: "nowrap",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "18px" },
  statCard: {
    background: "#21153f", borderRadius: "12px", padding: "12px 8px", textAlign: "center",
    border: "1px solid #332463", minWidth: 0,
  },
  statLabel: { fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px", color: "#a897d6", marginBottom: "6px" },
  statValue: { fontSize: "18px", fontWeight: 700, color: "#ffffff", wordBreak: "break-word" },
  statValueAccent: { fontSize: "18px", fontWeight: 700, color: "#06d6a0", wordBreak: "break-word" },
  tabRow: {
    display: "flex", gap: "6px", marginBottom: "14px", background: "#120b26",
    borderRadius: "10px", padding: "4px", border: "1px solid #2e2057",
  },
  tab: (active) => ({
    flex: 1, padding: "8px 0", borderRadius: "8px", border: "none",
    background: active ? "linear-gradient(90deg, #7b5cff, #b06bff)" : "transparent",
    color: active ? "#ffffff" : "#a897d6", fontSize: "13px", fontWeight: 700, cursor: "pointer",
  }),
  section: { background: "#1b1236", borderRadius: "12px", padding: "16px", marginBottom: "16px", border: "1px solid #2e2057" },
  sectionTitle: { margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600, color: "#d8ccff" },
  inputLabel: { display: "block", fontSize: "12px", color: "#a897d6", marginBottom: "6px" },
  inputRow: { display: "flex", gap: "8px", marginBottom: "10px" },
  input: {
    flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: "10px", border: "1px solid #4c3a8a",
    background: "#120b26", color: "#ffffff", WebkitTextFillColor: "#ffffff", caretColor: "#ffffff",
    colorScheme: "dark", fontSize: "16px", outline: "none", boxSizing: "border-box",
  },
  quickRow: { display: "flex", gap: "6px", marginBottom: "12px" },
  quickButton: {
    flex: 1, padding: "6px 0", borderRadius: "8px", border: "1px solid #4c3a8a",
    background: "#2a1d4f", color: "#c9b8ff", fontSize: "12px", cursor: "pointer",
  },
  primaryButton: {
    padding: "0 18px", borderRadius: "10px", border: "none",
    background: "linear-gradient(90deg, #7b5cff, #b06bff)", color: "#ffffff",
    fontSize: "15px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
  },
  claimButton: {
    width: "100%", padding: "12px", borderRadius: "10px", border: "none",
    background: "linear-gradient(90deg, #06d6a0, #ffd166)", color: "#1a1033",
    fontSize: "15px", fontWeight: 700, cursor: "pointer",
  },
  disabledButton: {
    width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #3b2a6b",
    background: "#2a1d4f", color: "#7d6fa6", fontSize: "15px", fontWeight: 700, cursor: "not-allowed",
  },
  timerText: {
    fontSize: "26px", fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "center",
    margin: "4px 0 10px 0", color: "#ffd166",
  },
  progressTrack: { width: "100%", height: "8px", background: "#2e2057", borderRadius: "999px", overflow: "hidden", marginBottom: "12px" },
  progressFill: (pct) => ({
    width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #7b5cff, #ffd166)",
    transition: "width 0.9s linear",
  }),
  creditBox: {
    marginTop: "12px", padding: "10px 12px", borderRadius: "10px", background: "#21153f",
    border: "1px solid #332463", fontSize: "12px", color: "#c9b8ff",
    display: "flex", justifyContent: "space-between", gap: "8px",
  },
  muted: { fontSize: "12px", color: "#a897d6", textAlign: "center", margin: "0 0 4px 0" },
  message: (type) => ({
    padding: "10px 12px", borderRadius: "10px", fontSize: "13px", marginBottom: "14px",
    background: type === "error" ? "#3d1a2a" : "#12332b",
    color: type === "error" ? "#ff8fab" : "#06d6a0",
    border: `1px solid ${type === "error" ? "#7a2d4c" : "#1d6b55"}`,
  }),
};

export default function SafeVault({ supabase, dailyRatePct = 2.5 }) {
  const [mode, setMode] = useState("deposit"); // "deposit" | "withdraw"
  const [state, setState] = useState(null);     // vault_get_state() result
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [message, setMessage] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [clockOffset, setClockOffset] = useState(0); // server time minus device time

  const serverNow = now + clockOffset;

  // Auto-hide messages
  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(id);
  }, [message]);

  // Tick every second for timers
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const applyState = useCallback((data) => {
    if (!data) return;
    setState(data);
    if (data.server_now) {
      setClockOffset(new Date(data.server_now).getTime() - Date.now());
    }
  }, []);

  // Load state. The server settles any missed interest days inside vault_get_state().
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("vault_get_state");
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    applyState(data);
  }, [supabase, applyState]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // Poll so that new daily interest shows up after midnight without reloading
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // ----- derived values from server state -----
  const coins = Number(state?.coins ?? 0);
  const inVault = Number(state?.in_vault ?? 0);
  const totalEarned = Number(state?.total_earned ?? 0);
  const hasPosition = state?.lock_until != null && inVault > 0;
  const lockUntilMs = state?.lock_until ? new Date(state.lock_until).getTime() : 0;
  const lockStartMs = state?.lock_start ? new Date(state.lock_start).getTime() : 0;
  const isLocked = hasPosition && serverNow < lockUntilMs;
  const remainingLock = hasPosition ? Math.max(0, lockUntilMs - serverNow) : 0;
  const lockSpan = Math.max(1, lockUntilMs - lockStartMs);
  const lockPct = hasPosition ? Math.min(100, Math.max(0, ((serverNow - lockStartMs) / lockSpan) * 100)) : 0;
  const nextCreditIn = nextMidnightAfter(serverNow) - serverNow;

  const withdrawBlocked = !hasPosition || isLocked || busy;

  // ----- actions -----
  const parseAmount = () => {
    const n = Math.floor(Number(amountInput));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const runRpc = async (fn, args, okText) => {
    setBusy(true);
    const { data, error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    applyState(data);
    setAmountInput("");
    setMessage({ type: "success", text: okText });
  };

  const handleDeposit = () => {
    const n = parseAmount();
    if (!n) {
      setMessage({ type: "error", text: "Enter a whole number greater than 0." });
      return;
    }
    if (n > coins) {
      setMessage({ type: "error", text: "Not enough vault coins." });
      return;
    }
    runRpc("vault_deposit", { p_amount: n }, `Deposited ${n} vault coins. Lock restarted.`);
  };

  const handleWithdraw = (override) => {
    const n = override ?? parseAmount();
    if (!n) {
      setMessage({ type: "error", text: "Enter a whole number greater than 0." });
      return;
    }
    if (!hasPosition) {
      setMessage({ type: "error", text: "The vault is empty." });
      return;
    }
    if (isLocked) {
      setMessage({ type: "error", text: `Still locked. ${formatCountdown(remainingLock)} remaining.` });
      return;
    }
    if (n > inVault) {
      setMessage({ type: "error", text: `You can withdraw at most ${inVault} tokens.` });
      return;
    }
    runRpc("vault_withdraw", { p_amount: n }, `Withdrew ${n} vault coins.`);
  };

  const handleSubmit = () => {
    if (mode === "deposit") handleDeposit();
    else handleWithdraw();
  };

  const setQuickAmount = (fraction) => {
    const source = mode === "deposit" ? coins : inVault;
    setAmountInput(String(Math.floor(source * fraction)));
  };

  const switchMode = (next) => {
    setMode(next);
    setAmountInput("");
    setMessage(null);
  };

  const submitDisabled = busy || (mode === "deposit" ? coins <= 0 : withdrawBlocked);

  if (loading && !state) {
    return (
      <div style={S.wrapper}>
        <p style={S.muted}>Loading vault...</p>
      </div>
    );
  }

  return (
    <div style={S.wrapper}>
      <style>{INPUT_FIX}</style>

      <div style={S.header}>
        <h2 style={S.title}>Coin Vault</h2>
        <span style={S.badge}>{dailyRatePct}% daily interest</span>
      </div>

      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statLabel}>Vault Coins</div>
          <div style={S.statValue}>{floorTokens(coins).toLocaleString()}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>In Vault</div>
          <div style={S.statValue}>{inVault.toLocaleString()}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>Total Earned</div>
          <div style={S.statValueAccent}>+{floorTokens(totalEarned).toLocaleString()}</div>
        </div>
      </div>

      {message && <div style={S.message(message.type)}>{message.text}</div>}

      <div style={S.section}>
        <div style={S.tabRow}>
          <button style={S.tab(mode === "deposit")} onClick={() => switchMode("deposit")}>Deposit</button>
          <button style={S.tab(mode === "withdraw")} onClick={() => switchMode("withdraw")}>Withdraw</button>
        </div>

        <label style={S.inputLabel}>
          {mode === "deposit" ? "Vault coins to deposit" : "Tokens to withdraw"}
        </label>
        <div style={S.inputRow}>
          <input
            className="sv-amount"
            type="number"
            min="1"
            placeholder={mode === "deposit" ? "e.g. 100" : "e.g. 50"}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            style={S.input}
          />
          <button style={S.primaryButton} onClick={handleSubmit} disabled={submitDisabled}>
            {busy ? "..." : mode === "deposit" ? "Deposit" : "Withdraw"}
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
            ? "Each deposit restarts the lock period."
            : !hasPosition
            ? "Deposit vault coins first."
            : isLocked
            ? "Withdrawals unlock when the lock timer reaches zero."
            : `Available to withdraw: ${inVault.toLocaleString()} tokens.`}
        </p>
      </div>

      <div style={S.section}>
        <h3 style={S.sectionTitle}>Lock Timer</h3>
        <div style={S.timerText}>
          {hasPosition ? (isLocked ? formatCountdown(remainingLock) : "UNLOCKED") : "--:--:--"}
        </div>
        <div style={S.progressTrack}>
          <div style={S.progressFill(hasPosition ? lockPct : 0)} />
        </div>
        <p style={S.muted}>
          {hasPosition
            ? isLocked
              ? "Tokens can be withdrawn once the timer reaches zero."
              : "Unlocked. You can withdraw your tokens now."
            : "Deposit vault coins to start a lock period."}
        </p>

        {hasPosition && (
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
          onClick={() => handleWithdraw(inVault)}
          disabled={withdrawBlocked}
        >
          {hasPosition ? `Withdraw All ${inVault.toLocaleString()} Tokens` : "Nothing to Withdraw"}
        </button>
      </div>
    </div>
  );
}
