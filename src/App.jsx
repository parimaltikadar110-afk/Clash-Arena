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

  const [activeTab, setActiveTab] = useState('home')
  const [matchCategory, setMatchCategory] = useState('SOLO BR')
  const [tournaments, setTournaments] = useState(mockTournaments)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [walletInput, setWalletInput] = useState('50')
  const [selectedGateway, setSelectedGateway] = useState('Zap UPI')
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

  // Match join validation logic (Checks user wallet balance)
  const handleJoinTournament = async (tournamentId, entryFeeText) => {
    if (!user) return

    // Extract entry fee number (e.g. "₹8 JOIN" or "FREE JOIN" -> 8 or 0)
    let fee = 0
    if (entryFeeText && entryFeeText.includes('₹')) {
      fee = Number(entryFeeText.replace(/[^0-9]/g, '')) || 0
    }

    const currentBalance = Number(user.wallet_balance || 0)

    if (currentBalance < fee) {
      alert(`Insufficient balance! You need ₹${fee} to join this match. Please add money to your wallet.`)
      setActiveTab('wallet')
      return
    }

    setTournaments((current) =>
      current.map((tournament) =>
        tournament.id === tournamentId
          ? { ...tournament, registered: Number(tournament.registered || 0) + 1 }
          : tournament
      )
    )

    const nextBalance = currentBalance - fee
    const updatedUser = { ...user, wallet_balance: nextBalance }
    setUser(updatedUser)
    localStorage.setItem(storageKey, JSON.stringify(updatedUser))
    alert('Successfully joined the tournament!')
  }

  // Gateway integration flow for adding money
  const handleAddWalletGateway = (e) => {
    e.preventDefault()
    const amount = Number(walletInput)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    // Simulating Gateway Redirect (Zap UPI / TrendUPI / Cashfree)
    alert(`Redirecting to ${selectedGateway} payment gateway for ₹${amount}... Please complete payment.`)

    setTimeout(() => {
      const nextBalance = Number(user.wallet_balance || 0) + amount
      const updatedUser = { ...user, wallet_balance: nextBalance }
      setUser(updatedUser)
      localStorage.setItem(storageKey, JSON.stringify(updatedUser))
      alert(`Payment successful via ${selectedGateway}! Added ₹${amount} to your wallet.`)
    }, 1000)
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
      entryFee: '₹8 JOIN',
      slots: Number(form.slots) || 32,
      registered: 0,
      start_time: form.start_time || '26 Sep 12:30 PM',
      status: 'Open'
    }

    setTournaments((current) => [generatedTournament, ...current])
    setForm({ title: '', game: 'Free Fire', prize: '৳1200', slots: '50', start_time: '' })
    setActiveTab('home')
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
      { label: 'Wallet Balance', value: `₹${user?.wallet_balance ?? 0}` },
      { label: 'Role', value: user?.role === 'admin' ? 'Admin' : 'Player' }
    ],
    [user]
  )

  if (!user) {
    return <AuthScreen authMode={authMode} setAuthMode={setAuthMode} onLogin={handleLogin} onSignup={handleSignup} />
  }

  if (isLoading && supabase) {
    return <div className="loading-screen">Loading ClashX7...</div>
  }

  const isAdmin = user.role === 'admin'

  return (
    <div className="app-shell clash-x-theme" style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px' }}>
      
      {/* Top Header */}
      <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="user-profile-mini" onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <div className="avatar-circle" style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user.game_name ? user.game_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
        <div className="header-wallet" onClick={() => setActiveTab('wallet')} style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', gap: '6px' }}>
          <span className="wallet-icon">👛</span>
          <span style={{ fontWeight: 'bold', color: '#10b981' }}>₹{user.wallet_balance || 0}</span>
          <span className="dropdown-arrow" style={{ fontSize: '10px', color: '#64748b' }}>▼</span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="main-panel">
        
        {/* HOME / MATCHES TAB (Clash X 24 Style) */}
        {activeTab === 'home' && (
          <section className="home-section">
            <div className="category-scroll" style={{ display: 'flex', overflowX: 'auto', gap: '8px', padding: '12px 16px', background: '#fff', whiteSpace: 'nowrap', borderBottom: '1px solid #eee' }}>
              {['SOLO BR', 'DUO BR', 'DUO PR KILL', 'SOLO PER KILL', 'LONE WOLF', 'CS CHALLENGERS', 'CLASH SQUAD', 'CS HEADSHOT', 'LOSS TO WIN'].map((cat) => (
                <button
                  key={cat}
                  className={matchCategory === cat ? 'cat-pill active' : 'cat-pill'}
                  onClick={() => setMatchCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: 'none',
                    background: matchCategory === cat ? '#dc2626' : '#f1f5f9',
                    color: matchCategory === cat ? '#fff' : '#475569',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="tournament-list-container" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="match-card-modern" style={{ background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div className="match-card-top" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <span className="match-badge" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>SOLO</span>
                    <span className="match-badge" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>BERMUDA</span>
                    <span className="match-badge" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{tournament.slots || 32} SLOTS</span>
                  </div>

                  <div className="match-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="match-info">
                      <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>{tournament.title}</h3>
                      <p className="prize-text" style={{ color: '#dc2626', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>Prize Pool - {tournament.prize || '₹225'}</p>
                    </div>
                    <div className="match-thumbnail" style={{ width: '70px', height: '50px', background: '#cbd5e1', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '20px' }}>🎮</span>
                    </div>
                  </div>

                  <div className="match-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <span className="match-id-text" style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>MATCH ID</span>
                    <span className="spots-left-text" style={{ fontSize: '12px', color: '#64748b' }}>{tournament.slots - (tournament.registered || 0)} spots left</span>
                    <button 
                      className="join-match-btn" 
                      onClick={() => handleJoinTournament(tournament.id, tournament.entryFee || '₹8 JOIN')}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {tournament.entryFee || '₹8 JOIN'}
                    </button>
                  </div>
                  <div className="match-time-row" style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                    <span>{tournament.start_time || '26 Sep 12:30 PM'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MY MATCHES TAB */}
        {activeTab === 'matches' && (
          <section className="section-padded" style={{ padding: '16px' }}>
            <h2>My Matches</h2>
            <div className="panel empty-state" style={{ background: '#fff', padding: '20px', textAlign: 'center', borderRadius: '8px', marginTop: '10px', color: '#64748b' }}>
              You haven't joined any matches yet.
            </div>
          </section>
        )}

        {/* CLASH STORE TAB */}
        {activeTab === 'store' && (
          <section className="section-padded" style={{ padding: '16px' }}>
            <h2>Clash Store</h2>
            <div className="panel empty-state" style={{ background: '#fff', padding: '20px', textAlign: 'center', borderRadius: '8px', marginTop: '10px', color: '#64748b' }}>
              Store items will appear soon.
            </div>
          </section>
        )}

        {/* WALLET TAB WITH GATEWAY INTEGRATION (Zap UPI / TrendUPI / Cashfree) */}
        {activeTab === 'wallet' && (
          <section className="section-padded wallet-screen" style={{ padding: '16px' }}>
            <h2 style={{ marginBottom: '15px' }}>Wallet</h2>
            <div className="panel wallet-box-modern" style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="balance-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '18px' }}>
                <span style={{ color: '#64748b' }}>Current Balance</span>
                <strong style={{ color: '#10b981' }}>₹{user.wallet_balance || 0}</strong>
              </div>

              <form onSubmit={handleAddWalletGateway} className="add-money-form">
                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>Enter amount to add</label>
                <input
                  type="number"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  min="1"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', fontSize: '15px' }}
                />

                <label style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '6px' }}>Select Payment Gateway</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  {['Zap UPI', 'TrendUPI', 'Cashfree'].map((gateway) => (
                    <button
                      type="button"
                      key={gateway}
                      onClick={() => setSelectedGateway(gateway)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: selectedGateway === gateway ? '2px solid #10b981' : '1px solid #cbd5e1',
                        background: selectedGateway === gateway ? '#f0fdf4' : '#fff',
                        color: selectedGateway === gateway ? '#10b981' : '#334155',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {gateway}
                    </button>
                  ))}
                </div>

                <button type="submit" className="success-btn" style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Pay ₹{walletInput} via {selectedGateway}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <section className="section-padded" style={{ padding: '16px' }}>
            <h2>Leaderboard</h2>
            <div className="panel leaderboard-panel" style={{ background: '#fff', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
              {mockLeaderboard.map((player) => (
                <div key={player.rank} className="leaderboard-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 'bold', color: '#f97316' }}>#{player.rank}</span>
                  <strong style={{ color: '#1e293b' }}>{player.name}</strong>
                  <span style={{ color: '#64748b' }}>{player.wins} Wins</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROFILE TAB (Clash X 24 Profile Style matching screenshot 16473_2.jpg) */}
        {activeTab === 'profile' && (
          <section className="section-padded profile-screen" style={{ padding: '16px', background: '#f8f9fa', minHeight: '80vh' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="avatar-large" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 10px auto', fontWeight: 'bold' }}>
                {user.game_name ? user.game_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>{user.game_name}</h3>
              <p style={{ color: '#64748b', fontSize: '13px', cursor: 'pointer' }} onClick={() => setIsEditingProfile(true)}>View Profile</p>
            </div>

            {isEditingProfile ? (
              <form className="panel profile-form" onSubmit={handleProfileSave} style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <div className="field-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: '#64748b' }}>Game Name</label>
                  <input
                    value={profileForm.game_name}
                    onChange={(event) => setProfileForm({ ...profileForm, game_name: event.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '4px' }}
                  />
                </div>
                <div className="field-group full-width-buttons" style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="primary-btn" style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                  <button type="button" className="ghost-btn" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, background: '#e2e8f0', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            ) : null}

            {/* Menu List matching screenshot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div onClick={() => setIsEditingProfile(true)} style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>👤 Account Settings</span>
                <span style={{ color: '#94a3b8' }}>›</span>
              </div>
              <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>🏆 Join Private Tournament</span>
                <span style={{ color: '#94a3b8' }}>›</span>
              </div>
              <div onClick={() => setActiveTab('wallet')} style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>💳 Withdrawals</span>
                <span style={{ color: '#94a3b8' }}>›</span>
              </div>
              <div onClick={() => setActiveTab('wallet')} style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>📋 Transactions</span>
                <span style={{ color: '#94a3b8' }}>›</span>
              </div>
              <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '14px', color: '#334155' }}>❓ Customer Support</span>
                <span style={{ color: '#94a3b8' }}>›</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button className="danger-btn" onClick={handleLogout} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>Logout</button>
              <small style={{ display: 'block', color: '#94a3b8', marginTop: '10px', fontSize: '11px' }}>Version 1.0.3</small>
            </div>

            {isAdmin && (
              <div className="panel admin-create-box" style={{ marginTop: '20px', background: '#fff', padding: '15px', borderRadius: '8px' }}>
                <h3>Create Tournament (Admin)</h3>
                <form onSubmit={handleCreateTournament} className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Tournament Name"
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="text"
                    value={form.prize}
                    onChange={(e) => setForm({ ...form, prize: e.target.value })}
                    placeholder="Prize Pool"
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <button type="submit" className="primary-btn" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Publish</button>
                </form>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav-bar" style={{ display: 'flex', justifyContent: 'space-around', background: '#fff', position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '1px solid #e2e8f0', padding: '8px 0', zIndex: 1000 }}>
        <button
          className={activeTab === 'home' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setActiveTab('home')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: activeTab === 'home' ? '#dc2626' : '#64748b', fontSize: '11px' }}
        >
          <span className="nav-icon" style={{ fontSize: '18px' }}>🏠</span>
          <span>Home</span>
        </button>
        <button
          className={activeTab === 'matches' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setActiveTab('matches')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: activeTab === 'matches' ? '#dc2626' : '#64748b', fontSize: '11px' }}
        >
          <span className="nav-icon" style={{ fontSize: '18px' }}>🏆</span>
          <span>My Matches</span>
        </button>
        <button
          className={activeTab === 'store' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setActiveTab('store')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: activeTab === 'store' ? '#dc2626' : '#64748b', fontSize: '11px' }}
        >
          <span className="nav-icon" style={{ fontSize: '18px' }}>🪙</span>
          <span>Clash Store</span>
        </button>
        <button
          className={activeTab === 'leaderboard' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setActiveTab('leaderboard')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: activeTab === 'leaderboard' ? '#dc2626' : '#64748b', fontSize: '11px' }}
        >
          <span className="nav-icon" style={{ fontSize: '18px' }}>📊</span>
          <span>Leaderboard</span>
        </button>
        <button
          className={activeTab === 'profile' ? 'bottom-nav-item active' : 'bottom-nav-item'}
          onClick={() => setActiveTab('profile')}
          style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: activeTab === 'profile' ? '#dc2626' : '#64748b', fontSize: '11px' }}
        >
          <span className="nav-icon" style={{ fontSize: '18px' }}>👤</span>
          <span>Profile</span>
        </button>
      </nav>
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
  const submitForm = (e) => {
    e.preventDefault()
    onLogin(formData)
  }
  return (
    <div className="login-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>
      <div className="login-card" style={{ background: '#fff', padding: '30px', borderRadius: '8px', width: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>ClashX7 Login</h1>
        <form onSubmit={submitForm} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: '#475569' }}>Email <input type="email" value={formData.login} onChange={(e) => setFormData({ ...formData, login: e.target.value })} placeholder="you@example.com" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></label>
          <label style={{ fontSize: '13px', color: '#475569' }}>Password <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Password" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></label>
          <button type="submit" className="primary-btn full-width" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Login</button>
        </form>
        <div className="auth-switch-row" style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
          <span>Don’t have an account?</span>
          <button type="button" className="link-btn" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>Create account</button>
        </div>
      </div>
    </div>
  )
}

function SignupPage({ onSignup, onSwitch }) {
  const [formData, setFormData] = useState({ game_name: '', email: '', password: '' })
  const submitForm = (e) => {
    e.preventDefault()
    onSignup(formData)
  }
  return (
    <div className="login-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>
      <div className="login-card" style={{ background: '#fff', padding: '30px', borderRadius: '8px', width: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>ClashX7 Sign Up</h1>
        <form onSubmit={submitForm} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: '#475569' }}>Game Name <input type="text" value={formData.game_name} onChange={(e) => setFormData({ ...formData, game_name: e.target.value })} placeholder="Your Free Fire Name" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></label>
          <label style={{ fontSize: '13px', color: '#475569' }}>Email <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></label>
          <label style={{ fontSize: '13px', color: '#475569' }}>Password <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Password" style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></label>
          <button type="submit" className="primary-btn full-width" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Create Account</button>
        </form>
        <div className="auth-switch-row" style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
          <span>Already registered?</span>
          <button type="button" className="link-btn" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>Back to login</button>
        </div>
      </div>
    </div>
  )
}

export default App
