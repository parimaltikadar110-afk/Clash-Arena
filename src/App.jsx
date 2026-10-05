import React, { useState } from 'react';

const ClashX24MasterApp = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [email, setEmail] = useState("parimaltikadar110@gmail.com");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("Parimal Tikadar");

    const [currentTab, setCurrentTab] = useState('home');

    const [walletBalance, setWalletBalance] = useState(0);
    const [depositAmount, setDepositAmount] = useState(50);
    const [matches, setMatches] = useState([]);
    const [myJoinedMatches, setMyJoinedMatches] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [supportTickets, setSupportTickets] = useState([]);
    const [announcedResults, setAnnouncedResults] = useState([]);
    
    const [appUsers, setAppUsers] = useState([
        { id: 1, name: "Parimal Tikadar", email: "parimaltikadar110@gmail.com", role: "Super Admin", balance: 0 },
        { id: 2, name: "Rahul Gamer", email: "rahul@gmail.com", role: "Player", balance: 0 }
    ]);

    const [matchTitle, setMatchTitle] = useState('');
    const [prizePool, setPrizePool] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [matchTime, setMatchTime] = useState('');
    
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');

    const [resMatch, setResMatch] = useState('');
    const [resWinner, setResWinner] = useState('');
    const [resPrize, setResPrize] = useState('');

    const [supportMsg, setSupportMsg] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoggedIn(true);
        alert("Logged in successfully!");
    };

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

            {currentTab === 'admin' && email === "parimaltikadar110@gmail.com" && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#d32f2f', marginBottom: '10px' }}>⚡ Super Admin Panel</h3>
                    
                    <form onSubmit={handleCreateMatch} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h4 style={{ fontSize: '12px', color: '#333' }}>Create Match</h4>
                        <input type="text" placeholder="Match Title" value={matchTitle} onChange={(e) => setMatchTitle(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Prize Pool (e.g. ₹225)" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Entry Fee (e.g. ₹8)" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Match Time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Publish Match</button>
                    </form>

                    <form onSubmit={handleSendNotification} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h4 style={{ fontSize: '12px', color: '#333' }}>Broadcast Notification</h4>
                        <input type="text" placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <textarea placeholder="Message" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', resize: 'none', height: '35px' }} required />
                        <button type="submit" style={{ background: '#333', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Send Notification</button>
                    </form>

                    <form onSubmit={handlePublishResult} style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h4 style={{ fontSize: '12px', color: '#333' }}>Declare Winner</h4>
                        <input type="text" placeholder="Match Name" value={resMatch} onChange={(e) => setResMatch(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Winner Name" value={resWinner} onChange={(e) => setResWinner(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <input type="text" placeholder="Prize Won" value={resPrize} onChange={(e) => setResPrize(e.target.value)} style={{ padding: '5px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        <button type="submit" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>Publish Winner</button>
                    </form>

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
