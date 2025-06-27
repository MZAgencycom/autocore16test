import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wrench, Loader, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { z } from 'zod'
import Logo from '../components/Logo'
import supabase from '../lib/supabaseClient'

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Veuillez saisir votre mot de passe")
})

const LoginPage = () => {
  const { signIn, isLoading, session } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [redirectUrl, setRedirectUrl] = useState(null)

  useEffect(() => {
    if (import.meta?.env?.DEV) console.log('useEffect triggered in LoginPage');
    // Get the current environment
    const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('stackblitz')
    // Set the redirect URL based on environment
    const baseUrl = isDev ? window.location.origin : 'https://autocoreai.fr'
    setRedirectUrl(`${baseUrl}/dashboard`)
  }, [])

  useEffect(() => {
    if (session) {
      navigate('/dashboard')
    }
  }, [session, navigate])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
    
    // Clear server error when user changes input
    if (serverError) {
      setServerError(null)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)
    setConnectionStatus('connecting')
    
    // Validate form
    try {
      loginSchema.parse(formData)
      
      // If validation passes, attempt to sign in
      const result = await signIn(formData.email, formData.password)
      if (import.meta?.env?.DEV) console.log('AUTH RESPONSE', result)

      if (!result.success) {
        if (import.meta?.env?.DEV) console.log('AUTH ERROR', result.error)
        // Check for specific error messages and provide more helpful feedback
        if (result.error.includes('Failed to fetch') || result.error.includes('Failed to connect to Supabase')) {
          setServerError("Impossible de se connecter au serveur Supabase. Veuillez vérifier votre connexion internet et les informations d'identification Supabase dans le fichier .env.")
        } else if (result.error.includes('Invalid login credentials')) {
          setServerError("Email ou mot de passe incorrect. Veuillez vérifier vos identifiants ou créer un compte si vous n'en avez pas encore.")
        } else {
          setServerError(result.error || "Une erreur s'est produite lors de la connexion. Veuillez réessayer.")
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod errors into a more user-friendly format
        const fieldErrors = {}
        error.errors.forEach(err => {
          fieldErrors[err.path[0]] = err.message
        })
        setErrors(fieldErrors)
      }
    } finally {
      setConnectionStatus(null)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setServerError(null)
      setConnectionStatus('connecting-google')
      
      // Lancer l'authentification avec Google via Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      })

      if (import.meta?.env?.DEV) console.log('AUTH RESPONSE', { data, error })
      if (error || !data?.session) {
        console.warn('Auth signInWithOAuth returned unexpected response', { data, error })
      }

      if (error) {
        throw error
      }

      // La redirection est gérée automatiquement par Supabase

    } catch (error) {
      console.error('Erreur de connexion avec Google:', error)
      setServerError(error.message || "Impossible de se connecter avec Google")
    } finally {
      // En cas d'échec de redirection, éviter un état de chargement infini
      setConnectionStatus(null)
    }
  }
  
  // Check if Supabase is properly configured
  const isSupabaseConfigured = !(
    !import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL === 'https://your-project-id.supabase.co' ||
    !import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY === 'your-anon-key'
  )

  if (isLoading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <Link to="/" className="flex items-center mb-8">
        <Logo className="h-6 w-6 mr-2" />
        <span className="font-bold text-xl">
          AutoCore<span className="text-primary">AI</span>
        </span>
      </Link>
      
      <div className="w-full max-w-md bg-card rounded-lg shadow p-6 border">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold">Connexion</h1>
          <p className="text-muted-foreground">
            Entrez vos identifiants pour accéder à votre compte
          </p>
        </div>
        
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-md bg-amber-500/10 text-amber-500 flex gap-2 text-sm">
            <Info className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Configuration Supabase requise</p>
              <p>Ajoutez vos identifiants Supabase dans le fichier .env :</p>
              <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                VITE_SUPABASE_URL=https://your-project-id.supabase.co<br/>
                VITE_SUPABASE_ANON_KEY=your-anon-key
              </pre>
            </div>
          </div>
        )}
        
        {/* Bouton de connexion avec Google */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={connectionStatus === 'connecting-google' || !isSupabaseConfigured}
          className="w-full mb-6 flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 transition-all relative overflow-hidden"
        >
          {connectionStatus === 'connecting-google' ? (
            <Loader className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <div className="flex items-center">
              {/* Logo Google officiel */}
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
            </div>
          )}
          <span className="font-medium text-gray-700">
            {connectionStatus === 'connecting-google' ? 'Connexion en cours...' : 'Connexion avec Google'}
          </span>
        </button>

        {/* Séparateur OU */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-3 text-xs text-muted-foreground">OU</span>
          <div className="flex-1 border-t border-border"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@entreprise.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full"
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Mot de passe oublié?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password" 
              value={formData.password}
              onChange={handleChange}
              className="w-full"
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1">{errors.password}</p>
            )}
          </div>
          
          <button 
            type="submit" 
            className="w-full btn-primary py-2"
            disabled={isLoading || connectionStatus === 'connecting'}
          >
            {isLoading || connectionStatus === 'connecting' ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin inline-block" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
        
        {/* Lien vers l'inscription */}
        <div className="text-center text-sm mt-6">
          Pas encore de compte?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Inscription gratuite
          </Link>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-8">
          Propulsé par{" "}
          <span className="font-medium">
            AutoCore<span className="text-primary">AI</span>
          </span>
          {" "}- 100% français
        </div>
      </div>
    </div>
  )
}

export default LoginPage