import { useEffect, useMemo, useState } from 'react'
import {
  loginWithSupabase,
  mockLeaderboard,
  supabase,
  mockTournaments,
  createUserInSupabase,
  updateUserProfileInSupabase
} from './lib/supabase.js'

const storageKey = 'clashx7-user'

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : null
  })

  const [activeTab, setActiveTab] = useState('dashboard')
  const [tournaments, setTournaments] = useState(mockTournaments)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [form, setForm] = useState({
    title: '',
    game: 'Free Fire',
    prize: '৳1200',
    slots: '50',
    start_time: ''
  })
  const [profileForm, setProfileForm] = useState({
    game_name: '',
    email: '',
    wallet_balance: 0
  })

  useEffect(() => {
    if (user) {
      setProfileForm({
        game_name: user.game_name || '',
        email: user.email || '',
        wallet_balance: user.wallet_balance || 0
      })
    }
  }, [user])

  const handleLogin = async (formData) => {
    const email = formData.login.trim()
    const password = formData.password

    if (!email || !password) {
      alert('Please fill in all fields.')
      return
    }

    try {
      if (supabase) {
        const supabaseUser = await loginWithSupabase({ email, password })
        if (supabaseUser) {
          localStorage.setItem(storageKey, JSON.stringify(supabaseUser))
          setUser(supabaseUser)
          return
        }
      }
    } catch (error) {
      console.error('Supabase login failed:', error)
      alert(error.message)
    }
  }

  const handleSignup = async ({ game_name, email, password }) => {
    const trimmedGameName = game_name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedGameName || !trimmedEmail || !password) {
      alert('Please fill in all fields.')
      return
    }

    try {
      if (supabase) {
        const remoteUser = await createUserInSupabase({
          email: trimmedEmail,
          password,
          game_name: trimmedGameName
        })
        if (remoteUser) {
          alert('Account created successfully! Please login.')
          setAuthMode('login')
        }
      }
    } catch (error) {
      console.error('Supabase signup failed:', error)
      alert(error.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(storageKey)
    setUser(null)
  }

  const handleJoinTournament = async (tournamentId) => {
    if (!user) return

    setTournaments((current) =>
      current.map((tournament) =>
        tournament.id === tournamentId
          ? { ...tournament, registered: Number(tournament.registered || 0) + 1 }
          : tournament
      )
    )

    const nextBalance = Number(user.wallet_balance || 0) + 50
    const updatedUser = { ...user, wallet_balance: nextBalance }
    setUser(updatedUser)
    localStorage.setItem(storageKey, JSON.stringify(updatedUser))
  }

  const handleCreateTournament = async (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      alert('Tournament title is required')
      return
    }

    const generatedTournament = {
      id: Date.now(),
      title: form.title.trim(),
      game: form.game,
      prize: form.prize || '৳1200',
      entryFee: 'Free',
      slots: Number(form.slots) || 50,
      registered: 0,
      start_time: form.start_time || 'Tomorrow, 8:00 PM',
      status: 'Open'
    }

    setTournaments((current) => [generatedTournament, ...current])
    setForm({ title: '', game: 'Free Fire', prize: '৳1200', slots: '50', start_time: '' })
    setActiveTab('tournaments')
  }

  const handleProfileSave = async (event) => {
    event.preventDefault()

    const updatedData = {
      game_name: profileForm.game_name.trim()
    }

    try {
      if (supabase) {
        const backendUser = await updateUserProfileInSupabase(user.id, updatedData)
        if (backendUser) {
          const mergedUser = { ...user, ...backendUser }
          setUser(mergedUser)
          localStorage.setItem(storageKey, JSON.stringify(mergedUser))
        }
      }
    } catch (error) {
      console.error('Profile update failed:', error)
      alert(error.message)
    }

    setIsEditingProfile(false)
  }

  const userStats = useMemo(
    () => [
      { label: 'Tournament Played', value: '12' },
      { label: 'Win Rate', value: '58%' },
      { label: 'Wallet Balance', value: `৳${user?.wallet_balance ?? 0}` },
      { label: 'Role', value: user?.role === 'admin' ? 'Admin' : 'Player' }
    ],
    [user]
  )

  const totalSlots = tournaments.reduce((sum, item) => sum + Number(item.slots || 0), 0)
  const totalRegistered = tournaments.reduce((sum, item) => sum + Number(item.registered || 0), 0)

  if (!user) {
    return <AuthScreen authMode={authMode} setAuthMode={setAuthMode} onLogin={handleLogin} onSignup={handleSignup} />
  }

  if (isLoading && supabase) {
    return <div className="loading-screen">Loading ClashX7...</div>
  }

  const isAdmin = user.role === 'admin'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-badge">CX7</div>
          <div>
            <p className="eyebrow">Game Arena</p>
            <h2>ClashX7</h2>
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
          <p>{user.game_name}</p>
          <small>{user.email}</small>
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
              <button className="primary-btn" onClick={() => setActiveTab('tournaments')}>
                View Matches
              </button>
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
                      <span className="pill">{tournament.status || 'Open'}</span>
                      <span>{tournament.game}</span>
                    </div>
                    <h3>{tournament.title}</h3>
                    <div className="meta">
                      <span>Prize: {tournament.prize}</span>
                      <span>Entry: {tournament.entryFee || 'Free'}</span>
                      <span>{tournament.registered || 0}/{tournament.slots || 0} joined</span>
                    </div>
                    <p>{tournament.start_time}</p>
                    {tournament.winner && <p className="winner-tag">Winner: {tournament.winner}</p>}
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
                <small>Wallet Balance</small>
                <h2>৳{user.wallet_balance || 0}</h2>
                <p>Earn rewards by joining tournaments and winning matches.</p>
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
              {!isEditingProfile && (
                <button className="primary-btn" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form className="panel profile-form" onSubmit={handleProfileSave}>
                <div className="form-grid">
                  <div className="field-group">
                    <label>Game Name</label>
                    <input
                      value={profileForm.game_name}
                      onChange={(event) => setProfileForm({ ...profileForm, game_name: event.target.value })}
                    />
                  </div>
                  <div className="field-group full-width-buttons">
                    <button type="submit" className="primary-btn">Save Profile</button>
                    <button type="button" className="ghost-btn" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="profile-card panel">
                <div className="avatar">{user.game_name ? user.game_name.charAt(0) : 'U'}</div>
                <div className="profile-info">
                  <h3>{user.game_name}</h3>
                  <p>Email: {user.email}</p>
                  <p>Wallet Balance: ৳{user.wallet_balance || 0}</p>
                  <p>Role: {user.role}</p>
                </div>
              </div>
            )}
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

            <div className="panel tournament-form-panel">
              <h3>Create Tournament</h3>
              <form onSubmit={handleCreateTournament} className="form-grid">
                <div className="field-group">
                  <label>Tournament Name</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="Example: Royal Arena Cup"
                  />
                </div>

                <div className="field-group">
                  <label>Game</label>
                  <select
                    value={form.game}
                    onChange={(event) => setForm({ ...form, game: event.target.value })}
                  >
                    <option value="Free Fire">Free Fire</option>
                    <option value="PUBG Mobile">PUBG Mobile</option>
                    <option value="BGMI">BGMI</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Prize</label>
                  <input
                    type="text"
                    value={form.prize}
                    onChange={(event) => setForm({ ...form, prize: event.target.value })}
                    placeholder="৳1200"
                  />
                </div>

                <div className="field-group">
                  <label>Slots</label>
                  <input
                    type="number"
                    min="10"
                    value={form.slots}
                    onChange={(event) => setForm({ ...form, slots: event.target.value })}
                  />
                </div>

                <div className="field-group full-width">
                  <label>Start Time</label>
                  <input
                    type="text"
                    value={form.start_time}
                    onChange={(event) => setForm({ ...form, start_time: event.target.value })}
                    placeholder="Tomorrow, 8:00 PM"
                  />
                </div>

                <button type="submit" className="primary-btn full-width">
                  Publish Tournament
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function AuthScreen({ authMode, setAuthMode, onLogin, onSignup }) {
  if (authMode === 'signup') {
    return <SignupPage onSignup={onSignup} onSwitch={() => setAuthMode('login')} />
  }

  return <LoginPage onLogin={onLogin} onSwitch={() => setAuthMode('signup')} />
}

