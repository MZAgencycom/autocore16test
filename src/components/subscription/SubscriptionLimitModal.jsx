import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { redirectToUpgrade } from '../../lib/subscriptionManager';

const SubscriptionLimitModal = ({ 
  isOpen, 
  onClose, 
  reason, 
  details = {},
  upgradePriceId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Handle upgrade action
  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await redirectToUpgrade(upgradePriceId);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      setError(error.message || 'Une erreur est survenue lors de la mise à niveau.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  // Get content based on reason
  let title = "Mise à niveau requise";
  let message = "Vous avez atteint la limite de votre abonnement actuel.";
  let upgradeText = "Mettre à niveau mon plan";
  
  if (reason === 'report_limit') {
    title = "Limite de rapports atteinte";
    message = `Vous avez analysé ${details.currentCount}/${details.limit} rapports autorisés avec votre abonnement actuel. Passez au plan supérieur pour analyser plus de rapports d'expertise.`;
  } else if (reason === 'invoice_limit') {
    title = "Limite de factures atteinte";
    message = `Vous avez généré ${details.currentCount}/${details.limit} factures autorisées avec votre abonnement actuel. Passez au plan supérieur pour continuer à créer des factures.`;
  } else if (reason === 'feature_not_available') {
    title = "Fonctionnalité non disponible";
    message = `L'assistant intelligent n'est pas disponible avec votre abonnement actuel. Passez au plan Pro pour débloquer cette fonctionnalité.`;
  } else if (reason === 'no_subscription') {
    title = "Abonnement requis";
    message = "Votre période d'essai est terminée. Veuillez souscrire à un abonnement pour continuer à utiliser AutoCore AI.";
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-lg shadow-xl max-w-md w-full"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="text-muted-foreground mt-1">{message}</p>
                </div>
              </div>
              <button
                className="text-muted-foreground hover:text-foreground p-2 rounded-full"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="border rounded-lg p-4 bg-muted/10 my-4">
              <h4 className="font-medium mb-2">Passez à un plan supérieur pour :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  {reason === 'report_limit' ? (
                    <span className="text-emerald-600 font-medium">Analyser jusqu'à 50 rapports par mois</span>
                  ) : (
                    <span>Analyser jusqu'à 50 rapports par mois</span>
                  )}
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  {reason === 'invoice_limit' ? (
                    <span className="text-emerald-600 font-medium">Générer un nombre illimité de factures</span>
                  ) : (
                    <span>Générer un nombre illimité de factures</span>
                  )}
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  {reason === 'feature_not_available' && details.feature === 'assistant' ? (
                    <span className="text-emerald-600 font-medium">Accéder à l'assistant intelligent</span>
                  ) : (
                    <span>Accéder à l'assistant intelligent</span>
                  )}
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  <span>Support prioritaire</span>
                </li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary flex justify-center items-center"
                onClick={handleUpgrade}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                      <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirection...
                  </span>
                ) : (
                  <span className="flex items-center">
                    {upgradeText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </motion.button>
              
              <Link 
                to="/pricing" 
                className="btn-outline flex justify-center items-center"
                onClick={onClose}
              >
                Voir tous les plans
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SubscriptionLimitModal;