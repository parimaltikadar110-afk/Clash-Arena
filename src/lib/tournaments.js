import { supabase } from './supabaseClient'

/**
 * Fetch all tournaments
 */
export const fetchTournaments = async () => {
  try {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('tournaments')
      .select('*, registrations(count)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(tournament => ({
      ...tournament,
      registered: tournament.registrations[0]?.count || 0
    }))
  } catch (error) {
    console.error('Fetch tournaments error:', error)
    return []
  }
}

/**
 * Create a new tournament (Admin only)
 */
export const createTournament = async (tournamentData) => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { data: user } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tournaments')
      .insert([
        {
          title: tournamentData.title,
          game: tournamentData.game,
          entry_fee: tournamentData.entry_fee || 0,
          prize_pool: tournamentData.prize_pool || 0,
          total_slots: tournamentData.total_slots || 50,
          status: 'upcoming',
          created_by: user.id
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Create tournament error:', error)
    throw error
  }
}

/**
 * Join a tournament
 */
export const joinTournament = async (tournamentId, slotNo = null) => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { data: user } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get tournament details
    const { data: tournament, error: tourError } = await supabase
      .from('tournaments')
      .select('entry_fee, prize_pool')
      .eq('id', tournamentId)
      .single()

    if (tourError) throw tourError

    // Deduct entry fee from wallet
    if (tournament.entry_fee > 0) {
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      if (userProfile.wallet_balance < tournament.entry_fee) {
        throw new Error('Insufficient balance')
      }

      // Update wallet
      const { error: walletError } = await supabase
        .from('users')
        .update({
          wallet_balance: userProfile.wallet_balance - tournament.entry_fee
        })
        .eq('id', user.id)

      if (walletError) throw walletError

      // Record transaction
      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          amount: tournament.entry_fee,
          type: 'entry_fee',
          tournament_id: tournamentId,
          status: 'success'
        }
      ])
    }

    // Register user
    const { data, error } = await supabase
      .from('registrations')
      .insert([
        {
          user_id: user.id,
          tournament_id: tournamentId,
          slot_no: slotNo
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Join tournament error:', error)
    throw error
  }
}

/**
 * Get user's registrations
 */
export const getUserRegistrations = async (userId) => {
  try {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('registrations')
      .select('*, tournaments(*)')
      .eq('user_id', userId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Fetch user registrations error:', error)
    return []
  }
}

/**
 * Get tournament participants
 */
export const getTournamentParticipants = async (tournamentId) => {
  try {
    if (!supabase) return []

    const { data, error } = supabase
      .from('registrations')
      .select('*, users(*)')
      .eq('tournament_id', tournamentId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Fetch tournament participants error:', error)
    return []
  }
}

/**
 * Update tournament status
 */
export const updateTournamentStatus = async (tournamentId, status) => {
  try {
    if (!supabase) throw new Error('Supabase not initialized')

    const { data, error } = await supabase
      .from('tournaments')
      .update({ status })
      .eq('id', tournamentId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Update tournament status error:', error)
    throw error
  }
}
