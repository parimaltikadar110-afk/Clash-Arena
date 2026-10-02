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

export async function loginWithSupabase({ login, password }) {
  const matched = demoUsers.find(
    (u) => (u.username === login || u.email === login || u.phone === login) && u.password_hash === password
  )
  if (matched) return matched

  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${login},email.eq.${login},phone.eq.${login}`)
      .single()

    if (error || !data) return null
    if (data.password_hash === password || !data.password_hash) return data
  } catch (err) {
    console.error('Supabase login error:', err)
  }
  return null
}

export async function createUserInSupabase(newUser) {
  // Safe fallback: jodi database ba table error thake, tobe app crash korbe na, user object return kore dibe
  if (!supabase) return newUser

  try {
    const { data, error } = await supabase.from('users').insert([newUser]).select().single()
    if (!error && data) return data
    if (error) {
      console.warn('Supabase insert warning, using safe fallback:', error.message)
    }
  } catch (err) {
    console.error('Supabase signup exception, using safe fallback:', err)
  }
  return newUser
}

export async function updateUserProfileInSupabase(userId, updatedData) {
  if (!supabase) return updatedData

  try {
    const { data, error } = await supabase.from('users').update(updatedData).eq('id', userId).select().single()
    if (!error && data) return data
  } catch (err) {
    console.error('Profile update error:', err)
  }
  return updatedData
}
