* {
  box-sizing: border-box;
}

:root {
  color-scheme: dark;
  --bg: #070d1a;
  --bg-2: #101a2d;
  --panel: rgba(17, 25, 40, 0.92);
  --panel-strong: rgba(22, 34, 52, 0.98);
  --primary: #6ee7b7;
  --primary-strong: #34d399;
  --accent: #7dd3fc;
  --text: #edf5ff;
  --muted: #9db0d1;
  --line: rgba(148, 163, 184, 0.15);
  --shadow: rgba(15, 23, 42, 0.48);
}

html, body, #root {
  margin: 0;
  min-height: 100%;
  height: 100%;
  font-family: Inter, 'Segoe UI', sans-serif;
  background: radial-gradient(circle at top, #142341 0%, #09131f 42%, var(--bg) 100%);
  color: var(--text);
}

a {
  color: var(--primary);
  text-decoration: none;
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
}

.loading-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: var(--text);
  font-size: 1.3rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 280px;
  background: rgba(10, 16, 28, 0.9);
  border-right: 1px solid var(--line);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.brand-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-badge {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: #061320;
  font-weight: 800;
}

.brand-badge.large {
  width: 56px;
  height: 56px;
  font-size: 1.4rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

h1, h2, h3, p {
  margin-top: 0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-btn,
.primary-btn,
.ghost-btn {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  transition: 0.2s ease;
}

.nav-btn {
  background: transparent;
  color: var(--text);
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.nav-btn.active,
.nav-btn:hover {
  background: rgba(110, 231, 183, 0.12);
  border-color: rgba(110, 231, 183, 0.35);
}

.user-card,
.panel,
.stat-card,
.tournament-card,
.admin-box,
.login-card,
.wallet-box,
.empty-state {
  background: rgba(18, 26, 44, 0.92);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 12px 32px var(--shadow);
}

.user-card {
  margin-top: auto;
  padding: 16px;
}

.user-card p,
.user-card small {
  display: block;
  margin-bottom: 8px;
}

.badge-role {
  display: inline-block;
  margin-bottom: 12px;
  background: rgba(125, 211, 252, 0.12);
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--accent);
  font-size: 0.7rem;
  text-transform: uppercase;
}

.main-panel {
  flex: 1;
  padding: 32px;
}

.topbar,
.section-header,
.card-header,
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.topbar {
  margin-bottom: 18px;
}

.stats-grid,
.quick-grid,
.summary-strip,
.card-grid,
.admin-grid,
.wallet-grid {
  display: grid;
  gap: 18px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  margin-bottom: 22px;
}

.quick-grid {
  grid-template-columns: 1.2fr 1fr;
}

.stat-card {
  padding: 18px;
}

.stat-card small {
  color: var(--muted);
}

.stat-card h3 {
  font-size: 1.7rem;
  margin-bottom: 0;
}

.panel {
  padding: 18px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--muted);
}

.spotlight-card {
  background: linear-gradient(135deg, rgba(22, 34, 52, 0.95), rgba(22, 51, 44, 0.88));
}

.leaderboard-list {
  display: grid;
  gap: 12px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.leaderboard-row:last-child {
  border-bottom: none;
}

.summary-strip {
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  margin-bottom: 18px;
}

.mini-stat {
  background: rgba(17, 25, 40, 0.8);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
}

.mini-stat small {
  color: var(--muted);
  display: block;
  margin-bottom: 8px;
}

.card-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.tournament-card {
  padding: 18px;
}

.pill {
  background: rgba(52, 211, 153, 0.15);
  color: var(--primary);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.72rem;
}

.meta {
  flex-direction: column;
  align-items: flex-start;
  margin: 12px 0;
  color: var(--muted);
}

.primary-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  color: #061320;
  font-weight: 700;
}

.primary-btn:hover {
  filter: brightness(1.05);
}

.ghost-btn {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text);
}

.full-width {
  width: 100%;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px;
}

.avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  font-size: 1.8rem;
  font-weight: 800;
  color: #07111f;
}

.admin-grid {
  grid-template-columns: repeat(2, minmax(220px, 1fr));
}

.admin-box {
  padding: 22px;
}

.wallet-grid {
  grid-template-columns: repeat(2, minmax(220px, 1fr));
}

.wallet-box {
  padding: 24px;
}

.wallet-box small {
  color: var(--muted);
}

.wallet-box h2 {
  margin: 8px 0;
  font-size: 2.2rem;
}

.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
}

.login-card {
  width: min(420px, 100%);
  padding: 28px;
}

.logo-wrap {
  text-align: center;
  margin-bottom: 18px;
}

.login-form {
  display: grid;
  gap: 16px;
}

.login-form label {
  display: grid;
  gap: 8px;
  color: var(--muted);
}

.login-form input {
  width: 100%;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: var(--text);
  border-radius: 12px;
  padding: 12px 14px;
}

.demo-note {
  padding-top: 14px;
  margin-bottom: 0;
  color: var(--muted);
  text-align: center;
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--line);
  }

  .stats-grid,
  .wallet-grid,
  .quick-grid,
  .admin-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .main-panel {
    padding: 18px;
  }

  .stats-grid,
  .wallet-grid,
  .quick-grid,
  .admin-grid,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .profile-card,
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
