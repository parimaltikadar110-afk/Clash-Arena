import { useMemo, useState } from 'react';

const tabs = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'matches', label: 'My Matches', icon: '⚔' },
  { key: 'store', label: 'Clash Store', icon: '◫' },
  { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { key: 'wallet', label: 'Wallet', icon: '💳' },
];

const modes = ['Solo BR', 'Duo BR', 'Clash Squad', 'Lone Wolf'];

const tournaments = [
  {
    id: 1,
    mode: 'Solo BR',
    title: 'Nightfall Royale',
    prize: '৳12,500',
    map: 'Pyramid 2.0',
    slotsLeft: 28,
    totalSlots: 64,
    time: 'Today • 8:30 PM',
    entry: '৳100',
    tag: 'Hot',
  },
  {
    id: 2,
    mode: 'Duo BR',
    title: 'Midnight Mayhem',
    prize: '৳18,000',
    map: 'Frozen Drift',
    slotsLeft: 16,
    totalSlots: 48,
    time: 'Tomorrow • 9:00 PM',
    entry: '৳150',
    tag: 'Featured',
  },
  {
    id: 3,
    mode: 'Clash Squad',
    title: 'Empire Strike',
    prize: '৳25,000',
    map: 'Urban Ruins',
    slotsLeft: 8,
    totalSlots: 32,
    time: 'Sat • 7:45 PM',
    entry: '৳220',
    tag: 'VIP',
  },
  {
    id: 4,
    mode: 'Lone Wolf',
    title: 'Shadow Hunt',
    prize: '৳9,500',
    map: 'Crimson Ridge',
    slotsLeft: 32,
    totalSlots: 72,
    time: 'Mon • 8:00 PM',
    entry: '৳80',
    tag: 'Fresh',
  },
];

const leaderboard = [
  { rank: 1, name: 'Blaze Phantom', earnings: '৳42,000', avatar: 'BP', color: '#ff7a18' },
  { rank: 2, name: 'Rogue Kairo', earnings: '৳38,500', avatar: 'RK', color: '#ff3b3b' },
  { rank: 3, name: 'Astra Vex', earnings: '৳35,250', avatar: 'AV', color: '#7c5cff' },
  { rank: 4, name: 'Astra Fenix', earnings: '৳31,700', avatar: 'AF', color: '#ffb703' },
  { rank: 5, name: 'Rogue Zeal', earnings: '৳29,200', avatar: 'RZ', color: '#24d47a' },
  { rank: 6, name: 'Nova Volt', earnings: '৳27,600', avatar: 'NV', color: '#22d3ee' },
];

const storeItems = [
  { name: '৳500 Gift Card', type: 'Redeemable', price: '৳500', tag: 'Popular' },
  { name: 'Apex Tee', type: 'Merch', price: '৳999', tag: 'New' },
  { name: 'Clash Pass', type: 'Voucher', price: '৳399', tag: 'Elite' },
  { name: 'Battle Badge', type: 'Merch', price: '৳699', tag: 'Limited' },
];

const matchSections = {
  upcoming: [
    { id: 1, title: 'Nightfall Royale', mode: 'Solo BR', time: 'Today • 8:30 PM', status: 'Confirmed' },
    { id: 2, title: 'Street Clash', mode: 'Clash Squad', time: 'Sun • 6:15 PM', status: 'Waiting' },
  ],
  live: [
    { id: 3, title: 'Frozen Drift', mode: 'Duo BR', time: 'Live now • 00:18:32', status: 'Live' },
  ],
  played: [
    { id: 4, title: 'Magma Rush', mode: 'Solo BR', time: 'Finished • 2h ago', status: 'Won' },
    { id: 5, title: 'Summit Duel', mode: 'Lone Wolf', time: 'Finished • 1d ago', status: 'Played' },
  ],
};

const defaultUser = {
  id: 'player-101',
  name: 'Apex Viper',
  username: 'apexviper',
  email: 'apex@clasharena.app',
  phone: '+8801700000000',
  balance: 24500,
  coinBalance: 1820,
};

// Toast Notification Component
function Toast({ message, isVisible }) {
  if (!isVisible) return null;
  return (
    <div className="toast-notification">
      <span>✓ {message}</span>
    </div>
  );
}

// Download Modal Component
function DownloadModal({ isOpen, onClose, onDownload, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <h2>📥 Download Clash Arena</h2>
        </div>
        <div className="modal-body">
          <p className="modal-text">
            Get the official Clash Arena app for the best tournament experience!
          </p>
          <div className="download-info">
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <span>Instant notifications for tournaments</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🎮</span>
              <span>Optimized mobile gameplay</span>
            </div>
            <div className="info-item">
              <span className="info-icon">💰</span>
              <span>Exclusive rewards & offers</span>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button 
            className="primary-btn full-width" 
            onClick={onDownload}
            disabled={isLoading}
          >
            {isLoading ? '⟳ Preparing Download...' : '⬇ Download Now'}
          </button>
          <button className="ghost-btn full-width" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="modal-note">
          ℹ APK downloads directly. Install from Settings → Security on Android devices.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [page, setPage] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(defaultUser);
  const [otpSent, setOtpSent] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const walletSummary = useMemo(
    () => [
      { label: 'Deposit Balance', value: `৳${user.balance.toLocaleString()}` },
      { label: 'Add Funds', value: '৳2,000' },
      { label: 'Withdraw', value: '৳1,500' },
      { label: 'Total Earnings', value: '৳24,500' },
    ],
    [user.balance]
  );

  const handleAuthSubmit = (event) => {
    event.preventDefault();
    const form = event.target;
    const email = form.email?.value?.trim() || '';
    const phone = form.phone?.value?.trim() || '';
    const password = form.password?.value || '';

    if (!email && !phone) {
      alert('Enter your email or mobile number');
      return;
    }

    if (!password) {
      alert('Enter your password');
      return;
    }

    if (authMode === 'signup') {
      const confirmPassword = form.confirmPassword?.value || '';
      if (confirmPassword !== password) {
        alert('Confirm password does not match');
        return;
      }
    }

    alert('Authentication successful!');
    setUser(defaultUser);
  };

  const handleDownloadClick = () => {
    setShowDownloadModal(true);
  };

  const showNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDownloadConfirm = async () => {
    setIsDownloading(true);
    
    try {
      // Create a dummy APK blob (simulated file)
      // In production, this would be an actual APK file
      const dummyContent = 'ClashArena_APK_v1.0.0';
      const blob = new Blob([dummyContent], { type: 'application/vnd.android.package-archive' });
      
      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'ClashArena.apk';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      // Show success notification
      showNotification('Downloading Clash Arena APK...');
      setShowDownloadModal(false);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderHome = () => (
    <div className="page-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Elite Esports Arena</p>
          <h1>Clash Arena</h1>
          <p className="subtitle">
            Compete in premium tournaments, battle for leaderboard glory, and win real rewards.
          </p>
          <div className="hero-actions">
            <button className="primary-btn">Join Free Match</button>
            <button className="download-btn" onClick={handleDownloadClick}>
              📥 Download App
            </button>
          </div>
        </div>

        <div className="hero-compact-card">
          <div className="live-pill">🔴 LIVE</div>
          <h3>Weekly Grand Slam</h3>
          <p>
            Prize Pool: <strong>৳1,25,000</strong>
          </p>
          <div className="mini-bars">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </header>

      <div className="mode-tabs">
        {modes.map((mode) => (
          <button key={mode} className={mode === 'Solo BR' ? 'active' : ''}>
            {mode}
          </button>
        ))}
      </div>

      <div className="cards-grid">
        {tournaments.map((card) => (
          <article key={card.id} className="tournament-card">
            <div className="card-top">
              <span className="badge">{card.tag}</span>
              <span>{card.mode}</span>
            </div>
            <h3>{card.title}</h3>
            <div className="card-meta">
              <span>{card.map}</span>
              <span>{card.prize}</span>
            </div>
            <div className="slots-row">
              <span>{card.slotsLeft}/{card.totalSlots} slots left</span>
              <span>{card.time}</span>
            </div>
            <div className="entry-row">
              <span>Entry: {card.entry}</span>
              <button className="join-btn">Join</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderMatches = () => (
    <div className="page-shell">
      <h2>My Matches</h2>
      <div className="match-sections">
        {['upcoming', 'live', 'played'].map((section) => (
          <div key={section} className="match-panel">
            <h3>{section.charAt(0).toUpperCase() + section.slice(1)}</h3>
            {matchSections[section].map((match) => (
              <div key={match.id} className="match-item">
                <div>
                  <h3>{match.title}</h3>
                  <p>
                    {match.mode} • {match.time}
                  </p>
                </div>
                <span className={`status-badge ${match.status.toLowerCase()}`}>
                  {match.status}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStore = () => (
    <div className="page-shell">
      <h2>Clash Store</h2>
      <div className="store-grid">
        {storeItems.map((item) => (
          <div key={item.name} className="store-card">
            <span className="tag">{item.tag}</span>
            <h3>{item.name}</h3>
            <p>{item.type}</p>
            <div className="store-row">
              <span>{item.price}</span>
              <button>Redeem</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="page-shell">
      <h2>Leaderboard</h2>
      <div className="leaderboard-list">
        {leaderboard.map((player) => (
          <div key={player.rank} className="leaderboard-row">
            <div className="avatar" style={{ background: player.color }}>
              {player.avatar}
            </div>
            <div className="player-meta">
              <h4>{player.name}</h4>
              <p>Earnings: {player.earnings}</p>
            </div>
            <span className="rank-pill">#{player.rank}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="page-shell">
      <h2>Wallet & Profile</h2>
      <div className="wallet-grid">
        {walletSummary.map((item) => (
          <div key={item.label} className="wallet-box">
            <small>{item.label}</small>
            <h2>{item.value}</h2>
          </div>
        ))}
      </div>

      <div className="profile-panel">
        <div className="profile-head">
          <div className="avatar large" style={{ background: 'linear-gradient(135deg, #ff7a18, #ff3b3b)' }}>
            AV
          </div>
          <div>
            <h3>{user.name}</h3>
            <p>@{user.username}</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Full Name</label>
            <input defaultValue={user.name} />
          </div>
          <div className="field">
            <label>Mobile Number</label>
            <input defaultValue={user.phone} />
          </div>
          <div className="field">
            <label>Email</label>
            <input defaultValue={user.email} />
          </div>
          <div className="field">
            <label>Wallet Balance</label>
            <input defaultValue={`৳${user.balance}`} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDesktopNav = () => (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">CA</span>
        <h2>Clash Arena</h2>
      </div>

      <nav className="nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={page === tab.key ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="download-box">
        <button className="download-btn large" onClick={handleDownloadClick}>
          📥 Download App
        </button>
      </div>

      <div className="user-card">
        <div>
          <p>{user.name}</p>
          <small>@{user.username}</small>
        </div>
        <button className="ghost-btn" onClick={() => setUser(null)}>
          Logout
        </button>
      </div>
    </aside>
  );

  const renderMobileNav = () => (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => (
        <button key={tab.key} className={page === tab.key ? 'active' : ''} onClick={() => setPage(tab.key)}>
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">
            <span className="brand-mark">CA</span>
            <h2>Clash Arena</h2>
          </div>

          <div className="auth-toggle">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
              Sign up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            <div className="field">
              <label>Email or Mobile</label>
              <input name="email" type="text" placeholder="Email or mobile number" />
            </div>

            <div className="field">
              <label>Password</label>
              <input name="password" type="password" placeholder="Enter password" />
            </div>

            {authMode === 'signup' && (
              <div className="field">
                <label>Confirm Password</label>
                <input name="confirmPassword" type="password" placeholder="Re-enter password" />
              </div>
            )}

            <button type="submit" className="primary-btn full-width">
              Continue
            </button>

            {otpSent && <div className="otp-box">✓ OTP sent to your number</div>}

            <button type="button" className="ghost-btn full-width" onClick={() => setOtpSent(true)}>
              Send OTP
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {renderDesktopNav()}
      <main className="main-panel">
        {page === 'home' && renderHome()}
        {page === 'matches' && renderMatches()}
        {page === 'store' && renderStore()}
        {page === 'leaderboard' && renderLeaderboard()}
        {page === 'wallet' && renderWallet()}
      </main>
      {renderMobileNav()}
      <DownloadModal 
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownloadConfirm}
        isLoading={isDownloading}
      />
      <Toast message={toastMessage} isVisible={showToast} />
    </div>
  );
}
