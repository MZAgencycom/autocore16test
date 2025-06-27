import { useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Mail, MessageSquare, ExternalLink, AlertCircle, X, User, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SupportWidget = () => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 rounded bg-primary/10 text-primary mr-3">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-lg">Besoin d'aide ?</h3>
          <p className="text-sm text-muted-foreground">Notre équipe est disponible pour vous aider</p>
        </div>
      </div>
      
      <button 
        onClick={() => setShowDetails(!showDetails)} 
        className="w-full p-4 border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-lg mb-4 transition-all text-left flex items-center justify-between"
      >
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-primary mr-2" />
          <span className="font-medium">Signaler un problème ou demander de l'aide</span>
        </div>
        <div className="text-primary">
          {showDetails ? '−' : '+'}
        </div>
      </button>
      
      <AnimatePresence>
        {showDetails && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 border rounded-lg mb-4">
              <p className="text-sm mb-4">
                Si vous rencontrez un problème technique ou avez besoin d'assistance, n'hésitez pas à nous contacter par email à l'adresse suivante:
              </p>
              
              <a 
                href="mailto:contact@autocoreai.fr" 
                className="flex items-center justify-center p-3 bg-primary text-primary-foreground rounded-lg mb-4 hover:bg-primary/90 transition-colors"
              >
                <Mail className="h-4 w-4 mr-2" />
                contact@autocoreai.fr
              </a>
              
              <p className="text-xs text-muted-foreground">
                Notre équipe vous répondra dans les meilleurs délais, généralement sous 24h ouvrées.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a 
          href="mailto:contact@autocoreai.fr?subject=Support%20Technique%20AutoCore%20AI" 
          className="flex flex-col items-center p-4 border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all"
        >
          <Mail className="h-6 w-6 text-primary mb-2" />
          <span className="font-medium text-sm">Email Support</span>
          <span className="text-xs text-muted-foreground">contact@autocoreai.fr</span>
        </a>
        
        <Link 
          to="/dashboard/help" 
          className="flex flex-col items-center p-4 border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all"
        >
          <MessageSquare className="h-6 w-6 text-primary mb-2" />
          <span className="font-medium text-sm">FAQ & Documentation</span>
          <span className="text-xs text-muted-foreground flex items-center">
            Accéder <ChevronRight className="h-3 w-3 ml-1" />
          </span>
        </Link>
      </div>
    </div>
  );
};

// Importing AnimatePresence directly in the file to ensure it's available
import { AnimatePresence } from 'framer-motion';

export default SupportWidget;