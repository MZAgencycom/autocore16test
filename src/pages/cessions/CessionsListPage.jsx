import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSignature,
  Plus,
  Search,
  Filter, 
  CheckCircle, 
  Clock, 
  Send, 
  AlertCircle, 
  Download,
  Eye,
  MoreHorizontal,
  Loader,
  User,
  X,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import EmailSender from '../../components/communication/EmailSender';
import CessionPDF from '../../components/cessions/CessionPDF';
import downloadFile from '../../utils/downloadFile';
import useCompanySettings from '../../hooks/useCompanySettings';

const CessionsListPage = () => {
  const [cessions, setCessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openActions, setOpenActions] = useState({});
  const [openStatusMenu, setOpenStatusMenu] = useState({});
  const [loadingStatusId, setLoadingStatusId] = useState(null);
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [selectedEmailData, setSelectedEmailData] = useState(null);
  const { company } = useCompanySettings();
  
  // Charger les cessions de créance
  const loadCessions = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('cession_creances')
          .select('id, recipient_name, recipient_email, invoice_number, amount, status, created_at, document_url')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map(c => ({
          id: c.id,
          clientName: c.recipient_name,
          clientEmail: c.recipient_email,
          invoiceNumber: c.invoice_number,
          amount: c.amount,
          createdAt: c.created_at,
          status: c.status,
          documentUrl: c.document_url
        }));

        setCessions(formatted);
        
      } catch (error) {
        console.error('Error loading cessions:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des cessions de créance");
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadCessions();
  }, [loadCessions]);
  
  // Filtrer les cessions en fonction de la recherche et du filtre de statut
  const filteredCessions = cessions.filter((cession) => {
    const searchLower = searchTerm.toLowerCase();
    const searchMatch =
      cession.clientName.toLowerCase().includes(searchLower) ||
      cession.invoiceNumber.toLowerCase().includes(searchLower);

    const statusMatch =
      statusFilter === 'all' || cession.status === statusFilter;

    return searchMatch && statusMatch;
  });
  
  // Formater une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  // Formater un montant en euros
  const formatCurrency = (amount) => {
    if (!amount) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Obtenir le statut d'une cession
  const getStatusDetails = (status) => {
    switch(status) {
      case 'draft':
        return { 
          label: 'Brouillon', 
          color: 'bg-amber-500/10 text-amber-600',
          icon: Clock
        };
      case 'sent':
        return { 
          label: 'Envoyée', 
          color: 'bg-blue-500/10 text-blue-600',
          icon: Send
        };
      case 'signed':
        return { 
          label: 'Signée', 
          color: 'bg-emerald-500/10 text-emerald-600',
          icon: CheckCircle
        };
      case 'rejected':
        return { 
          label: 'Rejetée', 
          color: 'bg-red-500/10 text-red-600',
          icon: AlertCircle
        };
      default:
        return { 
          label: 'Inconnue', 
          color: 'bg-gray-500/10 text-gray-600',
          icon: FileSignature
        };
    }
  };

  const toggleActions = (id) => {
    setOpenActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    // close status submenu when toggling actions
    setOpenStatusMenu(prev => ({
      ...prev,
      [id]: false
    }));
  };

  const toggleStatusMenu = (id) => {
    setOpenStatusMenu(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const updateStatus = async (id, newStatus) => {
    try {
      setLoadingStatusId(id);
      const { error } = await supabase
        .from('cession_creances')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setCessions(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      toast.success('Statut mis à jour');
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour du statut');
    } finally {
      setLoadingStatusId(null);
      setOpenStatusMenu(prev => ({ ...prev, [id]: false }));
      setOpenActions(prev => ({ ...prev, [id]: false }));
    }
  };

  const deleteCession = async (id) => {
    if (!confirm("Supprimer cette cession de créance ?")) return;
    try {
      const { error } = await supabase
        .from('cession_creances')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCessions(prev => prev.filter(c => c.id !== id));
      toast.success('Cession supprimée');
    } catch (err) {
      console.error('Error deleting cession:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  const openEmailModal = (cession) => {
    setSelectedEmailData({
      recipient: { name: cession.clientName, email: cession.clientEmail || '' }
    });
    setShowEmailSender(true);
    setOpenActions(prev => ({ ...prev, [cession.id]: false }));
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <FileSignature className="h-6 w-6 mr-2 text-primary" />
            Cessions de créance
          </h1>
          <p className="text-muted-foreground">
            Gérez vos cessions de créance pour facturer directement les assurances
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link to="/dashboard/cessions/create" className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle cession
          </Link>
        </div>
      </div>
      
      {/* Filtres */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-start sm:items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher..."
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
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="signed">Signée</option>
              <option value="rejected">Rejetée</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Liste des cessions */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des cessions de créance...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">Erreur</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadCessions}
              className="btn-primary py-2"
            >
              Réessayer
            </button>
          </div>
        ) : filteredCessions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <FileSignature className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucune cession de créance</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' ? 
                "Aucune cession ne correspond à vos critères de recherche." : 
                "Vous n'avez pas encore créé de cession de créance."}
            </p>
            {!(searchTerm || statusFilter !== 'all') && (
              <Link to="/dashboard/cessions/create" className="btn-primary py-2 px-4">
                Créer une première cession
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
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Facture</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Montant</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Statut</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCessions.map((cession) => {
                  const statusDetails = getStatusDetails(cession.status);
                  const StatusIcon = statusDetails.icon;
                  
                  return (
                    <tr key={cession.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-muted-foreground mr-2" />
                          <Link 
                            to={`/dashboard/cessions/${cession.id}`} 
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {cession.clientName}
                          </Link>
                        </div>
                      </td>
                      
                      <td className="p-4 text-sm">
                        <div className="flex items-center">
                          <FileSignature className="h-4 w-4 text-muted-foreground mr-2" />
                          <span>{cession.invoiceNumber}</span>
                        </div>
                      </td>
                      
                      <td className="p-4 text-right text-sm font-medium">
                        {formatCurrency(cession.amount)}
                      </td>
                      
                      <td className="p-4 text-center text-sm">
                        {formatDate(cession.createdAt)}
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusDetails.color}`}>
                          <StatusIcon className="h-3.5 w-3.5 mr-1" />
                          {statusDetails.label}
                        </div>
                      </td>
                      
                      <td className="p-4 text-right">
                        <div className="flex justify-end space-x-2 relative">
                          <Link
                            to={`/dashboard/cessions/${cession.id}`}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          
                          <button
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Télécharger"
                            onClick={async () => {
                              try {
                                if (cession.documentUrl) {
                                  await downloadFile(cession.documentUrl, 'cession.pdf');
                                } else {
                                  await CessionPDF(cession, company || {});
                                }
                              } catch (err) {
                                console.error('Failed to download cession:', err);
                              }
                            }}
                            disabled={cession.status !== 'signed'}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          
                          <button
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Plus d'options"
                            onClick={() => toggleActions(cession.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          <AnimatePresence>
                            {openActions[cession.id] && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 top-full mt-1 bg-card border rounded-md shadow-md z-10 w-48 py-1"
                              >
                                <button
                                  onClick={() => toggleStatusMenu(cession.id)}
                                  className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                >
                                  <Filter className="h-4 w-4 mr-2" />
                                  Changer le statut
                                </button>

                                {openStatusMenu[cession.id] && (
                                  <div className="border-t py-1">
                                    <button
                                      onClick={() => updateStatus(cession.id, 'draft')}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                    >
                                      {loadingStatusId === cession.id && (<Loader className="h-4 w-4 mr-2 animate-spin" />)}
                                      {loadingStatusId !== cession.id && (<Clock className="h-4 w-4 mr-2" />)}
                                      Brouillon
                                    </button>
                                    <button
                                      onClick={() => updateStatus(cession.id, 'sent')}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                    >
                                      {loadingStatusId === cession.id && (<Loader className="h-4 w-4 mr-2 animate-spin" />)}
                                      {loadingStatusId !== cession.id && (<Send className="h-4 w-4 mr-2" />)}
                                      Envoyée
                                    </button>
                                    <button
                                      onClick={() => updateStatus(cession.id, 'signed')}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                    >
                                      {loadingStatusId === cession.id && (<Loader className="h-4 w-4 mr-2 animate-spin" />)}
                                      {loadingStatusId !== cession.id && (<CheckCircle className="h-4 w-4 mr-2" />)}
                                      Signée
                                    </button>
                                    <button
                                      onClick={() => updateStatus(cession.id, 'rejected')}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                    >
                                      {loadingStatusId === cession.id && (<Loader className="h-4 w-4 mr-2 animate-spin" />)}
                                      {loadingStatusId !== cession.id && (<AlertCircle className="h-4 w-4 mr-2" />)}
                                      Rejetée
                                    </button>
                                  </div>
                                )}

                                <button
                                  onClick={() => openEmailModal(cession)}
                                  className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Envoyer par email
                                </button>

                                <button
                                  onClick={() => deleteCession(cession.id)}
                                  className="flex items-center px-4 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors w-full text-left"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEmailSender && selectedEmailData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl border max-w-4xl w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Envoyer par email</h2>
              <button
                onClick={() => setShowEmailSender(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <EmailSender recipient={selectedEmailData.recipient} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CessionsListPage;
