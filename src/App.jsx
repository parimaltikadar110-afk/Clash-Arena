import React, { useState } from 'react';
import { useAuth } from './useAuth'; // আপনার useAuth হুকটি এখানে ইম্পোর্ট করা হলো

export default function App() {
  const { user, profile, loading, error, signup, login, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Form states for Login/Signup
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameName, setGameName] = useState('');
  const [formError, setFormError] = useState('');

  // Handle Login or Signup submission with Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      if (isSignup) {
        // Supabase Sign Up
        await signup(email, password, gameName || email);
      } else {
        // Supabase Login
        await login(email, password);
      }
    } catch (err) {
      setFormError(err.message || 'Authentication failed');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center' }}>
        <h2>Loading Clash Arena...</h2>
      </div>
    );
  }

  // 1. LOGIN / SIGNUP SCREEN (જો ইউজার লগইন করা না থাকে)
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#0e1726', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#ff7a18' }}>Clash Arena</h2>
          <p style={{ textAlign: 'center', color: '#a5b0c7', marginBottom: '20px', fontSize: '14px' }}>
            {isSignup ? 'Create your gaming account' : 'Login to your account'}
          </p>

          {(formError || error) && (
            <div style={{ background: '#ff3b3b22', color: '#ff3b3b', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>
              {formError || error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email" 
                style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
            </div>

            {isSignup && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Game Name / Username</label>
                <input 
                  type="text" 
                  value={gameName} 
                  onChange={(e) => setGameName(e.target.value)} 
                  placeholder="Enter your game name" 
                  style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none' }}
                />
              </div>
            )}

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

  // 2. MAIN DASHBOARD (যদি ইউজার সাকসেসফুলি লগইন করে থাকেন)
  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', paddingBottom: '70px', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#0e1726', borderBottom: '1px solid #1a273b' }}>
        <h3 style={{ margin: 0, color: '#ff7a18' }}>Clash Arena</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', background: '#162238', padding: '5px 10px', borderRadius: '20px' }}>👤 {profile?.game_name || user?.email}</span>
          <button onClick={logout} style={{ padding: '6px 12px', background: '#ff3b3b', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Logout</button>
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
            <p style={{ color: '#a5b0c7' }}>Email: {user?.email}</p>
            <p style={{ color: '#a5b0c7' }}>Game Name: {profile?.game_name}</p>
            <p style={{ color: '#a5b0c7' }}>Wallet Balance: ₹{profile?.wallet_balance || 0}</p>
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
