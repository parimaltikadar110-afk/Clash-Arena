import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export const demoUsers = [
  { id: '1', full_name: 'Admin User', username: 'admin', email: 'admin@clasharena.com', phone: '01700000000', coins: 1000, role: 'admin', password_hash: '123456' },
  { id: '2', full_name: 'Parimal Tikadar', username: 'parimal', email: 'parimal@gmail.com', phone: '01800000000', coins: 500, role: 'user', password_hash: '123456' }
]

export const mockLeaderboard = [
  { rank: 1, name: 'CyberKing', wins: 42 },
  { rank: 2, name: 'ShadowSniper', wins: 38 },
  { rank: 3, name: 'ApexLegend', wins: 35 },
  { rank: 4, name: 'StormRider', wins: 30 }
]

export const mockTournaments = [
  {
    id: 1,
    title: 'Free Fire Daily Clash',
    game: 'Free Fire',
    prize: '৳1200',
    entryFee: 'Free',
    slots: 50,
    registered: 18,
    start_time: 'Today, 8:00 PM',
    status: 'Open'
  },
  {
    id: 2,
    title: 'PUBG Mobile Squad War',
    game: 'PUBG Mobile',
    prize: '৳2500',
    entryFee: 'Free',
    slots: 25,
    registered: 10,
    start_time: 'Tomorrow, 9:00 PM',
    status: 'Open'
  }
]

// Pure Supabase Login Function (No fake fallback)
export async function loginWithSupabase({ login, password }) {
  // Check demo admin first
  const demo = demoUsers.find(
    (u) => (u.username === login || u.email === login || u.phone === login) && String(u.password_hash) === String(password)
  )
  if (demo) return demo

  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.eq.${login},email.eq.${login},phone.eq.${login}`)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('User not found with this credential.')
  }

  if (String(data.password_hash) !== String(password)) {
    throw new Error('Incorrect password.')
  }

  return data
}

// Pure Supabase Create User Function (Directly saves to Supabase)
export async function createUserInSupabase(newUser) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  const { data, error } = await supabase
    .from('users')
    .insert([newUser])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Update profile in Supabase
export async function updateUserProfileInSupabase(userId, updatedData) {
  if (!supabase) return updatedData

  const { data, error } = await supabase
    .from('users')
    .update(updatedData)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
