import React, { useState } from 'react';
const AdminAndWalletModule = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [walletBalance, setWalletBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState(10);
  const [matches, setMatches] = useState([]);

  const superAdminEmail = "parimaltikadar110@gmail.com";
  const [currentUser, setCurrentUser] = useState({
    email: "parimaltikadar110@gmail.com",
    role: "Super Admin",
    balance: 0
  });

  const [matchTitle, setMatchTitle] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [matchTime, setMatchTime] = useState('');

  const handleCreateMatch = (e) => {
    e.preventDefault();
    if (currentUser.email !== superAdminEmail) {
      alert('Only Super Admin can create matches!');
      return;
    }
    const newMatch = {
      id: Date.now(),
      title: matchTitle,
      prize: prizePool,
      fee: entryFee,
      time: matchTime,
      spots: 32
    };
    setMatches([...matches, newMatch]);
    setMatchTitle('');
    setPrizePool('');
    setEntryFee('');
    setMatchTime('');
  };

  const handleAddBalance = () => {
    setWalletBalance(walletBalance + Number(depositAmount));
    alert(`Successfully added ₹${depositAmount} via UPI Gateway!`);
  };

  return (
    <div style={{ fontFamily: 'Segoe UI', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px' }}>
      
      {/* App Header (Apnar purono HTML-er header-ke JSX-e rupantor kora holo) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#d32f2f' }}>D</div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e0e0e0', fontWeight: 600, fontSize: '14px' }}>
          ₹ {walletBalance}
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', background: '#ffffff', padding: '10px 16px', gap: '15px', whiteSpace: 'nowrap', borderBottom: '1px solid #e0e0e0' }}>
        <div onClick={() => setActiveTab('SOLO')} style={{ fontSize: '13px', fontWeight: 700, color: activeTab === 'SOLO' ? '#d32f2f' : '#666', cursor: 'pointer' }}>SOLO BR</div>
        <div onClick={() => setActiveTab('DUO')} style={{ fontSize: '13px', fontWeight: 700, color: activeTab === 'DUO' ? '#d32f2f' : '#666', cursor: 'pointer' }}>DUO BR</div>
        <div onClick={() => setActiveTab('SQUAD')} style={{ fontSize: '13px', fontWeight: 700, color: activeTab === 'SQUAD' ? '#d32f2f' : '#666', cursor: 'pointer' }}>SQUAD BR</div>
      </div>

      {/* Admin Panel & UPI Section (Apnar ager code theke) */}
      {currentUser.email === superAdminEmail && (
        <div style={{ margin: '15px', background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ color: '#d32f2f', marginBottom: '10px' }}>⚡ Super Admin Match Creator</h3>
          <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Match Title (e.g. FREE FIRE - SOLO HUNTER)" 
              value={matchTitle}
              onChange={(e) => setMatchTitle(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required 
            />
            <input 
              type="text" 
              placeholder="Prize Pool (e.g. ₹225)" 
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required 
            />
            <input 
              type="text" 
              placeholder="Entry Fee (e.g. ₹8)" 
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required 
            />
            <input 
              type="text" 
              placeholder="Match Time (e.g. 26 Sep 12:30 PM)" 
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required 
            />
            <button type="submit" style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Create Match (Admin Only)
            </button>
          </form>
        </div>
      )}

      {/* UPI Deposit Gateway Section */}
      <div style={{ margin: '15px', background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
        <h4 style={{ marginBottom: '10px' }}>Add Funds via UPI Gateway</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="number" 
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            style={{ padding: '8px', width: '100px', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
          <button onClick={handleAddBalance} style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Add ₹{depositAmount}
          </button>
        </div>
      </div>

      {/* Match List Section */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>Available Tournaments</h3>
        {matches.length === 0 ? (
          <p style={{ color: '#777', fontSize: '14px' }}>No matches created yet. Admin can create matches above.</p>
        ) : (
          matches.map((m) => (
            <div key={m.id} style={{ background: '#fff', borderRadius: '12px', padding: '14px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111', marginBottom: '6px' }}>{m.title}</h3>
              <div style={{ fontSize: '13px', color: '#d32f2f', fontWeight: 700, marginBottom: '8px' }}>Prize Pool: {m.prize}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', borderTop: '1px dashed #e0e0e0', paddingTop: '8px', marginTop: '6px' }}>
                <span>Entry: <strong style={{ color: '#d32f2f' }}>₹{m.fee}</strong></span>
                <span>Time: {m.time}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #e0e0e0', zIndex: 1000 }}>
        <div onClick={() => setActiveTab('home')} style={{ textAlign: 'center', fontSize: '11px', color: activeTab === 'home' ? '#d32f2f' : '#777', fontWeight: 600, cursor: 'pointer' }}>Home</div>
        <div onClick={() => setActiveTab('matches')} style={{ textAlign: 'center', fontSize: '11px', color: activeTab === 'matches' ? '#d32f2f' : '#777', fontWeight: 600, cursor: 'pointer' }}>My Matches</div>
        <div onClick={() => setActiveTab('leaderboard')} style={{ textAlign: 'center', fontSize: '11px', color: activeTab === 'leaderboard' ? '#d32f2f' : '#777', fontWeight: 600, cursor: 'pointer' }}>Leaderboard</div>
      </div>

    </div>
  );
};

export default AdminAndWalletModule;

// Part 2: Admin Panel, Wallet & My Matches Component
import React, { useState } from 'react';

const AdminAndWalletModule = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [walletBalance, setWalletBalance] = useState(0);
    const [depositAmount, setDepositAmount] = useState(10);
    const [matches, setMatches] = useState([]); // Matches will be created from admin panel
    
    // Super Admin Credentials Check
    const superAdminEmail = "parimaltikadar110@gmail.com";
    const [currentUser, setCurrentUser] = useState({
        email: "parimaltikadar110@gmail.com",
        role: "Super Admin",
        balance: 0
    });

    // Admin match creation state
    const [matchTitle, setMatchTitle] = useState('');
    const [prizePool, setPrizePool] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [matchTime, setMatchTime] = useState('');

    const handleCreateMatch = (e) => {
        e.preventDefault();
        if (currentUser.email !== superAdminEmail) {
            alert("Only Super Admin can create matches!");
            return;
        }
        const newMatch = {
            id: Date.now(),
            title: matchTitle,
            prize: prizePool,
            fee: entryFee,
            time: matchTime,
            spots: 32
        };
        setMatches([...matches, newMatch]);
        setMatchTitle('');
        setPrizePool('');
        setEntryFee('');
        setMatchTime('');
    };

    const handleAddBalance = () => {
        setWalletBalance(walletBalance + Number(depositAmount));
        alert(`Successfully added ₹${depositAmount} via UPI Gateway!`);
    };

    return (
        <div style={{ fontFamily: 'Segoe UI', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '80px' }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#fff', borderBottom: '1px solid #ddd' }}>
                <div style={{ fontWeight: 'bold', color: '#d32f2f' }}>Clash X 24 - Admin Control</div>
                <div style={{ background: '#eee', padding: '5px 12px', borderRadius: '15px', fontWeight: '600' }}>
                    ₹ {walletBalance} ⌵
                </div>
            </div>

            {/* Super Admin Control Panel Section (Only for parimaltikadar110@gmail.com) */}
            {currentUser.email === superAdminEmail && (
                <div style={{ margin: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
                    <h3 style={{ color: '#d32f2f', marginBottom: '10px' }}>⚡ Super Admin Control Panel</h3>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                        Logged in as Super Admin: <b>{currentUser.email}</b> (Full Access: Create Matches, Manage Users, Add Balance, Set UPI Gateway)
                    </p>
                    
                    <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input 
                            type="text" 
                            placeholder="Match Title (e.g. FREE FIRE - SOLO HUNTER)" 
                            value={matchTitle} 
                            onChange={(e) => setMatchTitle(e.target.value)} 
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            required 
                        />
                        <input 
                            type="text" 
                            placeholder="Prize Pool (e.g. ₹225)" 
                            value={prizePool} 
                            onChange={(e) => setPrizePool(e.target.value)} 
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            required 
                        />
                        <input 
                            type="text" 
                            placeholder="Entry Fee (e.g. ₹8)" 
                            value={entryFee} 
                            onChange={(e) => setEntryFee(e.target.value)} 
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            required 
                        />
                        <input 
                            type="text" 
                            placeholder="Match Time (e.g. 26 Sep 12:30 PM)" 
                            value={matchTime} 
                            onChange={(e) => setMatchTime(e.target.value)} 
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            required 
                        />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Create Match (Admin Only)
                        </button>
                    </form>
                </div>
            )}

            {/* UPI Deposit Gateway Section */}
            <div style={{ margin: '15px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ marginBottom: '10px' }}>Add Funds via UPI Gateway</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="number" 
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)} 
                        style={{ padding: '8px', width: '100px', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    <button onClick={handleAddBalance} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Add ₹{depositAmount}
                    </button>
                </div>
            </div>

            {/* My Matches Section (Upcoming & Ongoing) */}
            <div style={{ margin: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold', color: '#d32f2f', cursor: 'pointer' }}>Upcoming</span>
                    <span style={{ fontWeight: 'bold', color: '#777', cursor: 'pointer' }}>Ongoing</span>
                    <span style={{ fontWeight: 'bold', color: '#777', cursor: 'pointer' }}>Completed</span>
                </div>
                {matches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#777', marginTop: '40px' }}>
                        No matches now. Join upcoming! (Create matches from admin panel)
                    </div>
                ) : (
                    matches.map((m) => (
                        <div key={m.id} style={{ background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ddd' }}>
                            <h4 style={{ color: '#111' }}>{m.title}</h4>
                            <p style={{ fontSize: '13px', color: '#d32f2f' }}>Prize Pool: {m.prize} | Fee: {m.fee}</p>
                            <p style={{ fontSize: '11px', color: '#555' }}>Time: {m.time}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Nav */}
            <div style={{ position: 'fixed', bottom: 0, width: '100%', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #ddd' }}>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#d32f2f', fontWeight: 'bold' }}>Home</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>My Matches</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>Leaderboard</div>
            </div>
        </div>
    );
};

export default AdminAndWalletModule;
// Part 3: Leaderboard & Moderator Management Module (Updated)
import React, { useState } from 'react';

const LeaderboardAndModeratorModule = () => {
    const superAdminEmail = "parimaltikadar110@gmail.com";
    
    // Dynamic users state (No pre-added mock players, purely controlled via Admin)
    const [users, setUsers] = useState([
        { id: 1, name: "Debraj (Super Admin)", email: "parimaltikadar110@gmail.com", role: "Super Admin", balance: 0 }
    ]);

    // Function for Super Admin to assign/remove Moderator role
    const handleToggleModerator = (id) => {
        setUsers(users.map(user => {
            if (user.id === id) {
                const newRole = user.role === "Moderator" ? "Player" : "Moderator";
                return { ...user, role: newRole };
            }
            return user;
        }));
        alert("User role updated successfully by Super Admin!");
    };

    return (
        <div style={{ fontFamily: 'Segoe UI', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '80px', padding: '15px' }}>
            <h3 style={{ color: '#d32f2f', marginBottom: '15px' }}>🏆 Leaderboard & User Management</h3>

            {/* Moderator Assignment Section (Super Admin Only Power) */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>Assign Moderators (Admin Panel Power)</h4>
                <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                    As Super Admin ({superAdminEmail}), you can promote any registered user to Moderator status.
                </p>
                {users.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{u.name}</div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{u.role} - ₹{u.balance}</div>
                        </div>
                        {u.email !== superAdminEmail && (
                            <button 
                                onClick={() => handleToggleModerator(u.id)}
                                style={{ background: u.role === 'Moderator' ? '#d32f2f' : '#1976d2', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                                {u.role === 'Moderator' ? 'Remove Mod' : 'Make Moderator'}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Leaderboard Section */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ marginBottom: '15px', color: '#333' }}>Top Earners Leaderboard</h4>
                {users.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#777', padding: '20px' }}>No users on leaderboard yet.</div>
                ) : (
                    users.sort((a, b) => b.balance - a.balance).map((user, index) => (
                        <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{user.name}</div>
                                    <div style={{ fontSize: '11px', color: '#2e7d32', fontWeight: '600' }}>₹{user.balance}</div>
                                </div>
                            </div>
                            <div style={{ fontWeight: 'bold', color: '#555', fontSize: '14px' }}>
                                #{index + 1}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Nav */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #ddd' }}>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>Home</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>My Matches</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#d32f2f', fontWeight: 'bold' }}>Leaderboard</div>
            </div>
        </div>
    );
};

export default LeaderboardAndModeratorModule;
// Part 4: Profile, Notifications & Final App Integration Component
import React, { useState } from 'react';

const ProfileAndNotificationModule = () => {
    const superAdminEmail = "parimaltikadar110@gmail.com";
    
    // Admin Notification State
    const [notifications, setNotifications] = useState([]);
    const [msgTitle, setMsgTitle] = useState('');
    const [msgBody, setMsgBody] = useState('');

    // Send Notification (Super Admin Only)
    const handleSendNotification = (e) => {
        e.preventDefault();
        const newNotif = {
            id: Date.now(),
            title: msgTitle,
            body: msgBody,
            time: new Date().toLocaleTimeString()
        };
        setNotifications([newNotif, ...notifications]);
        setMsgTitle('');
        setMsgBody('');
        alert("Notification sent successfully to all users!");
    };

    return (
        <div style={{ fontFamily: 'Segoe UI', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '80px', padding: '15px' }}>
            <h3 style={{ color: '#d32f2f', marginBottom: '15px' }}>👤 Profile & Notifications</h3>

            {/* Profile Section */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#d32f2f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 10px auto' }}>
                    P
                </div>
                <h4 style={{ color: '#111' }}>Parimal Tikadar</h4>
                <p style={{ fontSize: '12px', color: '#666' }}>{superAdminEmail}</p>
                <div style={{ display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', marginTop: '8px' }}>
                    Super Admin (Full Access)
                </div>
            </div>

            {/* Super Admin Notification Broadcaster */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ffcdd2' }}>
                <h4 style={{ color: '#d32f2f', marginBottom: '10px' }}>📢 Broadcast Notification (Admin Power)</h4>
                <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                        type="text" 
                        placeholder="Notification Title" 
                        value={msgTitle} 
                        onChange={(e) => setMsgTitle(e.target.value)} 
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        required 
                    />
                    <textarea 
                        placeholder="Notification Message" 
                        value={msgBody} 
                        onChange={(e) => setMsgBody(e.target.value)} 
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', height: '60px' }} 
                        required 
                    />
                    <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Send Notification to All
                    </button>
                </form>
            </div>

            {/* Notifications Display Feed */}
            <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ marginBottom: '10px' }}>Recent Notifications</h4>
                {notifications.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#777' }}>No new notifications.</p>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#d32f2f' }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: '#333' }}>{n.body}</div>
                            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{n.time}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Nav */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #ddd' }}>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>Home</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>My Matches</div>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#777' }}>Leaderboard</div>
            </div>
        </div>
    );
};

export default ProfileAndNotificationModule;
// Part 5: Main App Integration & Navigation Router (Clash X 24 Structure)
import React, { useState } from 'react';

const ClashX24App = () => {
    // Current logged-in user state (Super Admin Account)
    const [currentUser] = useState({
        name: "Parimal Tikadar",
        email: "parimaltikadar110@gmail.com",
        role: "Super Admin",
        balance: 0
    });

    // Active bottom navigation tab state ('home', 'matches', 'leaderboard', 'profile', 'admin')
    const [currentTab, setCurrentTab] = useState('home');

    // App Data States (Controlled entirely via Admin / User actions, no fake placeholders)
    const [matches, setMatches] = useState([]);
    const [myJoinedMatches, setMyJoinedMatches] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [depositAmount, setDepositAmount] = useState(10);
    
    // Admin match creation form states
    const [matchTitle, setMatchTitle] = useState('');
    const [prizePool, setPrizePool] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [matchTime, setMatchTime] = useState('');

    // Users list for Moderator Assignment (Super Admin Power)
    const [usersList, setUsersList] = useState([
        { id: 1, name: "Parimal Tikadar", email: "parimaltikadar110@gmail.com", role: "Super Admin", balance: 0 }
    ]);

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');

    // Handle Match Creation (Super Admin Only)
    const handleCreateMatch = (e) => {
        e.preventDefault();
        if (currentUser.email !== "parimaltikadar110@gmail.com") {
            alert("Only Super Admin can create matches!");
            return;
        }
        const newMatch = {
            id: Date.now(),
            title: matchTitle,
            prize: prizePool,
            fee: entryFee,
            time: matchTime,
            status: 'Upcoming'
        };
        setMatches([newMatch, ...matches]);
        setMatchTitle('');
        setPrizePool('');
        setEntryFee('');
        setMatchTime('');
        alert("Match created successfully from Admin Panel!");
    };

    // Handle UPI Deposit Gateway
    const handleAddBalanceViaUPI = () => {
        setWalletBalance(walletBalance + Number(depositAmount));
        alert(`Successfully added ₹${depositAmount} via UPI Gateway!`);
    };

    // Handle Moderator Toggle (Super Admin Power)
    const handleToggleModerator = (userId) => {
        setUsersList(usersList.map(u => {
            if (u.id === userId) {
                const updatedRole = u.role === 'Moderator' ? 'Player' : 'Moderator';
                return { ...u, role: updatedRole };
            }
            return u;
        }));
        alert("User role updated successfully!");
    };

    // Handle Broadcast Notification (Super Admin Power)
    const handleSendNotification = (e) => {
        e.preventDefault();
        const newNotif = {
            id: Date.now(),
            title: notifTitle,
            body: notifBody,
            time: new Date().toLocaleTimeString()
        };
        setNotifications([newNotif, ...notifications]);
        setNotifTitle('');
        setNotifBody('');
        alert("Notification broadcasted to all users!");
    };

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', border: '1px solid #e0e0e0' }}>
            
            {/* Top App Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ fontWeight: '800', color: '#d32f2f', fontSize: '16px' }}>CLASH X 24</div>
                <div 
                    onClick={() => setCurrentTab('wallet')}
                    style={{ background: '#f1f1f1', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                    ₹ {walletBalance} ⌵
                </div>
            </div>

            {/* TAB 1: HOME (Free Fire Tournaments List created by Admin) */}
            {currentTab === 'home' && (
                <div style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '15px', color: '#111' }}>Free Fire Tournaments</h3>
                        {currentUser.email === "parimaltikadar110@gmail.com" && (
                            <button 
                                onClick={() => setCurrentTab('admin')}
                                style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                ⚡ Admin Panel
                            </button>
                        )}
                    </div>

                    {matches.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#777', padding: '40px 20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <p style={{ fontSize: '13px', fontWeight: '600' }}>No matches available right now.</p>
                            <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>Create matches from your Super Admin panel.</p>
                        </div>
                    ) : (
                        matches.map(m => (
                            <div key={m.id} style={{ background: '#fff', borderRadius: '8px', padding: '12px', marginBottom: '12px', border: '1px solid #ddd' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>{m.title}</div>
                                <div style={{ fontSize: '12px', color: '#d32f2f', fontWeight: '700', marginBottom: '8px' }}>Prize Pool: {m.prize}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #eee', paddingTop: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#666' }}>Time: {m.time}</span>
                                    <button 
                                        onClick={() => {
                                            setMyJoinedMatches([...myJoinedMatches, m]);
                                            alert("Successfully joined match!");
                                        }}
                                        style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {m.fee} JOIN
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB 2: MY MATCHES (Upcoming & Ongoing Sections) */}
            {currentTab === 'matches' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '15px', color: '#111', marginBottom: '12px' }}>My Matches</h3>
                    <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>
                        <span style={{ color: '#d32f2f', borderBottom: '2px solid #d32f2f', paddingBottom: '6px' }}>Upcoming</span>
                        <span style={{ color: '#777' }}>Ongoing</span>
                    </div>
                    {myJoinedMatches.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#777', padding: '40px 0' }}>You haven't joined any matches yet.</div>
                    ) : (
                        myJoinedMatches.map(jm => (
                            <div key={jm.id} style={{ background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #ddd' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{jm.title}</div>
                                <div style={{ fontSize: '11px', color: '#d32f2f', marginTop: '4px' }}>Status: Registered (Upcoming)</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB 3: LEADERBOARD */}
            {currentTab === 'leaderboard' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '15px', color: '#111', marginBottom: '12px' }}>Leaderboard</h3>
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid #ddd' }}>
                        {usersList.map((u, idx) => (
                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                                <div><b>{u.name}</b> ({u.role})</div>
                                <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>₹{u.balance}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: PROFILE & NOTIFICATIONS */}
            {currentTab === 'profile' && (
                <div style={{ padding: '15px' }}>
                    <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #ddd', marginBottom: '15px' }}>
                        <div style={{ width: '50px', height: '50px', background: '#d32f2f', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', margin: '0 auto 8px auto' }}>P</div>
                        <h4 style={{ fontSize: '14px' }}>{currentUser.name}</h4>
                        <p style={{ fontSize: '11px', color: '#666' }}>{currentUser.email}</p>
                        <span style={{ display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>Super Admin</span>
                    </div>

                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>Notifications Feed</h4>
                        {notifications.length === 0 ? (
                            <p style={{ fontSize: '11px', color: '#777' }}>No notifications found.</p>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#d32f2f' }}>{n.title}</div>
                                    <div style={{ fontSize: '11px', color: '#333' }}>{n.body}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 5: ADMIN PANEL (Exclusive for parimaltikadar110@gmail.com) */}
            {currentTab === 'admin' && currentUser.email === "parimaltikadar110@gmail.com" && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '15px', color: '#d32f2f', marginBottom: '12px' }}>⚡ Super Admin Control Panel</h3>
                    
                    {/* Create Match Form */}
                    <form onSubmit={handleCreateMatch} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ fontSize: '13px', color: '#333' }}>Create New Match</h4>
                        <input type="text" placeholder="Match Title" value={matchTitle} onChange={(e) => setMatchTitle(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Prize Pool (e.g. ₹225)" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Entry Fee (e.g. ₹8)" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Match Time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Publish Match</button>
                    </form>

                    {/* Broadcast Notification Form */}
                    <form onSubmit={handleSendNotification} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ fontSize: '13px', color: '#333' }}>Broadcast Notification</h4>
                        <input type="text" placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <textarea placeholder="Message" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', height: '40px' }} required />
                        <button type="submit" style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Send Notification</button>
                    </form>
                </div>
            )}

            {/* WALLET / UPI GATEWAY VIEW */}
            {currentTab === 'wallet' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '15px', color: '#111', marginBottom: '12px' }}>Wallet & UPI Deposit</h3>
                    <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <p style={{ fontSize: '13px', marginBottom: '10px' }}>Current Balance: <b>₹{walletBalance}</b></p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ padding: '6px', width: '90px', borderRadius: '4px', border: '1px solid #ccc' }} />
                            <button onClick={handleAddBalanceViaUPI} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Add via UPI</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#ffffff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #e0e0e0', zIndex: 1000 }}>
                <div onClick={() => setCurrentTab('home')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'home' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>Home</div>
                <div onClick={() => setCurrentTab('matches')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'matches' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>My Matches</div>
                <div onClick={() => setCurrentTab('leaderboard')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'leaderboard' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>Leaderboard</div>
                <div onClick={() => setCurrentTab('profile')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'profile' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>Profile</div>
            </div>

        </div>
    );
};

export default ClashX24App;
// Part 6: Admin Moderator Management & Support Module
import React, { useState } from 'react';

const ModeratorAndSupportModule = () => {
    const superAdminEmail = "parimaltikadar110@gmail.com";
    
    // Dynamic Registered Users list (Controlled by Admin)
    const [appUsers, setAppUsers] = useState([
        { id: 1, name: "Parimal Tikadar", email: "parimaltikadar110@gmail.com", role: "Super Admin" },
        { id: 2, name: "Rahul Gamer", email: "rahul@gmail.com", role: "Player" },
        { id: 3, name: "Amit FF", email: "amit@gmail.com", role: "Player" }
    ]);

    // Support ticket messages state
    const [supportMsg, setSupportMsg] = useState('');
    const [tickets, setTickets] = useState([]);

    // Toggle Moderator Role (Super Admin Exclusive Power)
    const handleToggleRole = (userId) => {
        setAppUsers(appUsers.map(user => {
            if (user.id === userId) {
                if (user.email === superAdminEmail) {
                    alert("Super Admin role cannot be changed!");
                    return user;
                }
                const newRole = user.role === "Moderator" ? "Player" : "Moderator";
                return { ...user, role: newRole };
            }
            return user;
        }));
        alert("User role updated successfully by Super Admin!");
    };

    // Submit Support Ticket
    const handleTicketSubmit = (e) => {
        e.preventDefault();
        const newTicket = {
            id: Date.now(),
            message: supportMsg,
            status: 'Pending',
            time: new Date().toLocaleTimeString()
        };
        setTickets([newTicket, ...tickets]);
        setSupportMsg('');
        alert("Support ticket submitted successfully! Admin will review soon.");
    };

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', border: '1px solid #e0e0e0', padding: '15px' }}>
            
            <h3 style={{ fontSize: '15px', color: '#d32f2f', marginBottom: '15px' }}>🛡️ Admin & Support Center</h3>

            {/* Moderator Control Section (Super Admin Only) */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#111' }}>Manage User Roles (Moderators)</h4>
                <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                    Only Super Admin ({superAdminEmail}) can promote players to Moderator.
                </p>

                {appUsers.map(user => (
                    <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{user.name}</div>
                            <div style={{ fontSize: '10px', color: '#888' }}>{user.email} - <b>{user.role}</b></div>
                        </div>
                        {user.email !== superAdminEmail && (
                            <button 
                                onClick={() => handleToggleRole(user.id)}
                                style={{ background: user.role === 'Moderator' ? '#d32f2f' : '#1976d2', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                {user.role === 'Moderator' ? 'Remove Mod' : 'Make Mod'}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* 24/7 Help & Support Section */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#111' }}>24/7 Customer Support</h4>
                <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea 
                        placeholder="Write your issue or query here..." 
                        value={supportMsg} 
                        onChange={(e) => setSupportMsg(e.target.value)} 
                        style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', height: '60px' }} 
                        required 
                    />
                    <button type="submit" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                        Submit Ticket to Admin
                    </button>
                </form>

                {tickets.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <h5 style={{ fontSize: '12px', marginBottom: '5px', color: '#333' }}>Your Tickets:</h5>
                        {tickets.map(t => (
                            <div key={t.id} style={{ background: '#f9f9f9', padding: '6px', borderRadius: '4px', marginBottom: '5px', fontSize: '11px', border: '1px solid #eee' }}>
                                <div>{t.message}</div>
                                <div style={{ color: '#d32f2f', fontWeight: 'bold', marginTop: '2px' }}>Status: {t.status}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default ModeratorAndSupportModule;
// Part 7: Match Results & Winner Announcement Module
import React, { useState } from 'react';

const MatchResultModule = () => {
    const superAdminEmail = "parimaltikadar110@gmail.com";

    // Winner declaration state (Controlled by Admin)
    const [matchId, setMatchId] = useState('');
    const [winnerName, setWinnerName] = useState('');
    const [prizeAmount, setPrizeAmount] = useState('');
    const [announcedResults, setAnnouncedResults] = useState([]);

    const handlePublishResult = (e) => {
        e.preventDefault();
        const resultItem = {
            id: Date.now(),
            match: matchId,
            winner: winnerName,
            prize: prizeAmount,
            time: new Date().toLocaleTimeString()
        };
        setAnnouncedResults([resultItem, ...announcedResults]);
        setMatchId('');
        setWinnerName('');
        setPrizeAmount('');
        alert("Match winner result published successfully by Super Admin!");
    };

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', border: '1px solid #e0e0e0', padding: '15px' }}>
            
            <h3 style={{ fontSize: '15px', color: '#d32f2f', marginBottom: '15px' }}>🏆 Match Results & Winners</h3>

            {/* Admin Result Declaration Box */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '15px' }}>
                <h4 style={{ fontSize: '13px', color: '#333', marginBottom: '8px' }}>Declare Match Winner (Admin Power)</h4>
                <form onSubmit={handlePublishResult} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                        type="text" 
                        placeholder="Match Name / ID (e.g. Free Fire Solo #1)" 
                        value={matchId} 
                        onChange={(e) => setMatchId(e.target.value)} 
                        style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="Winner Player Name" 
                        value={winnerName} 
                        onChange={(e) => setWinnerName(e.target.value)} 
                        style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="Prize Won (e.g. ₹225)" 
                        value={prizeAmount} 
                        onChange={(e) => setPrizeAmount(e.target.value)} 
                        style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        required 
                    />
                    <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                        Publish Winner Result
                    </button>
                </form>
            </div>

            {/* Display Announced Results */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '10px', color: '#111' }}>Recent Winner Announcements</h4>
                {announcedResults.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#777' }}>No results declared yet.</p>
                ) : (
                    announcedResults.map(res => (
                        <div key={res.id} style={{ background: '#fcfcfc', padding: '8px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #eee', fontSize: '12px' }}>
                            <div style={{ fontWeight: 'bold', color: '#111' }}>{res.match}</div>
                            <div style={{ color: '#2e7d32', marginTop: '2px' }}>Winner: <b>{res.winner}</b></div>
                            <div style={{ color: '#d32f2f', fontWeight: 'bold', marginTop: '2px' }}>Prize: {res.prize}</div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
};

export default MatchResultModule;
// Part 8: Transaction History & Wallet Ledger Module
import React, { useState } from 'react';

const TransactionHistoryModule = () => {
    // Transaction logs state
    const [transactions, setTransactions] = useState([
        { id: 1, type: "UPI Deposit", amount: "+₹100", status: "Success", time: "05 Oct 2026, 11:30 AM" }
    ]);

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', border: '1px solid #e0e0e0', padding: '15px' }}>
            
            <h3 style={{ fontSize: '15px', color: '#d32f2f', marginBottom: '15px' }}>💳 Transaction History & Ledger</h3>

            {/* Transaction List Box */}
            <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h4 style={{ fontSize: '13px', color: '#111', marginBottom: '10px' }}>Recent Wallet Activities</h4>
                {transactions.length === 0 ? (
                    <p style={{ fontSize: '11px', color: '#777' }}>No transactions recorded yet.</p>
                ) : (
                    transactions.map(tx => (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{tx.type}</div>
                                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{tx.time}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: tx.amount.includes('+') ? '#2e7d32' : '#d32f2f' }}>
                                    {tx.amount}
                                </div>
                                <div style={{ fontSize: '10px', color: '#2e7d32', fontWeight: '600' }}>{tx.status}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
};

export default TransactionHistoryModule;
// Part 9: User Authentication & Login/Signup Module
import React, { useState } from 'react';

const AuthModule = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleAuthSubmit = (e) => {
        e.preventDefault();
        if (email === "parimaltikadar110@gmail.com") {
            alert("Logged in successfully as Super Admin!");
        } else {
            alert(isLogin ? "Logged in successfully!" : "Account created successfully!");
        }
    };

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', border: '1px solid #e0e0e0', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '18px', color: '#d32f2f', textAlign: 'center', marginBottom: '15px' }}>
                    {isLogin ? 'Clash X 24 Login' : 'Create Account'}
                </h3>

                <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {!isLogin && (
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            style={{ padding: '10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                            required 
                        />
                    )}
                    <input 
                        type="email" 
                        placeholder="Email Address (Super Admin: parimaltikadar110@gmail.com)" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        style={{ padding: '10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        style={{ padding: '10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} 
                        required 
                    />
                    <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                        {isLogin ? 'Login to App' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '12px', color: '#666', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </div>
            </div>

        </div>
    );
};

export default AuthModule;
// Part 10: Final Integrated Clash X 24 Master Application
import React, { useState } from 'react';

const ClashX24MasterApp = () => {
    // Auth States
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [email, setEmail] = useState("parimaltikadar110@gmail.com");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("Parimal Tikadar");

    // Navigation Tab State ('home', 'matches', 'leaderboard', 'profile', 'admin', 'wallet', 'support', 'results', 'transactions')
    const [currentTab, setCurrentTab] = useState('home');

    // App Data States (Controlled entirely via Super Admin / User)
    const [walletBalance, setWalletBalance] = useState(0);
    const [depositAmount, setDepositAmount] = useState(50);
    const [matches, setMatches] = useState([]);
    const [myJoinedMatches, setMyJoinedMatches] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [supportTickets, setSupportTickets] = useState([]);
    const [announcedResults, setAnnouncedResults] = useState([]);
    
    // Users List (Super Admin can assign/remove Moderators)
    const [appUsers, setAppUsers] = useState([
        { id: 1, name: "Parimal Tikadar", email: "parimaltikadar110@gmail.com", role: "Super Admin", balance: 0 },
        { id: 2, name: "Rahul Gamer", email: "rahul@gmail.com", role: "Player", balance: 0 }
    ]);

    // Admin Form States
    const [matchTitle, setMatchTitle] = useState('');
    const [prizePool, setPrizePool] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [matchTime, setMatchTime] = useState('');
    
    // Notification Form
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');

    // Result Form
    const [resMatch, setResMatch] = useState('');
    const [resWinner, setResWinner] = useState('');
    const [resPrize, setResPrize] = useState('');

    // Support Form
    const [supportMsg, setSupportMsg] = useState('');

    // Login Handler
    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoggedIn(true);
        alert("Logged in successfully!");
    };

    // Create Match (Super Admin Only)
    const handleCreateMatch = (e) => {
        e.preventDefault();
        if (email !== "parimaltikadar110@gmail.com") {
            alert("Access Denied! Only Super Admin can create matches.");
            return;
        }
        const newMatch = {
            id: Date.now(),
            title: matchTitle,
            prize: prizePool,
            fee: entryFee,
            time: matchTime,
            status: 'Upcoming'
        };
        setMatches([newMatch, ...matches]);
        setMatchTitle('');
        setPrizePool('');
        setEntryFee('');
        setMatchTime('');
        alert("Match created successfully from Admin Panel!");
    };

    // Join Match
    const handleJoinMatch = (match) => {
        setMyJoinedMatches([...myJoinedMatches, match]);
        const newTx = {
            id: Date.now(),
            type: `Joined Match: ${match.title}`,
            amount: `-${match.fee}`,
            status: "Success",
            time: new Date().toLocaleTimeString()
        };
        setTransactions([newTx, ...transactions]);
        alert("Successfully joined the match!");
    };

    // UPI Deposit
    const handleDeposit = () => {
        const amt = Number(depositAmount);
        setWalletBalance(walletBalance + amt);
        const newTx = {
            id: Date.now(),
            type: "UPI Deposit",
            amount: `+₹${amt}`,
            status: "Success",
            time: new Date().toLocaleTimeString()
        };
        setTransactions([newTx, ...transactions]);
        alert(`Successfully added ₹${amt} via UPI Gateway!`);
    };

    // Toggle Moderator Role (Super Admin Only)
    const handleToggleRole = (userId) => {
        if (email !== "parimaltikadar110@gmail.com") {
            alert("Only Super Admin can manage roles!");
            return;
        }
        setAppUsers(appUsers.map(u => {
            if (u.id === userId) {
                if (u.email === "parimaltikadar110@gmail.com") return u;
                const nextRole = u.role === 'Moderator' ? 'Player' : 'Moderator';
                return { ...u, role: nextRole };
            }
            return u;
        }));
        alert("User role updated successfully!");
    };

    // Send Broadcast Notification
    const handleSendNotification = (e) => {
        e.preventDefault();
        const newNotif = {
            id: Date.now(),
            title: notifTitle,
            body: notifBody,
            time: new Date().toLocaleTimeString()
        };
        setNotifications([newNotif, ...notifications]);
        setNotifTitle('');
        setNotifBody('');
        alert("Notification broadcasted to all users!");
    };

    // Publish Match Result
    const handlePublishResult = (e) => {
        e.preventDefault();
        const resObj = {
            id: Date.now(),
            match: resMatch,
            winner: resWinner,
            prize: resPrize,
            time: new Date().toLocaleTimeString()
        };
        setAnnouncedResults([resObj, ...announcedResults]);
        setResMatch('');
        setResWinner('');
        setResPrize('');
        alert("Match winner published successfully!");
    };

    // Submit Support Ticket
    const handleSupportSubmit = (e) => {
        e.preventDefault();
        const ticket = {
            id: Date.now(),
            message: supportMsg,
            status: 'Pending',
            time: new Date().toLocaleTimeString()
        };
        setSupportTickets([ticket, ...supportTickets]);
        setSupportMsg('');
        alert("Support ticket submitted to admin!");
    };

    // If not logged in, show Auth View
    if (!isLoggedIn) {
        return (
            <div style={{ fontFamily: 'Segoe UI', backgroundColor: '#f8f9fa', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h3 style={{ fontSize: '18px', color: '#d32f2f', textAlign: 'center', marginBottom: '15px' }}>Clash X 24 Login</h3>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="email" placeholder="Email (parimaltikadar110@gmail.com)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>Login</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', border: '1px solid #e0e0e0', position: 'relative' }}>
            
            {/* Top App Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ fontWeight: '800', color: '#d32f2f', fontSize: '16px', cursor: 'pointer' }} onClick={() => setCurrentTab('home')}>CLASH X 24</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div onClick={() => setCurrentTab('wallet')} style={{ background: '#f1f1f1', padding: '5px 10px', borderRadius: '20px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                        ₹ {walletBalance} ⌵
                    </div>
                    {email === "parimaltikadar110@gmail.com" && (
                        <button onClick={() => setCurrentTab('admin')} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Admin</button>
                    )}
                </div>
            </div>

            {/* TAB: HOME */}
            {currentTab === 'home' && (
                <div style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '14px', color: '#111' }}>Free Fire Tournaments</h3>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setCurrentTab('results')} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Results</button>
                            <button onClick={() => setCurrentTab('support')} style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Support</button>
                        </div>
                    </div>

                    {matches.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#777', padding: '30px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                            <p style={{ fontSize: '12px' }}>No matches live right now.</p>
                            <p style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Admin can create matches from the Admin panel.</p>
                        </div>
                    ) : (
                        matches.map(m => (
                            <div key={m.id} style={{ background: '#fff', borderRadius: '8px', padding: '12px', marginBottom: '10px', border: '1px solid #ddd' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111' }}>{m.title}</div>
                                <div style={{ fontSize: '11px', color: '#d32f2f', fontWeight: '700', margin: '3px 0' }}>Prize Pool: {m.prize}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #eee', paddingTop: '6px', fontSize: '11px', color: '#666' }}>
                                    <span>Time: {m.time}</span>
                                    <button onClick={() => handleJoinMatch(m)} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        {m.fee} JOIN
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB: MY MATCHES */}
            {currentTab === 'matches' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#111', marginBottom: '10px' }}>My Joined Matches</h3>
                    {myJoinedMatches.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#777' }}>You haven't joined any matches yet.</p>
                    ) : (
                        myJoinedMatches.map(jm => (
                            <div key={jm.id} style={{ background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #ddd', fontSize: '12px' }}>
                                <div style={{ fontWeight: 'bold' }}>{jm.title}</div>
                                <div style={{ color: '#d32f2f', fontSize: '10px', marginTop: '2px' }}>Status: Registered (Upcoming)</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB: LEADERBOARD */}
            {currentTab === 'leaderboard' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#111', marginBottom: '10px' }}>Top Earners Leaderboard</h3>
                    <div style={{ background: '#fff', borderRadius: '8px', padding: '10px', border: '1px solid #ddd' }}>
                        {appUsers.map((u, idx) => (
                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                                <div><b>{u.name}</b> <span style={{ fontSize: '10px', color: '#666' }}>({u.role})</span></div>
                                <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>₹{u.balance}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: PROFILE */}
            {currentTab === 'profile' && (
                <div style={{ padding: '15px' }}>
                    <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #ddd', marginBottom: '12px' }}>
                        <div style={{ width: '45px', height: '45px', background: '#d32f2f', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', margin: '0 auto 6px auto' }}>P</div>
                        <h4 style={{ fontSize: '13px' }}>{name}</h4>
                        <p style={{ fontSize: '10px', color: '#666' }}>{email}</p>
                        <span style={{ display: 'inline-block', background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>Super Admin</span>
                    </div>

                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '12px', marginBottom: '6px' }}>Notifications</h4>
                        {notifications.length === 0 ? (
                            <p style={{ fontSize: '10px', color: '#777' }}>No notifications.</p>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} style={{ padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '11px' }}>
                                    <div style={{ fontWeight: 'bold', color: '#d32f2f' }}>{n.title}</div>
                                    <div>{n.body}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB: ADMIN PANEL */}
            {currentTab === 'admin' && email === "parimaltikadar110@gmail.com" && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#d32f2f', marginBottom: '10px' }}>⚡ Super Admin Panel</h3>
                    
                    {/* Create Match */}
                    <form onSubmit={handleCreateMatch} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h4 style={{ fontSize: '12px', color: '#333' }}>Create Match</h4>
                        <input type="text" placeholder="Match Title" value={matchTitle} onChange={(e) => setMatchTitle(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Prize Pool (e.g. ₹225)" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Entry Fee (e.g. ₹8)" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Match Time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Publish Match</button>
                    </form>

                    {/* Broadcast Notification */}
                    <form onSubmit={handleSendNotification} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h4 style={{ fontSize: '12px', color: '#333' }}>Broadcast Notification</h4>
                        <input type="text" placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <textarea placeholder="Message" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', height: '35px' }} required />
                        <button type="submit" style={{ background: '#333', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Send Notification</button>
                    </form>

                    {/* Publish Winner Result */}
                    <form onSubmit={handlePublishResult} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h4 style={{ fontSize: '12px', color: '#333' }}>Declare Winner</h4>
                        <input type="text" placeholder="Match Name" value={resMatch} onChange={(e) => setResMatch(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Winner Name" value={resWinner} onChange={(e) => setResWinner(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Prize Won" value={resPrize} onChange={(e) => setResPrize(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Publish Winner</button>
                    </form>

                    {/* Moderator Assignment */}
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h4 style={{ fontSize: '12px', marginBottom: '6px' }}>Manage Moderators</h4>
                        {appUsers.map(u => (
                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '11px' }}>
                                <div>{u.name} ({u.role})</div>
                                {u.email !== "parimaltikadar110@gmail.com" && (
                                    <button onClick={() => handleToggleRole(u.id)} style={{ background: u.role === 'Moderator' ? '#d32f2f' : '#1976d2', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '3px', fontSize: '9px', cursor: 'pointer' }}>
                                        {u.role === 'Moderator' ? 'Remove Mod' : 'Make Mod'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: WALLET & DEPOSIT */}
            {currentTab === 'wallet' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#111', marginBottom: '10px' }}>Wallet & UPI Deposit</h3>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', marginBottom: '8px' }}>Balance: <b>₹{walletBalance}</b></p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ padding: '5px', width: '80px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }} />
                            <button onClick={handleDeposit} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Add via UPI</button>
                        </div>
                    </div>

                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <h4 style={{ fontSize: '12px', marginBottom: '8px' }}>Transaction History</h4>
                        {transactions.length === 0 ? (
                            <p style={{ fontSize: '10px', color: '#777' }}>No transactions yet.</p>
                        ) : (
                            transactions.map(tx => (
                                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '11px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{tx.type}</div>
                                        <div style={{ fontSize: '9px', color: '#888' }}>{tx.time}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: tx.amount.includes('+') ? '#2e7d32' : '#d32f2f' }}>{tx.amount}</div>
                                        <div style={{ fontSize: '9px', color: '#2e7d32' }}>{tx.status}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB: SUPPORT */}
            {currentTab === 'support' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#111', marginBottom: '10px' }}>24/7 Customer Support</h3>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea placeholder="Describe your query..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', height: '50px' }} required />
                            <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '7px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Submit Ticket</button>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB: RESULTS */}
            {currentTab === 'results' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#111', marginBottom: '10px' }}>Match Results & Winners</h3>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                        {announcedResults.length === 0 ? (
                            <p style={{ fontSize: '10px', color: '#777' }}>No results announced yet.</p>
                        ) : (
                            announcedResults.map(res => (
                                <div key={res.id} style={{ background: '#fcfcfc', padding: '8px', borderRadius: '4px', marginBottom: '6px', border: '1px solid #eee', fontSize: '11px' }}>
                                    <div style={{ fontWeight: 'bold' }}>{res.match}</div>
                                    <div style={{ color: '#2e7d32', marginTop: '2px' }}>Winner: <b>{res.winner}</b></div>
                                    <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>Prize: {res.prize}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#ffffff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #e0e0e0', zIndex: 1000 }}>
                <div onClick={() => setCurrentTab('home')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'home' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>Home</div>
                <div onClick={() => setCurrentTab('matches')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'matches' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>My Matches</div>
                <div onClick={() => setCurrentTab('leaderboard')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'leaderboard' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>Leaderboard</div>
                <div onClick={() => setCurrentTab('profile')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'profile' ? '#d32f2f' : '#666', fontWeight: '700', cursor: 'pointer' }}>Profile</div>
            </div>

        </div>
    );
};

export default ClashX24MasterApp;
