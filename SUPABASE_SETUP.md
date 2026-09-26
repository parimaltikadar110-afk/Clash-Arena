# Supabase Setup Guide for Clash Arena

## ✅ What's Done

Your Clash Arena app is now connected to Supabase with:
- ✅ Supabase Auth (Email/Password)
- ✅ User profiles with game names and wallet balance
- ✅ Tournaments system with status tracking
- ✅ Registration/slot system
- ✅ Wallet and transaction history
- ✅ Row Level Security (RLS) policies
- ✅ Admin role for tournament creation

---

## 🔧 Setup Instructions

### Step 1: Copy `.env.local` (Important!)

The `.env` file contains your Supabase credentials. Copy it to `.env.local` so Git doesn't track it:

```bash
cp .env .env.local
```

Or create `.env.local` with:
```env
VITE_SUPABASE_URL=https://qsozgiwbxafahieuvjgu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_FRS0F7IEaYLcxaE3FarMOg_fLstU-LY
```

### Step 2: Run SQL Schema in Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Open **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire content from `supabase/schema.sql`
5. Paste it into the SQL editor
6. Click **Run**

This will:
- Create all tables (users, tournaments, registrations, transactions)
- Set up indexes for performance
- Enable Row Level Security
- Create auth trigger for automatic user profile creation

### Step 3: Enable Email/Password Auth

1. Go to **Authentication** → **Providers**
2. Find **Email** provider
3. Enable it
4. Keep "Confirm email" OFF for easier testing (enable later for production)

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Run the App

```bash
npm run dev
```

---

## 📚 How to Use

### Authentication

```javascript
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, profile, login, signup, logout } = useAuth()

  // Sign up
  await signup('user@example.com', 'password123', 'MyGameName')

  // Sign in
  await login('user@example.com', 'password123')

  // Sign out
  await logout()
}
```

### Tournaments

```javascript
import { fetchTournaments, createTournament, joinTournament } from './lib/tournaments'

// Fetch all tournaments
const tournaments = await fetchTournaments()

// Create tournament (admin only)
await createTournament({
  title: 'Weekly Cup',
  game: 'Free Fire',
  entry_fee: 50,
  prize_pool: 5000,
  total_slots: 100
})

// Join tournament
await joinTournament(tournamentId)
```

### User Profile & Wallet

```javascript
import { getUserProfile, getWalletBalance, addWalletFunds, getTransactionHistory } from './lib/user'

// Get profile
const profile = await getUserProfile(userId)

// Get wallet balance
const balance = await getWalletBalance(userId)

// Add funds
await addWalletFunds(userId, 1000, 'Deposit')

// Get transaction history
const transactions = await getTransactionHistory(userId)
```

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled:

- **Users**: Can only read/update own profile, admins can read all
- **Tournaments**: Anyone can read, admins can create/update
- **Registrations**: Users see own registrations, admins see all
- **Transactions**: Users see own, admins see all

---

## 👨‍💼 Admin Panel

To create an admin user:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run:
```sql
UPDATE users SET role = 'admin' WHERE id = 'YOUR_USER_ID';
```

Admin users can:
- Create tournaments
- View all registrations
- View all transactions
- Manage tournament status

---

## 🚨 Important Security Notes

⚠️ **NEVER commit `.env` to Git**
- `.env` contains your public key (safe to expose)
- But it's better to keep it private
- Use `.env.local` locally only

⚠️ **Backend Service Role Key**
- Never expose your service role key in frontend
- Use it only in backend/server functions
- The anon key (public) in `.env` is safe for frontend

⚠️ **RLS Policies**
- All data is protected by RLS
- Users can only access their own data
- Admins have additional permissions

---

## 📝 Example Flow

### 1. User Signs Up
```javascript
await signup('player@example.com', 'pass123', 'FireKing')
// Creates auth user + profile with game_name='FireKing' + wallet_balance=500
```

### 2. Admin Creates Tournament
```javascript
await createTournament({
  title: 'Daily Cup',
  game: 'Free Fire',
  entry_fee: 100,
  prize_pool: 10000,
  total_slots: 50
})
```

### 3. Player Joins Tournament
```javascript
await joinTournament(tournamentId)
// Deducts 100 from wallet
// Creates registration record
// Records transaction
```

### 4. Admin Updates Status
```javascript
await updateTournamentStatus(tournamentId, 'ongoing')
// Changes tournament status
```

---

## 🐛 Troubleshooting

### Credentials not working?
- Check `.env.local` has correct values
- Restart the dev server after `.env` changes

### "Supabase not initialized" error?
- Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in `.env.local`
- Check browser console for exact error

### RLS Policy errors?
- Run the schema.sql again to ensure policies are created
- Check user role in database

### Auth not persisting?
- Browser might have localStorage disabled
- Check browser console for auth errors

---

## 📞 Next Steps

1. ✅ Run schema.sql
2. ✅ Enable Email/Password auth
3. ✅ Copy `.env` to `.env.local`
4. ✅ Run `npm install && npm run dev`
5. 🎮 Create account and test!

Happy gaming! 🚀
