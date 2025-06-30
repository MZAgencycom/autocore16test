import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { withTimeout } from '../utils/withTimeout'
import { useNavigate, useLocation } from 'react-router-dom'
import supabase, { usingMockSupabase, refreshSessionIfNeeded } from '../lib/supabaseClient'

const SESSION_REQUEST_TIMEOUT = 10000 // 10 seconds

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Check if there is a session
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true)
      setSessionError(null)

      if (usingMockSupabase) {
        setSessionError(
          'Supabase n\'est pas configuré correctement. Veuillez vérifier vos variables d\'environnement.'
        )
        setIsLoading(false)
        return
      }

      // Check if supabase is initialized
      if (!supabase) {
        console.error('Supabase client not initialized - skipping session check')
        setIsLoading(false)
        return
      }

      let fetchedSession = null
      let attempt = 0
      let lastError = null

      while (!fetchedSession && attempt < 3) {
        try {
          const { data, error } = await withTimeout(
            supabase.auth.getSession(),
            SESSION_REQUEST_TIMEOUT
          )
          if (error) throw error
          fetchedSession = data.session
        } catch (err) {
          lastError = err
          console.warn('Retrying session fetch...', err.message)
          await new Promise(res => setTimeout(res, 1500))
        }
        attempt++
      }

      const sessionError = lastError
      
      // Check for invalid refresh token error
      if (sessionError && sessionError.message && sessionError.message.includes('Invalid Refresh Token')) {
        if (import.meta?.env?.DEV) console.log('Invalid refresh token detected, refreshing session...')
        await refreshSessionIfNeeded(supabase)
        const { data: refreshed } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_REQUEST_TIMEOUT
        )
        setSession(refreshed.session)
        setUser(refreshed.session?.user || null)
        return
      }

      // If we explicitly get an unauthorized error or the session is missing,
      // send the user back to the home page then attempt to reach the dashboard
      // again shortly after. This avoids staying stuck on a blank screen.
      if (!fetchedSession && attempt >= 3) {
        setSessionError('Votre session a expiré ou est inaccessible. Merci de vous reconnecter.')
      }

      if (sessionError?.status === 401 || !fetchedSession) {
        // Simply clear the session and allow the user to log back in
        setSession(null)
        setUser(null)
        return
      }

      setSession(fetchedSession)
      setUser(fetchedSession?.user || null)
    } catch (error) {
      console.error('Error checking session:', error)
      if (error.message && error.message.toLowerCase().includes('timed out')) {
        setSessionError('Unable to contact authentication server')
      }
      // If there's any other error, also clear the session to be safe
      setSession(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Keep the session alive even when the user switches tabs
  useEffect(() => {
    if (usingMockSupabase || !supabase) return

    const interval = setInterval(async () => {
      try {
        await withTimeout(
          supabase.auth.getSession(),
          SESSION_REQUEST_TIMEOUT
        )
      } catch (e) {
        console.error('Erreur keep-alive session :', e.message)
      }
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // Sync session across tabs
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key && event.key.startsWith('sb-') && event.newValue !== event.oldValue) {
        checkSession()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [checkSession])

  // Chargement initial de la session et écoute des changements d'auth
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          8000
        )
        if (error || !data?.session) {
          console.warn('Session absente ou erreur :', error)
          setSession(null)
        } else {
          setSession(data.session)
        }
      } catch (err) {
        console.error('⛔️ Timeout ou fetch session échoué :', err.message)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => authListener.subscription.unsubscribe()
  }, [])

  // Sign up function
  const signUp = async (email, password, metadata) => {
    try {
      setIsLoading(true)

      if (usingMockSupabase || !supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) throw error

      if (data.user) {
        navigate('/onboarding')
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error signing up:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setIsLoading(true)

      if (usingMockSupabase || !supabase) {
        throw new Error('Supabase client not initialized')
      }

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })

      const timeoutId = setTimeout(() => {
        console.warn('Sign in request timed out')
      }, 15000)
      const { data, error } = await withTimeout(signInPromise, 15000)
      clearTimeout(timeoutId)

      if (import.meta?.env?.DEV) console.log('AUTH RESPONSE', { data, error })
      if (!data?.session) {
        console.warn('Authentication response without session', { data, error })
      }

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants ou créer un compte si vous n\'en avez pas encore.')
        } else {
          throw error
        }
      }

      // Ne pas naviguer ici, la navigation sera gérée par l'event listener
      return { success: true }
    } catch (error) {
      console.error('Error signing in:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Reset password function
  const resetPassword = async (email) => {
    try {
      setIsLoading(true)
      
      if (usingMockSupabase || !supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error resetting password:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }
  
  // Update user password
  const updatePassword = async (password) => {
    try {
      setIsLoading(true)
      
      if (usingMockSupabase || !supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating password:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true)
      
      if (usingMockSupabase || !supabase) {
        throw new Error('Supabase client not initialized')
      }
      
      await supabase.auth.signOut()
      // Ne pas naviguer ici, la navigation sera gérée par l'event listener
      return { success: true }
    } catch (error) {
      console.error('Error signing out:', error)
      return { success: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  // When the authentication server cannot be reached we previously forced
  // a full reload which resulted in an endless refresh loop. Instead we now
  // simply log the error and allow the user to retry manually.
  useEffect(() => {
    if (sessionError && sessionError.includes('Unable to contact')) {
      console.warn('Authentication server unreachable:', sessionError)
    }
  }, [sessionError])

  // Ensure the Supabase session stays valid by periodically refreshing it
  // even when the user is inactive. This helps avoid issues with expired
  // JWT tokens that can cause silent API failures or infinite loading loops.
  useEffect(() => {
    if (usingMockSupabase || !supabase) return

    const interval = setInterval(async () => {
      const {
        data: { session },
        error
      } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_REQUEST_TIMEOUT
      )

      if (!session || error) {
        console.warn(
          'Session expirée, tentative de refresh automatique'
        )
        await withTimeout(
          supabase.auth.refreshSession(),
          SESSION_REQUEST_TIMEOUT
        )
      }
    }, 2 * 60 * 1000) // refresh every 2 minutes

    return () => clearInterval(interval)
  }, [])

  // Periodically refresh the session to avoid expiry issues that can cause
  // infinite refresh loops. This complements Supabase's built-in auto refresh
  // by forcing a refresh every 10 minutes when a session exists.
  useEffect(() => {
    if (!session) return

    const interval = setInterval(async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.refreshSession(),
          SESSION_REQUEST_TIMEOUT
        )
        if (error) {
          console.error('Error refreshing session:', error)
        } else if (data?.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      } catch (err) {
        console.error('Unexpected refresh error:', err)
      }
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [session])

  // Context value
  const value = {
    user,
    session,
    isLoading,
    sessionError,
    signUp,
    signIn,
    signOut,
    checkSession,
    resetPassword,
    updatePassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}