import { useState } from 'react';
import { motion } from 'framer-motion';
import { redirectToCheckout } from '../../lib/stripe';
import { Loader, ArrowRight } from 'lucide-react';

const CheckoutButton = ({ 
  priceId, 
  mode = 'subscription', 
  children, 
  className = '',
  variant = 'primary'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await redirectToCheckout(priceId, mode);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine button styling based on variant
  const buttonStyle = 
    variant === 'primary' 
      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
      : variant === 'outline'
        ? 'border border-primary/20 bg-background/80 hover:bg-background/90'
        : 'bg-card border hover:bg-muted/50';

  return (
    <div className="relative">
      <motion.button
        onClick={handleCheckout}
        disabled={isLoading}
        className={`${buttonStyle} px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <Loader className="animate-spin h-4 w-4 mr-2" />
        ) : null}
        
        <span>{children || 'S\'abonner'}</span>
        
        {!isLoading && (
          <ArrowRight className="ml-2 h-4 w-4" />
        )}
      </motion.button>
      
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default CheckoutButton;