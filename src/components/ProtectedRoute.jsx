import { Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import supabase, { usingMockSupabase } from '../lib/supabaseClient'

const ProtectedRoute = ({ children }) => {
  const { session, isLoading, sessionError } = useAuth()

  useEffect(() => {
    if (usingMockSupabase) return

    const verifySession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!data?.session || error) {
          console.warn('Invalid session detected during route protection')
        }
      } catch (err) {
        console.warn('Session verification failed:', err)
      }
    }
    verifySession()
  }, [])

  useEffect(() => {
    if (usingMockSupabase) return

    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Session check is taking longer than expected')
      }
    }, 5000)
    return () => clearTimeout(timeout)
  }, [isLoading])

  if (usingMockSupabase) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive text-center p-4">
          Supabase n'est pas configuré correctement. Veuillez vérifier vos
          variables d'environnement.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    )
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{sessionError}</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
