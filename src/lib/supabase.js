import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const localUser = {
  id: 'local-user-1',
  full_name: 'Demo Player',
  username: 'demo',
  email: 'demo@clasharena.app',
  phone: '+8801700000000',
  coins: 1200,
  role: 'user'
}

export const mockTournaments = [
  {
    id: 1,
    title: 'Daily Clash Cup',
    game: 'Free Fire',
    prize: '৳1200',
    slots: 50,
    registered: 32,
    start_time: 'Today, 8:00 PM',
    status: 'Open'
  },
  {
    id: 2,
    title: 'Weekend Arena',
    game: 'Free Fire',
    prize: '৳2800',
    slots: 100,
    registered: 77,
    start_time: 'Saturday, 9:00 PM',
    status: 'Open'
  },
  {
    id: 3,
    title: 'Night Rush',
    game: 'Free Fire',
    prize: '৳900',
    slots: 25,
    registered: 19,
    start_time: 'Tonight, 10:30 PM',
    status: 'Hot'
  }
]

export const mockLeaderboard = [
  { rank: 1, name: 'Sakib', wins: 42 },
  { rank: 2, name: 'Rafsan', wins: 39 },
  { rank: 3, name: 'Nabil', wins: 34 },
  { rank: 4, name: 'Ishrak', wins: 29 }
]
