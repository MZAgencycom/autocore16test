import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, AlertCircle, CheckCircle, Lock } from 'lucide-react'
import supabase from '../lib/supabaseClient'
import Logo from '../components/Logo'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [hashPresent, setHashPresent] = useState(false)
  const navigate = useNavigate()
  
  useEffect(() => {
    // Vérifier si l'URL contient un hash, ce qui indique un lien de réinitialisation valide
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setHashPresent(true)
    } else {
      // Rediriger si aucun hash valide n'est présent
      setError("Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.")
    }
  }, [])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation basique
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      // Vérifier si Supabase est initialisé
      if (!supabase) {
        throw new Error('Client Supabase non initialisé. Veuillez vérifier votre configuration.')
      }
      
      // Mise à jour du mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })
      
      if (updateError) throw updateError
      
      // Afficher un message de succès
      setSuccess(true)
      
      // Rediriger vers la page de connexion après 3 secondes
      setTimeout(() => {
        navigate('/login')
      }, 3000)
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error)
      setError(error.message || 'Une erreur est survenue lors de la mise à jour du mot de passe')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="flex items-center mb-8">
        <Logo className="h-6 w-6 mr-2" />
        <span className="font-bold text-xl">
          AutoCore<span className="text-primary">AI</span>
        </span>
      </div>
      
      <div className="w-full max-w-md bg-card rounded-lg shadow p-6 border">
        {success ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Mot de passe modifié</h1>
            <p className="text-muted-foreground mb-4">
              Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6" />
              </div>
            </div>
            
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl font-bold text-center">Réinitialisation du mot de passe</h1>
              <p className="text-muted-foreground text-center">
                Veuillez saisir votre nouveau mot de passe
              </p>
            </div>
            
            {!hashPresent ? (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Au moins 8 caractères
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="w-full btn-primary py-2 flex items-center justify-center" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    "Modifier mon mot de passe"
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword