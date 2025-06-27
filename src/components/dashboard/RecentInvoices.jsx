import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Send, Eye, ScrollText as ScrollTextIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const RecentInvoices = ({ onStatusUpdate }) => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      // Récupérer les factures les plus récentes avec les données jointes des clients et véhicules
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(id, first_name, last_name),
          vehicles(id, make, model)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      setInvoices(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures récentes:', error);
      setError('Impossible de charger les factures récentes');
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour le statut d'une facture
  const updateInvoiceStatus = async (invoiceId, newStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Mettre à jour l'état local
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, status: newStatus } 
          : invoice
      ));
      
      // Notify parent component that status has been updated
      if (onStatusUpdate && newStatus === 'paid') {
        onStatusUpdate();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Erreur lors de la mise à jour du statut. Veuillez réessayer.');
    }
  };

  // Formater le montant en euros
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Obtenir le libellé et la classe de couleur pour chaque statut
  const getStatusDetails = (status) => {
    switch(status) {
      case 'pending':
        return { label: 'Générée', class: 'bg-amber-500/10 text-amber-500' };
      case 'sent':
        return { label: 'Envoyée', class: 'bg-blue-500/10 text-blue-500' };
      case 'waiting_payment':
        return { label: 'Paiement en attente', class: 'bg-orange-500/10 text-orange-500' };
      case 'paid':
        return { label: 'Encaissée', class: 'bg-emerald-500/10 text-emerald-500' };
      default:
        return { label: 'Générée', class: 'bg-amber-500/10 text-amber-500' };
    }
  };

  // Formater la date relative (ex: "il y a 2 jours")
  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  if (isLoading) {
    return (
      <div className="md:col-span-3 bg-card rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Factures récentes</h3>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <div className="h-5 bg-muted/50 rounded w-32 mb-1"></div>
                <div className="h-4 bg-muted/50 rounded w-24"></div>
              </div>
              <div className="text-right">
                <div className="h-5 bg-muted/50 rounded w-20 mb-1"></div>
                <div className="h-4 bg-muted/50 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="md:col-span-3 bg-card rounded-lg border p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:col-span-3 bg-card rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Factures récentes</h3>
        <Link to="/dashboard/invoices" className="text-sm text-primary">
          Voir tout
        </Link>
      </div>
      
      {invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ScrollTextIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>Aucune facture récente</p>
          <p className="text-sm mt-1">Commencez par analyser un rapport d'expertise</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium">
                  {invoice.clients?.first_name} {invoice.clients?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {invoice.vehicles?.make} {invoice.vehicles?.model} • {formatRelativeDate(invoice.created_at)}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className="font-medium">{formatCurrency(invoice.total)}</p>
                <div className="flex space-x-2 mt-1">
                  <select
                    value={invoice.status}
                    onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                    className="text-xs p-1 rounded bg-muted border-none"
                    style={{ minWidth: '120px' }}
                  >
                    <option value="pending">Générée</option>
                    <option value="sent">Envoyée</option>
                    <option value="waiting_payment">Paiement en attente</option>
                    <option value="paid">Encaissée</option>
                  </select>
                  <div className="flex gap-1">
                    <Link 
                      to={`/dashboard/invoices/${invoice.id}`} 
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                      title="Voir"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <button 
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                      title="Télécharger"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button 
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                      title="Envoyer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentInvoices;