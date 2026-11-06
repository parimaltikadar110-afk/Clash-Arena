import React, { useEffect, useMemo, useState } from 'react';

const DAILY_INTEREST_RATE = 0.025;
const MIN_LOCK_IN_DAYS = 3;
const MAX_LOCK_IN_DAYS = 365;
const MIN_INVESTMENT = 100;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

const clampDays = (value) =>
  Math.min(MAX_LOCK_IN_DAYS, Math.max(MIN_LOCK_IN_DAYS, Math.floor(Number(value) || MIN_LOCK_IN_DAYS)));

const SafeVault = () => {
  const [amount, setAmount] = useState('2500');
  const [lockInDays, setLockInDays] = useState(14);
  const [activeInvestment, setActiveInvestment] = useState(null);
  const [pendingInvestment, setPendingInvestment] = useState(null);
  const [message, setMessage] = useState('Choose an amount and lock-in period to preview an investment.');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const previewAmount = Number(amount);
  const validAmount = Number.isFinite(previewAmount) && previewAmount >= MIN_INVESTMENT;
  const previewDays = clampDays(lockInDays);
  const previewDailyInterest = validAmount ? previewAmount * DAILY_INTEREST_RATE : 0;
  const previewInterest = previewDailyInterest * previewDays;

  const activeSummary = useMemo(() => {
    if (!activeInvestment) return null;

    const startedAt = new Date(activeInvestment.startedAt);
    const unlockAt = new Date(startedAt.getTime() + activeInvestment.durationDays * DAY_IN_MS);
    const elapsedDays = Math.min(
      activeInvestment.durationDays,
      Math.max(0, (now - startedAt.getTime()) / DAY_IN_MS),
    );
    const accruedInterest = activeInvestment.principal * DAILY_INTEREST_RATE * elapsedDays;
    const matured = now >= unlockAt.getTime();

    return {
      startedAt,
      unlockAt,
      elapsedDays,
      accruedInterest,
      total: activeInvestment.principal + accruedInterest,
      matured,
      remainingMs: Math.max(0, unlockAt.getTime() - now),
    };
  }, [activeInvestment, now]);

  const previewUnlockDate = new Date(Date.now() + previewDays * DAY_IN_MS);

  const handleDeposit = () => {
    if (!validAmount) {
      setMessage(`Enter an amount of at least ${currency(MIN_INVESTMENT)}.`);
      return;
    }
    if (activeInvestment) {
      setMessage('Withdraw your current vault investment before starting another one.');
      return;
    }

    setPendingInvestment({
      principal: Math.round(previewAmount * 100) / 100,
      durationDays: previewDays,
    });
    setMessage('Review the investment details and confirm to start the lock-in period.');
  };

  const confirmDeposit = () => {
    if (!pendingInvestment) return;
    setActiveInvestment({ ...pendingInvestment, startedAt: Date.now() });
    setPendingInvestment(null);
    setMessage(`Vault investment started for ${pendingInvestment.durationDays} days.`);
  };

  const cancelDeposit = () => {
    setPendingInvestment(null);
    setMessage('Investment confirmation canceled. No funds were committed.');
  };

  const withdrawFunds = () => {
    if (!activeInvestment || !activeSummary) return;
    if (!activeSummary.matured) {
      setMessage(`Funds remain locked until ${formatDate(activeSummary.unlockAt)}.`);
      return;
    }

    const payout = activeSummary.total;
    setActiveInvestment(null);
    setMessage(`Withdrawal complete: ${currency(payout)} estimated principal and interest released.`);
  };

  const styles = {
    page: {
      minHeight: '100vh',
      padding: 'clamp(16px, 4vw, 40px)',
      background: 'radial-gradient(ellipse at top left, #17243b 0%, #09111e 42%, #060a12 100%)',
      color: '#edf4ff',
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      boxSizing: 'border-box',
    },
    container: { width: '100%', maxWidth: 1180, margin: '0 auto' },
    columns: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 430px), 1fr))',
      gap: 22,
      alignItems: 'start',
    },
    panel: {
      minWidth: 0,
      padding: 'clamp(20px, 3vw, 30px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 24,
      background: 'linear-gradient(145deg, rgba(17,26,42,0.96), rgba(11,17,28,0.96))',
      boxShadow: '0 20px 55px rgba(0,0,0,0.28)',
      boxSizing: 'border-box',
    },
    topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 26 },
    brand: { display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' },
    badge: {
      width: 44,
      height: 44,
      borderRadius: 15,
      display: 'grid',
      placeItems: 'center',
      color: '#10151e',
      fontSize: 20,
      fontWeight: 900,
      background: 'linear-gradient(135deg, #ffae42, #ff5b36)',
      boxShadow: '0 8px 25px rgba(255,113,48,0.2)',
    },
    pill: {
      border: '1px solid rgba(101,221,153,0.3)',
      borderRadius: 999,
      padding: '7px 11px',
      color: '#86e9ad',
      background: 'rgba(63,190,117,0.1)',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    },
    eyebrow: { margin: '0 0 10px', color: '#ffb673', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' },
    title: { margin: '0 0 12px', fontSize: 'clamp(2rem, 5vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.055em' },
    lead: { margin: '0 0 24px', color: '#aab8ce', lineHeight: 1.7, fontSize: 14 },
    rateCard: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
      padding: 18,
      borderRadius: 17,
      background: 'linear-gradient(110deg, rgba(255,137,48,0.15), rgba(255,255,255,0.025))',
      border: '1px solid rgba(255,146,69,0.17)',
      marginBottom: 24,
    },
    rateValue: { fontSize: 27, fontWeight: 900, color: '#ffc17a' },
    muted: { color: '#96a5bd', fontSize: 12, lineHeight: 1.6 },
    field: { display: 'grid', gap: 9, marginBottom: 20 },
    label: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, color: '#dce6f6', fontSize: 13, fontWeight: 700 },
    input: {
      width: '100%',
      padding: '14px 15px',
      color: '#f4f7fc',
      background: 'rgba(4,9,16,0.55)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 12,
      outline: 'none',
      fontSize: 15,
      boxSizing: 'border-box',
    },
    presets: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    preset: {
      minWidth: 54,
      padding: '9px 12px',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#cbd7e8',
      background: 'rgba(255,255,255,0.035)',
      fontWeight: 700,
      cursor: 'pointer',
    },
    presetActive: { borderColor: 'rgba(255,155,78,0.55)', color: '#ffd0a2', background: 'rgba(255,125,47,0.12)' },
    summary: { display: 'grid', gap: 0, padding: '8px 16px', marginTop: 8, borderRadius: 16, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#b5c2d5', fontSize: 13 },
    summaryLast: { borderBottom: 'none', color: '#fff0d6', fontSize: 14, fontWeight: 800 },
    buttons: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 },
    button: { border: 0, borderRadius: 12, padding: '13px 17px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
    primary: { color: '#17120d', background: 'linear-gradient(135deg, #ffb34e, #ff6938)' },
    secondary: { color: '#eaf0f9', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' },
    disabled: { cursor: 'not-allowed', opacity: 0.45 },
    section: { padding: 18, borderRadius: 17, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' },
    sectionTitle: { margin: '0 0 14px', color: '#ffb673', fontSize: 11, fontWeight: 800, letterSpacing: '0.11em', textTransform: 'uppercase' },
    infoRows: { display: 'grid', gap: 13 },
    infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 13, color: '#aebbd0' },
    infoValue: { color: '#edf4ff', textAlign: 'right', fontWeight: 700 },
    status: {
      marginTop: 17,
      padding: '13px 15px',
      borderRadius: 12,
      border: pendingInvestment ? '1px solid rgba(255,189,83,0.28)' : '1px solid rgba(112,164,255,0.18)',
      background: pendingInvestment ? 'rgba(255,173,55,0.08)' : 'rgba(84,133,217,0.07)',
      color: pendingInvestment ? '#ffd48c' : '#b9c9e2',
      fontSize: 13,
      lineHeight: 1.55,
    },
    warning: { marginTop: 15, padding: 13, borderRadius: 12, color: '#d4c7a6', background: 'rgba(195,153,61,0.08)', border: '1px solid rgba(214,175,82,0.16)', fontSize: 11, lineHeight: 1.6 },
    empty: { padding: '20px 16px', borderRadius: 14, color: '#a7b5ca', background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.12)', textAlign: 'center', fontSize: 13, lineHeight: 1.6 },
    statusPill: (matured) => ({
      display: 'inline-flex',
      padding: '7px 10px',
      borderRadius: 999,
      color: matured ? '#90efb2' : '#ffd38d',
      background: matured ? 'rgba(67,209,122,0.1)' : 'rgba(255,180,0,0.1)',
      border: matured ? '1px solid rgba(67,209,122,0.25)' : '1px solid rgba(255,180,0,0.23)',
      fontSize: 11,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
    }),
  };

  const presets = [7, 14, 30, 60, 90];
  const hasActiveInvestment = Boolean(activeInvestment && activeSummary);
  const canDeposit = validAmount && !hasActiveInvestment && !pendingInvestment;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.columns}>
          <section style={styles.panel} aria-labelledby="safevault-title">
            <div style={styles.topRow}>
              <div style={styles.brand}><span style={styles.badge} aria-hidden="true">V</span><span>SafeVault</span></div>
              <span style={styles.pill}>Vault overview</span>
            </div>
            <p style={styles.eyebrow}>Clash Arena rewards</p>
            <h1 id="safevault-title" style={styles.title}>A clearer way to plan your vault.</h1>
            <p style={styles.lead}>
              Preview a simple-interest estimate, choose a minimum lock-in duration, and review the terms before starting an investment.
            </p>

            <div style={styles.rateCard}>
              <div>
                <div style={{ color: '#f4f6fb', fontSize: 14, fontWeight: 800 }}>Daily interest estimate</div>
                <div style={styles.muted}>Simple interest; not compounded</div>
              </div>
              <div style={styles.rateValue}>2.5%</div>
            </div>

            <div style={styles.field}>
              <label htmlFor="vault-amount" style={styles.label}>
                <span>Investment amount</span><span style={styles.muted}>Minimum {currency(MIN_INVESTMENT)}</span>
              </label>
              <input
                id="vault-amount"
                type="number"
                min={MIN_INVESTMENT}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => { setAmount(event.target.value); setPendingInvestment(null); }}
                style={styles.input}
                aria-describedby="vault-amount-help"
              />
              <span id="vault-amount-help" style={styles.muted}>Enter the principal amount to calculate an estimate.</span>
            </div>

            <div style={styles.field}>
              <label htmlFor="vault-duration" style={styles.label}>
                <span>Minimum investment duration</span><span style={styles.muted}>{MIN_LOCK_IN_DAYS}–{MAX_LOCK_IN_DAYS} days</span>
              </label>
              <div style={styles.presets}>
                {presets.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => { setLockInDays(days); setPendingInvestment(null); }}
                    style={{ ...styles.preset, ...(Number(lockInDays) === days ? styles.presetActive : {}) }}
                    aria-pressed={Number(lockInDays) === days}
                  >{days} days</button>
                ))}
              </div>
              <input
                id="vault-duration"
                type="number"
                min={MIN_LOCK_IN_DAYS}
                max={MAX_LOCK_IN_DAYS}
                step="1"
                value={lockInDays}
                onChange={(event) => { setLockInDays(event.target.value); setPendingInvestment(null); }}
                onBlur={() => setLockInDays(clampDays(lockInDays))}
                style={styles.input}
                aria-describedby="vault-duration-help"
              />
              <span id="vault-duration-help" style={styles.muted}>Principal and interest are unavailable until the selected lock-in ends.</span>
            </div>

            <div style={styles.summary} aria-live="polite">
              <div style={styles.summaryRow}><span>Principal</span><strong>{currency(validAmount ? previewAmount : 0)}</strong></div>
              <div style={styles.summaryRow}><span>Estimated interest per day</span><strong>{currency(previewDailyInterest)}</strong></div>
              <div style={styles.summaryRow}><span>Estimated interest for {previewDays} days</span><strong>{currency(previewInterest)}</strong></div>
              <div style={{ ...styles.summaryRow, ...styles.summaryLast }}><span>Estimated value at unlock</span><strong>{currency((validAmount ? previewAmount : 0) + previewInterest)}</strong></div>
            </div>
            <div style={{ ...styles.infoRow, marginTop: 14 }}><span style={styles.muted}>Estimated unlock date</span><strong style={{ ...styles.infoValue, fontSize: 12 }}>{formatDate(previewUnlockDate)}</strong></div>

            <div style={styles.buttons}>
              {!pendingInvestment ? (
                <button type="button" style={{ ...styles.button, ...styles.primary, ...(!canDeposit ? styles.disabled : {}) }} onClick={handleDeposit} disabled={!canDeposit}>
                  {hasActiveInvestment ? 'Active investment exists' : 'Review deposit'}
                </button>
              ) : (
                <>
                  <button type="button" style={{ ...styles.button, ...styles.primary }} onClick={confirmDeposit}>Confirm investment</button>
                  <button type="button" style={{ ...styles.button, ...styles.secondary }} onClick={cancelDeposit}>Cancel</button>
                </>
              )}
              {hasActiveInvestment && (
                <button type="button" style={{ ...styles.button, ...styles.secondary, ...(!activeSummary.matured ? styles.disabled : {}) }} onClick={withdrawFunds} disabled={!activeSummary.matured}>
                  {activeSummary.matured ? 'Withdraw principal + interest' : 'Locked until maturity'}
                </button>
              )}
            </div>

            {pendingInvestment && (
              <div style={styles.status} role="status">
                Confirm {currency(pendingInvestment.principal)} for {pendingInvestment.durationDays} days? Estimated interest is {currency(pendingInvestment.principal * DAILY_INTEREST_RATE * pendingInvestment.durationDays)}. No investment starts until you confirm.
              </div>
            )}
            {!pendingInvestment && <div style={styles.status} role="status">{message}</div>}
          </section>

          <aside style={{ ...styles.panel, display: 'grid', gap: 16 }} aria-label="Vault details">
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Your vault</h2>
              {hasActiveInvestment ? (
                <>
                  <div style={{ marginBottom: 16 }}><span style={styles.statusPill(activeSummary.matured)}>{activeSummary.matured ? 'Ready to withdraw' : 'Locked'}</span></div>
                  <div style={styles.infoRows}>
                    <div style={styles.infoRow}><span>Principal</span><strong style={styles.infoValue}>{currency(activeInvestment.principal)}</strong></div>
                    <div style={styles.infoRow}><span>Lock-in period</span><strong style={styles.infoValue}>{activeInvestment.durationDays} days</strong></div>
                    <div style={styles.infoRow}><span>Started</span><strong style={styles.infoValue}>{formatDate(activeSummary.startedAt)}</strong></div>
                    <div style={styles.infoRow}><span>Unlocks</span><strong style={styles.infoValue}>{formatDate(activeSummary.unlockAt)}</strong></div>
                    <div style={styles.infoRow}><span>Accrued interest estimate</span><strong style={styles.infoValue}>{currency(activeSummary.accruedInterest)}</strong></div>
                    <div style={{ ...styles.infoRow, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}><span>Estimated withdrawal value</span><strong style={{ ...styles.infoValue, color: '#ffca85' }}>{currency(activeSummary.total)}</strong></div>
                  </div>
                </>
              ) : (
                <div style={styles.empty}>No active investment. Your confirmed vault position will appear here.</div>
              )}
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>How the estimate works</h2>
              <div style={styles.infoRows}>
                <div style={styles.infoRow}><span>Rate used</span><strong style={styles.infoValue}>2.5% per day</strong></div>
                <div style={styles.infoRow}><span>Interest formula</span><strong style={styles.infoValue}>principal × 0.025 × days</strong></div>
                <div style={styles.infoRow}><span>Minimum lock-in</span><strong style={styles.infoValue}>{MIN_LOCK_IN_DAYS} days</strong></div>
                <div style={styles.infoRow}><span>Maximum term</span><strong style={styles.infoValue}>{MAX_LOCK_IN_DAYS} days</strong></div>
              </div>
            </section>

            <div style={styles.warning}>
              Illustrative estimate only—not a guarantee, bank balance, or confirmation that funds are held or insured. This component keeps state in the browser and does not connect to a wallet or database. Confirm the platform’s actual terms and backend accounting before handling real funds.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default SafeVault;
