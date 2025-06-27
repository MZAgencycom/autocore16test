import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search,
  Calendar,
  CheckCircle,
  Clock,
  Car,
  AlertCircle,
  CornerDownLeft,
  Eye,
  FileText,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { VehicleLoan } from '../../models/VehicleLoan';
import { LoanVehicle } from '../../models/LoanVehicle';
import downloadFile from '../../utils/downloadFile';
import { format, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';

const VehicleLoansPage = () => {
  const location = useLocation();
  const [loans, setLoans] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openActions, setOpenActions] = useState({});
  const [clientFilter, setClientFilter] = useState(null);
  
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

  // Check for client filter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientId = params.get('client');
    if (clientId) {
      setClientFilter(clientId);
    }
  }, [location]);

  // Charger les prêts et les véhicules disponibles
  const loadData = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Charger les prêts
        const loansData = await VehicleLoan.getAll();
        setLoans(loansData);
        
        // Charger les véhicules disponibles
        const vehiclesData = await LoanVehicle.getAvailableVehicles();
        setAvailableVehicles(vehiclesData);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrer les prêts en fonction de la recherche et du filtre de statut
  const filteredLoans = loans.filter(loan => {
    // Recherche dans le nom du client et l'immatriculation du véhicule
    const clientName = `${loan.clients?.first_name} ${loan.clients?.last_name}`.toLowerCase();
    const vehicleInfo = `${loan.loan_vehicles?.make} ${loan.loan_vehicles?.model} ${loan.loan_vehicles?.registration || ''}`.toLowerCase();
    const searchMatch = clientName.includes(searchTerm.toLowerCase()) || vehicleInfo.includes(searchTerm.toLowerCase());
    
    // Filtre par statut
    let statusMatch = true;
    if (statusFilter === 'active') {
      statusMatch = !loan.actual_end_date;
    } else if (statusFilter === 'completed') {
      statusMatch = !!loan.actual_end_date;
    }
    
    // Filtre par client
    const clientMatch = !clientFilter || loan.client_id === clientFilter;
    
    return searchMatch && statusMatch && clientMatch;
  });

  // Formatter une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  // Vérifier si un prêt est en retard
  const isLoanOverdue = (loan) => {
    if (loan.actual_end_date) return false; // Le prêt est terminé
    
    return isAfter(new Date(), parseISO(loan.expected_end_date));
  };

  // Gérer les actions sur un prêt
  const toggleActions = (id) => {
    setOpenActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary" />
            Prêts de véhicules
          </h1>
          <p className="text-muted-foreground">
            Gérez les prêts de véhicules aux clients
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link 
            to={availableVehicles.length > 0 ? "/dashboard/loans/create" : "/dashboard/loan-vehicles"}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            {availableVehicles.length > 0 ? "Créer un prêt" : "Ajouter un véhicule"}
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
              placeholder="Rechercher un prêt..."
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
              <option value="active">En cours</option>
              <option value="completed">Terminés</option>
            </select>
          </div>
        </div>
        
        {/* Client filter badge */}
        {clientFilter && (
          <div className="mt-3 flex items-center">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center">
              Filtré par client
              <button 
                onClick={() => setClientFilter(null)}
                className="ml-1 hover:text-primary/80"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Liste des prêts */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des prêts...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">Erreur</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadData}
              className="btn-primary py-2"
            >
              Réessayer
            </button>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucun prêt de véhicule</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' || clientFilter ? 
                "Aucun prêt ne correspond à vos critères de recherche." : 
                "Vous n'avez pas encore créé de prêt de véhicule."}
            </p>
            {!(searchTerm || statusFilter !== 'all' || clientFilter) && (
              <Link to="/dashboard/loans/create" className="btn-primary py-2 px-4">
                Créer un premier prêt
              </Link>
            )}
            {(searchTerm || statusFilter !== 'all' || clientFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setClientFilter(null);
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
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground">Véhicule</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Début</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Fin prévue</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Fin réelle</th>
                  <th className="text-center p-4 text-xs font-medium text-muted-foreground">Statut</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4">
                      <Link 
                        to={`/dashboard/clients/${loan.client_id}`} 
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {loan.clients?.first_name} {loan.clients?.last_name}
                      </Link>
                    </td>
                    
                    <td className="p-4 text-sm">
                      <Link 
                        to={`/dashboard/loan-vehicles/${loan.vehicle_id}`} 
                        className="hover:text-primary transition-colors"
                      >
                        {loan.loan_vehicles?.make} {loan.loan_vehicles?.model}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({loan.loan_vehicles?.registration || "Non immatriculé"})
                        </span>
                      </Link>
                    </td>
                    
                    <td className="p-4 text-center text-sm">
                      {formatDate(loan.start_date)}
                    </td>
                    
                    <td className="p-4 text-center text-sm">
                      <span className={isLoanOverdue(loan) && !loan.actual_end_date ? 'text-red-500 font-medium' : ''}>
                        {formatDate(loan.expected_end_date)}
                      </span>
                    </td>
                    
                    <td className="p-4 text-center text-sm">
                      {loan.actual_end_date ? formatDate(loan.actual_end_date) : '-'}
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        loan.actual_end_date 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : isLoanOverdue(loan)
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {loan.actual_end_date 
                          ? <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> 
                          : isLoanOverdue(loan)
                            ? <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                            : <Clock className="h-3.5 w-3.5 mr-1.5" />
                        }
                        {loan.actual_end_date 
                          ? 'Terminé' 
                          : isLoanOverdue(loan)
                            ? 'En retard'
                            : 'En cours'
                        }
                      </span>
                    </td>
                    
                    <td className="p-4 text-right">
                      <div className="flex justify-end space-x-2 relative">
                        <Link
                          to={`/dashboard/loans/${loan.id}`}
                          className="p-1 hover:bg-muted rounded transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        
                        {!loan.actual_end_date && (
                          <Link
                            to={`/dashboard/loans/${loan.id}/return`}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            <CornerDownLeft className="h-4 w-4" />
                          </Link>
                        )}
                        
                        <button
                          className="p-1 hover:bg-muted rounded-full transition-colors"
                          onClick={() => toggleActions(loan.id)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        
                        <AnimatePresence>
                          {openActions[loan.id] && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="absolute right-0 top-full mt-1 bg-card border rounded-md shadow-md z-10 w-48 py-1"
                            >
                              {loan.contract_url && (
                                <button
                                  onClick={async () => {
                                    await downloadFile(
                                      loan.contract_url,
                                      'contrat.pdf'
                                    );
                                  }}
                                  className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Voir le contrat
                                </button>
                              )}
                              
                              <Link
                                to={`/dashboard/loans/${loan.id}`}
                                className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Détails complets
                              </Link>
                              
                              {!loan.actual_end_date && (
                                <Link
                                  to={`/dashboard/loans/${loan.id}/return`}
                                  className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <CornerDownLeft className="h-4 w-4 mr-2" />
                                  Clôturer le prêt
                                </Link>
                              )}
                              
                              <a
                                href="#"
                                className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Télécharger le contrat
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Télécharger
                              </a>
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
        )}
      </div>
    </div>
  );
};

export default VehicleLoansPage;