function LoginPage({ onLogin, onSwitch }) {
  const [formData, setFormData] = useState({ login: '', password: '' })

  const submitForm = (event) => {
    event.preventDefault()
    onLogin(formData)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="logo-wrap">
          <div className="brand-badge large">CX7</div>
          <h1>ClashX7 Login</h1>
        </div>

        <form onSubmit={submitForm} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              placeholder="you@example.com"
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

        <div className="auth-switch-row">
          <span>Don’t have an account?</span>
          <button type="button" className="link-btn" onClick={onSwitch}>Create account</button>
        </div>
      </div>
    </div>
  )
}

function SignupPage({ onSignup, onSwitch }) {
  const [formData, setFormData] = useState({
    game_name: '',
    email: '',
    password: ''
  })

  const submitForm = (event) => {
    event.preventDefault()
    onSignup(formData)
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="logo-wrap">
          <div className="brand-badge large">CX7</div>
          <h1>Sign Up</h1>
        </div>

        <form onSubmit={submitForm} className="login-form">
          <label>
            Game Name
            <input
              type="text"
              value={formData.game_name}
              onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
              placeholder="Your Free Fire name"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Create password"
            />
          </label>

          <button type="submit" className="primary-btn full-width">
            Create Account
          </button>
        </form>

        <div className="auth-switch-row">
          <span>Already registered?</span>
          <button type="button" className="link-btn" onClick={onSwitch}>Back to login</button>
        </div>
      </div>
    </div>
  )
}

export default App
