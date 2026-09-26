import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { localUser, mockLeaderboard, mockTournaments } from './lib/supabase'

const storageKey = 'clash-arena-user'

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : null
  })

  const [activeTab, setActiveTab] = useState('dashboard')

  const handleLogin = (formData) => {
    const loginValue = formData.login.trim().toLowerCase()
    const matched =
      loginValue === localUser.username ||
      loginValue === localUser.email ||
      loginValue === localUser.phone.replace(/\s+/g, '').toLowerCase() ||
      loginValue === localUser.full_name.toLowerCase()

    if (!matched || formData.password !== '123456') {
      alert('Invalid login. Demo credentials: username/email/phone = demo or demo@clasharena.app or +8801700000000 and password = 123456')
      return
    }

    const loggedUser = { ...localUser }
    localStorage.setItem(storageKey, JSON.stringify(loggedUser))
    setUser(loggedUser)
  }

  const handleLogout = () => {
    localStorage.removeItem(storageKey)
    setUser(null)
  }

  const userStats = useMemo(
    () => [
      { label: 'Tournament Played', value: '12' },
      { label: 'Win Rate', value: '58%' },
      { label: 'Coins', value: `${user?.coins ?? 0}` },
      { label: 'Rank', value: '#18' }
    ],
    [user]
  )

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-badge">CA</div>
          <div>
            <p className="eyebrow">Game Arena</p>
            <h2>Clash Arena</h2>
          </div>
        </div>

        <nav className="nav">
          {[
            ['dashboard', 'Dashboard'],
            ['tournaments', 'Tournaments'],
            ['profile', 'Profile'],
            ['admin', 'Admin Panel']
          ].map(([key, label]) => (
            <button
              key={key}
              className={activeTab === key ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="user-card">
          <p>{user.full_name}</p>
          <small>{user.username}</small>
          <button className="ghost-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-panel">
        {activeTab === 'dashboard' && (
          <section>
            <div className="topbar">
              <div>
                <p className="eyebrow">Welcome back</p>
                <h1>Dashboard</h1>
              </div>
              <button className="primary-btn">Create Match</button>
            </div>

            <div className="stats-grid">
              {userStats.map((item) => (
                <div key={item.label} className="stat-card">
                  <small>{item.label}</small>
                  <h3>{item.value}</h3>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="section-header">
                <h3>Leaderboard</h3>
                <Link to="/">View all</Link>
              </div>
              <div className="leaderboard-list">
                {mockLeaderboard.map((player) => (
                  <div key={player.rank} className="leaderboard-row">
                    <span>#{player.rank}</span>
                    <strong>{player.name}</strong>
                    <span>{player.wins} Wins</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'tournaments' && (
          <section>
            <div className="topbar">
              <div>
                <p className="eyebrow">Daily events</p>
                <h1>Available Tournaments</h1>
              </div>
            </div>

            <div className="card-grid">
              {mockTournaments.map((tournament) => (
                <div key={tournament.id} className="tournament-card">
                  <div className="card-header">
                    <span className="pill">{tournament.status}</span>
                    <span>{tournament.game}</span>
                  </div>
                  <h3>{tournament.title}</h3>
                  <div className="meta">
                    <span>Prize: {tournament.prize}</span>
                    <span>{tournament.registered}/{tournament.slots} joined</span>
                  </div>
                  <p>{tournament.start_time}</p>
                  <button className="primary-btn">Join Tournament</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section>
            <div className="topbar">
              <div>
                <p className="eyebrow">Your account</p>
                <h1>Profile</h1>
              </div>
            </div>

            <div className="profile-card panel">
              <div className="avatar">{user.full_name.charAt(0)}</div>
              <div className="profile-info">
                <h3>{user.full_name}</h3>
                <p>Username: @{user.username}</p>
                <p>Email: {user.email}</p>
                <p>Phone: {user.phone}</p>
                <p>Coins: {user.coins}</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'admin' && (
          <section>
            <div className="topbar">
              <div>
                <p className="eyebrow">Management</p>
                <h1>Admin Panel</h1>
              </div>
            </div>

            <div className="panel admin-grid">
              <div className="admin-box">
                <h3>Active Matches</h3>
                <p>12 tournaments running</p>
              </div>
              <div className="admin-box">
                <h3>Players</h3>
                <p>8,420 registered users</p>
              </div>
              <div className="admin-box">
                <h3>Transactions</h3>
                <p>৳14,500 processed</p>
              </div>
              <div className="admin-box">
                <h3>Reports</h3>
                <p>3 new issues</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({ login: '', password: '' })

  const submitForm = (event) => {
    event.preventDefault()
    onLogin(formData)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="logo-wrap">
          <div className="brand-badge large">CA</div>
          <h1>Clash Arena</h1>
        </div>

        <form onSubmit={submitForm} className="login-form">
          <label>
            Username / Email / Phone
            <input
              type="text"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              placeholder="demo / demo@clasharena.app / +8801700000000"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
            />
          </label>

          <button type="submit" className="primary-btn full-width">
            Login
          </button>
        </form>

        <p className="demo-note">Demo login: username/email/phone = demo, password = 123456</p>
      </div>
    </div>
  )
}

export default App
