import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, 
  Plus, 
  Search,
  Calendar,
  FileText,
  Car,
  Users,
  Clock,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader,
  Filter,
  ChevronDown,
  CircleDollarSign,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TrafficViolation } from '../../models/TrafficViolation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';

const TrafficViolationsPage = () => {
  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openActions, setOpenActions] = useState({});
  
  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  
  // Check access permission
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await checkActionPermission('loan_vehicles');
        if (!result.canProceed) {
          setLimitInfo(result);
          setShowLimitModal(true);
        }
      } catch (error) {
        console.error('Error checking access permission:', error);
      }
    };
    
    checkAccess();
  }, []);

  // Charger les infractions
  const loadViolations = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await TrafficViolation.getAll();
        setViolations(data);
        
      } catch (error) {
        console.error('Error loading violations:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des infractions");
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  // Filtrer les infractions en fonction de la recherche et du filtre de statut
  const filteredViolations = violations.filter(violation => {
    // Recherche dans l'immatriculation du véhicule et le nom du client
    const vehicleInfo = `${violation.loan_vehicles?.make} ${violation.loan_vehicles?.model} ${violation.loan_vehicles?.registration || ''}`.toLowerCase();
    const clientName = violation.vehicle_loans?.clients ? 
      `${violation.vehicle_loans.clients.first_name} ${violation.vehicle_loans.clients.last_name}`.toLowerCase() : '';
    
    const searchMatch = vehicleInfo.includes(searchTerm.toLowerCase()) || 
                         clientName.includes(searchTerm.toLowerCase());
    
    // Filtre par statut
    const statusMatch = statusFilter === 'all' || violation.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  // Formatter une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  // Formatter un montant
  const formatAmount = (amount) => {
    if (!amount) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Obtenir le label pour un statut
  const getStatusLabel = (status) => {
    switch(status) {
      case 'pending': return 'En attente';
      case 'forwarded': return 'Transférée';
      case 'paid': return 'Payée';
      case 'contested': return 'Contestée';
      case 'resolved': return 'Résolue';
      default: return status;
    }
  };

  // Obtenir la couleur pour un statut
  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-amber-500/10 text-amber-600';
      case 'forwarded': return 'bg-blue-500/10 text-blue-600';
      case 'paid': return 'bg-emerald-500/10 text-emerald-600';
      case 'contested': return 'bg-violet-500/10 text-violet-600';
      case 'resolved': return 'bg-gray-500/10 text-gray-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  // Gérer les actions sur une infraction
  const toggleActions = (id) => {
    setOpenActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Mettre à jour le statut d'une infraction
  const updateViolationStatus = async (id, newStatus) => {
    try {
      await TrafficViolation.updateStatus(id, newStatus);
      
      // Mettre à jour l'état local
      setViolations(prev => 
        prev.map(violation => 
          violation.id === id 
            ? { ...violation, status: newStatus } 
            : violation
        )
      );
      
      // Fermer le menu d'actions
      setOpenActions(prev => ({
        ...prev,
        [id]: false
      }));
      
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating violation status:', error);
      toast.error(error.message || "Une erreur est survenue lors de la mise à jour du statut");
    }
  };

  // Supprimer une infraction
  const deleteViolation = async (id) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette infraction ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      await TrafficViolation.delete(id);
      
      // Mettre à jour l'état local
      setViolations(prev => prev.filter(violation => violation.id !== id));
      
      toast.success('Infraction supprimée');
    } catch (error) {
      console.error('Error deleting violation:', error);
      toast.error(error.message || "Une erreur est survenue lors de la suppression de l'infraction");
    }
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <AlertCircle className="h-6 w-6 mr-2 text-primary" />
            PV & Infractions
          </h1>
          <p className="text-muted-foreground">
            Gérez les contraventions et infractions reçues pour vos véhicules de prêt
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link to="/dashboard/violations/add" className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une infraction
          </Link>
        </div>
      </div>
      
      {/* Subscription limitation modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />

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
              <option value="pending">En attente</option>
              <option value="forwarded">Transférée</option>
              <option value="paid">Payée</option>
              <option value="contested">Contestée</option>
              <option value="resolved">Résolue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des infractions */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des infractions...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">Erreur</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadViolations}
              className="btn-primary py-2"
            >
              Réessayer
            </button>
          </div>
        ) : filteredViolations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucune infraction</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' ? 
                "Aucune infraction ne correspond à vos critères de recherche." : 
                "Aucune infraction n'a été enregistrée pour vos véhicules."}
            </p>
            {!(searchTerm || statusFilter !== 'all') && (
              <Link to="/dashboard/violations/add" className="btn-primary py-2 px-4">
                Ajouter une première infraction
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Véhicule</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Date d'infraction</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Montant</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Points</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Échéance</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Statut</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredViolations.map((violation) => (
                    <tr
                      key={violation.id}
                      className={`hover:bg-muted/50 transition-colors ${violation.status === 'resolved' ? 'opacity-60 pointer-events-none' : ''} ${violation.status === 'contested' ? 'ring-2 ring-violet-300' : ''}`}
                    >
                      <td className="p-4">
                        <Link 
                          to={`/dashboard/loan-vehicles/${violation.vehicle_id}`} 
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {violation.loan_vehicles?.make} {violation.loan_vehicles?.model}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {violation.loan_vehicles?.registration || "Non immatriculé"}
                        </div>
                      </td>
                      
                      <td className="p-4 text-sm">
                        {violation.vehicle_loans?.clients ? (
                          <Link 
                            to={`/dashboard/clients/${violation.vehicle_loans.client_id}`} 
                            className="hover:text-primary transition-colors"
                          >
                            {violation.vehicle_loans.clients.first_name} {violation.vehicle_loans.clients.last_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Inconnu</span>
                        )}
                      </td>
                      
                      <td className="p-4 text-center text-sm">
                        {formatDate(violation.violation_date)}
                      </td>
                      
                      <td className="p-4 text-right text-sm font-medium">
                        {formatAmount(violation.amount)}
                      </td>
                      
                      <td className="p-4 text-center text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          violation.points_lost > 0 ? 'bg-red-500/10 text-red-600' : 'bg-muted/30 text-muted-foreground'
                        }`}>
                          {violation.points_lost > 0 ? `-${violation.points_lost}` : '0'}
                        </span>
                      </td>
                      
                      <td className="p-4 text-center text-sm">
                        {violation.payment_deadline ? formatDate(violation.payment_deadline) : '-'}
                      </td>
                      
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                          {getStatusLabel(violation.status)}
                        </span>
                      </td>
                      
                      <td className="p-4 text-right">
                        <div className="relative">
                          <button
                            className="p-1 hover:bg-muted rounded-full transition-colors"
                            onClick={() => toggleActions(violation.id)}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          
                          <AnimatePresence>
                            {openActions[violation.id] && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 top-full mt-1 bg-card border rounded-md shadow-md z-10 w-48 py-1"
                              >
                                <Link
                                  to={`/dashboard/violations/${violation.id}`}
                                  className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir les détails
                                </Link>
                                
                                {violation.status !== 'paid' && (
                                  <button
                                    onClick={() => updateViolationStatus(violation.id, 'paid')}
                                    className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                  >
                                    <CircleDollarSign className="h-4 w-4 mr-2" />
                                    Marquer comme payée
                                  </button>
                                )}
                                
                                {violation.status !== 'forwarded' && (
                                  <button
                                    onClick={() => updateViolationStatus(violation.id, 'forwarded')}
                                    className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Transférée au client
                                  </button>
                                )}
                                
                                {violation.status !== 'contested' && (
                                  <button
                                    onClick={() => updateViolationStatus(violation.id, 'contested')}
                                    className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Marquer comme contestée
                                  </button>
                                )}
                                
                                {violation.status !== 'resolved' && (
                                  <button
                                    onClick={() => updateViolationStatus(violation.id, 'resolved')}
                                    className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Marquer comme résolue
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => deleteViolation(violation.id)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Statistiques */}
      {!isLoading && !error && filteredViolations.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-xs text-muted-foreground mb-1">Total des infractions</h3>
            <p className="text-2xl font-bold">{violations.length}</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-xs text-muted-foreground mb-1">Montant total</h3>
            <p className="text-2xl font-bold">{formatAmount(violations.reduce((sum, v) => sum + parseFloat(v.amount), 0))}</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-xs text-muted-foreground mb-1">Points perdus</h3>
            <p className="text-2xl font-bold">{violations.reduce((sum, v) => sum + (v.points_lost || 0), 0)}</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-xs text-muted-foreground mb-1">Infractions en attente</h3>
            <p className="text-2xl font-bold">{violations.filter(v => v.status === 'pending').length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficViolationsPage;