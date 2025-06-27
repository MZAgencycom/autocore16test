import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import supabase from '../lib/supabaseClient'
import Logo from '../components/Logo'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Veuillez saisir une adresse email')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      // Vérifier si Supabase est initialisé
      if (!supabase) {
        throw new Error('Client Supabase non initialisé. Veuillez vérifier votre configuration.')
      }
      
      // Envoyer l'email de réinitialisation
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (resetError) throw resetError
      
      // Afficher un message de succès
      setSuccess(true)
      
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error)
      setError(error.message || 'Une erreur est survenue lors de l\'envoi de l\'email de réinitialisation')
    } finally {
      setIsSubmitting(false)
    }
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
        <div className="mb-6">
          <Link to="/login" className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Retour à la connexion
          </Link>
        </div>
        
        {success ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Email envoyé</h1>
            <p className="text-muted-foreground mb-4">
              Si l'adresse email {email} existe dans notre base de données, 
              vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <p className="text-sm text-muted-foreground">
              Vérifiez votre boîte de réception ainsi que vos spams.
            </p>
            <div className="mt-6">
              <Link to="/login" className="btn-primary w-full py-2 inline-block text-center">
                Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl font-bold">Mot de passe oublié?</h1>
              <p className="text-muted-foreground">
                Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer le lien"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword