import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import supabase, { usingMockSupabase } from '../lib/supabaseClient'

const ForceRefresh = () => {
  const navigate = useNavigate()
  const [needsLogin, setNeedsLogin] = useState(false)

  useEffect(() => {
    if (usingMockSupabase) {
      setNeedsLogin(true)
      return
    }

    const refresh = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data?.session && !error) {
        navigate('/dashboard', { replace: true })
      } else {
        setNeedsLogin(true)
      }
    }
    refresh()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {needsLogin ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {usingMockSupabase
              ? "Supabase n'est pas configuré correctement."
              : 'Session expirée. Veuillez vous reconnecter.'}
          </p>
          {!usingMockSupabase && (
            <Link to="/login" className="btn-primary inline-block px-4 py-2">
              Se connecter
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-3">
          <Loader className="h-6 w-6 animate-spin" />
          <p className="text-sm text-muted-foreground">Reconnexion en cours...</p>
        </div>
      )}
    </div>
  )
}

export default ForceRefresh
