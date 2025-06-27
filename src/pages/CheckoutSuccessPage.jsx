import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Loader, ArrowRight, Home } from 'lucide-react';
import { getUserSubscription, getUserOrders } from '../lib/stripeClient';
import { getProductByPriceId } from '../stripe-config';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [order, setOrder] = useState(null);
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }
    
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch subscription data
        const subscriptionData = await getUserSubscription();
        setSubscription(subscriptionData);
        
        // Fetch orders data
        const ordersData = await getUserOrders();
        
        // Find the order that matches the session ID
        const matchingOrder = ordersData.find(o => o.checkout_session_id === sessionId);
        setOrder(matchingOrder);
        
        // If we have subscription data with a price_id, get the product details
        if (subscriptionData?.price_id) {
          const productDetails = getProductByPriceId(subscriptionData.price_id);
          setProduct(productDetails);
        }
        
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [sessionId, navigate]);
  
  // Redirect to dashboard after 5 seconds
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Traitement de votre paiement...</h2>
          <p className="text-muted-foreground">Veuillez patienter pendant que nous confirmons votre transaction.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div 
        className="max-w-md w-full bg-card rounded-lg shadow-lg border p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <motion.div 
            className="mx-auto bg-emerald-500/10 text-emerald-500 h-20 w-20 rounded-full flex items-center justify-center mb-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <CheckCircle className="h-10 w-10" />
          </motion.div>
          
          <h1 className="text-2xl font-bold mb-2">Paiement réussi !</h1>
          
          <p className="text-muted-foreground mb-6">
            {subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing' ? (
              <>Votre abonnement <span className="font-medium">{product?.name || 'Premium'}</span> est maintenant actif.</>
            ) : (
              <>Votre commande a été traitée avec succès.</>
            )}
          </p>
          
          <div className="space-y-4 mb-8">
            {subscription && (
              <div className="bg-muted/30 p-4 rounded-lg text-left">
                <h3 className="font-medium mb-2">Détails de l'abonnement</h3>
                <p className="text-sm">
                  <span className="text-muted-foreground">Statut:</span>{' '}
                  <span className={`font-medium ${
                    ['active', 'trialing'].includes(subscription.subscription_status) 
                      ? 'text-emerald-500' 
                      : 'text-amber-500'
                  }`}>
                    {subscription.subscription_status === 'active' ? 'Actif' : 
                     subscription.subscription_status === 'trialing' ? 'Période d\'essai' : 
                     subscription.subscription_status}
                  </span>
                </p>
                {subscription.current_period_end && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Prochain renouvellement:</span>{' '}
                    <span className="font-medium">
                      {new Date(subscription.current_period_end * 1000).toLocaleDateString('fr-FR')}
                    </span>
                  </p>
                )}
                {subscription.payment_method_last4 && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Moyen de paiement:</span>{' '}
                    <span className="font-medium">
                      {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                    </span>
                  </p>
                )}
              </div>
            )}
            
            {order && (
              <div className="bg-muted/30 p-4 rounded-lg text-left">
                <h3 className="font-medium mb-2">Détails de la commande</h3>
                <p className="text-sm">
                  <span className="text-muted-foreground">Montant:</span>{' '}
                  <span className="font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: order.currency.toUpperCase(),
                    }).format(order.amount_total / 100)}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Date:</span>{' '}
                  <span className="font-medium">
                    {new Date(order.order_date).toLocaleDateString('fr-FR')}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Statut:</span>{' '}
                  <span className={`font-medium ${
                    order.payment_status === 'paid' ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {order.payment_status === 'paid' ? 'Payé' : order.payment_status}
                  </span>
                </p>
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            Vous allez être redirigé vers votre tableau de bord dans quelques secondes...
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/dashboard" className="btn-primary">
              <ArrowRight className="h-4 w-4 mr-2" />
              Accéder au dashboard
            </Link>
            <Link to="/" className="btn-outline">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccessPage;