import { supabase } from './supabaseClient'

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (email, password, userData) => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) throw error

    // Update user profile with game_name
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .update({
          game_name: userData.game_name || email
        })
        .eq('id', data.user.id)

      if (profileError) throw profileError

      return { user: data.user, session: data.session }
    }

    return { user: data.user, session: data.session }
  } catch (error) {
    console.error('Signup error:', error)
    throw error
  }
}

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    // Fetch user profile
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError) throw profileError

      return { user: data.user, session: data.session, profile }
    }

    return { user: data.user, session: data.session }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * Get current session
 */
export const getSession = async () => {
  try {
    if (!supabase) return null

    const { data, error } = await supabase.auth.getSession()
    if (error) throw error

    return data.session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    if (!supabase) return null

    const { data, error } = await supabase.auth.getUser()
    if (error) throw error

    return data.user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

/**
 * Listen to auth state changes safely
 */
export const onAuthStateChange = (callback) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }

  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session)
  })
}
