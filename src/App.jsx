import React, { useState, useEffect } from 'react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  // Form states for Login/Signup
  const [isSignup, setIsSignup] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Email, Username, or Mobile
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Check LocalStorage on initial load for persistent session
  useEffect(() => {
    const savedLogin = localStorage.getItem('clash_isLoggedIn');
    const savedUser = localStorage.getItem('clash_user');
    if (savedLogin === 'true' && savedUser) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Handle Login or Signup submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignup) {
      // Register new user
      const newUser = {
        identifier,
        password,
        role: identifier.toLowerCase().includes('admin') ? 'super_admin' : 'user', // auto-assign admin role if identifier has 'admin'
        balance: 500
      };
      localStorage.setItem('clash_user_db', JSON.stringify(newUser));
      localStorage.setItem('clash_user', JSON.stringify(newUser));
      localStorage.setItem('clash_isLoggedIn', 'true');
      setIsLoggedIn(true);
      setCurrentUser(newUser);
    } else {
      // Login existing user
      const storedUserDb = JSON.parse(localStorage.getItem('clash_user_db'));
      if (storedUserDb && storedUserDb.identifier === identifier && storedUserDb.password === password) {
        localStorage.setItem('clash_user', JSON.stringify(storedUserDb));
        localStorage.setItem('clash_isLoggedIn', 'true');
        setIsLoggedIn(true);
        setCurrentUser(storedUserDb);
      } else {
        // Fallback for demo login if no DB exists
        const defaultUser = { 
          identifier, 
          password, 
          role: identifier.toLowerCase().includes('admin') ? 'super_admin' : 'user', 
          balance: 500 
        };
        localStorage.setItem('clash_user', JSON.stringify(defaultUser));
        localStorage.setItem('clash_isLoggedIn', 'true');
        setIsLoggedIn(true);
        setCurrentUser(defaultUser);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clash_isLoggedIn');
    localStorage.removeItem('clash_user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    window.location.reload(); // Prevents blank screen by fully reloading to login state
  };

  // 1. LOGIN / SIGNUP SCREEN
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#0e1726', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#ff7a18' }}>Clash Arena</h2>
          <p style={{ textAlign: 'center', color: '#a5b0c7', marginBottom: '20px', fontSize: '14px' }}>
            {isSignup ? 'Create your gaming account' : 'Login to your account'}
          </p>

          {error && <div style={{ background: '#ff3b3b22', color: '#ff3b3b', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Gmail / Username / Mobile</label>
              <input 
                type="text" 
                value={identifier} 
                onChange={(e) => setIdentifier(e.target.value)} 
                placeholder="Enter email, username or mobile" 
                style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
                style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ff7a18, #ff3b3b)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
              {isSignup ? 'Sign Up' : 'Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#a5b0c7', cursor: 'pointer' }} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </p>
        </div>
      </div>
    );
  }

  // 2. MAIN DASHBOARD (Clash Arena)
  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', paddingBottom: '70px', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#0e1726', borderBottom: '1px solid #1a273b' }}>
        <h3 style={{ margin: 0, color: '#ff7a18' }}>Clash Arena</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', background: '#162238', padding: '5px 10px', borderRadius: '20px' }}>👤 {currentUser?.identifier}</span>
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: '#ff3b3b', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Logout</button>
        </div>
      </div>

      {/* Content Area based on Active Tab */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '15px' }}>Live Tournaments</h2>
            <div style={{ background: '#0e1726', padding: '15px', borderRadius: '12px', marginBottom: '10px', border: '1px solid #1a273b' }}>
              <h4>FREE FIRE - SOLO HUNTER</h4>
              <p style={{ color: '#a5b0c7', fontSize: '13px' }}>Prize Pool: ₹225 | Slots: 32</p>
              <button style={{ marginTop: '10px', padding: '8px 16px', background: '#ff7a18', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Join Match</button>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <h2>Leaderboard</h2>
            <p style={{ color: '#a5b0c7' }}>Top players ranking will appear here.</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h2>My Profile</h2>
            <p style={{ color: '#a5b0c7' }}>Username: {currentUser?.identifier}</p>
            <p style={{ color: '#a5b0c7' }}>Role: <b>{currentUser?.role}</b></p>
            <p style={{ color: '#a5b0c7' }}>Wallet Balance: ₹{currentUser?.balance}</p>

            {/* Role-Based Admin Panel Access */}
            {(currentUser?.role === 'super_admin' || currentUser?.role === 'moderator') && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#162238', borderRadius: '8px', border: '1px solid #ff7a18' }}>
                <h3 style={{ color: '#ff7a18', marginBottom: '5px' }}>🛡️ Admin Panel</h3>
                <p style={{ fontSize: '13px', color: '#a5b0c7' }}>Manage matches, verify results, and control users.</p>
                <button style={{ marginTop: '10px', padding: '8px 16px', background: '#ff7a18', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Open Admin Dashboard</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0e1726', display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid #1a273b' }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: activeTab === 'home' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer', fontWeight: activeTab === 'home' ? 'bold' : 'normal' }}>Home</button>
        <button onClick={() => setActiveTab('leaderboard')} style={{ background: 'none', border: 'none', color: activeTab === 'leaderboard' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer', fontWeight: activeTab === 'leaderboard' ? 'bold' : 'normal' }}>Leaderboard</button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer', fontWeight: activeTab === 'profile' ? 'bold' : 'normal' }}>Profile</button>
      </div>
    </div>
  );
}
