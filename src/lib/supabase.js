import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// ১. Supabase Auth দিয়ে সাইন-আপ এবং public.users-এ প্রোফাইল ডাটা সেভ করা
export async function signUpWithSupabase({ email, password, game_name }) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  // ক. Supabase Auth-এ অ্যাকাউন্ট তৈরি
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  const user = authData.user
  if (user) {
    // খ. public.users টেবিলে প্রয়োজনীয় প্রোফাইল ডাটা ইনসার্ট করা
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          game_name: game_name || 'Player',
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

// ২. Supabase Auth দিয়ে লগইন করা এবং প্রোফাইল ডাটা ফেচ করা
export async function loginWithSupabase({ email, password }) {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.')
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    throw new Error(authError.message)
  }

  // public.users টেবিল থেকে ইউজারের অতিরিক্ত তথ্য (যেমন wallet_balance, role, game_name) নিয়ে আসা
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

// ৩. ইউজার প্রোফাইল আপডেট করার ফাংশন
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
