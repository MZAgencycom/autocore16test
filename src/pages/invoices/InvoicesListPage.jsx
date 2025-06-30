import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { withTimeout } from '../../utils/withTimeout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ScrollText, 
  Plus, 
  Filter, 
  Search, 
  MoreHorizontal, 
  Download, 
  Send, 
  Eye, 
  AlertCircle,
  Clock,
  CheckCircle,
  Loader
} from 'lucide-react';
import { Invoice } from '../../models/Invoice';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import InvoiceRow from '../../components/invoices/InvoiceRow';

const InvoicesListPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);
  const { session } = useAuth();

  useEffect(() => {
    if (!session || !supabase) return;
    loadInvoices();
  }, [session]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        setError('Temps de chargement dépassé. Veuillez rafraîchir.');
        setIsLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading]);


  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await withTimeout(Invoice.getAll(), 10000, 'timeout');
      setInvoices(data || []);
      if (import.meta?.env?.DEV) console.log('Chargement terminé', data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setError(error.message || "Une erreur est survenue lors du chargement des factures");
      toast.error(error.message || 'Échec de chargement des factures');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter invoices based on search term and status filter
  const filteredInvoices = invoices.filter(invoice => {
    // Search term filter
    const searchMatch = searchTerm === '' || 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vehicles?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vehicles?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const statusMatch = statusFilter === 'all' || invoice.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  // Handle status change
  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      setUpdatingStatus(invoiceId);
      await Invoice.updateStatus(invoiceId, newStatus);
      
      // Update local state to reflect the change
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, status: newStatus } 
          : invoice
      ));
      
      setUpdatingStatus(null);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      // Optionally show an error toast/message here
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <ScrollText className="h-6 w-6 mr-2 text-primary" />
            Factures
          </h1>
          <p className="text-muted-foreground">
            Gérez vos factures et suivez leur statut
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link to="/dashboard/invoices/create" className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Créer une facture
          </Link>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-start sm:items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher une facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">Générée</option>
              <option value="sent">Envoyée</option>
              <option value="waiting_payment">Paiement en attente</option>
              <option value="paid">Encaissée</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Invoice List */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des factures...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">Erreur</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={loadInvoices} 
              className="btn-primary py-2"
            >
              Réessayer
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <ScrollText className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucune facture</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' ? 
                "Aucune facture ne correspond à vos critères de recherche." : 
                "Vous n'avez pas encore créé de factures."}
            </p>
            {!(searchTerm || statusFilter !== 'all') && (
              <Link to="/dashboard/invoices/create" className="btn-primary py-2 px-4">
                Créer votre première facture
              </Link>
            )}
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="btn-outline py-2 px-4"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">N° Facture</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Véhicule</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Montant</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Statut</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    onStatusChange={handleStatusChange}
                    animating={updatingStatus === invoice.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesListPage;