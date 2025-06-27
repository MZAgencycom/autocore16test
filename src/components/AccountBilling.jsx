import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Download, Loader, AlertCircle, Clock, CheckCircle, ArrowRight, Eye, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { getUserOrders } from '../lib/stripeClient';

const AccountBilling = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getUserOrders();
        if (import.meta?.env?.DEV) console.log("Fetched orders:", data);
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Impossible de charger l\'historique des paiements');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, []);
  
  // Format currency
  const formatCurrency = (amount, currency = 'EUR') => {
    // Ensure currency is a string before calling toUpperCase()
    const currencyCode = currency ? currency.toUpperCase() : 'EUR';
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(amount / 100);
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };
  
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 rounded bg-primary/10 text-primary mr-3">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Historique des paiements</h3>
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
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Historique des paiements</h3>
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="p-2 rounded bg-primary/10 text-primary mr-3">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Historique des paiements</h3>
        </div>
        
        <Link to="/pricing" className="btn-outline text-sm py-1.5 px-3">
          Voir les tarifs
        </Link>
      </div>
      
      {orders.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h4 className="font-medium mb-1">Aucun paiement</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Vous n'avez effectué aucun paiement pour le moment.
          </p>
          <Link to="/pricing" className="btn-primary inline-flex">
            Découvrir nos offres
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      ) : (
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Montant</th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      {formatDate(order.order_date)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-medium">
                      {formatCurrency(order.amount_total, order.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.payment_status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {order.payment_status === 'paid' ? 'Payé' : order.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button 
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Télécharger la facture"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Pour toute question concernant vos paiements, veuillez contacter notre service client.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AccountBilling;