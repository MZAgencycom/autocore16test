import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import Logo from './Logo';

const WelcomeScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(3);
  const routerReady = !!location;

  useEffect(() => {
    if (!routerReady) return;
    // Compte à rebours pour la redirection automatique
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/dashboard');
    }
  }, [countdown, navigate, routerReady]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center">
      <motion.div
        className="max-w-lg w-full bg-card rounded-2xl p-8 border shadow-xl relative overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.6 
        }}
      >
        {/* Déco background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-3xl rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 blur-3xl rounded-full"></div>
        
        <div className="text-center relative z-10">
          <div className="flex justify-center mb-6">
            <motion.div 
              className="p-4 rounded-full bg-emerald-500/10 text-emerald-500"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20, 
                delay: 0.2 
              }}
            >
              <CheckCircle className="h-10 w-10" />
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Logo className="h-5 w-5" />
              <h2 className="text-2xl font-bold">
                AutoCore<span className="text-primary">AI</span>
              </h2>
            </div>
            
            <motion.h1 
              className="text-3xl font-extrabold mb-4 flex items-center justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Sparkles className="h-6 w-6 text-primary mr-2" />
              <span>Bienvenue!</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl mb-3 text-foreground/90"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              🎉 Bienvenue sur AutoCore AI
            </motion.p>
            
            <motion.p 
              className="text-lg mb-3 text-foreground/80"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              La plateforme qui révolutionne le quotidien des carrossiers.
            </motion.p>
            
            <motion.p 
              className="text-base mb-6 text-foreground/70"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              Vous bénéficiez dès maintenant de votre essai gratuit.
            </motion.p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="relative z-10"
          >
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn-primary py-3 px-6 w-full flex items-center justify-center group"
            >
              Accéder à mon compte
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-sm text-muted-foreground mt-2">
              Redirection automatique dans {countdown}s...
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;