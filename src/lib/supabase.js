import { useEffect, useMemo, useState } from 'react'
import {
  demoUsers,
  fetchTournamentsFromSupabase,
  loginWithSupabase,
  mockLeaderboard,
  supabase,
  joinTournamentInSupabase,
  seedSupabaseDemoData
} from './lib/supabase'

const storageKey = 'clash-arena-user'

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : null
  })

  const [activeTab, setActiveTab] = useState('dashboard')
  const [tournaments, setTournaments] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadTournaments = async () => {
      if (!supabase) {
        setTournaments([])
        setIsLoading(false)
        return
      }

      try {
        await seedSupabaseDemoData()
        const rows = await fetchTournamentsFromSupabase()
        if (rows?.length) {
          setTournaments(rows)
        } else {
          setTournaments([])
        }
      } catch (error) {
        console.error('Error loading tournaments:', error)
        setTournaments([])
      } finally {
        setIsLoading(false)
      }
    }

    loadTournaments()
  }, [])

  const handleLogin = async (formData) => {
    const loginValue = formData.login.trim().toLowerCase().replace(/\s+/g, '')
    const password = formData.password

    try {
      if (supabase) {
        const supabaseUser = await loginWithSupabase({ login: loginValue, password })
        if (supabaseUser) {
          localStorage.setItem(storageKey, JSON.stringify(supabaseUser))
          setUser(supabaseUser)
          return
        }
      }
    } catch (error) {
      console.error('Supabase login failed, falling back to demo mode:', error)
    }

    const foundUser = Object.values(demoUsers).find((account) => {
      const values = [
        account.username,
        account.email,
        account.phone,
        account.full_name
      ].map((value) => value.toLowerCase().replace(/\s+/g, ''))

      return values.includes(loginValue)
    })

    if (!foundUser || password !== '123456') {
      alert('Invalid login. Demo credentials: demo / demo@clasharena.app / +8801700000000 or admin and password = 123456')
      return
    }

    const loggedUser = { ...foundUser }
    localStorage.setItem(storageKey, JSON.stringify(loggedUser))
    setUser(loggedUser)
  }

  const handleLogout = () => {
    localStorage.removeItem(storageKey)
    setUser(null)
  }

  const handleJoinTournament = async (tournamentId) => {
    if (!user) return

    try {
      if (supabase) {
        await joinTournamentInSupabase(user.id, tournamentId)
      }
    } catch (error) {
      console.error('Tournament join failed:', error)
    }

    setTournaments((current) =>
      current.map((tournament) =>
        tournament.id === tournamentId
          ? { ...tournament, registered: Number(tournament.registered || 0) + 1 }
          : tournament
      )
    )

    setUser((currentUser) =>
      currentUser
        ? { ...currentUser, coins: Number(currentUser.coins || 0) + 50 }
        : currentUser
    )

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...user,
        coins: Number(user.coins || 0) + 50
      })
    )
  }

  const userStats = useMemo(
    () => [
      { label: 'Tournament Played', value: '12' },
      { label: 'Win Rate', value: '58%' },
      { label: 'Coins', value: `${user?.coins ?? 0}` },
      { label: 'Rank', value: user?.role === 'admin' ? 'Admin' : '#18' }
    ],
    [user]
  )

  const totalSlots = tournaments.reduce((sum, item) => sum + Number(item.slots || 0), 0)
  const totalRegistered = tournaments.reduce((sum, item) => sum + Number(item.registered || 0), 0)

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (isLoading && supabase) {
    return <div className="loading-screen">Loading Clash Arena...</div>
  }

  const isAdmin = user.role === 'admin'

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
            ['wallet', 'Wallet'],
            ['profile', 'Profile'],
            isAdmin ? ['admin', 'Admin Panel'] : null
          ]
            .filter(Boolean)
            .map(([key, label]) => (
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
          <small>@{user.username}</small>
          <span className="badge-role">{user.role}</span>
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

            <div className="quick-grid">
              <div className="panel spotlight-card">
                <p className="eyebrow">Current event</p>
                <h3>Daily Clash Cup</h3>
                <p>Free entry • 25 players • 6 squads • Winner gets prize pool</p>
                <button className="primary-btn" onClick={() => setActiveTab('tournaments')}>
                  Join Now
                </button>
              </div>

              <div className="panel">
                <div className="section-header">
                  <h3>Leaderboard</h3>
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

            <div className="summary-strip">
              <div className="mini-stat">
                <small>Total slots</small>
                <strong>{totalSlots}</strong>
              </div>
              <div className="mini-stat">
                <small>Players joined</small>
                <strong>{totalRegistered}</strong>
              </div>
              <div className="mini-stat">
                <small>Entry fee</small>
                <strong>Free</strong>
              </div>
            </div>

            <div className="card-grid">
              {tournaments.length === 0 ? (
                <div className="panel empty-state">No tournaments available yet.</div>
              ) : (
                tournaments.map((tournament) => (
                  <div key={tournament.id} className="tournament-card">
                    <div className="card-header">
                      <span className="pill">{tournament.status}</span>
                      <span>{tournament.game}</span>
                    </div>
                    <h3>{tournament.title}</h3>
                    <div className="meta">
                      <span>Prize: {tournament.prize}</span>
                      <span>Entry: {tournament.entryFee || 'Free'}</span>
                      <span>{tournament.registered || 0}/{tournament.slots || 0} joined</span>
                    </div>
                    <p>{tournament.start_time}</p>
                    <button className="primary-btn" onClick={() => handleJoinTournament(tournament.id)}>
                      Join Tournament
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'wallet' && (
          <section>
            <div className="topbar">
              <div>
                <p className="eyebrow">Balance</p>
                <h1>Wallet</h1>
              </div>
            </div>

            <div className="wallet-grid">
              <div className="panel wallet-box">
                <small>Available Coins</small>
                <h2>{user.coins}</h2>
                <p>Earn coins by joining tournaments and winning matches.</p>
              </div>
              <div className="panel wallet-box">
                <small>Rewards</small>
                <h2>৳0</h2>
                <p>Daily prize pool and bonus rewards are shown here.</p>
              </div>
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
                <p>Role: {user.role}</p>
              </div>
            </div>
          </section>
        )}

        {isAdmin && activeTab === 'admin' && (
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
                <p>{tournaments.length} tournaments running</p>
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

        <p className="demo-note">Demo login: username/email/phone = demo or admin, password = 123456</p>
      </div>
    </div>
  )
}

export default App
