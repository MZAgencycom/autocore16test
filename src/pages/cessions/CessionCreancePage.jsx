import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  FileSignature, 
  User, 
  Car, 
  Building, 
  Calendar, 
  Save, 
  Loader, 
  AlertCircle, 
  Check,
  Info
} from 'lucide-react';
import ClientSearchInput from '../../components/communication/ClientSearchInput';

const CessionCreancePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Lancer automatiquement le téléchargement du PDF une fois la cession créée
  useEffect(() => {
    if (success) {
      downloadPdf();
    }
  }, [success]);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    clientName: '',
    clientAddress: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleRegistration: '',
    insurerName: '',
    insurerAddress: '',
    claimNumber: '',
    accidentDate: '',
    repairAmount: '',
    signatureDate: new Date().toISOString().split('T')[0]
  });
  
  // Gérer les changements dans le formulaire
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Gérer la sélection d'un client
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientName: `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`,
        clientAddress: client.address || ''
      }));
      
      // Si le client a des véhicules, sélectionner le premier par défaut
      if (client.vehicles && client.vehicles.length > 0) {
        const vehicle = client.vehicles[0];
        setSelectedVehicle(vehicle);
        setFormData(prev => ({
          ...prev,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleRegistration: vehicle.registration || ''
        }));
      }
    }
  };
  
  // Gérer la soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Validation basique
      if (!formData.clientName) {
        throw new Error("Le nom du client est requis");
      }
      if (!formData.insurerName) {
        throw new Error("Le nom de l'assureur est requis");
      }
      if (!formData.repairAmount) {
        throw new Error("Le montant des réparations est requis");
      }
      
      // Simuler un appel API pour créer la cession de créance
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Afficher le succès
      setSuccess(true);
      
      // Réinitialiser le formulaire après 3 secondes
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          clientName: '',
          clientAddress: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleRegistration: '',
          insurerName: '',
          insurerAddress: '',
          claimNumber: '',
          accidentDate: '',
          repairAmount: '',
          signatureDate: new Date().toISOString().split('T')[0]
        });
        setSelectedClient(null);
        setSelectedVehicle(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error creating cession de créance:', error);
      setError(error.message || "Une erreur est survenue lors de la création de la cession de créance");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Formater un montant en euros
  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(parseFloat(value));
  };

  // Générer et télécharger le PDF de la cession
  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Cession de créance', 10, 20);
    doc.setFontSize(12);
    doc.text(`Client : ${formData.clientName}`, 10, 30);
    doc.text(`Adresse : ${formData.clientAddress}`, 10, 37);
    doc.text(`Véhicule : ${formData.vehicleMake} ${formData.vehicleModel}`, 10, 44);
    doc.text(`Immatriculation : ${formData.vehicleRegistration}`, 10, 51);
    doc.text(`Assureur : ${formData.insurerName}`, 10, 58);
    if (formData.claimNumber) doc.text(`N° Sinistre : ${formData.claimNumber}`, 10, 65);
    if (formData.repairAmount) doc.text(`Montant : ${formatCurrency(formData.repairAmount)}`, 10, 72);
    doc.text(`Date de signature : ${formData.signatureDate}`, 10, 79);
    doc.save('cession-creance.pdf');
  };
  
  // Afficher le succès
  if (success) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-card rounded-lg border p-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-emerald-500/10 p-6 rounded-full inline-flex justify-center mb-6"
          >
            <Check className="h-12 w-12 text-emerald-500" />
          </motion.div>

          <h1 className="text-2xl font-bold mb-2">Cession de créance créée avec succès !</h1>
          <p className="text-muted-foreground mb-6">
            Félicitations, téléchargement en cours...
          </p>

          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
            <button className="btn-primary" onClick={downloadPdf}>
              Télécharger manuellement
            </button>
            <button className="btn-outline">
              Envoyer par email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/invoices" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux factures
          </Link>
          <h1 className="text-2xl font-bold">Créer une cession de créance</h1>
          <p className="text-muted-foreground">
            Générez une cession de créance pour facturer directement l'assurance
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Formulaire principal */}
        <div className="md:col-span-8 bg-card rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Erreur</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-lg font-medium">Informations du client</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Client</label>
                  <ClientSearchInput
                    onClientSelect={handleClientSelect}
                    initialValue={selectedClient}
                    placeholder="Rechercher un client..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Nom complet</label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => handleChange('clientName', e.target.value)}
                      className="w-full"
                      placeholder="Nom complet du client"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Adresse</label>
                    <textarea
                      value={formData.clientAddress}
                      onChange={(e) => handleChange('clientAddress', e.target.value)}
                      className="w-full h-20"
                      placeholder="Adresse complète du client"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Car className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-lg font-medium">Informations du véhicule</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Marque</label>
                  <input
                    type="text"
                    value={formData.vehicleMake}
                    onChange={(e) => handleChange('vehicleMake', e.target.value)}
                    className="w-full"
                    placeholder="Ex: Renault"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Modèle</label>
                  <input
                    type="text"
                    value={formData.vehicleModel}
                    onChange={(e) => handleChange('vehicleModel', e.target.value)}
                    className="w-full"
                    placeholder="Ex: Clio"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Immatriculation</label>
                  <input
                    type="text"
                    value={formData.vehicleRegistration}
                    onChange={(e) => handleChange('vehicleRegistration', e.target.value)}
                    className="w-full"
                    placeholder="Ex: AB-123-CD"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-lg font-medium">Informations de l'assurance</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Nom de l'assureur</label>
                  <input
                    type="text"
                    value={formData.insurerName}
                    onChange={(e) => handleChange('insurerName', e.target.value)}
                    className="w-full"
                    placeholder="Ex: AXA Assurances"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Adresse de l'assureur</label>
                  <textarea
                    value={formData.insurerAddress}
                    onChange={(e) => handleChange('insurerAddress', e.target.value)}
                    className="w-full h-20"
                    placeholder="Adresse complète de l'assureur"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">N° de sinistre</label>
                  <input
                    type="text"
                    value={formData.claimNumber}
                    onChange={(e) => handleChange('claimNumber', e.target.value)}
                    className="w-full"
                    placeholder="Ex: SIN-2023-12345"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Date du sinistre</label>
                  <input
                    type="date"
                    value={formData.accidentDate}
                    onChange={(e) => handleChange('accidentDate', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <FileSignature className="h-5 w-5 text-primary mr-2" />
                <h3 className="text-lg font-medium">Informations de la cession</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Montant des réparations</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.repairAmount}
                      onChange={(e) => handleChange('repairAmount', e.target.value)}
                      className="w-full pr-16"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                      EUR
                    </div>
                  </div>
                  {formData.repairAmount && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(formData.repairAmount)}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Date de signature</label>
                  <input
                    type="date"
                    value={formData.signatureDate}
                    onChange={(e) => handleChange('signatureDate', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <Link
                to="/dashboard/invoices"
                className="btn-outline py-2"
              >
                Annuler
              </Link>
              
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary py-2 min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Générer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Colonne d'informations */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Qu'est-ce qu'une cession de créance ?</h3>
            
            <div className="space-y-4 text-sm">
              <p>
                Une cession de créance est un document juridique qui permet à votre client de vous céder son droit à indemnisation par son assurance.
              </p>
              
              <p>
                Grâce à ce document, vous pourrez facturer directement l'assurance et recevoir le paiement sans que votre client n'ait à avancer les frais.
              </p>
              
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start">
                <Info className="h-5 w-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Important</p>
                  <p className="text-sm">
                    Ce document doit être signé par votre client pour être valide. Vous pouvez l'imprimer ou l'envoyer par email pour signature.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Avantages</h3>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <Check className="h-4 w-4 text-emerald-500 mr-2 mt-0.5" />
                <span>Évite à votre client d'avancer les frais de réparation</span>
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-emerald-500 mr-2 mt-0.5" />
                <span>Sécurise votre paiement directement auprès de l'assurance</span>
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-emerald-500 mr-2 mt-0.5" />
                <span>Simplifie la gestion administrative pour toutes les parties</span>
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-emerald-500 mr-2 mt-0.5" />
                <span>Document légal reconnu par toutes les compagnies d'assurance</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CessionCreancePage;
