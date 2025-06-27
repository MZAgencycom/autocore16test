import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

const CheckoutCancelPage = () => {
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
            className="mx-auto bg-amber-500/10 text-amber-500 h-20 w-20 rounded-full flex items-center justify-center mb-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <XCircle className="h-10 w-10" />
          </motion.div>
          
          <h1 className="text-2xl font-bold mb-2">Paiement annulé</h1>
          
          <p className="text-muted-foreground mb-6">
            Votre transaction a été annulée et aucun paiement n'a été effectué.
          </p>
          
          <div className="bg-muted/30 p-4 rounded-lg text-left mb-8">
            <h3 className="font-medium mb-2">Que se passe-t-il maintenant ?</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Vous pouvez réessayer votre achat à tout moment</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Aucun montant n'a été débité de votre compte</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Si vous avez des questions, n'hésitez pas à contacter notre support</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/pricing" className="btn-primary">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Retour aux tarifs
            </Link>
            <Link to="/" className="btn-outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutCancelPage;