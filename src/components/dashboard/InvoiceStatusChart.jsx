import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '../../lib/supabase';

const InvoiceStatusChart = ({ refreshKey }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Récupérer toutes les factures
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('*');

        if (error) {
          throw error;
        }

        // Compter par statut
        const statusCounts = {
          pending: 0,
          sent: 0,
          waiting_payment: 0,
          paid: 0
        };

        // Calculer les totaux par statut
        const statusTotals = {
          pending: 0,
          sent: 0,
          waiting_payment: 0,
          paid: 0
        };

        invoices?.forEach(invoice => {
          // Statut par défaut si non spécifié
          const status = invoice.status || 'pending';
          
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          statusTotals[status] = (statusTotals[status] || 0) + (invoice.total || 0);
        });

        // Transformer en format pour le graphique
        const chartData = [
          { name: 'Générée', value: statusCounts.pending, amount: statusTotals.pending, color: '#f59e0b' },
          { name: 'Envoyée', value: statusCounts.sent, amount: statusTotals.sent, color: '#3b82f6' },
          { name: 'Paiement en attente', value: statusCounts.waiting_payment, amount: statusTotals.waiting_payment, color: '#f97316' },
          { name: 'Encaissée', value: statusCounts.paid, amount: statusTotals.paid, color: '#10b981' }
        ];

        // Filtrer pour ne pas afficher les catégories vides
        const filteredData = chartData.filter(item => item.value > 0);
        
        setData(filteredData);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Impossible de charger les données');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  // Formater les montants en euros
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border shadow-lg rounded-md p-3 text-sm">
          <p className="font-medium">{data.name}: {data.value} facture(s)</p>
          <p className="text-muted-foreground">
            Montant: {formatCurrency(data.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center flex-col">
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-medium mb-2">Statut des factures</h3>
      
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <div className="flex-1 truncate">{entry.name}</div>
            <div className="font-medium">{entry.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvoiceStatusChart;