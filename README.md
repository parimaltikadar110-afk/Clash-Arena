# Clash Arena - Free Fire Tournament App

**Clash Arena** is a premium Free Fire tournament platform where players can compete in tournaments, climb the leaderboard, and win real rewards.

## 🎮 Features

- **Tournament Matchmaking** - Join live tournaments across multiple game modes (Solo BR, Duo BR, Clash Squad, Lone Wolf)
- **Real-time Leaderboard** - Track your earnings and rank globally
- **Secure Wallet System** - Manage deposits, withdrawals, and prize earnings
- **Clash Store** - Purchase gift cards, vouchers, and exclusive merchandise
- **Live Match Tracking** - Watch ongoing tournaments and match results
- **Multi-platform Access** - Web app with responsive mobile design

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/parimaltikadar110-afk/Clash-Arena
cd Clash-Arena

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to Vercel.

## 📂 Project Structure

```
src/
├── App.jsx           # Main app component with all page views
├── main.jsx          # React DOM entry point
├── index.css         # Global styles
├── lib/
│   ├── supabase.js   # Supabase client and mock data
│   ├── auth.js       # Authentication functions
│   ├── user.js       # User management
│   └── tournaments.js # Tournament data handlers
└── hooks/
    └── useAuth.js    # Auth state management hook

backend/             # Express API server (optional)
vercel.json          # Vercel deployment configuration
```

## 🔑 Environment Setup

Create a `.env` file with the following Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project settings. See `SUPABASE_SETUP.md` for detailed setup instructions.

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: CSS (with CSS Variables)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Deployment**: Vercel
- **Build Tool**: Vite

## 📱 Features by Page

### Home
- Browse active tournaments
- Filter by game mode
- View prize pools and slot availability
- Quick join functionality

### My Matches
- View upcoming matches
- Watch live tournament progress
- Review finished match results

### Leaderboard
- Global earnings rankings
- Top player profiles
- Real-time score updates

### Wallet & Profile
- Account settings
- Balance management
- Transaction history
- Profile customization

### Clash Store
- Purchase gift cards
- Exclusive merchandise
- Limited edition items

## 🔐 Authentication

The app supports:
- Email/Password signup and login
- OTP verification via phone
- Session management via Supabase Auth
- Profile data stored in PostgreSQL

## 📦 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Vercel automatically detects Vite configuration
4. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

The `vercel.json` file is pre-configured with proper routing for single-page app deployment.

## 🐛 Troubleshooting

### Blank page after deployment
- Check browser console for errors
- Verify Supabase credentials in `.env`
- Ensure `vercel.json` routing is configured

### Service Worker errors
- Service worker registration failures are non-critical and logged to console
- App continues to function normally

### Build failures
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version compatibility (18+)
- Verify no syntax errors with `npm run build`

## 📄 License

This project is open source and available for tournament organizers and esports platforms.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues, questions, or suggestions, please create an issue on GitHub.

---

**Made with ❤️ for Free Fire Esports Community**
