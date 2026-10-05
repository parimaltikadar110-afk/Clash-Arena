import React, { useState } from 'react';

const ClashX7App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(true);
    const [email, setEmail] = useState("parimaltikadar110@gmail.com");
    const [password, setPassword] = useState("");
    const [currentTab, setCurrentTab] = useState('home');
    const [subTab, setSubTab] = useState('solo_br');

    const [walletBalance, setWalletBalance] = useState(0);
    const [winningBalance, setWinningBalance] = useState(0);
    const [depositAmount, setDepositAmount] = useState(50);
    const [withdrawAmount, setWithdrawAmount] = useState(50);
    const [upiId, setUpiId] = useState('');
    
    const [gameName, setGameName] = useState('Debraj');
    const [gameId, setGameId] = useState('4646434354');

    const [matches, setMatches] = useState([
        { id: 1, title: "FREE FIRE - SOLO HUNTER", category: "solo_br", prize: "₹225", fee: "₹8", time: "06 Oct 12:00 AM", spots: "0 spots left" },
        { id: 2, title: "FREE FIRE - NEW THUNDER", category: "solo_br", prize: "₹145", fee: "₹8", time: "06 Oct 01:00 AM", spots: "19 spots left" },
        { id: 3, title: "FF - 5RS DUO PER KILL", category: "duo_kill", prize: "₹240", fee: "₹8", time: "06 Oct 12:00 AM", spots: "22 spots left" },
        { id: 4, title: "FF - LONE WOLF 1V1 HEAD", category: "lone_wolf", prize: "₹45", fee: "₹26", time: "06 Oct 12:15 AM", spots: "0 spots left" }
    ]);

    const [myJoinedMatches, setMyJoinedMatches] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [notifications, setNotifications] = useState([
        { id: 1, title: "Welcome to ClashX7", body: "Join tournaments and win cash daily!" }
    ]);
    const [supportMsg, setSupportMsg] = useState('');

    // Admin States
    const [matchTitle, setMatchTitle] = useState('');
    const [prizePool, setPrizePool] = useState('');
    const [entryFee, setEntryFee] = useState('');
    const [matchTime, setMatchTime] = useState('');
    const [matchCategory, setMatchCategory] = useState('solo_br');

    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');

    const [resMatch, setResMatch] = useState('');
    const [resWinner, setResWinner] = useState('');
    const [resPrize, setResPrize] = useState('');
    const [announcedResults, setAnnouncedResults] = useState([]);

    const [appUsers, setAppUsers] = useState([
        { id: 1, name: "Parimal Tikadar", email: "parimaltikadar110@gmail.com", role: "Super Admin" },
        { id: 2, name: "Debraj", email: "debraj@gmail.com", role: "Player" }
    ]);

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoggedIn(true);
        alert("Logged in to ClashX7 successfully!");
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
            category: matchCategory,
            prize: prizePool,
            fee: entryFee,
            time: matchTime,
            spots: "32 spots left"
        };
        setMatches([newMatch, ...matches]);
        setMatchTitle('');
        setPrizePool('');
        setEntryFee('');
        setMatchTime('');
        alert("Match created successfully via Admin Panel!");
    };

    const handleJoinMatch = (match) => {
        setMyJoinedMatches([...myJoinedMatches, match]);
        const newTx = {
            id: Date.now(),
            type: `Joined: ${match.title}`,
            amount: `-${match.fee}`,
            status: "Success",
            time: new Date().toLocaleTimeString()
        };
        setTransactions([newTx, ...transactions]);
        alert("Successfully joined tournament!");
    };

    const handleDeposit = () => {
        const amt = Number(depositAmount);
        setWalletBalance(walletBalance + amt);
        const newTx = {
            id: Date.now(),
            type: "Add Money (UPI)",
            amount: `+₹${amt}`,
            status: "Success",
            time: new Date().toLocaleTimeString()
        };
        setTransactions([newTx, ...transactions]);
        alert(`Successfully added ₹${amt} to wallet!`);
    };

    const handleWithdraw = (e) => {
        e.preventDefault();
        const amt = Number(withdrawAmount);
        if (amt > winningBalance) {
            alert("Insufficient winning balance!");
            return;
        }
        setWinningBalance(winningBalance - amt);
        const newTx = {
            id: Date.now(),
            type: "UPI Withdrawal",
            amount: `-₹${amt}`,
            status: "Processing",
            time: new Date().toLocaleTimeString()
        };
        setTransactions([newTx, ...transactions]);
        alert(`Withdrawal request of ₹${amt} sent to UPI ID: ${upiId}`);
    };

    const handleSendNotification = (e) => {
        e.preventDefault();
        const newNotif = { id: Date.now(), title: notifTitle, body: notifBody };
        setNotifications([newNotif, ...notifications]);
        setNotifTitle('');
        setNotifBody('');
        alert("Notification broadcasted!");
    };

    const handlePublishResult = (e) => {
        e.preventDefault();
        const resObj = { id: Date.now(), match: resMatch, winner: resWinner, prize: resPrize };
        setAnnouncedResults([resObj, ...announcedResults]);
        setResMatch('');
        setResWinner('');
        setResPrize('');
        alert("Result published successfully!");
    };

    const handleSupportSubmit = (e) => {
        e.preventDefault();
        alert("Support ticket sent to admin successfully!");
        setSupportMsg('');
    };

    if (!isLoggedIn) {
        return (
            <div style={{ fontFamily: 'Segoe UI', backgroundColor: '#111', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
                <div style={{ background: '#1c1c1c', padding: '25px', borderRadius: '12px', border: '1px solid #d32f2f' }}>
                    <h2 style={{ fontSize: '20px', color: '#d32f2f', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>CLASHX7 LOGIN</h2>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>Login</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#121212', minHeight: '100vh', paddingBottom: '70px', maxWidth: '480px', margin: '0 auto', color: '#fff', position: 'relative', border: '1px solid #333' }}>
            
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#1e1e1e', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 1000 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#d32f2f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>🔥</div>
                    <span style={{ fontWeight: '900', color: '#d32f2f', fontSize: '16px', letterSpacing: '1px' }}>CLASHX7</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div onClick={() => setCurrentTab('wallet')} style={{ background: '#2c2c2c', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', border: '1px solid #444' }}>
                        ₹ {walletBalance} 💳
                    </div>
                    {email === "parimaltikadar110@gmail.com" && (
                        <button onClick={() => setCurrentTab('admin')} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Admin Panel</button>
                    )}
                </div>
            </div>

            {/* HOME TAB */}
            {currentTab === 'home' && (
                <div>
                    {/* Sub-menu bar matching video */}
                    <div style={{ display: 'flex', overflowX: 'auto', background: '#181818', padding: '8px 10px', borderBottom: '1px solid #333', gap: '8px', whiteSpace: 'nowrap' }}>
                        {[
                            { id: 'solo_br', label: 'SOLO BR' },
                            { id: 'duo_br', label: 'DUO BR' },
                            { id: 'duo_kill', label: 'DUO PR KILL' },
                            { id: 'lone_wolf', label: 'LONE WOLF' },
                            { id: 'cs_challengers', label: 'CS CHALLENGERS' }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{ background: subTab === tab.id ? '#d32f2f' : 'transparent', color: subTab === tab.id ? '#fff' : '#aaa', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '12px' }}>
                        {matches.filter(m => subTab === 'solo_br' || m.category === subTab).length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>No tournaments available in this category.</div>
                        ) : (
                            matches.filter(m => subTab === 'solo_br' || m.category === subTab).map(m => (
                                <div key={m.id} style={{ background: '#1c1c1c', borderRadius: '8px', padding: '12px', marginBottom: '10px', border: '1px solid #333' }}>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>SOLO • BERMUDA • 32 SLOTS</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>{m.title}</div>
                                    <div style={{ fontSize: '12px', color: '#d32f2f', fontWeight: '700' }}>Prize Pool: {m.prize}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #444', paddingTop: '8px', marginTop: '6px', fontSize: '11px', color: '#aaa' }}>
                                        <div>
                                            <span style={{ color: '#ff9800', display: 'block' }}>{m.spots}</span>
                                            <span>{m.time}</span>
                                        </div>
                                        <button onClick={() => handleJoinMatch(m)} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            {m.fee} JOIN
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* MY MATCHES TAB */}
            {currentTab === 'matches' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>My Joined Matches</h3>
                    {myJoinedMatches.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#888' }}>No matches joined yet. Join upcoming tournaments!</p>
                    ) : (
                        myJoinedMatches.map(jm => (
                            <div key={jm.id} style={{ background: '#1c1c1c', padding: '12px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #333', fontSize: '12px' }}>
                                <div style={{ fontWeight: 'bold', color: '#fff' }}>{jm.title}</div>
                                <div style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>Status: Registered (Upcoming)</div>
                                <div style={{ color: '#aaa', fontSize: '10px', marginTop: '2px' }}>Time: {jm.time}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* LEADERBOARD TAB */}
            {currentTab === 'leaderboard' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '12px' }}>Top Players Leaderboard</h3>
                    <div style={{ background: '#1c1c1c', borderRadius: '8px', padding: '12px', border: '1px solid #333' }}>
                        {appUsers.map((u, idx) => (
                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2c2c2c', fontSize: '12px', alignItems: 'center' }}>
                                <div><b>{idx + 1}. {u.name}</b> <span style={{ fontSize: '10px', color: '#888' }}>({u.role})</span></div>
                                <div style={{ color: '#4caf50', fontWeight: 'bold' }}>₹145.6k</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WALLET TAB (Replacing Clash Store) */}
            {currentTab === 'wallet' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '12px' }}>Wallet & Transactions</h3>
                    
                    <div style={{ background: '#1c1c1c', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '15px' }}>
                        <div style={{ fontSize: '13px', color: '#aaa' }}>Current Deposit Balance</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4caf50', margin: '5px 0' }}>₹ {walletBalance}</div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ padding: '8px', width: '100px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '12px' }} />
                            <button onClick={handleDeposit} style={{ background: '#4caf50', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Add Money</button>
                        </div>
                    </div>

                    <div style={{ background: '#1c1c1c', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '15px' }}>
                        <div style={{ fontSize: '13px', color: '#aaa' }}>Winning Balance (Withdraw)</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff9800', margin: '5px 0' }}>₹ {winningBalance}</div>
                        <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            <input type="number" placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '12px' }} required />
                            <input type="text" placeholder="Enter UPI ID (e.g. okaxis@paytm)" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '12px' }} required />
                            <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Withdraw Money</button>
                        </form>
                    </div>

                    <div style={{ background: '#1c1c1c', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                        <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>Transaction History</h4>
                        {transactions.length === 0 ? (
                            <p style={{ fontSize: '11px', color: '#888' }}>No transactions recorded yet.</p>
                        ) : (
                            transactions.map(tx => (
                                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2c2c2c', fontSize: '11px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{tx.type}</div>
                                        <div style={{ fontSize: '9px', color: '#888' }}>{tx.time}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: tx.amount.includes('+') ? '#4caf50' : '#d32f2f' }}>{tx.amount}</div>
                                        <div style={{ fontSize: '9px', color: '#aaa' }}>{tx.status}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* PROFILE TAB */}
            {currentTab === 'profile' && (
                <div style={{ padding: '15px' }}>
                    <div style={{ background: '#1c1c1c', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333', marginBottom: '15px' }}>
                        <div style={{ width: '50px', height: '50px', background: '#d32f2f', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', margin: '0 auto 8px auto' }}>D</div>
                        <h4 style={{ fontSize: '14px' }}>{gameName}</h4>
                        <p style={{ fontSize: '11px', color: '#888' }}>Game ID: {gameId}</p>
                    </div>

                    <div style={{ background: '#1c1c1c', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
                        {[
                            { title: 'Account Settings', action: () => alert("Account settings updated.") },
                            { title: 'Results & Winners', action: () => setCurrentTab('results') },
                            { title: 'Customer Support', action: () => setCurrentTab('support') },
                            { title: 'Logout', action: () => setIsLoggedIn(false) }
                        ].map((item, idx) => (
                            <div key={idx} onClick={item.action} style={{ padding: '12px 15px', borderBottom: '1px solid #2c2c2c', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.title}</span>
                                <span>›</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '15px' }}>Version 1.0.7</div>
                </div>
            )}

            {/* ADMIN PANEL */}
            {currentTab === 'admin' && email === "parimaltikadar110@gmail.com" && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '15px', color: '#d32f2f', marginBottom: '15px', fontWeight: 'bold' }}>⚡ ClashX7 Super Admin Panel</h3>
                    
                    {/* Match Creation */}
                    <form onSubmit={handleCreateMatch} style={{ background: '#1c1c1c', padding: '12px', borderRadius: '8px', border: '1px solid #d32f2f', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ fontSize: '13px', color: '#fff' }}>Create New Tournament Match</h4>
                        <input type="text" placeholder="Match Title (e.g. FREE FIRE - SOLO)" value={matchTitle} onChange={(e) => setMatchTitle(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <select value={matchCategory} onChange={(e) => setMatchCategory(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}>
                            <option value="solo_br">SOLO BR</option>
                            <option value="duo_br">DUO BR</option>
                            <option value="duo_kill">DUO PR KILL</option>
                            <option value="lone_wolf">LONE WOLF</option>
                            <option value="cs_challengers">CS CHALLENGERS</option>
                        </select>
                        <input type="text" placeholder="Prize Pool (e.g. ₹225)" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <input type="text" placeholder="Entry Fee (e.g. ₹8)" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <input type="text" placeholder="Match Time (e.g. 06 Oct 12:00 AM)" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Publish Match</button>
                    </form>

                    {/* Declare Winner */}
                    <form onSubmit={handlePublishResult} style={{ background: '#1c1c1c', padding: '12px', borderRadius: '8px', border: '1px solid #333', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ fontSize: '13px', color: '#fff' }}>Publish Match Result & Winner</h4>
                        <input type="text" placeholder="Match Name" value={resMatch} onChange={(e) => setResMatch(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <input type="text" placeholder="Winner Name" value={resWinner} onChange={(e) => setResWinner(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <input type="text" placeholder="Prize Amount Won" value={resPrize} onChange={(e) => setResPrize(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <button type="submit" style={{ background: '#4caf50', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Publish Winner</button>
                    </form>

                    {/* Notification Broadcast */}
                    <form onSubmit={handleSendNotification} style={{ background: '#1c1c1c', padding: '12px', borderRadius: '8px', border: '1px solid #333', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ fontSize: '13px', color: '#fff' }}>Broadcast Notification</h4>
                        <input type="text" placeholder="Notification Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }} required />
                        <textarea placeholder="Notification Body Message" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} style={{ padding: '8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', resize: 'none', height: '45px' }} required />
                        <button type="submit" style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Send Broadcast</button>
                    </form>
                </div>
            )}

            {/* RESULTS TAB */}
            {currentTab === 'results' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>Match Results & Winners</h3>
                    <div style={{ background: '#1c1c1c', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
                        {announcedResults.length === 0 ? (
                            <p style={{ fontSize: '11px', color: '#888' }}>No results declared yet by admin.</p>
                        ) : (
                            announcedResults.map(res => (
                                <div key={res.id} style={{ background: '#222', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #444', fontSize: '12px' }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{res.match}</div>
                                    <div style={{ color: '#4caf50', marginTop: '3px' }}>Winner: <b>{res.winner}</b></div>
                                    <div style={{ color: '#ff9800', fontWeight: 'bold' }}>Prize Won: {res.prize}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* SUPPORT TAB */}
            {currentTab === 'support' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '10px' }}>24/7 Customer Support</h3>
                    <div style={{ background: '#1c1c1c', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                        <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea placeholder="Describe your issue or payment query..." value={supportMsg} onChange={(e) => setSupportMsg(e.target.value)} style={{ padding: '10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff', resize: 'none', height: '70px' }} required />
                            <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '9px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Submit Ticket</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar matching video */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#181818', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #333', zIndex: 1000 }}>
                <div onClick={() => setCurrentTab('home')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'home' ? '#d32f2f' : '#888', fontWeight: '700', cursor: 'pointer' }}>🏠<br/>Home</div>
                <div onClick={() => setCurrentTab('matches')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'matches' ? '#d32f2f' : '#888', fontWeight: '700', cursor: 'pointer' }}>🎮<br/>My Matches</div>
                <div onClick={() => setCurrentTab('wallet')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'wallet' ? '#d32f2f' : '#888', fontWeight: '700', cursor: 'pointer' }}>💳<br/>Wallet</div>
                <div onClick={() => setCurrentTab('leaderboard')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'leaderboard' ? '#d32f2f' : '#888', fontWeight: '700', cursor: 'pointer' }}>🏆<br/>Leaderboard</div>
                <div onClick={() => setCurrentTab('profile')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'profile' ? '#d32f2f' : '#888', fontWeight: '700', cursor: 'pointer' }}>👤<br/>Profile</div>
            </div>

        </div>
    );
};

export default ClashX7App;
