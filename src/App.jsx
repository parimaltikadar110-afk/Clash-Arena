import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, profile, loading, error, signup, login, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Form states
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameName, setGameName] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!email || !password) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (isSignup && !gameName) {
      setFormError('Please enter your Game Name / Username.');
      return;
    }

    try {
      setSubmitting(true);
      if (isSignup) {
        await signup(email, password, gameName);
        setSuccessMsg('Account created successfully! You are now logged in.');
      } else {
        await login(email, password);
        setSuccessMsg('Logged in successfully!');
      }
    } catch (err) {
      setFormError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #2a3b5c', borderTop: '4px solid #ff7a18', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
          <h3 style={{ color: '#ff7a18', margin: 0 }}>Loading Clash Arena...</h3>
        </div>
      </div>
    );
  }

  // 1. AUTHENTICATION SCREEN (Login / Signup)
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#0e1726', padding: '35px 30px', borderRadius: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', border: '1px solid #1a273b' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h2 style={{ margin: '0 0 8px', color: '#ff7a18', fontSize: '26px', letterSpacing: '0.5px' }}>⚡ Clash Arena</h2>
            <p style={{ color: '#a5b0c7', margin: 0, fontSize: '14px' }}>
              {isSignup ? 'Create your competitive gaming profile' : 'Welcome back! Please login'}
            </p>
          </div>

          {(formError || error) && (
            <div style={{ background: 'rgba(255, 59, 59, 0.1)', color: '#ff3b3b', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', textAlign: 'center', border: '1px solid rgba(255, 59, 59, 0.2)' }}>
              ⚠️ {formError || error}
            </div>
          )}

          {successMsg && (
            <div style={{ background: 'rgba(46, 213, 115, 0.1)', color: '#2ed573', padding: '12px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', textAlign: 'center', border: '1px solid rgba(46, 213, 115, 0.2)' }}>
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#a5b0c7', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Game Name / Username</label>
                <input 
                  type="text" 
                  value={gameName} 
                  onChange={(e) => setGameName(e.target.value)} 
                  placeholder="e.g. ProKiller99" 
                  style={{ width: '100%', padding: '12px 15px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#a5b0c7', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@example.com" 
                style={{ width: '100%', padding: '12px 15px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#a5b0c7', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                style={{ width: '100%', padding: '12px 15px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              style={{ width: '100%', padding: '14px', background: submitting ? '#555' : 'linear-gradient(135deg, #ff7a18, #ff3b3b)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(255, 122, 24, 0.4)', transition: 'all 0.3s' }}
            >
              {submitting ? 'Processing...' : (isSignup ? 'Create Account' : 'Login')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px', color: '#a5b0c7', cursor: 'pointer' }} onClick={() => { setIsSignup(!isSignup); setFormError(''); setSuccessMsg(''); }}>
            {isSignup ? 'Already have an account? <span style="color: #ff7a18; font-weight: bold;">Login</span>' : "Don't have an account? <span style='color: #ff7a18; font-weight: bold;'>Sign Up</span>"}
            {isSignup ? ' Already have an account? Login' : " Don't have an account? Sign Up"}
          </p>
        </div>
      </div>
    );
  }

  // 2. MAIN DASHBOARD (Clash Arena)
  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', paddingBottom: '80px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#0e1726', borderBottom: '1px solid #1a273b', position: 'sticky', top: 0, zIndex: 100 }}>
        <h3 style={{ margin: 0, color: '#ff7a18', fontSize: '20px' }}>⚡ Clash Arena</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', background: '#162238', padding: '6px 14px', borderRadius: '20px', border: '1px solid #2a3b5c' }}>
            🎮 {profile?.game_name || user?.email?.split('@')[0]}
          </span>
          <button 
            onClick={logout} 
            style={{ padding: '7px 14px', background: 'rgba(255, 59, 59, 0.15)', border: '1px solid #ff3b3b', borderRadius: '8px', color: '#ff3b3b', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        
        {activeTab === 'home' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #162238, #0e1726)', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #2a3b5c' }}>
              <h2 style={{ margin: '0 0 5px', fontSize: '22px' }}>Welcome, {profile?.game_name || 'Gamer'}! 🔥</h2>
              <p style={{ color: '#a5b0c7', fontSize: '14px', margin: 0 }}>Join tournaments, compete with top players, and win exciting cash rewards.</p>
            </div>

            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#ff7a18' }}>Live Tournaments</h3>
            
            <div style={{ background: '#0e1726', padding: '18px', borderRadius: '14px', marginBottom: '15px', border: '1px solid #1a273b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 5px', fontSize: '16px' }}>FREE FIRE - SOLO HUNTER</h4>
                <p style={{ color: '#a5b0c7', fontSize: '13px', margin: 0 }}>Prize Pool: ₹225 | Slots Left: 12/32</p>
              </div>
              <button style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #ff7a18, #ff3b3b)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                Join Match
              </button>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#ff7a18' }}>🏆 Leaderboard</h2>
            <div style={{ background: '#0e1726', padding: '25px', borderRadius: '14px', border: '1px solid #1a273b', textAlign: 'center' }}>
              <p style={{ color: '#a5b0c7', margin: 0 }}>Top players ranking will appear here soon.</p>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#ff7a18' }}>👤 My Profile</h2>
            <div style={{ background: '#0e1726', padding: '25px', borderRadius: '16px', border: '1px solid #1a273b' }}>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div style={{ background: '#162238', padding: '15px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#a5b0c7', display: 'block', marginBottom: '3px' }}>Game Name</span>
                  <strong style={{ fontSize: '16px' }}>{profile?.game_name || 'Not Set'}</strong>
                </div>
                <div style={{ background: '#162238', padding: '15px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#a5b0c7', display: 'block', marginBottom: '3px' }}>Email Address</span>
                  <strong style={{ fontSize: '16px' }}>{user?.email}</strong>
                </div>
                <div style={{ background: '#162238', padding: '15px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#a5b0c7', display: 'block', marginBottom: '3px' }}>Wallet Balance</span>
                  <strong style={{ fontSize: '18px', color: '#2ed573' }}>₹{profile?.wallet_balance || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0e1726', display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid #1a273b', zIndex: 100 }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: activeTab === 'home' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer', fontWeight: activeTab === 'home' ? 'bold' : 'normal', fontSize: '14px' }}>🏠 Home</button>
        <button onClick={() => setActiveTab('leaderboard')} style={{ background: 'none', border: 'none', color: activeTab === 'leaderboard' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer', fontWeight: activeTab === 'leaderboard' ? 'bold' : 'normal', fontSize: '14px' }}>🏆 Leaderboard</button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer', fontWeight: activeTab === 'profile' ? 'bold' : 'normal', fontSize: '14px' }}>👤 Profile</button>
      </div>
    </div>
  );
}
