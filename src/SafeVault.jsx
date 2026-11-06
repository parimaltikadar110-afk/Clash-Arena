import { useCallback, useEffect, useMemo, useState } from "react";

const DAILY_RATE = 0.025;
const MIN_DAYS = 3;
const MAX_DAYS = 365;
const MIN_AMOUNT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = value => INR.format(Number.isFinite(Number(value)) ? Number(value) : 0);
const dateText = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
const durationText = ms => {
  if (ms <= 0) return "Ready to withdraw";
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${days}d ${hours}h ${minutes}m remaining`;
};

const styles = {
  page: { minHeight: "100vh", boxSizing: "border-box", padding: "12px 14px 36px", color: "#f3efe0", background: "radial-gradient(ellipse at 50% -10%,#17452e 0%,#09140e 48%,#050a07 100%)", fontFamily: "system-ui,-apple-system,Segoe UI,sans-serif" },
  wrap: { width: "100%", maxWidth: 980, margin: "0 auto" },
  top: { display: "flex", alignItems: "center", gap: 12, margin: "0 auto 18px" },
  back: { border: "1px solid #d4af3780", borderRadius: 12, color: "#f5f5f4", background: "#16271d", padding: "10px 13px", fontWeight: 800, cursor: "pointer" },
  heading: { flex: 1, color: "#facc15", fontWeight: 900, fontSize: 17, letterSpacing: 1 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 14, alignItems: "start" },
  panel: { minWidth: 0, padding: "clamp(17px,3vw,26px)", border: "1px solid #ffffff18", borderRadius: 20, background: "linear-gradient(145deg,#13271c,#0a1510)", boxShadow: "0 18px 48px #0006", boxSizing: "border-box" },
  eyebrow: { margin: "0 0 8px", color: "#facc15", fontSize: 11, letterSpacing: 1.5, fontWeight: 900, textTransform: "uppercase" },
  title: { margin: "0 0 8px", fontSize: "clamp(25px,5vw,36px)", lineHeight: 1.12 },
  muted: { color: "#a5b5a9", fontSize: 12, lineHeight: 1.6 },
  rate: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 16, margin: "18px 0", borderRadius: 15, background: "linear-gradient(110deg,#d4af3722,#ffffff08)", border: "1px solid #d4af3744" },
  rateNumber: { color: "#facc15", fontSize: 26, fontWeight: 900, whiteSpace: "nowrap" },
  field: { display: "grid", gap: 8, margin: "16px 0" },
  label: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, color: "#e5e7eb", fontSize: 13, fontWeight: 750 },
  input: { width: "100%", padding: "12px 13px", color: "#f8fafc", background: "#050d09", border: "1px solid #ffffff25", borderRadius: 11, outline: "none", fontSize: 15, boxSizing: "border-box" },
  presets: { display: "flex", flexWrap: "wrap", gap: 7 },
  summary: { display: "grid", gap: 0, padding: "5px 13px", borderRadius: 14, background: "#ffffff08", border: "1px solid #ffffff12" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "11px 0", borderBottom: "1px solid #ffffff0f", fontSize: 13, color: "#bdc9bf" },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 },
  primary: { border: 0, borderRadius: 11, padding: "12px 15px", color: "#111", background: "linear-gradient(135deg,#fde68a,#d4af37)", fontWeight: 900, cursor: "pointer" },
  secondary: { border: "1px solid #ffffff25", borderRadius: 11, padding: "11px 14px", color: "#f3efe0", background: "#ffffff0a", fontWeight: 800, cursor: "pointer" },
  section: { padding: 15, borderRadius: 15, background: "#ffffff07", border: "1px solid #ffffff12" },
  status: { marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#0c1820", border: "1px solid #ffffff12", color: "#cbd5e1", fontSize: 13, lineHeight: 1.55 },
  warning: { marginTop: 14, padding: 13, borderRadius: 12, color: "#f3d9a1", background: "#8a65151a", border: "1px solid #d4af3733", fontSize: 11, lineHeight: 1.6 },
  overlay: { position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 14, background: "#000b" },
  dialog: { width: "min(100%,420px)", padding: 20, borderRadius: 17, border: "1px solid #d4af37", background: "#0a1f14", boxShadow: "0 20px 70px #000", boxSizing: "border-box" },
};

/**
 * SafeVault relies on the server-side safe_vault_* RPCs in supabase/safe_vault.sql.
 * It never changes wallet/investment state locally: deposit and withdrawal requests
 * are committed by PostgreSQL only after the user confirms the action.
 */
export default function SafeVault({ supabase, me, reload, say, onBack = () => {}, cfg = {} }) {
  const vaultCfg = cfg?.safe_vault || {};
  const minDays = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Number(vaultCfg.min_lock_days) || MIN_DAYS));
  const maxDays = Math.max(minDays, Math.min(MAX_DAYS, Number(vaultCfg.max_lock_days) || MAX_DAYS));
  const minimumAmount = Math.max(MIN_AMOUNT, Number(vaultCfg.min_amount) || MIN_AMOUNT);
  const [amount, setAmount] = useState("2500");
  const [days, setDays] = useState(14);
  const [investment, setInvestment] = useState(null);
  const [wallet, setWallet] = useState((Number(me?.balance) || 0) + (Number(me?.winnings) || 0));
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Choose an amount and lock-in duration to preview your vault estimate.");
  const [confirmation, setConfirmation] = useState(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("safe_vault_get");
      if (error) throw error;
      setInvestment(data?.investment || null);
      setWallet(Number(data?.wallet_balance) || 0);
      setMessage(data?.investment ? "Vault details synced securely." : "No active vault investment. Choose terms to get started.");
    } catch (error) {
      setMessage(error?.message || "Could not load vault details. Run the supplied SafeVault SQL in Supabase first.");
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const principal = Number(investment?.principal) || 0;
  const duration = Number(investment?.duration_days) || 0;
  const startedAt = investment?.started_at ? new Date(investment.started_at).getTime() : 0;
  const unlockAtMs = startedAt + duration * DAY_MS;
  const elapsedDays = investment ? Math.min(duration, Math.max(0, (now - startedAt) / DAY_MS)) : 0;
  const accruedInterest = investment ? Math.round(principal * DAILY_RATE * elapsedDays * 100) / 100 : 0;
  const matured = Boolean(investment && now >= unlockAtMs);
  const previewAmount = Number(amount);
  const validAmount = Number.isFinite(previewAmount) && previewAmount >= minimumAmount;
  const safeDays = Math.max(minDays, Math.min(maxDays, Math.floor(Number(days) || minDays)));
  const dailyEstimate = validAmount ? previewAmount * DAILY_RATE : 0;
  const interestEstimate = dailyEstimate * safeDays;
  const unlockPreview = new Date(now + safeDays * DAY_MS);

  const requestDeposit = () => {
    if (!validAmount) {
      setMessage(`Investment must be at least ${money(minimumAmount)}.`);
      return;
    }
    if (previewAmount > wallet) {
      setMessage("Insufficient available wallet balance.");
      return;
    }
    if (investment) {
      setMessage("Withdraw your current vault investment before starting another.");
      return;
    }
    setConfirmation({ type: "deposit", amount: Math.round(previewAmount * 100) / 100, days: safeDays });
  };

  const requestWithdrawal = () => {
    if (!investment || !matured) return;
    setConfirmation({ type: "withdraw" });
  };

  const confirmAction = async () => {
    if (!confirmation || busy || !supabase) return;
    const action = confirmation;
    setBusy(true);
    setConfirmation(null);
    try {
      const { data, error } = action.type === "deposit"
        ? await supabase.rpc("safe_vault_deposit", { p_amount: action.amount, p_duration_days: action.days })
        : await supabase.rpc("safe_vault_withdraw");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || "Vault action was not completed.");
      if (data.wallet_balance !== undefined) setWallet(Number(data.wallet_balance) || 0);
      setInvestment(data.investment || null);
      setMessage(action.type === "deposit" ? `Vault investment started for ${action.days} days.` : `Withdrawal completed: ${money(data.payout)} returned to your wallet.`);
      if (typeof reload === "function") await reload();
      await refresh();
      if (typeof say === "function") say(action.type === "deposit" ? "SafeVault investment started ✅" : "SafeVault withdrawal completed ✅");
    } catch (error) {
      setMessage(error?.message || "Could not complete the vault action.");
      if (typeof say === "function") say(error?.message || "SafeVault action failed", 1);
    } finally {
      setBusy(false);
    }
  };

  const controlStyle = active => ({ ...styles.secondary, borderColor: active ? "#facc15" : "#ffffff25", color: active ? "#fde68a" : "#e5e7eb", background: active ? "#d4af3718" : "#ffffff08" });
  const displayedEstimate = useMemo(() => Math.round((validAmount ? previewAmount + interestEstimate : 0) * 100) / 100, [validAmount, previewAmount, interestEstimate]);

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.top}>
          <button type="button" onClick={onBack} style={styles.back}>← Casino</button>
          <div style={styles.heading}>CLASHX7 · SAFEVAULT</div>
          <button type="button" onClick={refresh} disabled={busy} style={styles.secondary} aria-label="Refresh vault">↻</button>
        </header>

        <div style={styles.grid}>
          <section style={styles.panel}>
            <p style={styles.eyebrow}>Vault overview</p>
            <h1 style={styles.title}>Plan a safe lock-in.</h1>
            <p style={styles.muted}>Review your terms, confirm before committing, and withdraw only after the selected minimum lock-in period. Interest is simple and non-compounded.</p>

            <div style={styles.rate}>
              <div><strong style={{ display: "block", fontSize: 14 }}>Daily simple-interest estimate</strong><span style={styles.muted}>Calculated by the server, not compounded</span></div>
              <strong style={styles.rateNumber}>2.5% / day</strong>
            </div>

            <div style={styles.field}>
              <label htmlFor="safe-vault-amount" style={styles.label}><span>Investment principal</span><span style={styles.muted}>Min {money(minimumAmount)}</span></label>
              <input id="safe-vault-amount" type="number" min={minimumAmount} step="0.01" inputMode="decimal" value={amount} disabled={Boolean(investment) || busy} onChange={event => setAmount(event.target.value)} style={styles.input} />
            </div>

            <div style={styles.field}>
              <label htmlFor="safe-vault-days" style={styles.label}><span>Minimum lock-in duration</span><span style={styles.muted}>{minDays}–{maxDays} days</span></label>
              <div style={styles.presets}>{[7, 14, 30, 60, 90].filter(value => value >= minDays && value <= maxDays).map(value => <button key={value} type="button" disabled={Boolean(investment) || busy} onClick={() => setDays(value)} style={controlStyle(Number(days) === value)}>{value} days</button>)}</div>
              <input id="safe-vault-days" type="number" min={minDays} max={maxDays} step="1" value={days} disabled={Boolean(investment) || busy} onChange={event => setDays(event.target.value)} onBlur={() => setDays(safeDays)} style={styles.input} />
              <span style={styles.muted}>Principal and interest cannot be withdrawn before this lock-in ends.</span>
            </div>

            <div style={styles.summary} aria-live="polite">
              <div style={styles.row}><span>Available wallet</span><strong style={{ color: "#f3efe0" }}>{money(wallet)}</strong></div>
              <div style={styles.row}><span>Principal</span><strong style={{ color: "#f3efe0" }}>{money(validAmount ? previewAmount : 0)}</strong></div>
              <div style={styles.row}><span>Estimated interest per day</span><strong style={{ color: "#facc15" }}>{money(dailyEstimate)}</strong></div>
              <div style={styles.row}><span>Estimated interest after {safeDays} days</span><strong style={{ color: "#facc15" }}>{money(interestEstimate)}</strong></div>
              <div style={{ ...styles.row, borderBottom: 0, color: "#fff0c2", fontSize: 14 }}><span>Estimated value at unlock</span><strong>{money(displayedEstimate)}</strong></div>
            </div>
            <p style={{ ...styles.muted, margin: "12px 0 0" }}>Estimated unlock: {dateText(unlockPreview)}</p>

            <div style={styles.buttonRow}>
              {investment
                ? <button type="button" style={{ ...styles.primary, opacity: matured ? 1 : 0.5, cursor: matured ? "pointer" : "not-allowed" }} onClick={requestWithdrawal} disabled={!matured || busy}>{matured ? "Review withdrawal" : "Funds locked"}</button>
                : <button type="button" style={{ ...styles.primary, opacity: validAmount && !busy ? 1 : 0.55 }} onClick={requestDeposit} disabled={!validAmount || busy}>Review investment</button>}
              <button type="button" style={styles.secondary} onClick={refresh} disabled={busy}>{busy ? "Syncing…" : "Refresh vault"}</button>
            </div>
            <div role="status" style={styles.status}>{message}</div>
          </section>

          <aside style={{ ...styles.panel, display: "grid", gap: 14 }}>
            <section style={styles.section}>
              <p style={styles.eyebrow}>Your investment</p>
              {investment ? <>
                <div style={{ display: "inline-flex", padding: "6px 10px", borderRadius: 99, color: matured ? "#86efac" : "#fde68a", background: matured ? "#16a34a22" : "#d4af3720", border: `1px solid ${matured ? "#22c55e55" : "#d4af3755"}`, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{matured ? "Ready to withdraw" : "Locked"}</div>
                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  <div style={styles.row}><span>Principal</span><strong style={{ color: "#fff" }}>{money(principal)}</strong></div>
                  <div style={styles.row}><span>Lock-in</span><strong style={{ color: "#fff" }}>{duration} days</strong></div>
                  <div style={styles.row}><span>Started</span><strong style={{ color: "#fff", textAlign: "right" }}>{dateText(investment.started_at)}</strong></div>
                  <div style={styles.row}><span>Unlocks</span><strong style={{ color: "#fff", textAlign: "right" }}>{dateText(new Date(unlockAtMs))}</strong></div>
                  <div style={styles.row}><span>Time left</span><strong style={{ color: matured ? "#86efac" : "#fde68a", textAlign: "right" }}>{durationText(unlockAtMs - now)}</strong></div>
                  <div style={styles.row}><span>Accrued interest estimate</span><strong style={{ color: "#facc15" }}>{money(accruedInterest)}</strong></div>
                  <div style={{ ...styles.row, borderBottom: 0 }}><span>Estimated withdrawal</span><strong style={{ color: "#facc15", fontSize: 17 }}>{money(principal + accruedInterest)}</strong></div>
                </div>
              </> : <div style={{ padding: "22px 10px", color: "#a5b5a9", textAlign: "center", border: "1px dashed #ffffff25", borderRadius: 12 }}>No active investment. Review a deposit to begin.</div>}
            </section>

            <section style={styles.section}>
              <p style={styles.eyebrow}>How it is calculated</p>
              <div style={{ display: "grid", gap: 10, fontSize: 13, color: "#bdc9bf" }}>
                <div style={styles.row}><span>Rate</span><strong style={{ color: "#fff" }}>2.5% per day</strong></div>
                <div style={styles.row}><span>Formula</span><strong style={{ color: "#fff", textAlign: "right" }}>Principal × 0.025 × elapsed days</strong></div>
                <div style={styles.row}><span>Minimum term</span><strong style={{ color: "#fff" }}>{minDays} days</strong></div>
                <div style={{ ...styles.row, borderBottom: 0 }}><span>Maximum term</span><strong style={{ color: "#fff" }}>{maxDays} days</strong></div>
              </div>
            </section>
            <div style={styles.warning}>This displays a product estimate, not a guaranteed or insured return. Run the provided SQL before use. The database validates lock-in and payout; do not treat this client display as the source of financial truth.</div>
          </aside>
        </div>
      </div>

      {confirmation && <div style={styles.overlay} role="presentation" onClick={() => !busy && setConfirmation(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="vault-confirm-title" style={styles.dialog} onClick={event => event.stopPropagation()}>
          <h2 id="vault-confirm-title" style={{ margin: "0 0 8px", color: "#facc15", fontSize: 20 }}>{confirmation.type === "deposit" ? "Confirm vault investment" : "Confirm vault withdrawal"}</h2>
          {confirmation.type === "deposit" ? <p style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.6 }}>Invest {money(confirmation.amount)} for {confirmation.days} days? Estimated simple interest is {money(confirmation.amount * DAILY_RATE * confirmation.days)}. Your wallet will be debited only after you confirm.</p> : <p style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.6 }}>Withdraw your matured investment? The server will calculate the final payout and update your wallet.</p>}
          <div style={styles.buttonRow}>
            <button type="button" style={styles.primary} onClick={confirmAction} disabled={busy}>{busy ? "Processing…" : "Yes, confirm"}</button>
            <button type="button" style={styles.secondary} onClick={() => setConfirmation(null)} disabled={busy}>Cancel</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
