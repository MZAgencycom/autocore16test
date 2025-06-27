import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { getUserSubscription, isSubscriptionActive } from '../lib/stripeClient';
import { getProductByPriceId } from '../stripe-config';

const SubscriptionBanner = () => {
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const data = await getUserSubscription();
        setSubscription(data);
        
        // If we have a price_id, get the product details
        if (data?.price_id) {
          const productDetails = getProductByPriceId(data.price_id);
          setProduct(productDetails);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscription();
  }, []);
  
  // Don't show banner if loading, dismissed, or subscription is active
  if (isLoading || dismissed || isSubscriptionActive(subscription)) {
    return null;
  }
  
  // Calculate days left in trial if applicable
  const getDaysLeft = () => {
    if (subscription?.subscription_status === 'trialing' && subscription?.current_period_end) {
      const endDate = new Date(subscription.current_period_end * 1000);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return null;
  };
  
  const daysLeft = getDaysLeft();
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed bottom-4 right-4 z-50 max-w-md w-full bg-card rounded-lg shadow-lg border overflow-hidden"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="p-4 relative">
          <button 
            onClick={() => setDismissed(true)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          
          {subscription?.subscription_status === 'trialing' ? (
            <>
              <div className="flex items-start mb-3">
                <div className="bg-amber-500/10 p-2 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-medium">Période d'essai en cours</h3>
                  <p className="text-sm text-muted-foreground">
                    Il vous reste {daysLeft} jour{daysLeft > 1 ? 's' : ''} d'essai sur votre plan {product?.name || 'premium'}.
                  </p>
                </div>
              </div>
              
              <div className="mt-3">
                <Link to="/pricing" className="btn-primary w-full text-center text-sm py-1.5">
                  Passer à un abonnement payant
                </Link>
              </div>
            </>
          ) : subscription?.subscription_status === 'canceled' ? (
            <>
              <div className="flex items-start mb-3">
                <div className="bg-destructive/10 p-2 rounded-full mr-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium">Abonnement annulé</h3>
                  <p className="text-sm text-muted-foreground">
                    Votre abonnement a été annulé et prendra fin le {new Date(subscription.current_period_end * 1000).toLocaleDateString('fr-FR')}.
                  </p>
                </div>
              </div>
              
              <div className="mt-3">
                <Link to="/pricing" className="btn-primary w-full text-center text-sm py-1.5">
                  Réactiver mon abonnement
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start mb-3">
                <div className="bg-primary/10 p-2 rounded-full mr-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Découvrez nos offres</h3>
                  <p className="text-sm text-muted-foreground">
                    Passez à un plan payant pour accéder à toutes les fonctionnalités d'AutoCore AI.
                  </p>
                </div>
              </div>
              
              <div className="mt-3">
                <Link to="/pricing" className="btn-primary w-full text-center text-sm py-1.5">
                  Voir les tarifs
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SubscriptionBanner;