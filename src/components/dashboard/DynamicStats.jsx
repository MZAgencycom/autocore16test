import { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  ScrollText,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DynamicStats = ({ refreshKey }) => {
  const [statistics, setStatistics] = useState({
    reportsCount: 0,
    invoicesCount: 0,
    revenue: 0,
    pendingRevenue: 0,
    timeSaved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calcul du temps économisé (estimation basée sur les rapports analysés)
  const calculateTimeSaved = (reportsCount) => {
    // Estimation: 30 minutes économisées par rapport analysé
    return Math.round(reportsCount * 0.5);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Récupérer les statistiques des rapports
        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('status', 'analyzed');

        if (reportsError) throw reportsError;

        // Récupérer toutes les factures
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('*, clients(first_name, last_name)');

        if (invoicesError) throw invoicesError;

        // Calculer les statistiques
        const reportsCount = reports?.length || 0;
        const invoicesCount = invoices?.length || 0;
        
        // Chiffre d'affaires (factures encaissées)
        const paidInvoices = invoices?.filter(invoice => invoice.status === 'paid') || [];
        const revenue = paidInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        
        // Chiffre d'affaires en attente
        const pendingInvoices = invoices?.filter(invoice => invoice.status !== 'paid') || [];
        const pendingRevenue = pendingInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        
        // Temps économisé
        const timeSaved = calculateTimeSaved(reportsCount);

        setStatistics({
          reportsCount,
          invoicesCount,
          revenue,
          pendingRevenue,
          timeSaved
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        setError('Impossible de charger les statistiques');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Rafraîchir les données toutes les 5 minutes
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Formater le nombre pour l'affichage
  const formatNumber = (number) => {
    return new Intl.NumberFormat('fr-FR').format(number);
  };

  // Formater un montant en euros
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculer le changement en pourcentage (simulé pour la démo)
  const getPercentChange = (statName) => {
    // Dans une version réelle, comparer avec les données du mois précédent
    const percentChanges = {
      reportsCount: '+8%',
      invoicesCount: '+12%',
      revenue: '+5%',
      pendingRevenue: '+10%',
      timeSaved: '+20%'
    };
    
    return percentChanges[statName] || '+0%';
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-6 animate-pulse">
            <div className="h-6 bg-muted/50 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-muted/50 rounded w-1/3 mb-1"></div>
            <div className="h-4 bg-muted/50 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  // Configuration des cartes de statistiques
  const statsCards = [
    {
      title: "Rapports analysés",
      value: formatNumber(statistics.reportsCount),
      change: getPercentChange('reportsCount'),
      color: "bg-blue-500/10 text-blue-500",
      icon: FileText
    },
    {
      title: "Factures générées",
      value: formatNumber(statistics.invoicesCount),
      change: getPercentChange('invoicesCount'),
      color: "bg-violet-500/10 text-violet-500",
      icon: ScrollText
    },
    {
      title: "Chiffre d'affaires",
      value: formatCurrency(statistics.revenue),
      change: getPercentChange('revenue'),
      color: "bg-emerald-500/10 text-emerald-500",
      icon: BarChart3,
      tooltip: "Total des factures encaissées"
    },
    {
      title: "En attente de paiement",
      value: formatCurrency(statistics.pendingRevenue),
      change: getPercentChange('pendingRevenue'),
      color: "bg-amber-500/10 text-amber-500",
      icon: Clock,
      tooltip: "Montant des factures non encaissées"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((card, i) => (
        <div 
          key={i} 
          className="bg-card rounded-lg border p-6 transition-all hover:shadow-md"
          title={card.tooltip}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
            <div className={`rounded-full p-2 ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            <span className="flex items-center text-emerald-500 mr-1">
              <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
              {card.change}
            </span>
            vs mois précédent
          </p>
        </div>
      ))}
    </div>
  );
};

export default DynamicStats;