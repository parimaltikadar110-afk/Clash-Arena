import React, { useState } from 'react';

const ClashX7App = () => {
    // Navigation & View States
    const [currentTab, setCurrentTab] = useState('home');
    const [subCategory, setSubCategory] = useState('SOLO BR');
    const [profileView, setProfileView] = useState('main'); // main, account, withdrawals, transactions, support

    // App Data States
    const [walletBalance, setWalletBalance] = useState(0);
    const [winningBalance, setWinningBalance] = useState(0);
    const [depositAmount, setDepositAmount] = useState(10);
    const [withdrawAmount, setWithdrawAmount] = useState(50);
    const [upiId, setUpiId] = useState('');
    
    // User Profile Details
    const [gameName, setGameName] = useState('Debraj');
    const [gameId, setGameId] = useState('464634354');

    // Admin & Matches States (Only created via Admin Panel)
    const [matches, setMatches] = useState([
        { id: 1, category: 'SOLO BR', title: 'FREE FIRE - SOLO HUNTER', prize: '₹225', fee: '₹8', time: '06 Oct 12:00 AM', spots: 0 },
        { id: 2, category: 'SOLO BR', title: 'FREE FIRE - NEW THUNDER', prize: '₹145', fee: '₹8', time: '06 Oct 01:00 AM', spots: 19 },
        { id: 3, category: 'DUO BR', title: 'FF - 5RS DUO PER KILL', prize: '₹240', fee: '₹6', time: '06 Oct 12:00 AM', spots: 22 },
        { id: 4, category: 'SOLO PER KILL', title: 'FF - 5₹ PER KILL', prize: '₹240', fee: '₹6', time: '06 Oct 12:00 AM', spots: 48 },
        { id: 5, category: 'LONE WOLF', title: 'FF - LONE WOLF 1V1 HEADSHOT', prize: '₹45', fee: '₹26', time: '06 Oct 12:15 AM', spots: 0 },
        { id: 6, category: 'CS CHALLENGERS', title: 'FF - M1887 1V1 HEAD ONLY', prize: '₹50', fee: '₹31', time: '06 Oct 12:00 AM', spots: 0 },
        { id: 7, category: 'CLASH SQUAD', title: 'CLASH SQUAD 1 VS 1', prize: '₹45', fee: '₹26', time: '06 Oct 12:10 AM', spots: 1 },
        { id: 8, category: 'LOSS TO WIN', title: 'LONE WOLF 1V1 LOSS TO WIN', prize: '₹50', fee: '₹31', time: '06 Oct 10:00 AM', spots: 1 }
    ]);

    const [myJoinedMatches, setMyJoinedMatches] = useState([]);
    const [transactions, setTransactions] = useState([]);
    
    // Admin Panel State
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [adminTitle, setAdminTitle] = useState('');
    const [adminPrize, setAdminPrize] = useState('');
    const [adminFee, setAdminFee] = useState('');
    const [adminCategory, setAdminCategory] = useState('SOLO BR');
    const [adminTime, setAdminTime] = useState('');

    // Handlers
    const handleJoinMatch = (match) => {
        setMyJoinedMatches([...myJoinedMatches, match]);
        setTransactions([
            { id: Date.now(), type: `Joined: ${match.title}`, amount: `-${match.fee}`, time: new Date().toLocaleTimeString(), status: 'Success' },
            ...transactions
        ]);
        alert(`Successfully joined ${match.title}!`);
    };

    const handleAddMoney = () => {
        const amt = Number(depositAmount);
        setWalletBalance(walletBalance + amt);
        setTransactions([
            { id: Date.now(), type: 'Deposit via UPI', amount: `+₹${amt}`, time: new Date().toLocaleTimeString(), status: 'Success' },
            ...transactions
        ]);
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
        setTransactions([
            { id: Date.now(), type: 'Withdrawal Request', amount: `-₹${amt}`, time: new Date().toLocaleTimeString(), status: 'Pending' },
            ...transactions
        ]);
        alert(`Withdrawal request of ₹${amt} submitted successfully!`);
    };

    const handleAdminCreateMatch = (e) => {
        e.preventDefault();
        const newMatch = {
            id: Date.now(),
            category: adminCategory,
            title: adminTitle,
            prize: adminPrize,
            fee: adminFee,
            time: adminTime,
            spots: 32
        };
        setMatches([newMatch, ...matches]);
        setAdminTitle('');
        setAdminPrize('');
        setAdminFee('');
        setAdminTime('');
        alert("New match created successfully via Admin Panel!");
    };

    return (
        <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#fff', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', position: 'relative', paddingBottom: '70px', border: '1px solid #ddd' }}>
            
            {/* Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div onClick={() => setCurrentTab('profile')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#673ab7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
                        {gameName.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#d32f2f' }}>CLASHX7</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setIsAdminOpen(true)} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Admin</button>
                    <div onClick={() => setCurrentTab('wallet')} style={{ border: '1px solid #ddd', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#2e7d32' }}>
                        ₹ {walletBalance} ⌵
                    </div>
                </div>
            </div>

            {/* TAB 1: HOME */}
            {currentTab === 'home' && (
                <div>
                    {/* Sub-categories horizontal scroll */}
                    <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', padding: '10px 15px', borderBottom: '1px solid #eee', background: '#fff', whiteSpace: 'nowrap' }}>
                        {['SOLO BR', 'DUO BR', 'DUO PR KILL', 'SOLO PER KILL', 'LONE WOLF', 'CS CHALLENGERS', 'CLASH SQUAD', 'LOSS TO WIN'].map(cat => (
                            <span key={cat} onClick={() => setSubCategory(cat)} style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: subCategory === cat ? '#d32f2f' : '#666', borderBottom: subCategory === cat ? '2px solid #d32f2f' : 'none', paddingBottom: '4px' }}>
                                {cat}
                            </span>
                        ))}
                    </div>

                    {/* Match List */}
                    <div style={{ padding: '10px 15px' }}>
                        {matches.filter(m => m.category === subCategory).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#777', fontSize: '13px' }}>No tournaments in this category. Stay tuned!</div>
                        ) : (
                            matches.filter(m => m.category === subCategory).map(m => (
                                <div key={m.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '10px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>SOLO • BERMUDA • {m.spots} SPOTS</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111' }}>{m.title}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#d32f2f', fontWeight: 'bold' }}>Prize Pool - {m.prize}</div>
                                            <div style={{ fontSize: '10px', color: '#555' }}>{m.time}</div>
                                        </div>
                                        <button onClick={() => handleJoinMatch(m)} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            {m.fee} JOIN
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: MY MATCHES */}
            {currentTab === 'matches' && (
                <div style={{ padding: '15px' }}>
                    <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>My Joined Matches</h3>
                    {myJoinedMatches.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#777', padding: '40px', fontSize: '13px' }}>No matches now. Join upcoming!</div>
                    ) : (
                        myJoinedMatches.map(jm => (
                            <div key={jm.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{jm.title}</div>
                                <div style={{ fontSize: '10px', color: '#2e7d32', marginTop: '4px' }}>Status: Registered</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB 3: CLASH STORE */}
            {currentTab === 'store' && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '15px', color: '#333' }}>Clash Store</h3>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>In-game items & redeem codes coming soon!</p>
                </div>
            )}

            {/* TAB 4: LEADERBOARD */}
            {currentTab === 'leaderboard' && (
                <div style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '15px', background: '#fafafa', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#673ab7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: '12px', fontWeight: 'bold' }}>S</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Saksham</div>
                            <div style={{ fontSize: '10px', color: '#2e7d32' }}>₹102.K</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ff9800', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: '12px', fontWeight: 'bold' }}>I</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>ISAGI</div>
                            <div style={{ fontSize: '10px', color: '#2e7d32' }}>₹145.6K</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#00bcd4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', fontSize: '12px', fontWeight: 'bold' }}>M</div>
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Mehebub</div>
                            <div style={{ fontSize: '10px', color: '#2e7d32' }}>₹95.5K</div>
                        </div>
                    </div>
                    <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                        <span>Name</span>
                        <span>Rank</span>
                    </div>
                    {[
                        { rank: 3, name: 'Mehebub', score: '95.5K' },
                        { rank: 4, name: 'Abhi', score: '84K' },
                        { rank: 5, name: 'ITZ ARYAN', score: '80.9K' },
                        { rank: 6, name: 'SONU GUPTA', score: '77.6K' },
                        { rank: 7, name: 'Arab', score: '69.5K' }
                    ].map(user => (
                        <div key={user.rank} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                            <span><b>{user.name}</b></span>
                            <span>{user.rank}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#e8f5e9', marginTop: '10px', borderRadius: '6px', fontSize: '12px' }}>
                        <span><b>{gameName} (You)</b></span>
                        <span><b>1</b></span>
                    </div>
                </div>
            )}

            {/* PROFILE & SUB-PAGES */}
            {currentTab === 'profile' && profileView === 'main' && (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ width: '60px', height: '60px', background: '#673ab7', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 8px' }}>
                        {gameName.charAt(0)}
                    </div>
                    <h3 style={{ fontSize: '15px' }}>{gameName}</h3>
                    <div onClick={() => setProfileView('account')} style={{ fontSize: '12px', color: '#d32f2f', cursor: 'pointer', marginTop: '2px', fontWeight: 'bold' }}>View Profile</div>

                    <div style={{ marginTop: '20px', textAlign: 'left', borderTop: '1px solid #eee' }}>
                        {[
                            { name: 'Account Settings', view: 'account' },
                            { name: 'Join Private Tournament', view: 'main' },
                            { name: 'Withdrawals', view: 'withdrawals' },
                            { name: 'Transactions', view: 'transactions' },
                            { name: 'Customer Support', view: 'support' }
                        ].map((item, idx) => (
                            <div key={idx} onClick={() => setProfileView(item.view)} style={{ padding: '12px 5px', borderBottom: '1px solid #eee', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.name}</span>
                                <span>›</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '20px' }}>Version 1.0.3</div>
                </div>
            )}

            {/* PROFILE -> ACCOUNT SETTINGS */}
            {currentTab === 'profile' && profileView === 'account' && (
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span onClick={() => setProfileView('main')} style={{ cursor: 'pointer', fontSize: '16px' }}>←</span>
                        <h3 style={{ fontSize: '15px' }}>Account</h3>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <div style={{ width: '50px', height: '50px', background: '#673ab7', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto' }}>{gameName.charAt(0)}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '5px' }}>{gameName}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '11px', color: '#666' }}>Game Name</label>
                        <input type="text" value={gameName} onChange={(e) => setGameName(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                        <label style={{ fontSize: '11px', color: '#666' }}>Game ID</label>
                        <input type="text" value={gameId} onChange={(e) => setGameId(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} />
                        <button onClick={() => { alert("Account updated!"); setProfileView('main'); }} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '10px' }}>Save</button>
                    </div>
                </div>
            )}

            {/* PROFILE -> WITHDRAWALS */}
            {currentTab === 'profile' && profileView === 'withdrawals' && (
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span onClick={() => setProfileView('main')} style={{ cursor: 'pointer', fontSize: '16px' }}>←</span>
                        <h3 style={{ fontSize: '15px' }}>Withdrawal</h3>
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '15px' }}>Winning Balance: <b>₹{winningBalance}</b></div>
                    <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                        <input type="text" placeholder="Enter UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                        <button type="submit" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Withdraw ₹{withdrawAmount}</button>
                    </form>
                </div>
            )}

            {/* PROFILE -> TRANSACTIONS */}
            {currentTab === 'profile' && profileView === 'transactions' && (
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span onClick={() => setProfileView('main')} style={{ cursor: 'pointer', fontSize: '16px' }}>←</span>
                        <h3 style={{ fontSize: '15px' }}>Transactions</h3>
                    </div>
                    {transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#777', padding: '40px', fontSize: '12px' }}>No Transactions Yet</div>
                    ) : (
                        transactions.map(tx => (
                            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                                <div><div>{tx.type}</div><div style={{ fontSize: '10px', color: '#888' }}>{tx.time}</div></div>
                                <div style={{ fontWeight: 'bold', color: tx.amount.includes('+') ? '#2e7d32' : '#d32f2f' }}>{tx.amount}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* PROFILE -> SUPPORT */}
            {currentTab === 'profile' && profileView === 'support' && (
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span onClick={() => setProfileView('main')} style={{ cursor: 'pointer', fontSize: '16px' }}>←</span>
                        <h3 style={{ fontSize: '15px' }}>Customer Support</h3>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666' }}>Contact us on Telegram or WhatsApp for support regarding matches and payments.</p>
                </div>
            )}

            {/* WALLET TAB */}
            {currentTab === 'wallet' && (
                <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', marginBottom: '15px' }}>Wallet</h3>
                    <div style={{ fontSize: '13px', marginBottom: '10px' }}>Current Balance: <b>₹{walletBalance}</b></div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} style={{ padding: '8px', width: '100px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }} />
                        <button onClick={handleAddMoney} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Add ₹{depositAmount}</button>
                    </div>
                </div>
            )}

            {/* ADMIN MODAL (Only way to create matches now) */}
            {isAdminOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '90%', maxWidth: '400px', padding: '20px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h3 style={{ fontSize: '14px', color: '#d32f2f' }}>Admin Panel: Create Match</h3>
                            <span onClick={() => setIsAdminOpen(false)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                        </div>
                        <form onSubmit={handleAdminCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <select value={adminCategory} onChange={(e) => setAdminCategory(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                {['SOLO BR', 'DUO BR', 'DUO PR KILL', 'SOLO PER KILL', 'LONE WOLF', 'CS CHALLENGERS', 'CLASH SQUAD', 'LOSS TO WIN'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="text" placeholder="Match Title (e.g. FREE FIRE - SOLO)" value={adminTitle} onChange={(e) => setAdminTitle(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            <input type="text" placeholder="Prize Pool (e.g. ₹225)" value={adminPrize} onChange={(e) => setAdminPrize(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            <input type="text" placeholder="Entry Fee (e.g. ₹8)" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            <input type="text" placeholder="Time (e.g. 06 Oct 12:00 AM)" value={adminTime} onChange={(e) => setAdminTime(e.target.value)} style={{ padding: '8px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} required />
                            <button type="submit" style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '5px' }}>Create Match</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #eee', zIndex: 99 }}>
                <div onClick={() => setCurrentTab('home')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'home' ? '#d32f2f' : '#666', fontWeight: 'bold', cursor: 'pointer' }}>Home</div>
                <div onClick={() => setCurrentTab('matches')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'matches' ? '#d32f2f' : '#666', fontWeight: 'bold', cursor: 'pointer' }}>My Matches</div>
                <div onClick={() => setCurrentTab('store')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'store' ? '#d32f2f' : '#666', fontWeight: 'bold', cursor: 'pointer' }}>Clash Store</div>
                <div onClick={() => setCurrentTab('leaderboard')} style={{ textAlign: 'center', fontSize: '11px', color: currentTab === 'leaderboard' ? '#d32f2f' : '#666', fontWeight: 'bold', cursor: 'pointer' }}>Leaderboard</div>
            </div>

        </div>
    );
};

export default ClashX7App;
