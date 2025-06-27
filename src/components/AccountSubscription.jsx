import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Clock, XCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import { getUserSubscription, isSubscriptionActive } from '../lib/stripeClient';
import { getProductByPriceId } from '../stripe-config';

const AccountSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getUserSubscription();
        setSubscription(data);
        
        // If we have a price_id, get the product details
        if (data?.price_id) {
          const productDetails = getProductByPriceId(data.price_id);
          setProduct(productDetails);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setError('Impossible de charger les informations d\'abonnement');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscription();
  }, []);
  
  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR');
  };
  
  // Get subscription status details
  const getStatusDetails = () => {
    if (!subscription) return { icon: null, label: 'Aucun abonnement', color: 'text-muted-foreground' };
    
    switch (subscription.subscription_status) {
      case 'active':
        return { 
          icon: CheckCircle, 
          label: 'Actif', 
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10'
        };
      case 'trialing':
        return { 
          icon: Clock, 
          label: 'Période d\'essai', 
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10'
        };
      case 'canceled':
        return { 
          icon: XCircle, 
          label: 'Annulé', 
          color: 'text-destructive',
          bgColor: 'bg-destructive/10'
        };
      case 'past_due':
        return { 
          icon: AlertCircle, 
          label: 'Paiement en retard', 
          color: 'text-destructive',
          bgColor: 'bg-destructive/10'
        };
      default:
        return { 
          icon: null, 
          label: subscription.subscription_status || 'Aucun abonnement', 
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/30'
        };
    }
  };
  
  const statusDetails = getStatusDetails();
  const StatusIcon = statusDetails.icon;
  
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 rounded bg-primary/10 text-primary mr-3">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Abonnement</h3>
        </div>
        
        <div className="flex justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 rounded bg-primary/10 text-primary mr-3">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Abonnement</h3>
        </div>
        
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center mb-6">
        <div className="p-2 rounded bg-primary/10 text-primary mr-3">
          <CreditCard className="h-5 w-5" />
        </div>
        <h3 className="font-medium text-lg">Abonnement</h3>
      </div>
      
      {!subscription || (!isSubscriptionActive(subscription) && subscription.subscription_status !== 'trialing') ? (
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Aucun abonnement actif</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Vous n'avez actuellement aucun abonnement actif. Découvrez nos offres pour accéder à toutes les fonctionnalités d'AutoCore AI.
            </p>
            <Link to="/pricing" className="btn-primary inline-flex">
              Voir les tarifs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${statusDetails.bgColor} ${statusDetails.color} mr-3`}>
                {StatusIcon && <StatusIcon className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="font-medium">{product?.name || 'Plan Premium'}</h4>
                <p className={`text-sm ${statusDetails.color}`}>
                  {statusDetails.label}
                </p>
              </div>
            </div>
            
            <Link to="/pricing" className="btn-outline text-sm py-1.5 px-3 self-start md:self-center">
              {subscription.subscription_status === 'canceled' ? 'Réactiver' : 'Gérer l\'abonnement'}
            </Link>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Période actuelle</h4>
              <p className="font-medium">
                {subscription.current_period_start ? (
                  <>
                    {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                  </>
                ) : (
                  'Non disponible'
                )}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Renouvellement</h4>
              {subscription.cancel_at_period_end ? (
                <p className="font-medium text-destructive">
                  Ne se renouvelle pas
                </p>
              ) : (
                <p className="font-medium">
                  {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'Non disponible'}
                </p>
              )}
            </div>
          </div>
          
          {subscription.payment_method_last4 && (
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Moyen de paiement</h4>
              <div className="flex items-center">
                <div className="p-1 bg-muted/30 rounded mr-2">
                  <CreditCard className="h-4 w-4" />
                </div>
                <p className="font-medium">
                  {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                </p>
              </div>
            </div>
          )}
          
          {subscription.subscription_status === 'trialing' && (
            <div className="bg-amber-500/10 text-amber-600 p-4 rounded-lg flex items-start">
              <Clock className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Période d'essai en cours</p>
                <p className="text-sm">
                  Votre période d'essai se termine le {formatDate(subscription.current_period_end)}. 
                  {subscription.cancel_at_period_end 
                    ? ' Votre abonnement ne sera pas renouvelé automatiquement.'
                    : ' Votre carte sera débitée automatiquement à cette date, sauf si vous annulez avant.'}
                </p>
              </div>
            </div>
          )}
          
          {subscription.subscription_status === 'canceled' && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Abonnement annulé</p>
                <p className="text-sm">
                  Votre abonnement a été annulé et prendra fin le {formatDate(subscription.current_period_end)}.
                  Vous pouvez réactiver votre abonnement avant cette date pour continuer à bénéficier de nos services.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AccountSubscription;