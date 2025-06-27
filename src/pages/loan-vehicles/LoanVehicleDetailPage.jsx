import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  ArrowLeft, 
  Calendar, 
  PenTool as Tool, 
  Users, 
  PlusCircle, 
  Clock, 
  ChevronDown, 
  ShieldCheck, 
  FileText, 
  AlertCircle, 
  Camera, 
  Check, 
  Trash2, 
  Loader, 
  Settings, 
  MoreHorizontal, 
  Pencil, 
  MoveHorizontal as MoveHorizonal, 
  Play, 
  CircleDollarSign, 
  Eye 
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LoanVehicle } from '../../models/LoanVehicle';
import downloadFile from '../../utils/downloadFile';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';

const LoanVehicleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [openedSections, setOpenedSections] = useState({
    images: true,
    documents: true,
    damages: true
  });
  
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

  // Charger les informations du véhicule
  useEffect(() => {
    const loadVehicle = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await LoanVehicle.getById(id);
        setVehicle(data);
        
      } catch (error) {
        console.error('Error loading vehicle:', error);
        setError(error.message || "Une erreur est survenue lors du chargement du véhicule");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVehicle();
  }, [id]);

  // Formatter une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

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

  // Gérer le changement de statut
  const handleStatusChange = async (status) => {
    try {
      await LoanVehicle.updateStatus(id, status);
      
      // Mettre à jour l'état local
      setVehicle(prev => ({
        ...prev,
        status
      }));
      
      // Fermer le menu
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.message || "Une erreur est survenue lors de la mise à jour du statut");
    }
  };

  // Supprimer le véhicule
  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      await LoanVehicle.delete(id);
      navigate('/dashboard/loan-vehicles');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert(error.message || "Une erreur est survenue lors de la suppression du véhicule");
    }
  };

  // Basculer l'affichage d'une section
  const toggleSection = (section) => {
    setOpenedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error || "Véhicule introuvable"}</p>
          </div>
          <Link to="/dashboard/loan-vehicles" className="text-sm underline mt-2 inline-block">
            Retour à la liste des véhicules
          </Link>
        </div>
      </div>
    );
  }

  // Trouver le prêt en cours
  const currentLoan = vehicle.loans?.find(loan => !loan.actual_end_date);

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/loan-vehicles" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux véhicules
          </Link>
          <h1 className="text-2xl font-bold">
            {vehicle.make} {vehicle.model}
            {vehicle.registration && (
              <span className="ml-2 text-lg font-normal text-muted-foreground">
                {vehicle.registration}
              </span>
            )}
          </h1>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex space-x-3">
          {vehicle.status === 'available' && (
            <Link 
              to={`/dashboard/loans/create?vehicle=${vehicle.id}`}
              className="btn-primary flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Créer un prêt
            </Link>
          )}
          
          <div className="relative">
            <button
              className="btn-outline flex items-center"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Statut: {getStatusLabel(vehicle.status)}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            <AnimatePresence>
              {showStatusMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 bg-card border rounded-md shadow-lg z-10 w-48 overflow-hidden"
                >
                  <div className="py-1">
                    {vehicle.status !== 'available' && (
                      <button
                        onClick={() => handleStatusChange('available')}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-muted/50 text-left"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                        Disponible
                      </button>
                    )}
                    {vehicle.status !== 'maintenance' && (
                      <button
                        onClick={() => handleStatusChange('maintenance')}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-muted/50 text-left"
                      >
                        <Tool className="h-4 w-4 mr-2 text-amber-500" />
                        En maintenance
                      </button>
                    )}
                    {vehicle.status !== 'retired' && (
                      <button
                        onClick={() => handleStatusChange('retired')}
                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-muted/50 text-left"
                      >
                        <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                        Retiré
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
      
      {/* Statut actuel et prêt en cours */}
      {currentLoan && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Ce véhicule est actuellement prêté à:</p>
                <Link
                  to={`/dashboard/clients/${currentLoan.clients.id}`}
                  className="font-medium text-lg text-primary hover:underline"
                >
                  {currentLoan.clients.first_name} {currentLoan.clients.last_name}
                </Link>
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <span>
                    Du {formatDate(currentLoan.start_date)} au {formatDate(currentLoan.expected_end_date)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link
                to={`/dashboard/loans/${currentLoan.id}`}
                className="btn-outline py-1.5 text-sm"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Voir le prêt
              </Link>
              <Link
                to={`/dashboard/loans/${currentLoan.id}/return`}
                className="btn-primary py-1.5 text-sm"
              >
                <MoveHorizonal className="h-3.5 w-3.5 mr-1.5" />
                Clôturer le prêt
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Contenu principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne de gauche */}
        <div className="md:col-span-2 space-y-6">
          {/* Informations principales */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-medium">Informations du véhicule</h2>
              <Link to={`/dashboard/loan-vehicles/${id}/edit`} className="text-xs text-primary hover:underline flex items-center">
                <Pencil className="h-3 w-3 mr-1" />
                Modifier
              </Link>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Informations de base */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1">Identification</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Marque:</dt>
                      <dd className="font-medium">{vehicle.make}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Modèle:</dt>
                      <dd className="font-medium">{vehicle.model}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Immatriculation:</dt>
                      <dd className="font-medium">{vehicle.registration || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Couleur:</dt>
                      <dd className="font-medium">{vehicle.color || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Numéro de châssis:</dt>
                      <dd className="font-medium">{vehicle.chassis_number || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Numéro de moteur:</dt>
                      <dd className="font-medium">{vehicle.engine_number || '-'}</dd>
                    </div>
                  </dl>
                </div>
                
                {/* État du véhicule */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-1">État actuel</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Statut:</dt>
                      <dd>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(vehicle.status)}`}>
                          {getStatusLabel(vehicle.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Kilométrage initial:</dt>
                      <dd className="font-medium">{vehicle.initial_mileage} km</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Kilométrage actuel:</dt>
                      <dd className="font-medium">{vehicle.current_mileage} km</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Niveau carburant:</dt>
                      <dd className="font-medium">{vehicle.fuel_level}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Date d'ajout:</dt>
                      <dd className="font-medium">{formatDate(vehicle.created_at)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* Notes */}
              {vehicle.notes && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium mb-2">Notes</h3>
                  <div className="p-3 bg-muted/10 rounded-lg text-sm">
                    {vehicle.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Images du véhicule */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div 
              className="p-4 border-b flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('images')}
            >
              <h2 className="font-medium flex items-center">
                <Camera className="h-4 w-4 mr-2 text-primary" />
                Photos du véhicule
              </h2>
              <ChevronDown 
                className={`h-5 w-5 transition-transform ${openedSections.images ? 'rotate-180' : ''}`} 
              />
            </div>
            
            {openedSections.images && (
              <div className="p-6">
                {!vehicle.front_image_url && 
                 !vehicle.rear_image_url && 
                 !vehicle.left_side_image_url && 
                 !vehicle.right_side_image_url ? (
                  <div className="text-center py-6">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">Aucune photo n'a été ajoutée pour ce véhicule</p>
                    <Link to={`/dashboard/loan-vehicles/${id}/edit`} className="text-primary hover:underline text-sm mt-2 inline-block">
                      Ajouter des photos
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.front_image_url && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="p-2 bg-muted/30 border-b text-sm font-medium">Face avant</div>
                        <img
                          src={vehicle.front_image_url}
                          alt="Face avant"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                    
                    {vehicle.rear_image_url && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="p-2 bg-muted/30 border-b text-sm font-medium">Face arrière</div>
                        <img
                          src={vehicle.rear_image_url}
                          alt="Face arrière"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                    
                    {vehicle.left_side_image_url && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="p-2 bg-muted/30 border-b text-sm font-medium">Côté gauche</div>
                        <img
                          src={vehicle.left_side_image_url}
                          alt="Côté gauche"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                    
                    {vehicle.right_side_image_url && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="p-2 bg-muted/30 border-b text-sm font-medium">Côté droit</div>
                        <img
                          src={vehicle.right_side_image_url}
                          alt="Côté droit"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Documents */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div 
              className="p-4 border-b flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('documents')}
            >
              <h2 className="font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                Documents
              </h2>
              <ChevronDown 
                className={`h-5 w-5 transition-transform ${openedSections.documents ? 'rotate-180' : ''}`} 
              />
            </div>
            
            {openedSections.documents && (
              <div className="p-6">
                {!vehicle.registration_doc_url && !vehicle.insurance_doc_url ? (
                  <div className="text-center py-6">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">Aucun document n'a été ajouté pour ce véhicule</p>
                    <Link to={`/dashboard/loan-vehicles/${id}/edit`} className="text-primary hover:underline text-sm mt-2 inline-block">
                      Ajouter des documents
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.registration_doc_url && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center mb-4">
                          <FileText className="h-6 w-6 text-primary mr-3" />
                          <div>
                            <h3 className="font-medium">Carte grise</h3>
                            <p className="text-xs text-muted-foreground">Document d'immatriculation</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await downloadFile(
                              vehicle.registration_doc_url,
                              'carte-grise.pdf'
                            );
                          }}
                          className="btn-outline py-1.5 text-xs w-full flex items-center justify-center"
                        >
                          <Eye className="h-3 w-3 mr-1.5" />
                          Voir le document
                        </button>
                      </div>
                    )}
                    
                    {vehicle.insurance_doc_url && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center mb-4">
                          <ShieldCheck className="h-6 w-6 text-primary mr-3" />
                          <div>
                            <h3 className="font-medium">Carte verte d'assurance</h3>
                            <p className="text-xs text-muted-foreground">Attestation d'assurance</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await downloadFile(
                              vehicle.insurance_doc_url,
                              'assurance.pdf'
                            );
                          }}
                          className="btn-outline py-1.5 text-xs w-full flex items-center justify-center"
                        >
                          <Eye className="h-3 w-3 mr-1.5" />
                          Voir le document
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Dommages existants */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div 
              className="p-4 border-b flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('damages')}
            >
              <h2 className="font-medium flex items-center">
                <Tool className="h-4 w-4 mr-2 text-primary" />
                Dommages existants
              </h2>
              <div className="flex items-center">
                <Link 
                  to={`/dashboard/loan-vehicles/${id}/damages/add`}
                  className="text-xs text-primary hover:underline mr-4 flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Ajouter
                </Link>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${openedSections.damages ? 'rotate-180' : ''}`} 
                />
              </div>
            </div>
            
            {openedSections.damages && (
              <div className="p-6">
                {vehicle.vehicle_damages && vehicle.vehicle_damages.length > 0 ? (
                  <div className="space-y-3">
                    {vehicle.vehicle_damages.map((damage) => (
                      <div key={damage.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`p-1.5 rounded-full ${
                              damage.damage_type === 'Rayure' ? 'bg-blue-500/20 text-blue-600' :
                              damage.damage_type === 'Choc' ? 'bg-amber-500/20 text-amber-600' :
                              'bg-red-500/20 text-red-600'
                            }`}>
                              <Tool className="h-4 w-4" />
                            </div>
                            <div className="ml-3">
                              <h3 className="font-medium">{damage.body_part}</h3>
                              <p className="text-xs text-muted-foreground">
                                Type: {damage.damage_type} • Sévérité: {damage.severity === 'minor' ? 'Mineur' : 
                                damage.severity === 'moderate' ? 'Modéré' : 'Important'}
                              </p>
                            </div>
                          </div>
                          
                          <button className="p-1 hover:bg-muted/50 rounded-full">
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                          </button>
                        </div>
                        
                        {damage.description && (
                          <div className="mt-3 text-sm">
                            <p>{damage.description}</p>
                          </div>
                        )}
                        
                        {damage.image_url && (
                          <div className="mt-3">
                            <img
                              src={damage.image_url}
                              alt={`Dommage sur ${damage.body_part}`}
                              className="max-h-32 rounded-md"
                            />
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          Ajouté le {formatDate(damage.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Tool className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">Aucun dommage enregistré pour ce véhicule</p>
                    <Link 
                      to={`/dashboard/loan-vehicles/${id}/damages/add`}
                      className="text-primary hover:underline text-sm mt-2 inline-block"
                    >
                      Ajouter un dommage
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Colonne de droite */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">Actions rapides</h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-2">
                {vehicle.status === 'available' && (
                  <Link
                    to={`/dashboard/loans/create?vehicle=${vehicle.id}`}
                    className="btn-primary py-2 w-full flex items-center justify-center"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Créer un prêt
                  </Link>
                )}
                
                <Link
                  to={`/dashboard/loan-vehicles/${id}/edit`}
                  className="btn-outline py-2 w-full flex items-center justify-center"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier le véhicule
                </Link>
                
                <Link
                  to={`/dashboard/loan-vehicles/${id}/damages/add`}
                  className="btn-outline py-2 w-full flex items-center justify-center"
                >
                  <Tool className="h-4 w-4 mr-2" />
                  Ajouter un dommage
                </Link>
                
                {vehicle.status !== 'loaned' && (
                  <button
                    onClick={handleDelete}
                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive py-2 w-full flex items-center justify-center rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer le véhicule
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Historique des prêts */}
          {vehicle.loans && vehicle.loans.length > 0 && (
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-medium">Historique des prêts</h2>
              </div>
              
              <div className="divide-y">
                {vehicle.loans.map((loan) => (
                  <div key={loan.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/dashboard/clients/${loan.client_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {loan.clients.first_name} {loan.clients.last_name}
                        </Link>
                        
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            Du {formatDate(loan.start_date)} au {formatDate(loan.actual_end_date || loan.expected_end_date)}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`px-2 py-1 rounded-full text-xs flex items-center ${
                        loan.actual_end_date 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {loan.actual_end_date ? 'Terminé' : 'En cours'}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <Link
                        to={`/dashboard/loans/${loan.id}`}
                        className="text-xs px-2 py-1 rounded border hover:bg-muted/30 transition-colors"
                      >
                        <Eye className="h-3 w-3 mr-1 inline-block" />
                        Voir
                      </Link>
                      
                      {!loan.actual_end_date && (
                        <Link
                          to={`/dashboard/loans/${loan.id}/return`}
                          className="text-xs px-2 py-1 rounded border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <MoveHorizonal className="h-3 w-3 mr-1 inline-block" />
                          Clôturer
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t">
                <Link
                  to="/dashboard/loans"
                  className="text-xs text-primary hover:underline"
                >
                  Voir tous les prêts
                </Link>
              </div>
            </div>
          )}
          
          {/* Informations supplémentaires */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="font-medium mb-4">Informations supplémentaires</h2>
            
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ajouté le:</dt>
                <dd className="font-medium">{formatDate(vehicle.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dernière modification:</dt>
                <dd className="font-medium">{formatDate(vehicle.updated_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nombre de prêts:</dt>
                <dd className="font-medium">{vehicle.loans?.length || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nombre de dommages:</dt>
                <dd className="font-medium">{vehicle.vehicle_damages?.length || 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanVehicleDetailPage;