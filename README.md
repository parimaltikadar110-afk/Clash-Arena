# Clash Arena

Free Fire Tournament App starter project.

## Features
- Login with username, email, or phone number
- User profile section inside the app
- Dashboard and leaderboard
- Tournament cards
- Admin panel inside the app
- Supabase-ready schema for users, tournaments, registrations, and transactions

## Tech stack
- React + Vite
- Supabase JavaScript client

## Run locally
1. Install dependencies:
   npm install
2. Copy `.env.example` to `.env` and add your Supabase values.
3. Start development server:
   npm run dev

## Demo login
- Username / Email / Phone: `demo`
- Password: `123456`

## Supabase setup
1. Create a new Supabase project.
2. Open SQL editor and run the SQL in `supabase/schema.sql`.
3. Copy your project URL and anon key into `.env`.
4. Update the app logic later to connect real auth and data queries.
