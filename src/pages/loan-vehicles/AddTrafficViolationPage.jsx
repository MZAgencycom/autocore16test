import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Car,
  Calendar,
  CircleDollarSign,
  Upload,
  Save,
  AlertCircle,
  Check,
  Loader,
  X,
  Clock,
  FileText
} from 'lucide-react';
import { TrafficViolation } from '../../models/TrafficViolation';
import { LoanVehicle } from '../../models/LoanVehicle';
import { VehicleLoan } from '../../models/VehicleLoan';
import { Invoice } from '../../models/Invoice';
import { Client } from '../../models/Client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase, refreshSessionIfNeeded } from '../../lib/supabase';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';

const AddTrafficViolationPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [vehicles, setVehicles] = useState([]);
  const [currentLoans, setCurrentLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  
  // États du formulaire
  const [formData, setFormData] = useState({
    vehicleId: '',
    loanId: '',
    violationDate: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    pointsLost: 0,
    penaltyRate: 0,
    paymentDeadline: '',
    violationImageUrl: null,
    status: 'pending',
    notes: ''
  });
  
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

  // Charger les véhicules disponibles
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Charger les véhicules
        const vehiclesData = await LoanVehicle.getAll();
        setVehicles(vehiclesData || []);

      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Charger les prêts associés au véhicule sélectionné
  useEffect(() => {
    const loadLoans = async () => {
      if (!formData.vehicleId) {
        setCurrentLoans([]);
        return;
      }

      try {
        const loansData = await VehicleLoan.getByVehicle(formData.vehicleId);
        setCurrentLoans(loansData || []);
      } catch (error) {
        console.error('Error loading vehicle loans:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des prêts");
      }
    };

    loadLoans();
  }, [formData.vehicleId]);
  
  // Formater un montant
  const formatAmount = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Gérer les changements dans le formulaire
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Gérer le téléchargement d'image
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `traffic_violations/${fileName}`;
      
      // Télécharger le fichier vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports') // Réutiliser le bucket existant
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) throw error;
      
      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);
        
      // Mettre à jour le formulaire avec l'URL
      setFormData(prev => ({
        ...prev,
        violationImageUrl: publicUrl
      }));
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(`Erreur lors du téléchargement de l'image: ${error.message}`);
    }
  };
  
  // Supprimer l'image
  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      violationImageUrl: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Check if user can use this feature
      const result = await checkActionPermission('loan_vehicles');
      if (!result.canProceed) {
        setLimitInfo(result);
        setShowLimitModal(true);
        return;
      }
      
      setIsSaving(true);
      setError(null);
      const timeout = setTimeout(() => {
        setIsSaving(false);
        alert('Temps dépassé. Veuillez réessayer.');
      }, 15000);
      
      // Valider les données du formulaire
      if (!formData.vehicleId) {
        throw new Error("Veuillez sélectionner un véhicule");
      }
      if (!formData.violationDate) {
        throw new Error("Veuillez sélectionner une date d'infraction");
      }
      if (!formData.amount) {
        throw new Error("Veuillez saisir un montant");
      }
      
      // Création de l'infraction
      const violationData = {
        vehicleId: formData.vehicleId,
        loanId: formData.loanId || null,
        violationDate: new Date(formData.violationDate).toISOString(),
        amount: parseFloat(formData.amount),
        pointsLost: parseInt(formData.pointsLost) || 0,
        paymentDeadline: formData.paymentDeadline ? new Date(formData.paymentDeadline).toISOString() : null,
        violationImageUrl: formData.violationImageUrl,
        status: formData.status || 'pending',
        notes: formData.notes || null
      };
      
      const newViolation = await TrafficViolation.create(violationData);

      // Création automatique de la facture si un prêt est associé
      if (formData.loanId) {
        const loan = currentLoans.find(l => l.id === formData.loanId);
        if (loan) {
          // Fetch client data to get their vehicles
          const clientData = await Client.getById(loan.client_id);
          
          // Check if client has any vehicles
          if (!clientData.vehicles || clientData.vehicles.length === 0) {
            throw new Error("Le client associé à ce prêt n'a aucun véhicule enregistré. Une facture ne peut pas être créée automatiquement.");
          }
          
          // Use the first vehicle of the client for the invoice
          const clientVehicleId = clientData.vehicles[0].id;
          
          const nextNumber = await Invoice.getNextInvoiceNumber();
          const issueDate = new Date();
          const dueDate = new Date(issueDate);
          dueDate.setDate(dueDate.getDate() + 30);

          const baseAmount = parseFloat(formData.amount);
          const penaltyAmount = baseAmount * (parseFloat(formData.penaltyRate) || 0);
          const subtotal = baseAmount + penaltyAmount;
          const taxRate = 0.2;
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          const parts = [
            { description: `Infraction du ${format(new Date(formData.violationDate), 'dd/MM/yyyy')} - Refacturation`, quantity: 1, unitPrice: baseAmount }
          ];
          if (penaltyAmount > 0) {
            parts.push({ description: `Pénalité ${parseFloat(formData.penaltyRate) * 100}%`, quantity: 1, unitPrice: penaltyAmount });
          }

          await refreshSessionIfNeeded(supabase);

          await Invoice.create({
            clientId: loan.client_id,
            vehicleId: clientVehicleId, // Use client's vehicle ID instead of loan vehicle ID
            reportId: null,
            invoiceNumber: nextNumber,
            issueDate: issueDate.toISOString(),
            dueDate: dueDate.toISOString(),
            parts,
            laborHours: 0,
            laborRate: 0,
            laborDetails: [],
            subtotal,
            taxRate,
            taxAmount,
            total,
            status: 'pending',
            notes: `Facture pour infraction sur véhicule de prêt ${vehicles.find(v => v.id === formData.vehicleId)?.make} ${vehicles.find(v => v.id === formData.vehicleId)?.model} (${vehicles.find(v => v.id === formData.vehicleId)?.registration})`,
            template: 'white',
            templateColor: 'blue',
            paymentMethod: 'Virement bancaire',
            insurer: null
          });
        }
      }
      
      clearTimeout(timeout);

      // Afficher un message de succès
      setSuccess(true);
      
      // Rediriger vers la page de détail de l'infraction après 2 secondes
      setTimeout(() => {
        navigate(`/dashboard/violations/${newViolation.id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error creating traffic violation:', error);
      setError(error.message || "Une erreur est survenue lors de la création de l'infraction");
      clearTimeout(timeout);
      setIsSaving(false);
    }
  };

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Affichage en cas de succès
  if (success) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto bg-card rounded-lg border p-6 text-center">
          <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full inline-block mb-4">
            <Check className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Infraction enregistrée</h2>
          <p className="text-muted-foreground mb-4">
            L'infraction a été enregistrée avec succès.
          </p>
          <Link to="/dashboard/violations" className="btn-primary py-2 px-4">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center space-x-2 mb-6">
        <Link to="/dashboard/violations" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Ajouter une infraction</h1>
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
        {/* Formulaire */}
        <div className="md:col-span-2 bg-card rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Véhicule */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Véhicule *</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => handleChange('vehicleId', e.target.value)}
                    className="w-full"
                    required
                  >
                    <option value="">Sélectionnez un véhicule</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.registration || "Non immatriculé"})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Prêt associé */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Prêt associé</label>
                  <select
                    value={formData.loanId}
                    onChange={(e) => handleChange('loanId', e.target.value)}
                    className="w-full"
                  >
                    <option value="">Aucun prêt associé</option>
                    {currentLoans.map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        {loan.clients.first_name} {loan.clients.last_name} ({format(new Date(loan.start_date), 'dd/MM/yyyy', { locale: fr })})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date d'infraction */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Date de l'infraction *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData.violationDate}
                      onChange={(e) => handleChange('violationDate', e.target.value)}
                      className="w-full pl-10"
                      required
                    />
                  </div>
                </div>
                
                {/* Montant */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Montant *</label>
                  <div className="relative">
                    <CircleDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleChange('amount', e.target.value)}
                      className="w-full pl-10"
                      placeholder="90.00"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Points perdus */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Points perdus</label>
                  <select
                    value={formData.pointsLost}
                    onChange={(e) => handleChange('pointsLost', parseInt(e.target.value))}
                    className="w-full"
                  >
                    <option value="0">0 point</option>
                    <option value="1">1 point</option>
                    <option value="2">2 points</option>
                    <option value="3">3 points</option>
                    <option value="4">4 points</option>
                    <option value="6">6 points</option>
                  </select>
                </div>

                {/* Pénalité */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Pénalité</label>
                  <select
                    value={formData.penaltyRate}
                    onChange={(e) => handleChange('penaltyRate', parseFloat(e.target.value))}
                    className="w-full"
                  >
                    <option value="0">Aucune</option>
                    <option value="0.05">5 %</option>
                    <option value="0.1">10 %</option>
                    <option value="0.15">15 %</option>
                    <option value="0.2">20 %</option>
                  </select>
                </div>
                
                {/* Date limite de paiement */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Date limite de paiement</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData.paymentDeadline}
                      onChange={(e) => handleChange('paymentDeadline', e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
              </div>
              
              {/* Statut */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full"
                >
                  <option value="pending">En attente</option>
                  <option value="forwarded">Transférée</option>
                  <option value="paid">Payée</option>
                  <option value="contested">Contestée</option>
                  <option value="resolved">Résolue</option>
                </select>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full h-24"
                  placeholder="Informations supplémentaires sur l'infraction..."
                ></textarea>
              </div>
              
              {/* Image de l'infraction */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Photo de l'infraction</label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Infraction"
                        className="max-h-60 mx-auto rounded"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground mb-4">
                        Ajoutez une photo de l'infraction (optionnel)
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                      >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Parcourir...
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <Link
                to="/dashboard/violations"
                className="btn-outline py-2"
              >
                Annuler
              </Link>
              
              <button
                type="submit"
                disabled={isSaving || !formData.vehicleId || !formData.violationDate || !formData.amount}
                className="btn-primary py-2 min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Informations complémentaires */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-medium mb-4">Informations</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 text-amber-600 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Important</p>
                  <p className="text-sm">
                    Assurez-vous de bien vérifier les informations avant d'enregistrer l'infraction. 
                    Le conducteur au moment de l'infraction pourra être tenu responsable.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Procédure à suivre</h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="bg-muted w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                    <span>Enregistrez l'infraction avec tous les détails disponibles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-muted w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                    <span>Informez le client concerné de l'infraction</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-muted w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                    <span>Décidez ensemble de la prise en charge (client ou entreprise)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-muted w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                    <span>Mettez à jour le statut de l'infraction au fur et à mesure</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTrafficViolationPage;