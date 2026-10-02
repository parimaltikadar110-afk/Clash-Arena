import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, profile, loading, error, signup, login, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameName, setGameName] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please fill in all fields.');
      return;
    }

    try {
      if (isSignup) {
        await signup(email, password, gameName || email);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setFormError(err.message || 'Authentication failed.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'sans-serif' }}>
        <h3>Loading Clash Arena...</h3>
      </div>
    );
  }

  // 1. Login / Signup Screen
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', display: 'grid', placeItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#0e1726', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid #1a273b' }}>
          <h2 style={{ textAlign: 'center', color: '#ff7a18', marginBottom: '10px' }}>Clash Arena</h2>
          <p style={{ textAlign: 'center', color: '#a5b0c7', fontSize: '14px', marginBottom: '20px' }}>
            {isSignup ? 'Create your account' : 'Login to your account'}
          </p>

          {(formError || error) && (
            <div style={{ background: '#ff3b3b22', color: '#ff3b3b', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>
              {formError || error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Game Name</label>
                <input 
                  type="text" 
                  value={gameName} 
                  onChange={(e) => setGameName(e.target.value)} 
                  placeholder="Enter game name" 
                  style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter email" 
                style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#a5b0c7', marginBottom: '5px' }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
                style={{ width: '100%', padding: '12px', background: '#162238', border: '1px solid #2a3b5c', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', background: '#ff7a18', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
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

  // 2. Dashboard Screen
  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#fff', paddingBottom: '70px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#0e1726', borderBottom: '1px solid #1a273b' }}>
        <h3 style={{ margin: 0, color: '#ff7a18' }}>Clash Arena</h3>
        <button onClick={logout} style={{ padding: '6px 12px', background: '#ff3b3b', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Logout</button>
      </div>

      <div style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <h2>Live Tournaments</h2>
            <p style={{ color: '#a5b0c7' }}>Welcome, {profile?.game_name || user?.email}!</p>
          </div>
        )}
        {activeTab === 'profile' && (
          <div>
            <h2>My Profile</h2>
            <p style={{ color: '#a5b0c7' }}>Email: {user?.email}</p>
            <p style={{ color: '#a5b0c7' }}>Wallet: ₹{profile?.wallet_balance || 0}</p>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0e1726', display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid #1a273b' }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: activeTab === 'home' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer' }}>Home</button>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: activeTab === 'profile' ? '#ff7a18' : '#a5b0c7', cursor: 'pointer' }}>Profile</button>
      </div>
    </div>
  );
}
