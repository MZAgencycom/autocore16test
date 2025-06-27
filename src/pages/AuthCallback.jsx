import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Vérifier la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (session) {
          // Vérifier si l'utilisateur a déjà un profil complet
          const { data, error: profileError } = await supabase
            .from('users_extended')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') { // Ignore l'erreur si le profil n'existe pas encore
            console.error('Erreur lors de la récupération du profil:', profileError);
          }
          
          // Rediriger vers onboarding si le profil n'existe pas ou est incomplet
          if (!data || !data.company_name) {
            navigate('/onboarding');
          } else {
            // Sinon rediriger vers le dashboard
            navigate('/dashboard');
          }
        } else {
          // Pas de session, rediriger vers login
          navigate('/login');
        }
      } catch (error) {
        console.error('Erreur lors du traitement du callback:', error);
        setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
        
        // Rediriger vers login en cas d'erreur
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };
    
    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="bg-card p-8 rounded-lg shadow-lg border max-w-md w-full text-center">
        <Logo className="h-12 w-12 text-primary mx-auto mb-4" />
        
        <h1 className="text-2xl font-bold mb-4">Authentification en cours</h1>
        
        {error ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-4">
            {error}
          </div>
        ) : (
          <>
            <Loader className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Veuillez patienter pendant que nous finalisons votre connexion...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;