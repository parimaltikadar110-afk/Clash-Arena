import React, { useEffect, useMemo, useState } from 'react';

const DAILY_INTEREST_RATE = 0.025;
const MIN_LOCK_IN_DAYS = 3;
const MAX_LOCK_IN_DAYS = 365;

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const SafeVault = () => {
  const [amount, setAmount] = useState(2500);
  const [lockInDays, setLockInDays] = useState(14);
  const [customDuration, setCustomDuration] = useState(14);
  const [startDate, setStartDate] = useState(() => new Date());
  const [isLocked, setIsLocked] = useState(true);
  const [lastAction, setLastAction] = useState('Vault is active');
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  useEffect(() => {
    const today = new Date();
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + lockInDays);
    setStartDate(today);
    setCustomDuration(lockInDays);
    setPendingConfirmation(false);
    setLastAction(`Lock-in period set to ${lockInDays} days`);
  }, [lockInDays]);

  const investmentSummary = useMemo(() => {
    const sanitizedAmount = Number(amount) || 0;
    const safeLockIn = clamp(Number(customDuration) || lockInDays, MIN_LOCK_IN_DAYS, MAX_LOCK_IN_DAYS);
    const dailyYield = sanitizedAmount * DAILY_INTEREST_RATE;
    const projectedInterest = dailyYield * safeLockIn;
    const finalValue = sanitizedAmount + projectedInterest;
    const unlockDate = new Date(startDate);
    unlockDate.setDate(unlockDate.getDate() + safeLockIn);

    const canWithdraw = (() => {
      const now = new Date();
      const diffDays = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / 86400000));
      return diffDays >= safeLockIn;
    })();

    return {
      sanitizedAmount,
      safeLockIn,
      dailyYield,
      projectedInterest,
      finalValue,
      unlockDate,
      canWithdraw,
    };
  }, [amount, customDuration, lockInDays, startDate]);

  const handleDeposit = () => {
    const depositAmount = Number(amount) || 0;
    if (depositAmount <= 0) {
      setLastAction('Enter a valid investment amount to continue.');
      return;
    }

    if (customDuration < MIN_LOCK_IN_DAYS) {
      setLastAction(`Minimum lock-in is ${MIN_LOCK_IN_DAYS} days.`);
      return;
    }

    setPendingConfirmation(true);
    setLastAction('Investment ready for confirmation.');
  };

  const confirmDeposit = () => {
    const depositAmount = Number(amount) || 0;
    if (depositAmount <= 0) {
      setLastAction('Your deposit is invalid.');
      return;
    }

    const nextLockIn = clamp(Number(customDuration) || lockInDays, MIN_LOCK_IN_DAYS, MAX_LOCK_IN_DAYS);
    setLockInDays(nextLockIn);
    setStartDate(new Date());
    setIsLocked(true);
    setPendingConfirmation(false);
    setLastAction(`Vault activated: ${currency(depositAmount)} locked for ${nextLockIn} days.`);
  };

  const withdrawFunds = () => {
    if (!investmentSummary.canWithdraw) {
      setLastAction(`Withdrawal blocked until ${formatDate(investmentSummary.unlockDate)}.`);
      return;
    }

    setIsLocked(false);
    setLastAction('Withdrawal approved. Principal and interest released.');
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #0c1321 0%, #070d16 38%, #050a12 100%)',
      color: '#edf5ff',
      fontFamily: 'Inter, "Segoe UI", sans-serif',
      padding: '32px 20px',
      display: 'grid',
      placeItems: 'center',
    },
    shell: {
      width: '100%',
      maxWidth: '1200px',
      display: 'grid',
      gridTemplateColumns: '1.1fr 0.9fr',
      gap: '24px',
    },
    panel: {
      background: 'rgba(13, 19, 31, 0.9)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '24px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      overflow: 'hidden',
    },
    leftPanel: {
      padding: '26px',
      background: 'linear-gradient(135deg, rgba(255, 122, 24, 0.08), rgba(17, 24, 39, 0.82))',
    },
    rightPanel: {
      padding: '26px',
    },
    topRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '22px',
    },
    brand: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontWeight: 800,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: '#f5f7fb',
      fontSize: '0.8rem',
    },
    brandBadge: {
      width: '42px',
      height: '42px',
      borderRadius: '14px',
      display: 'grid',
      placeItems: 'center',
      background: 'linear-gradient(135deg, #ff7a18, #ff3b3b)',
      color: '#0b101b',
      fontSize: '1.2rem',
      fontWeight: 900,
    },
    pill: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '7px 12px',
      borderRadius: '999px',
      background: 'rgba(67, 209, 122, 0.12)',
      border: '1px solid rgba(67, 209, 122, 0.3)',
      color: '#7af2a6',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
    title: {
      margin: '0 0 12px',
      fontSize: 'clamp(2.2rem, 4vw, 3.8rem)',
      lineHeight: 1.08,
      fontWeight: 900,
      letterSpacing: '-0.06em',
    },
    lead: {
      margin: '0 0 22px',
      color: '#afbacd',
      lineHeight: 1.7,
      maxWidth: '640px',
      fontSize: '1rem',
    },
    statGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: '14px',
      marginTop: '18px',
    },
    statCard: {
      padding: '16px 14px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    statLabel: {
      display: 'block',
      color: '#96a3ba',
      fontSize: '0.7rem',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      marginBottom: '10px',
    },
    statValue: {
      fontSize: '1.4rem',
      fontWeight: 800,
      color: '#f3f7ff',
    },
    sectionLabel: {
      display: 'inline-block',
      color: '#ffb77b',
      letterSpacing: '0.08em',
      fontSize: '0.72rem',
      textTransform: 'uppercase',
      fontWeight: 700,
      marginBottom: '12px',
    },
    inputGroup: {
      display: 'grid',
      gap: '18px',
      marginTop: '18px',
    },
    fieldRow: {
      display: 'grid',
      gap: '10px',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      fontSize: '0.8rem',
      color: '#b7c2d6',
      fontWeight: 600,
    },
    input: {
      width: '100%',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      padding: '14px 16px',
      color: '#edf5ff',
      fontSize: '1rem',
      outline: 'none',
      boxSizing: 'border-box',
    },
    presetRow: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    },
    preset: {
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.02)',
      color: '#dfeafc',
      padding: '10px 12px',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontWeight: 700,
    },
    activePreset: {
      background: 'rgba(255, 122, 24, 0.12)',
      borderColor: 'rgba(255, 122, 24, 0.38)',
      color: '#ffd5b5',
    },
    buttonRow: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      marginTop: '18px',
    },
    actionBtn: {
      border: 'none',
      borderRadius: '12px',
      padding: '13px 18px',
      fontWeight: 800,
      cursor: 'pointer',
      transition: 'transform 0.2s ease, opacity 0.2s ease',
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, #ff7a18, #ff3b3b)',
      color: '#09131d',
    },
    secondaryBtn: {
      background: 'rgba(255,255,255,0.04)',
      color: '#edf5ff',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    summaryCard: {
      marginTop: '20px',
      padding: '18px',
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      color: '#dfeafc',
    },
    summaryRowLast: {
      borderBottom: 'none',
      color: '#fef3d1',
      fontWeight: 800,
    },
    statusBox: {
      marginTop: '16px',
      padding: '14px 16px',
      borderRadius: '12px',
      background: pendingConfirmation ? 'rgba(255, 180, 0, 0.08)' : 'rgba(67, 209, 122, 0.08)',
      border: pendingConfirmation ? '1px solid rgba(255, 180, 0, 0.28)' : '1px solid rgba(67, 209, 122, 0.28)',
      color: pendingConfirmation ? '#ffd37d' : '#9ef0ba',
      fontSize: '0.92rem',
      lineHeight: 1.6,
    },
    rightInner: {
      display: 'grid',
      gap: '18px',
    },
    miniCard: {
      padding: '18px',
      borderRadius: '18px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    miniStats: {
      display: 'grid',
      gap: '12px',
      marginTop: '14px',
    },
    miniItem: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      color: '#dfeafc',
      fontSize: '0.9rem',
    },
    guard: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '12px 14px',
      borderRadius: '14px',
      background: isLocked ? 'rgba(67, 209, 122, 0.08)' : 'rgba(255, 122, 24, 0.08)',
      border: isLocked ? '1px solid rgba(67, 209, 122, 0.28)' : '1px solid rgba(255, 122, 24, 0.28)',
      color: isLocked ? '#9ef0ba' : '#ffc08c',
      fontSize: '0.9rem',
      fontWeight: 700,
    },
    tiny: {
      color: '#9aa9c3',
      fontSize: '0.76rem',
      lineHeight: 1.5,
    },
  };

  const presetOptions = [7, 14, 30, 60, 90];

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={{ ...styles.panel, ...styles.leftPanel }}>
          <div style={styles.topRow}>
            <div style={styles.brand}>
              <div style={styles.brandBadge}>V</div>
              SafeVault
            </div>
            <span style={styles.pill}>Protected</span>
          </div>

          <div>
            <h1 style={styles.title}>Grow your rewards safely.</h1>
            <p style={styles.lead}>
              Lock your funds into Clash Arena’s SafeVault and receive a daily return of 2.5% while the
              treasury keeps your principal protected until the minimum lock-in period ends.
            </p>
          </div>

          <div style={styles.statGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Daily ROI</span>
              <div style={styles.statValue}>2.5%</div>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Lock-in</span>
              <div style={styles.statValue}>{investmentSummary.safeLockIn}d</div>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Projected</span>
              <div style={styles.statValue}>{currency(investmentSummary.finalValue)}</div>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.fieldRow}>
              <div style={styles.label}>
                <span>Investment amount</span>
                <span style={styles.tiny}>Min: $100</span>
              </div>
              <input
                type="number"
                min="100"
                step="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={styles.input}
                placeholder="Enter amount"
              />
            </div>

            <div style={styles.fieldRow}>
              <div style={styles.label}>
                <span>Minimum investment duration</span>
                <span style={styles.tiny}>Required before withdrawal</span>
              </div>
              <div style={styles.presetRow}>
                {presetOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    style={{
                      ...styles.preset,
                      ...(Number(customDuration) === option ? styles.activePreset : {}),
                    }}
                    onClick={() => setCustomDuration(option)}
                  >
                    {option}d
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={MIN_LOCK_IN_DAYS}
                max={MAX_LOCK_IN_DAYS}
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value) || 0)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.buttonRow}>
            <button type="button" style={{ ...styles.actionBtn, ...styles.primaryBtn }} onClick={handleDeposit}>
              Deposit into Vault
            </button>
            <button type="button" style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={withdrawFunds}>
              Withdraw
            </button>
          </div>

          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryRow }}>
              <span>Principal</span>
              <strong>{currency(investmentSummary.sanitizedAmount)}</strong>
            </div>
            <div style={{ ...styles.summaryRow }}>
              <span>Daily interest</span>
              <strong>{currency(investmentSummary.dailyYield)}</strong>
            </div>
            <div style={{ ...styles.summaryRow }}>
              <span>Projected total interest</span>
              <strong>{currency(investmentSummary.projectedInterest)}</strong>
            </div>
            <div style={{ ...styles.summaryRow, ...styles.summaryRowLast }}>
              <span>Estimated withdraw value</span>
              <strong>{currency(investmentSummary.finalValue)}</strong>
            </div>
          </div>

          <div style={styles.statusBox}>
            {pendingConfirmation
              ? `Confirmation required: ${currency(investmentSummary.sanitizedAmount)} will be locked for ${investmentSummary.safeLockIn} days and released on ${formatDate(investmentSummary.unlockDate)}.`
              : lastAction}
          </div>
        </div>

        <div style={{ ...styles.panel, ...styles.rightPanel }}>
          <div style={styles.rightInner}>
            <div style={styles.miniCard}>
              <div style={styles.sectionLabel}>Vault status</div>
              <div style={styles.guard}>
                <span>{isLocked ? 'Vault locked' : 'Vault unlocked'}</span>
                <span>{isLocked ? '🔒' : '🔓'}</span>
              </div>
              <div style={{ ...styles.miniStats }}>
                <div style={styles.miniItem}>
                  <span>Start date</span>
                  <strong>{formatDate(startDate)}</strong>
                </div>
                <div style={styles.miniItem}>
                  <span>Unlock date</span>
                  <strong>{formatDate(investmentSummary.unlockDate)}</strong>
                </div>
                <div style={styles.miniItem}>
                  <span>Withdrawal ready</span>
                  <strong>{investmentSummary.canWithdraw ? 'Yes' : 'No'}</strong>
                </div>
              </div>
            </div>

            <div style={styles.miniCard}>
              <div style={styles.sectionLabel}>Interest model</div>
              <div style={{ ...styles.miniStats }}>
                <div style={styles.miniItem}>
                  <span>Rate</span>
                  <strong>2.5% per day</strong>
                </div>
                <div style={styles.miniItem}>
                  <span>Formula</span>
                  <strong>principal × 0.025 × days</strong>
                </div>
                <div style={styles.miniItem}>
                  <span>Max term</span>
                  <strong>365 days</strong>
                </div>
              </div>
            </div>

            <div style={styles.miniCard}>
              <div style={styles.sectionLabel}>Policy</div>
              <p style={styles.tiny}>
                SafeVault requires a minimum lock-in period before principal and accumulated interest can be
                withdrawn. This helps prevent early exits and preserves the expected reward cycle.
              </p>
              {pendingConfirmation && (
                <div style={{ ...styles.buttonRow, marginTop: '16px' }}>
                  <button type="button" style={{ ...styles.actionBtn, ...styles.primaryBtn }} onClick={confirmDeposit}>
                    Confirm Deposit
                  </button>
                  <button type="button" style={{ ...styles.actionBtn, ...styles.secondaryBtn }} onClick={() => setPendingConfirmation(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeVault;
