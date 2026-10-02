import { useEffect, useMemo, useState } from 'react'
import {
  demoUsers,
  fetchTournamentsFromSupabase,
  loginWithSupabase,
  mockLeaderboard,
  supabase,
  joinTournamentInSupabase,
  createTournamentInSupabase,
  mockTournaments,
  updateTournamentResultInSupabase,
  createUserInSupabase,
  updateUserProfileInSupabase
} from './lib/supabase.js'


const storageKey = 'clash-arena-user'

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : null
  })

  const [activeTab, setActiveTab] = useState('dashboard')
  const [tournaments, setTournaments] = useState(mockTournaments)
  const [isLoading, setIsLoading] = useState(true)
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
    full_name: '',
    username: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      })
    }
  }, [user])

  useEffect(() => {
    const loadTournaments = async () => {
      if (!supabase) {
        setTournaments(mockTournaments)
        setIsLoading(false)
        return
      }

      try {
        await seedSupabaseDemoData()
        const rows = await fetchTournamentsFromSupabase()
        setTournaments(rows.length ? rows : mockTournaments)
      } catch (error) {
        console.error('Error loading tournaments:', error)
        setTournaments(mockTournaments)
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
      console.error('Supabase login failed:', error)
    }
    alert('Supabase login failed. Please check your credentials.')
  }

  const handleSignup = async ({ full_name, username, email, phone, password }) => {
    const trimmedName = full_name.trim()
    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName || !trimmedUsername || !trimmedEmail || !trimmedPhone || !password) {
      alert('Please fill in all fields.')
      return
    }

    const newUser = {
      id: `user-${Date.now()}`,
      full_name: trimmedName,
      username: trimmedUsername,
      email: trimmedEmail,
      phone: trimmedPhone,
      coins: 500,
      role: 'user',
      password_hash: password
    }

    try {
      if (supabase) {
        const remoteUser = await createUserInSupabase(newUser)
        if (remoteUser) {
          setUser(remoteUser)
          localStorage.setItem(storageKey, JSON.stringify(remoteUser))
          setAuthMode('login')
          return
        }
      }
    } catch (error) {
      console.error('Supabase signup failed:', error)
      alert('Signup failed via Supabase.')
    }
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

    const nextCoins = Number(user.coins || 0) + 50
    const updatedUser = { ...user, coins: nextCoins }
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

    try {
      if (supabase) {
        const inserted = await createTournamentInSupabase({
          title: generatedTournament.title,
          game: generatedTournament.game,
          prize: generatedTournament.prize,
          slots: generatedTournament.slots,
          start_time: generatedTournament.start_time
        })

        if (inserted) {
          setTournaments((current) => [inserted, ...current])
        }
      } else {
        setTournaments((current) => [generatedTournament, ...current])
      }
    } catch (error) {
      console.error('Create tournament failed:', error)
      setTournaments((current) => [generatedTournament, ...current])
    }

    setForm({ title: '', game: 'Free Fire', prize: '৳1200', slots: '50', start_time: '' })
    setActiveTab('tournaments')
  }

  const handleResultSubmit = async (tournamentId, winnerName) => {
    if (!winnerName.trim()) return

    try {
      await updateTournamentResultInSupabase(tournamentId, winnerName)
      setTournaments((current) =>
        current.map((item) =>
          item.id === tournamentId ? { ...item, winner: winnerName.trim(), status: 'Completed' } : item
        )
      )
    } catch (error) {
      console.error('Result update failed:', error)
    }
  }

  const handleProfileSave = async (event) => {
    event.preventDefault()

    const updatedUser = {
      ...user,
      full_name: profileForm.full_name.trim(),
      username: profileForm.username.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim()
    }

    try {
      if (supabase) {
        const backendUser = await updateUserProfileInSupabase(user.id, updatedUser)
        if (backendUser) {
          setUser(backendUser)
          localStorage.setItem(storageKey, JSON.stringify(backendUser))
        }
      }
    } catch (error) {
      console.error('Profile update failed:', error)
    }

    setUser(updatedUser)
    localStorage.setItem(storageKey, JSON.stringify(updatedUser))
    setIsEditingProfile(false)
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
    return <AuthScreen authMode={authMode} setAuthMode={setAuthMode} onLogin={handleLogin} onSignup={handleSignup} />
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

                    {isAdmin && (
                      <div className="result-box">
                        <input
                          type="text"
                          placeholder="Winner name"
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              handleResultSubmit(tournament.id, event.target.value)
                              event.target.value = ''
                            }
                          }}
                        />
                      </div>
                    )}
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
                    <label>Full Name</label>
                    <input
                      value={profileForm.full_name}
                      onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label>Username</label>
                    <input
                      value={profileForm.username}
                      onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label>Phone</label>
                    <input
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
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
              placeholder="demo / email / phone"
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
    full_name: '',
    username: '',
    email: '',
    phone: '',
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
          <div className="brand-badge large">CA</div>
          <h1>Sign Up</h1>
        </div>

        <form onSubmit={submitForm} className="login-form">
          <label>
            Full Name
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Your full name"
            />
          </label>

          <label>
            Username
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="username"
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
            Phone
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+88017..."
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
          <button type="button" className="link-dev" onClick={onSwitch}>Back to login</button>
        </div>
      </div>
    </div>
  )
}

export default App
