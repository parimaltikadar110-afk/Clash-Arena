import React, { useState, useEffect, useCallback } from "react";

/*
  Coin Vault (play-money vault coins only). The database decides every balance, interest credit and lock.
    vault_get_state()             -> load state, settles missed interest days
    vault_deposit_checked(p_amount) -> minimum-deposit check, then vault_deposit (lock restarts)
    vault_withdraw(p_amount)      -> whole tokens back to vault coins, only after the lock ends
  This component never touches the rupee wallet.

  Props:
    supabase       Supabase client (required)
    dailyRatePct   display only (default 2.5). The real rate lives in the database.
    minDeposit     minimum vault coins per deposit, set from the admin casino settings (vault_min)
*/

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const POLL_MS = 5 * 60 * 1000;
const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

const floorTokens = (n) => Math.floor(Number(n) + 1e-9);
const nextMidnightAfter = (ts) => {
  const dayIndex = Math.floor((ts + IST_OFFSET_MS) / DAY_MS);
  return (dayIndex + 1) * DAY_MS - IST_OFFSET_MS;
};
const fmtCountdown = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
};

const C = {
  text: "#f4f0ff", muted: "#9d8fd0", card: "#170f2e", card2: "#1f1640", line: "#2e2360",
  gold: "#ffd166", mint: "#06d6a0", violet: "#8b5cf6", pink: "#f472b6", danger: "#fb7185", field: "#0d0820",
};

// scoped rules: the host app's global input styles were overriding inline colours
const CSS = `
.sv-input{color:#fff !important;-webkit-text-fill-color:#fff !important;caret-color:#fff !important;background:#0d0820 !important;opacity:1 !important;-moz-appearance:textfield;}
.sv-input::placeholder{color:#7f72b0 !important;-webkit-text-fill-color:#7f72b0 !important;opacity:1 !important;}
.sv-input::-webkit-outer-spin-button,.sv-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
@keyframes svPulse{0%,100%{box-shadow:0 0 0 0 rgba(6,214,160,.45)}50%{box-shadow:0 0 0 10px rgba(6,214,160,0)}}
@keyframes svIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;

const S = {
  wrap: { fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: C.text, width: "100%", maxWidth: 460, margin: "0 auto", boxSizing: "border-box", padding: 16, background: "radial-gradient(120% 80% at 50% 0%,#2a1755 0%,#0d0820 60%)", borderRadius: 22, border: `1px solid ${C.line}`, boxShadow: "0 18px 50px rgba(0,0,0,.5)" },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  title: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: .3, color: C.gold },
  sub: { margin: "4px 0 0", fontSize: 12, color: C.muted },
  pill: (tone) => ({ fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: .4, color: tone === "ok" ? "#052e25" : tone === "lock" ? "#fde68a" : C.muted, background: tone === "ok" ? C.mint : tone === "lock" ? "#3b2a08" : "#1f1640", border: `1px solid ${tone === "ok" ? C.mint : tone === "lock" ? "#7c5a14" : C.line}`, animation: tone === "ok" ? "svPulse 2s infinite" : "none" }),
  hero: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
  heroCard: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 14px 12px", animation: "svIn .4s ease both" },
  label: { fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: .9, marginBottom: 6 },
  big: { fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums", wordBreak: "break-word" },
  earn: { fontSize: 20, fontWeight: 800, color: C.mint, fontVariantNumeric: "tabular-nums" },
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 12, animation: "svIn .4s ease both" },
  ringWrap: { display: "flex", alignItems: "center", gap: 16 },
  ringText: { flex: 1, minWidth: 0 },
  ringCenter: { position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" },
  ringTime: { fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: C.gold },
  ringHint: { fontSize: 10, color: C.muted, letterSpacing: .6, textTransform: "uppercase" },
  muted: { fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "6px 0 0" },
  creditRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "10px 12px", borderRadius: 12, background: C.card2, border: `1px solid ${C.line}`, fontSize: 12, color: C.muted },
  seg: { display: "flex", background: C.field, border: `1px solid ${C.line}`, borderRadius: 12, padding: 4, gap: 4, marginBottom: 14 },
  segBtn: (on) => ({ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, color: on ? "#fff" : C.muted, background: on ? `linear-gradient(90deg,${C.violet},${C.pink})` : "transparent" }),
  fieldLabel: { display: "block", fontSize: 12, color: C.muted, marginBottom: 6 },
  inputRow: { display: "flex", gap: 8, alignItems: "stretch" },
  inputWrap: { position: "relative", flex: 1, minWidth: 0 },
  input: { width: "100%", boxSizing: "border-box", padding: "12px 58px 12px 14px", borderRadius: 12, border: `1px solid #4c3a8a`, fontSize: 16, fontWeight: 700, outline: "none" },
  suffix: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted, pointerEvents: "none", letterSpacing: .5 },
  cta: (dis) => ({ padding: "0 18px", borderRadius: 12, border: "none", cursor: dis ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 14, color: "#fff", whiteSpace: "nowrap", opacity: dis ? .5 : 1, background: `linear-gradient(90deg,${C.violet},${C.pink})` }),
  chips: { display: "flex", gap: 6, margin: "10px 0 0" },
  chip: { flex: 1, padding: "7px 0", borderRadius: 9, border: `1px solid ${C.line}`, background: C.card2, color: "#d8ccff", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  bigBtn: (dis, good) => ({ width: "100%", padding: "13px 0", borderRadius: 13, border: "none", cursor: dis ? "not-allowed" : "pointer", fontWeight: 900, fontSize: 15, color: good ? "#052e25" : C.muted, background: dis ? C.card2 : `linear-gradient(90deg,${C.mint},${C.gold})`, opacity: dis ? .6 : 1, marginTop: 12 }),
  toast: (type) => ({ padding: "10px 12px", borderRadius: 12, fontSize: 13, marginBottom: 12, animation: "svIn .25s ease both", background: type === "error" ? "#3d1a2a" : "#0f2f29", color: type === "error" ? "#ffb3c1" : C.mint, border: `1px solid ${type === "error" ? "#7a2d4c" : "#1d6b55"}` }),
  center: { textAlign: "center", color: C.muted, padding: 30 },
};

