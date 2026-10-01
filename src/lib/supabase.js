import { supabase as supabaseClient } from './supabaseClient'

export const supabase = supabaseClient

export const localUser = {
  id: 1,
  full_name: 'Demo User',
  username: 'demo',
  email: 'demo@clasharena.app',
  phone: '+8801700000000',
  coins: 1200,
  role: 'player'
}

export const mockLeaderboard = [
  { rank: 1, name: 'Ayesha', wins: 98 },
  { rank: 2, name: 'Rafi', wins: 92 },
  { rank: 3, name: 'Nabil', wins: 89 },
  { rank: 4, name: 'Mira', wins: 84 },
  { rank: 5, name: 'Ovi', wins: 81 }
]

export const mockTournaments = [
  {
    id: 1,
    title: 'Weekend Clash Cup',
    game: 'Free Fire',
    status: 'Live',
    prize: '৳5,000',
    registered: 42,
    slots: 64,
    start_time: 'Today • 8:00 PM'
  },
  {
    id: 2,
    title: 'Pro Arena Showdown',
    game: 'PUBG Mobile',
    status: 'Upcoming',
    prize: '৳12,000',
    registered: 18,
    slots: 32,
    start_time: 'Tomorrow • 7:30 PM'
  },
  {
    id: 3,
    title: 'Raiders Championship',
    game: 'CODM',
    status: 'Upcoming',
    prize: '৳8,500',
    registered: 28,
    slots: 48,
    start_time: 'Friday • 9:00 PM'
  }
]

export default supabase
