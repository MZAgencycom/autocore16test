import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader, ArrowRight, AlertCircle } from 'lucide-react';
import { stripeProducts, formatPrice } from '../stripe-config';
import { useAuth } from '../contexts/AuthContext';
import PricingCard from '../components/subscription/PricingCard';

const PricingPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [billingInterval, setBillingInterval] = useState('month');
  
  // Filter products based on billing interval
  const filteredProducts = stripeProducts.filter(product => 
    product.mode === 'payment' || (product.mode === 'subscription' && product.interval === billingInterval)
  );
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24">
      <div className="container py-12">
        <motion.div 
          className="text-center max-w-[800px] mx-auto mb-16 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold">
            Tarifs Simples et Transparents
          </h1>
          <p className="text-muted-foreground text-lg max-w-[600px] mx-auto">
            Choisissez le plan qui correspond à vos besoins et commencez à optimiser votre activité dès aujourd'hui.
          </p>
          
          {/* Interval toggle */}
          <div className="flex justify-center mt-8">
            <div className="bg-muted/30 p-1 rounded-full inline-flex">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingInterval === 'month' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted/50'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingInterval === 'year' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted/50'
                }`}
              >
                Annuel
              </button>
            </div>
          </div>
        </motion.div>
        
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-destructive/10 text-destructive p-4 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <motion.div 
          className="grid gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredProducts.map((product) => (
            <PricingCard 
              key={product.id}
              plan={product} 
              isPopular={product.popular}
            />
          ))}
        </motion.div>

        <div className="mt-12 text-center text-muted-foreground">
          <p>Tous les prix sont hors taxes. Essai gratuit de 14 jours pour les abonnements.</p>
          <p className="mt-2">Besoin d'une solution personnalisée ? <Link to="/contact" className="text-primary hover:underline">Contactez-nous</Link></p>
        </div>

        {/* Feature comparison */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Comparaison des fonctionnalités</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-4 px-6 text-left">Fonctionnalité</th>
                  <th className="py-4 px-6 text-center">Starter</th>
                  <th className="py-4 px-6 text-center bg-primary/5 border-x">Pro</th>
                  <th className="py-4 px-6 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Analyse de rapports", starter: "10/mois", pro: "50/mois", enterprise: "Illimités" },
                  { feature: "Génération de factures", starter: "15/mois", pro: "Illimitées", enterprise: "Illimitées" },
                  { feature: "Templates de factures", starter: "1", pro: "3", enterprise: "Personnalisables" },
                  { feature: "Assistant IA", starter: "✗", pro: "✓", enterprise: "✓" },
                  { feature: "Mini CRM", starter: "Basique", pro: "Complet", enterprise: "Avancé" },
                  { feature: "Support client", starter: "Email", pro: "Prioritaire", enterprise: "Dédié" },
                  { feature: "Utilisateurs", starter: "1", pro: "3", enterprise: "Illimités" },
                  { feature: "API d'intégration", starter: "✗", pro: "✗", enterprise: "✓" }
                ].map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/10">
                    <td className="py-4 px-6 font-medium">{row.feature}</td>
                    <td className="py-4 px-6 text-center">
                      {row.starter === "✓" ? (
                        <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : row.starter === "✗" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.starter
                      )}
                    </td>
                    <td className="py-4 px-6 text-center bg-primary/5 border-x">
                      {row.pro === "✓" ? (
                        <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : row.pro === "✗" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="font-medium">{row.pro}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {row.enterprise === "✓" ? (
                        <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : row.enterprise === "✗" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.enterprise
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guarantee section */}
        <div className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Garantie de satisfaction</h2>
          <p className="text-muted-foreground mb-6">
            Si vous n'êtes pas satisfait dans les 30 premiers jours, nous vous remboursons intégralement.
            Pas de questions, pas de conditions.
          </p>
          <div className="p-8 bg-card rounded-xl border">
            <div className="flex flex-col items-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Testez sans risque</h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Tous nos plans incluent un essai gratuit de 14 jours et sont couverts par notre garantie
                de remboursement de 30 jours. Vous pouvez annuler à tout moment sans engagement.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PricingPage;