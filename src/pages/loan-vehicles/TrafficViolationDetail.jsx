import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertCircle,
  Car,
  Calendar,
  CircleDollarSign,
  Clock,
  FileText,
  User,
  Phone,
  Mail,
  Check,
  X,
  Trash2,
  MoreHorizontal,
  Download,
  Eye,
  Loader
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrafficViolation } from '../../models/TrafficViolation';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';
import EmailSender from '../../components/communication/EmailSender';
import { toast } from 'react-hot-toast';

const TrafficViolationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [violation, setViolation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEmailSender, setShowEmailSender] = useState(false);
  const [emailData, setEmailData] = useState(null);
  
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

  // Charger les détails de l'infraction
  useEffect(() => {
    const loadViolationDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await TrafficViolation.getById(id);
        setViolation(data);

        if (data.vehicle_loans?.clients) {
          setEmailData({
            recipient: {
              name: `${data.vehicle_loans.clients.first_name} ${data.vehicle_loans.clients.last_name}`,
              email: data.vehicle_loans.clients.email || ''
            },
            vehicle: {
              make: data.loan_vehicles?.make || '',
              model: data.loan_vehicles?.model || '',
              registration: data.loan_vehicles?.registration || ''
            },
            attachments: data.violation_image_url
              ? [{ name: 'infraction.jpg', size: '150 KB', type: 'image/jpeg' }]
              : []
          });
        }
        
      } catch (error) {
        console.error('Error loading violation details:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des détails de l'infraction");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadViolationDetails();
  }, [id]);

  // Formatage de date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  // Formater un montant
  const formatAmount = (amount) => {
    if (!amount) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Mettre à jour le statut de l'infraction
  const updateStatus = async (newStatus) => {
    try {
      await TrafficViolation.updateStatus(id, newStatus);
      
      // Mettre à jour les données locales
      setViolation(prev => ({
        ...prev,
        status: newStatus
      }));
      
      // Fermer le menu d'actions
      setShowActionsMenu(false);
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating violation status:', error);
      toast.error(error.message || "Une erreur est survenue lors de la mise à jour du statut");
    }
  };

  // Supprimer l'infraction
  const deleteViolation = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette infraction ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      await TrafficViolation.delete(id);
      navigate('/dashboard/violations');
      toast.success('Infraction supprimée');
    } catch (error) {
      console.error('Error deleting violation:', error);
      toast.error(error.message || "Une erreur est survenue lors de la suppression de l'infraction");
    }
  };

  // Obtenir le label du statut
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

  // Obtenir la couleur du statut
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !violation) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error || "Infraction introuvable"}</p>
          </div>
          <Link to="/dashboard/violations" className="text-sm underline mt-2 inline-block">
            Retour à la liste des infractions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${violation.status === 'resolved' ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/violations" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux infractions
          </Link>
          <h1 className="text-2xl font-bold">Détail de l'infraction</h1>
          <p className="text-muted-foreground">
            Infraction du {formatDate(violation.violation_date)}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-3">
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="btn-outline py-2 px-4 flex items-center"
            >
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Actions
            </button>
            
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 bg-card rounded-md border shadow-md z-10 w-48 py-1 overflow-hidden">
                {violation.status !== 'paid' && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center"
                    onClick={() => updateStatus('paid')}
                  >
                    <Check className="h-4 w-4 mr-2 text-emerald-500" />
                    Marquer comme payée
                  </button>
                )}
                
                {violation.status !== 'forwarded' && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center"
                    onClick={() => {
                      updateStatus('forwarded');
                      setShowEmailSender(true);
                    }}
                  >
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    Transférée au client
                  </button>
                )}
                
                {violation.status !== 'contested' && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center"
                    onClick={() => updateStatus('contested')}
                  >
                    <FileText className="h-4 w-4 mr-2 text-violet-500" />
                    Marquer comme contestée
                  </button>
                )}
                
                {violation.status !== 'resolved' && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 flex items-center"
                    onClick={() => updateStatus('resolved')}
                  >
                    <Check className="h-4 w-4 mr-2 text-gray-500" />
                    Marquer comme résolue
                  </button>
                )}
                
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive flex items-center"
                  onClick={deleteViolation}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </button>
              </div>
            )}
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
      
      {/* Contenu principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Détails de l'infraction */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-medium mb-4">Informations de l'infraction</h2>
            
            {/* Statut actuel */}
            <div className="mb-6">
              <div className="p-4 bg-muted/10 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Statut actuel</p>
                  <div className={`text-sm px-3 py-1 rounded-full inline-flex items-center mt-1 ${getStatusColor(violation.status)}`}>
                    {getStatusLabel(violation.status)}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="text-xl font-bold">{formatAmount(violation.amount)}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations principales */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Dates</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date de l'infraction:</span>
                    <span className="text-sm font-medium">{formatDate(violation.violation_date)}</span>
                  </div>
                  
                  {violation.payment_deadline && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date limite de paiement:</span>
                      <span className="text-sm font-medium">{formatDate(violation.payment_deadline)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date d'enregistrement:</span>
                    <span className="text-sm font-medium">{formatDate(violation.created_at)}</span>
                  </div>
                </div>
              </div>
              
              {/* Détails de l'infraction */}
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Détails</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Montant:</span>
                    <span className="text-sm font-medium">{formatAmount(violation.amount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Points perdus:</span>
                    <span className={`text-sm font-medium ${violation.points_lost > 0 ? 'text-red-500' : ''}`}>
                      {violation.points_lost > 0 ? `-${violation.points_lost}` : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notes */}
            {violation.notes && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm bg-muted/10 p-3 rounded-md">{violation.notes}</p>
              </div>
            )}
            
            {/* Photo de l'infraction */}
            {violation.violation_image_url && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-2">Photo de l'infraction</h3>
                <div className="p-2 border rounded-md">
                  <img 
                    src={violation.violation_image_url} 
                    alt="Infraction" 
                    className="max-h-80 mx-auto rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Informations complémentaires */}
        <div className="space-y-6">
          {/* Véhicule */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-base font-medium mb-4">Véhicule concerné</h3>
            
            <div className="space-y-2">
              <Link 
                to={`/dashboard/loan-vehicles/${violation.vehicle_id}`}
                className="block p-3 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center">
                  <Car className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <p className="font-medium">{violation.loan_vehicles?.make} {violation.loan_vehicles?.model}</p>
                    <p className="text-xs text-muted-foreground">
                      Immatriculation: {violation.loan_vehicles?.registration || "Non renseignée"}
                    </p>
                  </div>
                </div>
              </Link>
              
              {/* Informations du prêt associé */}
              {violation.loan_id && violation.vehicle_loans && (
                <div className="mt-4 pt-4 border-t">
                  <Link 
                    to={`/dashboard/loans/${violation.loan_id}`}
                    className="block p-3 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-primary mr-3" />
                      <div>
                        <p className="font-medium">
                          {violation.vehicle_loans.clients?.first_name} {violation.vehicle_loans.clients?.last_name}
                        </p>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          {violation.vehicle_loans.clients?.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {violation.vehicle_loans.clients.email}
                            </span>
                          )}
                          {violation.vehicle_loans.clients?.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {violation.vehicle_loans.clients.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-base font-medium mb-4">Actions</h3>
            
            <div className="space-y-3">
              <button
                className="w-full btn-outline py-2 flex items-center justify-center"
                onClick={() => {
                  updateStatus('forwarded');
                  setShowEmailSender(true);
                }}
                disabled={violation.status === 'forwarded' || violation.status === 'resolved'}
              >
                <User className="h-4 w-4 mr-2" />
                Transférer au client
              </button>
              
              <button 
                className="w-full btn-outline py-2 flex items-center justify-center"
                onClick={() => updateStatus('paid')}
                disabled={violation.status === 'paid' || violation.status === 'resolved'}
              >
                <CircleDollarSign className="h-4 w-4 mr-2" />
                Marquer comme payée
              </button>
              
              <button 
                className="w-full btn-outline py-2 flex items-center justify-center"
                onClick={() => updateStatus('contested')}
                disabled={violation.status === 'contested' || violation.status === 'resolved'}
              >
                <FileText className="h-4 w-4 mr-2" />
                Marquer comme contestée
              </button>
              
              <button 
                className="w-full btn-outline py-2 flex items-center justify-center"
                onClick={() => updateStatus('resolved')}
                disabled={violation.status === 'resolved'}
              >
                <Check className="h-4 w-4 mr-2" />
                Marquer comme résolue
              </button>
              
              <button 
                className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors py-2 rounded-md flex items-center justify-center"
                onClick={deleteViolation}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

        {showEmailSender && emailData && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg shadow-xl border max-w-4xl w-full modal-content max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Transférer l'infraction au client</h2>
              <button onClick={() => setShowEmailSender(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <EmailSender
                recipient={emailData.recipient}
                vehicle={emailData.vehicle}
                generatedSubject={`Infraction du ${formatDate(violation.violation_date)}`}
                generatedContent={`Bonjour,\nVous avez reçu une infraction durant la période de location du véhicule.\nMerci de régler la somme de ${formatAmount(violation.amount)} dans les plus brefs délais.`}
                initialAttachments={emailData.attachments}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficViolationDetail;