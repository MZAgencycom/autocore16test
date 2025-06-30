import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../../lib/stripe';

const StripeProvider = ({ children }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  // Check if Stripe is properly configured
  useEffect(() => {
    const checkStripeConfig = async () => {
      try {
        setIsLoading(true);
        
        // Check if Stripe publishable key is set
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        
        if (!publishableKey) {
          console.warn('Stripe publishable key is missing. Stripe functionality will be limited.');
          setError('missing_key');
        } else if (publishableKey.startsWith('pk_test_')) {
          console.info('Using Stripe test mode');
        }
        
      } catch (error) {
        console.error('Error checking Stripe configuration:', error);
        setError('config_error');
      } finally {
        setIsLoading(false);
      }
    };

    checkStripeConfig();
    getStripe().then(p => setStripePromise(p));
  }, []);

  // If there's no Stripe config, still render children
  if (error === 'missing_key' || isLoading) {
    return children;
  }

  // Otherwise wrap with Stripe Elements
  const options = {
    // Pass additional options to Stripe Elements if needed
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#6366f1', // Match primary color
      },
    },
  };

  return stripePromise ? (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  ) : (
    children
  );
};

export default StripeProvider;

export { StripeProvider }