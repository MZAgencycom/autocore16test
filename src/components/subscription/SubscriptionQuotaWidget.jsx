import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  ScrollText, 
  Brain,
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  getRemainingQuotas,
  getUserSubscriptionTier,
  SUBSCRIPTION_LIMITS
} from '../../lib/subscriptionManager';

const SubscriptionQuotaWidget = () => {
  const [quotas, setQuotas] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchQuotas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const quotaData = await getRemainingQuotas();
        setQuotas(quotaData);
      } catch (error) {
        console.error('Error fetching quotas:', error);
        setError('Impossible de charger les informations d\'abonnement');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuotas();
    
    // Refresh every 5 minutes or when the component mounts
    const interval = setInterval(fetchQuotas, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-4 animate-pulse">
        <div className="h-5 bg-muted/50 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-muted/50 rounded w-full"></div>
          <div className="h-4 bg-muted/50 rounded w-5/6"></div>
          <div className="h-4 bg-muted/50 rounded w-4/6"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <div className="p-3 bg-destructive/10 text-destructive flex items-center text-sm rounded">
          <AlertCircle className="h-4 w-4 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!quotas) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <Link to="/pricing" className="p-3 bg-amber-500/10 text-amber-600 flex items-center text-sm rounded hover:bg-amber-500/20 transition-colors">
          <AlertCircle className="h-4 w-4 mr-2" />
          <p>Vous n'avez pas d'abonnement actif. Cliquez pour voir nos offres.</p>
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Link>
      </div>
    );
  }
  
  // Get plan name based on tier
  const getPlanName = (tier) => {
    switch(tier) {
      case 'trial':
        return 'Essai gratuit';
      case 'starter':
        return 'Starter';
      case 'pro':
        return 'Pro';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Inconnu';
    }
  };
  
  // Get a color class based on usage percentage
  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };
  
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">Votre abonnement</h3>
        <Link 
          to="/dashboard/account"
          className="text-xs text-primary hover:underline"
        >
          Gérer
        </Link>
      </div>
      
      {/* Plan header */}
      <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center mb-4">
        <div>
          <p className="font-medium">{getPlanName(quotas.tier)}</p>
          {quotas.tier === 'trial' && quotas.daysRemaining && (
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {quotas.daysRemaining > 0 ? (
                <span>Il vous reste {quotas.daysRemaining} jour{quotas.daysRemaining > 1 ? 's' : ''}</span>
              ) : (
                <span>Expiré</span>
              )}
            </div>
          )}
        </div>
        <Link
          to="/pricing"
          className="text-xs bg-primary px-2 py-1 text-primary-foreground rounded"
        >
          {quotas.tier === 'trial' ? 'Passer à Pro' : 'Mettre à niveau'}
        </Link>
      </div>
      
      {/* Quotas section */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center text-sm">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              <span>Rapports</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {quotas.reports.used} / {quotas.reports.isUnlimited ? '∞' : quotas.reports.total}
            </span>
          </div>
          
          {!quotas.reports.isUnlimited && (
            <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${getProgressColor(quotas.reports.percentage)}`}
                initial={{ width: '0%' }}
                animate={{ width: `${quotas.reports.percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center text-sm">
              <ScrollText className="h-3.5 w-3.5 mr-1.5" />
              <span>Factures</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {quotas.invoices.used} / {quotas.invoices.isUnlimited ? '∞' : quotas.invoices.total}
            </span>
          </div>
          
          {!quotas.invoices.isUnlimited && (
            <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${getProgressColor(quotas.invoices.percentage)}`}
                initial={{ width: '0%' }}
                animate={{ width: `${quotas.invoices.percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
        
        <div className={`flex items-center space-x-2 text-sm ${!quotas.hasAssistant ? 'text-muted-foreground' : ''}`}>
          <Brain className={`h-3.5 w-3.5 ${!quotas.hasAssistant ? 'opacity-50' : 'text-primary'}`} />
          <span>Assistant intelligent</span>
          <span className={`text-xs ${quotas.hasAssistant ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/30 text-muted-foreground'} px-1.5 py-0.5 rounded`}>
            {quotas.hasAssistant ? 'Actif' : 'Indisponible'}
          </span>
        </div>
      </div>
      
      {/* Trial expiry warning or upgrade button */}
      {quotas.tier === 'trial' && quotas.daysRemaining <= 2 && quotas.daysRemaining > 0 && (
        <div className="mt-4 p-2 bg-amber-500/10 text-amber-600 rounded text-xs flex items-center">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          Votre période d'essai se termine bientôt. 
          <Link to="/pricing" className="ml-1 font-medium hover:underline">Passer à Pro</Link>
        </div>
      )}
      
      {quotas.tier === 'trial' && quotas.daysRemaining <= 0 && (
        <div className="mt-4 p-2 bg-red-500/10 text-red-600 rounded text-xs flex items-center">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          Votre période d'essai est terminée. 
          <Link to="/pricing" className="ml-1 font-medium hover:underline">Passer à Pro</Link>
        </div>
      )}
    </div>
  );
};

export default SubscriptionQuotaWidget;