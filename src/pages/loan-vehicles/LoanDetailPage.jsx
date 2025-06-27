import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  Key,
  Shield,
  Droplets,
  Gauge,
  Loader,
  CornerDownLeft,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { VehicleLoan } from '../../models/VehicleLoan';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';
import downloadFile from '../../utils/downloadFile';

const LoanDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  
  // Charger les détails du prêt
  useEffect(() => {
    const loadLoan = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await VehicleLoan.getById(id);
        setLoan(data);
        
      } catch (error) {
        console.error('Error loading loan details:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des détails du prêt");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLoan();
  }, [id]);
  
  // Formater une date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };
  
  // Obtenir le statut du prêt
  const getLoanStatus = () => {
    if (loan?.actual_end_date) {
      return {
        label: 'Terminé',
        color: 'bg-emerald-500/10 text-emerald-600',
        icon: CheckCircle
      };
    } else {
      const expectedEnd = new Date(loan?.expected_end_date);
      const isOverdue = expectedEnd < new Date();
      
      if (isOverdue) {
        return {
          label: 'En retard',
          color: 'bg-red-500/10 text-red-600',
          icon: AlertCircle
        };
      } else {
        return {
          label: 'En cours',
          color: 'bg-blue-500/10 text-blue-600',
          icon: Clock
        };
      }
    }
  };
  
  // Télécharger le contrat
  const downloadContract = async () => {
    try {
      if (loan?.contract_url) {
        await downloadFile(loan.contract_url, 'contrat.pdf');
      }
    } catch (err) {
      console.error('Failed to download contract:', err);
    }
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
  
  if (error || !loan) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error || "Prêt introuvable"}</p>
          </div>
          <Link to="/dashboard/loans" className="text-sm underline mt-2 inline-block">
            Retour à la liste des prêts
          </Link>
        </div>
      </div>
    );
  }
  
  const status = getLoanStatus();
  const StatusIcon = status.icon;
  
  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/loans" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux prêts
          </Link>
          <h1 className="text-2xl font-bold">
            Prêt de véhicule
            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
              <span className={`flex items-center gap-1.5 ${status.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span>{status.label}</span>
              </span>
            </span>
          </h1>
          <p className="text-muted-foreground">
            Du {formatDate(loan.start_date)} au {formatDate(loan.actual_end_date || loan.expected_end_date)}
          </p>
        </div>
        
        <div className="flex space-x-3">
          {loan.contract_url && (
            <button 
              onClick={downloadContract}
              className="btn-outline flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger contrat
            </button>
          )}
          
          {!loan.actual_end_date && (
            <Link
              to={`/dashboard/loans/${id}/return`}
              className="btn-primary flex items-center"
            >
              <CornerDownLeft className="h-4 w-4 mr-2" />
              Clôturer le prêt
            </Link>
          )}
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Informations générales */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">Informations du prêt</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                {/* Période */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium border-b pb-1 mb-2">Période</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date de début:</span>
                      <span className="text-sm font-medium">{formatDate(loan.start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date de fin prévue:</span>
                      <span className="text-sm font-medium">{formatDate(loan.expected_end_date)}</span>
                    </div>
                    {loan.actual_end_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Date de fin réelle:</span>
                        <span className="text-sm font-medium">{formatDate(loan.actual_end_date)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Durée:</span>
                      <span className="text-sm font-medium">
                        {Math.abs(
                          Math.floor(
                            (new Date(loan.actual_end_date || new Date()) - new Date(loan.start_date)) / 
                            (1000 * 60 * 60 * 24)
                          )
                        )} jours
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* État */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium border-b pb-1 mb-2">État du véhicule</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Kilométrage départ:</span>
                      <span className="text-sm font-medium">{loan.start_mileage} km</span>
                    </div>
                    {loan.end_mileage && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Kilométrage retour:</span>
                        <span className="text-sm font-medium">{loan.end_mileage} km</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Niveau carburant départ:</span>
                      <span className="text-sm font-medium">{loan.start_fuel_level}%</span>
                    </div>
                    {loan.end_fuel_level !== null && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Niveau carburant retour:</span>
                        <span className="text-sm font-medium">{loan.end_fuel_level}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              {loan.notes && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Notes</h3>
                  <p className="text-sm bg-muted/10 p-3 rounded-md">{loan.notes}</p>
                </div>
              )}
              
              {/* Documents */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-4">Documents</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {loan.contract_url && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <FileText className="h-6 w-6 text-primary mr-3" />
                        <h4 className="font-medium">Contrat de prêt</h4>
                      </div>
                      <button
                        onClick={downloadContract}
                        className="btn-outline py-1.5 text-xs w-full flex items-center justify-center"
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        Télécharger
                      </button>
                    </div>
                  )}
                  
                  {loan.driver_license_front_url && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Key className="h-6 w-6 text-primary mr-3" />
                        <h4 className="font-medium">Permis de conduire (recto)</h4>
                      </div>
                      <button
                        onClick={async () => {
                          await downloadFile(
                            loan.driver_license_front_url,
                            'permis-recto.pdf'
                          );
                        }}
                        className="btn-outline py-1.5 text-xs w-full flex items-center justify-center"
                      >
                        <Eye className="h-3 w-3 mr-1.5" />
                        Voir le document
                      </button>
                  </div>
                )}
                  
                  {loan.driver_license_back_url && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Key className="h-6 w-6 text-primary mr-3" />
                        <h4 className="font-medium">Permis de conduire (verso)</h4>
                      </div>
                      <button
                        onClick={async () => {
                          await downloadFile(
                            loan.driver_license_back_url,
                            'permis-verso.pdf'
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
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Informations client */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">Client</h2>
            </div>
            
            <div className="p-4">
              <Link
                to={`/dashboard/clients/${loan.client_id}`}
                className="flex items-center space-x-3 p-2 hover:bg-muted/30 rounded-md transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{loan.clients.first_name} {loan.clients.last_name}</h3>
                  {loan.clients.email && (
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {loan.clients.email}
                    </p>
                  )}
                  {loan.clients.phone && (
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Phone className="h-3 w-3 mr-1" />
                      {loan.clients.phone}
                    </p>
                  )}
                </div>
              </Link>
              
              {loan.clients.address && (
                <div className="mt-2 p-2 text-sm">
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{loan.clients.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Informations véhicule */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">Véhicule</h2>
            </div>
            
            <div className="p-4">
              <Link
                to={`/dashboard/loan-vehicles/${loan.vehicle_id}`}
                className="flex items-center space-x-3 p-2 hover:bg-muted/30 rounded-md transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{loan.loan_vehicles.make} {loan.loan_vehicles.model}</h3>
                  {loan.loan_vehicles.registration && (
                    <p className="text-xs text-muted-foreground">
                      Immatriculation: {loan.loan_vehicles.registration}
                    </p>
                  )}
                  {loan.loan_vehicles.color && (
                    <p className="text-xs text-muted-foreground">
                      Couleur: {loan.loan_vehicles.color}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          </div>
          
          {/* Informations conducteur et assurance */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">Conducteur</h2>
            </div>
            
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">{loan.driver_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Permis n° {loan.driver_license_number}
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted/10 p-3 rounded-md space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Délivré le:</span>
                    <span>{format(new Date(loan.driver_license_issue_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Né(e) le:</span>
                    <span>{format(new Date(loan.driver_birthdate), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lieu de naissance:</span>
                    <span>{loan.driver_birthplace}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-3 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Assurance</h4>
                  </div>
                  
                  <div className="bg-muted/10 p-3 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Compagnie:</span>
                      <span>{loan.insurance_company}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">N° de police:</span>
                      <span>{loan.insurance_policy_number}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* État du véhicule */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-medium">État du véhicule</h2>
            </div>
            
            <div className="divide-y">
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Gauge className="h-5 w-5 text-muted-foreground mr-2" />
                  <span className="text-sm">Kilométrage au départ</span>
                </div>
                <span className="font-medium">{loan.start_mileage} km</span>
              </div>
              
              {loan.end_mileage && (
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <Gauge className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-sm">Kilométrage au retour</span>
                  </div>
                  <span className="font-medium">{loan.end_mileage} km</span>
                </div>
              )}
              
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Droplets className="h-5 w-5 text-muted-foreground mr-2" />
                  <span className="text-sm">Niveau carburant au départ</span>
                </div>
                <span className="font-medium">{loan.start_fuel_level}%</span>
              </div>
              
              {loan.end_fuel_level !== null && (
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <Droplets className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-sm">Niveau carburant au retour</span>
                  </div>
                  <span className="font-medium">{loan.end_fuel_level}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetailPage;