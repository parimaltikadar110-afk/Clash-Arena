import { supabase } from './supabaseClient'

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
  try {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get user profile error:', error)
    return null
  }
}

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Update user profile error:', error)
    throw error
  }
}

/**
 * Get user wallet balance
 */
export const getWalletBalance = async (userId) => {
  try {
    if (!supabase) return 0

    const { data, error } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.wallet_balance || 0
  } catch (error) {
    console.error('Get wallet balance error:', error)
    return 0
  }
}

/**
 * Add funds to wallet
 */
export const addWalletFunds = async (userId, amount, description = '') => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    // Get current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Update balance
    const newBalance = (user.wallet_balance || 0) + amount

    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId)

    if (updateError) throw updateError

    // Record transaction
    const { data: transaction, error: transError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          amount,
          type: 'deposit',
          status: 'success',
          description
        }
      ])
      .select()
      .single()

    if (transError) throw transError
    return transaction
  } catch (error) {
    console.error('Add wallet funds error:', error)
    throw error
  }
}

/**
 * Get user transaction history
 */
export const getTransactionHistory = async (userId) => {
  try {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get transaction history error:', error)
    return []
  }
}

/**
 * Get user rank based on tournament wins
 */
export const getUserRank = async (userId) => {
  try {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('registrations')
      .select('count', { count: 'exact' })
      .eq('user_id', userId)

    if (error) throw error
    return data.length
  } catch (error) {
    console.error('Get user rank error:', error)
    return 0
  }
}