export default function SafeVault({ supabase, dailyRatePct = 2.5, minDeposit = 0 }) {
  const [mode, setMode] = useState("deposit");
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [message, setMessage] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [clockOffset, setClockOffset] = useState(0);

  const serverNow = now + clockOffset;
  const minDep = Math.max(0, Math.floor(Number(minDeposit) || 0));

  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(id);
  }, [message]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const applyState = useCallback((data) => {
    if (!data) return;
    setState(data);
    if (data.server_now) setClockOffset(new Date(data.server_now).getTime() - Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("vault_get_state");
    if (error) { setMessage({ type: "error", text: error.message }); return; }
    applyState(data);
  }, [supabase, applyState]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

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

  const parseAmount = () => {
    const n = Math.floor(Number(amountInput));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const runRpc = async (fn, args, okText) => {
    setBusy(true);
    const { data, error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) { setMessage({ type: "error", text: error.message }); return; }
    applyState(data);
    setAmountInput("");
    setMessage({ type: "success", text: okText });
  };

  const handleDeposit = () => {
    const n = parseAmount();
    if (!n) return setMessage({ type: "error", text: "Enter a whole number greater than 0." });
    if (minDep > 0 && n < minDep) return setMessage({ type: "error", text: `Minimum deposit is ${minDep.toLocaleString()} vault coins.` });
    if (n > coins) return setMessage({ type: "error", text: "Not enough vault coins." });
    runRpc("vault_deposit_checked", { p_amount: n }, `Deposited ${n.toLocaleString()} vault coins. Lock restarted.`);
  };

  const handleWithdraw = (override) => {
    const n = override ?? parseAmount();
    if (!n) return setMessage({ type: "error", text: "Enter a whole number greater than 0." });
    if (!hasPosition) return setMessage({ type: "error", text: "The vault is empty." });
    if (isLocked) return setMessage({ type: "error", text: `Still locked. ${fmtCountdown(remainingLock)} remaining.` });
    if (n > inVault) return setMessage({ type: "error", text: `You can withdraw at most ${inVault} tokens.` });
    runRpc("vault_withdraw", { p_amount: n }, `Withdrew ${n.toLocaleString()} vault coins.`);
  };

  const handleSubmit = () => (mode === "deposit" ? handleDeposit() : handleWithdraw());

  const setQuick = (f) => {
    const source = mode === "deposit" ? coins : inVault;
    setAmountInput(String(Math.floor(source * f)));
  };

  const switchMode = (next) => { setMode(next); setAmountInput(""); setMessage(null); };

  const depositBlocked = busy || coins <= 0;
  const submitDisabled = mode === "deposit" ? depositBlocked : withdrawBlocked;

  const status = !hasPosition ? { t: "EMPTY", tone: "idle" } : isLocked ? { t: "LOCKED", tone: "lock" } : { t: "UNLOCKED", tone: "ok" };
  const ringOffset = RING_C * (1 - (hasPosition ? lockPct : 0) / 100);

  if (loading && !state) {
    return (<div style={S.wrap}><style>{CSS}</style><div style={S.center}>Loading vault…</div></div>);
  }

  return (
    <div style={S.wrap}>
      <style>{CSS}</style>

      <div style={S.head}>
        <div>
          <h2 style={S.title}>Coin Vault</h2>
          <p style={S.sub}>Lock your coins and earn {dailyRatePct}% a day.</p>
        </div>
        <span style={S.pill(status.tone)}>{status.t}</span>
      </div>

      <div style={S.hero}>
        <div style={S.heroCard}>
          <div style={S.label}>Vault coins</div>
          <div style={S.big}>{floorTokens(coins).toLocaleString()}</div>
        </div>
        <div style={S.heroCard}>
          <div style={S.label}>In vault</div>
          <div style={S.big}>{inVault.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ ...S.heroCard, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={S.label}>Total earned</div>
          <div style={S.earn}>+{floorTokens(totalEarned).toLocaleString()}</div>
        </div>
        <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>Interest credited<br />every midnight (IST)</div>
      </div>

      {message && <div style={S.toast(message.type)}>{message.text}</div>}

      <div style={S.card}>
        <div style={S.ringWrap}>
          <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
            <svg viewBox="0 0 128 128" width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="64" cy="64" r={RING_R} fill="none" stroke={C.line} strokeWidth="9" />
              <circle cx="64" cy="64" r={RING_R} fill="none"
                stroke={isLocked ? C.gold : C.mint} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={RING_C} strokeDashoffset={ringOffset}
                style={{ transition: "stroke-dashoffset .9s linear, stroke .3s" }} />
            </svg>
            <div style={S.ringCenter}>
              <div>
                <div style={S.ringTime}>{hasPosition ? (isLocked ? fmtCountdown(remainingLock) : "READY") : "--:--"}</div>
                <div style={S.ringHint}>{hasPosition ? (isLocked ? "until unlock" : "withdraw now") : "no lock"}</div>
              </div>
            </div>
          </div>
          <div style={S.ringText}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Lock timer</div>
            <p style={S.muted}>
              {hasPosition
                ? isLocked ? "Withdrawals open when the timer reaches zero." : "Your lock has ended. You can withdraw now."
                : "Deposit vault coins to start a lock period."}
            </p>
          </div>
        </div>
        {hasPosition && (
          <div style={S.creditRow}>
            <span>Next interest credit</span>
            <b style={{ color: C.gold, fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(nextCreditIn)}</b>
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.seg}>
          <button style={S.segBtn(mode === "deposit")} onClick={() => switchMode("deposit")}>Deposit</button>
          <button style={S.segBtn(mode === "withdraw")} onClick={() => switchMode("withdraw")}>Withdraw</button>
        </div>

        <label style={S.fieldLabel}>{mode === "deposit" ? "Amount to lock" : "Amount to withdraw"}</label>
        <div style={S.inputRow}>
          <div style={S.inputWrap}>
            <input className="sv-input" type="number" min="1" inputMode="numeric"
              placeholder={mode === "deposit" ? (minDep ? `min ${minDep}` : "e.g. 100") : "e.g. 50"}
              value={amountInput} onChange={(e) => setAmountInput(e.target.value)}
              style={S.input} />
            <span style={S.suffix}>COINS</span>
          </div>
          <button style={S.cta(submitDisabled)} onClick={handleSubmit} disabled={submitDisabled}>
            {busy ? "…" : mode === "deposit" ? "Deposit" : "Withdraw"}
          </button>
        </div>

        <div style={S.chips}>
          {[0.25, 0.5, 1].map((f) => (
            <button key={f} style={S.chip} onClick={() => setQuick(f)}>{f === 1 ? "Max" : `${f * 100}%`}</button>
          ))}
        </div>

        <p style={S.muted}>
          {mode === "deposit"
            ? (minDep ? `Minimum deposit ${minDep.toLocaleString()} coins. Each deposit restarts the lock.` : "Each deposit restarts the lock period.")
            : !hasPosition ? "Deposit vault coins first."
            : isLocked ? "Withdrawals unlock when the timer reaches zero."
            : `Available to withdraw: ${inVault.toLocaleString()} tokens.`}
        </p>

        <button style={S.bigBtn(withdrawBlocked, hasPosition && !isLocked)}
          onClick={() => handleWithdraw(inVault)} disabled={withdrawBlocked}>
          {hasPosition ? `Withdraw all ${inVault.toLocaleString()} tokens` : "Nothing to withdraw"}
        </button>
      </div>
    </div>
  );
}
