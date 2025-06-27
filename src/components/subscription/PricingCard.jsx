import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import CheckoutButton from './CheckoutButton';

const PricingCard = ({ 
  plan, 
  isPopular = false, 
  onCheckout 
}) => {
  return (
    <motion.div 
      className={`flex flex-col rounded-xl border bg-card/70 backdrop-blur-sm overflow-hidden relative shadow-md ${
        isPopular ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-primary/10'
      }`}
      whileHover={{ 
        y: -5, 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Enhanced background effect on hover */}
      <div className={`absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent transition-opacity duration-300 ${isPopular ? 'opacity-100' : 'opacity-0'}`} />
      
      {isPopular && (
        <div className="py-1 px-4 bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-medium tracking-wider uppercase text-center shadow-md">
          Recommandé
        </div>
      )}

      <div className="p-6 relative z-10">
        <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">{plan.name}</h3>
        <p className="text-foreground/70 text-sm h-12">{plan.description}</p>
        <div className="mt-4 flex items-baseline">
          <span className="text-4xl font-extrabold">{plan.price}€</span>
          <span className="ml-1 text-foreground/70">/mois</span>
        </div>
      </div>
      
      <div className="flex-grow p-6 pt-0 relative z-10">
        <ul className="space-y-3 mt-6">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start text-sm">
              <div className="rounded-full p-1 bg-primary/10 text-primary mr-2 mt-0.5">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-foreground/80">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="p-6 pt-0 relative z-10">
        <CheckoutButton 
          priceId={plan.priceId} 
          mode={plan.mode || 'subscription'}
          variant={isPopular ? 'primary' : 'outline'}
          className="w-full"
        >
          {plan.cta || "S'abonner"}
        </CheckoutButton>
      </div>
      
      {/* Decorative corner accent for popular plan */}
      {isPopular && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 transform rotate-45 translate-x-8 -translate-y-8 border-b border-primary/20"></div>
        </div>
      )}
    </motion.div>
  );
};

export default PricingCard;