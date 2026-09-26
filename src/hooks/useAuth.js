import { useState, useEffect, useCallback } from 'react'
import {
  signUpWithEmail,
  signInWithEmail,
  signOut,
  getCurrentUser,
  onAuthStateChange
} from '../lib/auth'
import { getUserProfile } from '../lib/user'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          const userProfile = await getUserProfile(currentUser.id)
          setProfile(userProfile)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen to auth changes
    const { data: subscription } = onAuthStateChange(async (session) => {
      if (session) {
        setUser(session.user)
        const userProfile = await getUserProfile(session.user.id)
        setProfile(userProfile)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signup = useCallback(
    async (email, password, gameName) => {
      try {
        setError(null)
        setLoading(true)
        const result = await signUpWithEmail(email, password, {
          game_name: gameName || email
        })
        return result
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const login = useCallback(
    async (email, password) => {
      try {
        setError(null)
        setLoading(true)
        const result = await signInWithEmail(email, password)
        setUser(result.user)
        setProfile(result.profile)
        return result
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const logout = useCallback(
    async () => {
      try {
        setError(null)
        setLoading(true)
        await signOut()
        setUser(null)
        setProfile(null)
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    user,
    profile,
    loading,
    error,
    signup,
    login,
    logout,
    isAuthenticated: !!user
  }
}
