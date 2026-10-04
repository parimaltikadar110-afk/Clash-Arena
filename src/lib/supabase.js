import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// Mock Tournaments & Leaderboard
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

// Supabase Auth Signup (App.jsx এর চাহিদা অনুযায়ী দুটি নামই এক্সপোর্ট করা হলো)
export async function signUpWithSupabase({ email, password, game_name, username }) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  const user = authData.user
  if (user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          game_name: game_name || username || 'Player',
          wallet_balance: 0,
          role: 'player'
        }
      ])

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }
  }

  return authData
}

// App.jsx থেকে createUserInSupabase ডাকলে যেন এটি কাজ করে
export const createUserInSupabase = signUpWithSupabase

// Supabase Login Function
export async function loginWithSupabase({ login, email, password }) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  // যদি login ফিল্ডে ইমেইল বা ইউজারনেম থাকে
  const userEmail = email || login

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.warn('Could not fetch user profile:', profileError.message)
  }

  return {
    ...authData.user,
    ...(profileData || {})
  }
}

// Update Profile
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
