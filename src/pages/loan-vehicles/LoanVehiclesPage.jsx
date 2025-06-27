import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock, 
  Settings, 
  AlertCircle, 
  Circle, 
  MoreHorizontal, 
  ChevronDown, 
  Wrench, 
  Trash2,
  Eye,
  CornerDownLeft,
  Loader
} from 'lucide-react';
import { LoanVehicle } from '../../models/LoanVehicle';
import { VehicleLoan } from '../../models/VehicleLoan';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';

const LoanVehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [currentLoans, setCurrentLoans] = useState([]);
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

  // Charger les véhicules et les prêts en cours
  const loadData = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Charger les véhicules
        const vehiclesData = await LoanVehicle.getAll();
        setVehicles(vehiclesData || []);
        
        // Charger les prêts en cours
        const loansData = await VehicleLoan.getCurrentLoans();
        setCurrentLoans(loansData || []);
        
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

  // Filtrer les véhicules en fonction de la recherche et du filtre de statut
  const filteredVehicles = vehicles.filter(vehicle => {
    const searchMatch = 
      `${vehicle.make} ${vehicle.model} ${vehicle.registration || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return searchMatch && statusMatch;
  });

  // Obtenir le label pour le statut d'un véhicule
  const getStatusLabel = (status) => {
    switch(status) {
      case 'available': return 'Disponible';
      case 'loaned': return 'En prêt';
      case 'maintenance': return 'En maintenance';
      case 'retired': return 'Retiré';
      default: return status;
    }
  };

  // Obtenir la couleur pour le statut d'un véhicule
  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-emerald-500/10 text-emerald-600';
      case 'loaned': return 'bg-blue-500/10 text-blue-600';
      case 'maintenance': return 'bg-amber-500/10 text-amber-600';
      case 'retired': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  // Obtenir le statut d'un véhicule
  const getStatusIcon = (status) => {
    switch(status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'loaned': return <Users className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'retired': return <Circle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  // Formatter une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  // Gérer les actions sur un véhicule
  const toggleActions = (id) => {
    setOpenActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Mettre à jour le statut d'un véhicule
  const updateVehicleStatus = async (id, newStatus) => {
    try {
      await LoanVehicle.updateStatus(id, newStatus);
      
      // Mettre à jour l'état local
      setVehicles(prev => 
        prev.map(vehicle => 
          vehicle.id === id 
            ? { ...vehicle, status: newStatus } 
            : vehicle
        )
      );
      
      // Fermer le menu d'actions
      setOpenActions(prev => ({
        ...prev,
        [id]: false
      }));
      
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      alert(error.message || "Une erreur est survenue lors de la mise à jour du statut");
    }
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Car className="h-6 w-6 mr-2 text-primary" />
            Véhicules de prêt
          </h1>
          <p className="text-muted-foreground">
            Gérez votre flotte de véhicules de prêt et suivez les prêts en cours
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/loan-vehicles/add" className="btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un véhicule
          </Link>
          <Link to="/dashboard/loans/create" className="btn-outline flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Créer un prêt
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
              placeholder="Rechercher un véhicule..."
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
              <option value="available">Disponible</option>
              <option value="loaned">En prêt</option>
              <option value="maintenance">En maintenance</option>
              <option value="retired">Retiré</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des véhicules */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Chargement des véhicules...</p>
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
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <Car className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucun véhicule de prêt</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' ? 
                "Aucun véhicule ne correspond à vos critères de recherche." : 
                "Vous n'avez pas encore ajouté de véhicule de prêt."}
            </p>
            {!(searchTerm || statusFilter !== 'all') && (
              <Link to="/dashboard/loan-vehicles/add" className="btn-primary py-2 px-4">
                Ajouter un premier véhicule
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
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Immatriculation</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Kilométrage</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Statut</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Client actuel</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Date retour</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredVehicles.map((vehicle) => {
                    // Trouver le prêt en cours pour ce véhicule s'il y en a un
                    const currentLoan = currentLoans.find(loan => loan.vehicle_id === vehicle.id);
                    
                    return (
                      <tr key={vehicle.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <Link to={`/dashboard/loan-vehicles/${vehicle.id}`} className="font-medium hover:text-primary transition-colors">
                            {vehicle.make} {vehicle.model}
                          </Link>
                          {vehicle.color && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({vehicle.color})
                            </span>
                          )}
                        </td>
                        
                        <td className="p-4 text-sm">
                          {vehicle.registration || "-"}
                        </td>
                        
                        <td className="p-4 text-center text-sm">
                          {vehicle.current_mileage ? `${vehicle.current_mileage} km` : "-"}
                        </td>
                        
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                            <span className={`flex items-center gap-1.5 ${getStatusColor(vehicle.status)}`}>
                              {getStatusIcon(vehicle.status)}
                              <span>{getStatusLabel(vehicle.status)}</span>
                            </span>
                          </div>
                        </td>
                        
                        <td className="p-4 text-center text-sm">
                          {currentLoan ? (
                            <Link
                              to={`/dashboard/clients/${currentLoan.client_id}`}
                              className="hover:text-primary transition-colors font-medium"
                            >
                              {currentLoan.clients.first_name} {currentLoan.clients.last_name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        
                        <td className="p-4 text-center text-sm">
                          {currentLoan ? (
                            <span>
                              {formatDate(currentLoan.expected_end_date)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        
                        <td className="p-4 text-right">
                          <div className="relative">
                            <button
                              className="p-1 hover:bg-muted rounded-full transition-colors"
                              onClick={() => toggleActions(vehicle.id)}
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                            
                            <AnimatePresence>
                              {openActions[vehicle.id] && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute right-0 top-full mt-1 bg-card border rounded-md shadow-md z-10 w-48 py-1"
                                >
                                  <Link
                                    to={`/dashboard/loan-vehicles/${vehicle.id}`}
                                    className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir les détails
                                  </Link>
                                  
                                  {vehicle.status === 'available' && (
                                    <Link
                                      to={`/dashboard/loans/create?vehicle=${vehicle.id}`}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                                    >
                                      <Users className="h-4 w-4 mr-2" />
                                      Créer un prêt
                                    </Link>
                                  )}
                                  
                                  {vehicle.status !== 'maintenance' && (
                                    <button
                                      onClick={() => updateVehicleStatus(vehicle.id, 'maintenance')}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                    >
                                      <Wrench className="h-4 w-4 mr-2" />
                                      Mettre en maintenance
                                    </button>
                                  )}
                                  
                                  {vehicle.status === 'maintenance' && (
                                    <button
                                      onClick={() => updateVehicleStatus(vehicle.id, 'available')}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Marquer comme disponible
                                    </button>
                                  )}
                                  
                                  {vehicle.status !== 'loaned' && (
                                    <button
                                      onClick={() => {
                                        if (confirm("Êtes-vous sûr de vouloir retirer ce véhicule ?")) {
                                          updateVehicleStatus(vehicle.id, 'retired');
                                        }
                                      }}
                                      className="flex items-center px-4 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors w-full text-left"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Retirer le véhicule
                                    </button>
                                  )}
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
          </>
        )}
      </div>

      {/* Section des prêts en cours */}
      {currentLoans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Prêts en cours</h2>
          
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Véhicule</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Date de début</th>
                    <th className="text-center p-4 text-xs font-medium text-muted-foreground">Retour prévu</th>
                    <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <Link to={`/dashboard/clients/${loan.client_id}`} className="font-medium hover:text-primary transition-colors">
                          {loan.clients.first_name} {loan.clients.last_name}
                        </Link>
                      </td>
                      
                      <td className="p-4 text-sm">
                        <Link to={`/dashboard/loan-vehicles/${loan.vehicle_id}`} className="hover:text-primary transition-colors">
                          {loan.loan_vehicles.make} {loan.loan_vehicles.model}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({loan.loan_vehicles.registration || "Non immatriculé"})
                          </span>
                        </Link>
                      </td>
                      
                      <td className="p-4 text-center text-sm">
                        {formatDate(loan.start_date)}
                      </td>
                      
                      <td className="p-4 text-center text-sm">
                        {formatDate(loan.expected_end_date)}
                      </td>
                      
                      <td className="p-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Link
                            to={`/dashboard/loans/${loan.id}`}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/dashboard/loans/${loan.id}/return`}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Terminer le prêt"
                          >
                            <CornerDownLeft className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanVehiclesPage;