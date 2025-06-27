import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Car,
  User,
  Calendar,
  Gauge,
  Droplets,
  Camera,
  CheckCircle,
  Loader,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { VehicleLoan } from '../../models/VehicleLoan';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';

const EndLoanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loan, setLoan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [returnData, setReturnData] = useState({
    endMileage: 0,
    endFuelLevel: 50,
    notes: '',
    endImages: []
  });
  
  // Charger les détails du prêt
  useEffect(() => {
    const loadLoan = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await VehicleLoan.getById(id);
        
        if (!data) {
          throw new Error("Prêt introuvable");
        }
        
        if (data.actual_end_date) {
          throw new Error("Ce prêt est déjà clôturé");
        }
        
        setLoan(data);
        
        // Initialiser les données de retour
        setReturnData(prev => ({
          ...prev,
          endMileage: data.start_mileage || 0,
          endFuelLevel: data.start_fuel_level || 50
        }));
        
      } catch (error) {
        console.error('Error loading loan details:', error);
        setError(error.message || "Une erreur est survenue lors du chargement des détails du prêt");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLoan();
  }, [id]);
  
  // Gérer les changements dans le formulaire
  const handleChange = (field, value) => {
    setReturnData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Ajouter une image
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `loan_vehicles/returns/${fileName}`;
      
      // Télécharger le fichier vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) throw error;
      
      // Obtenir l'URL public
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);
        
      // Ajouter l'URL à la liste des images
      setReturnData(prev => ({
        ...prev,
        endImages: [...prev.endImages, { url: publicUrl, name: file.name }]
      }));
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(`Erreur lors du téléchargement de l'image: ${error.message}`);
    }
  };
  
  // Supprimer une image
  const removeImage = (index) => {
    setReturnData(prev => ({
      ...prev,
      endImages: prev.endImages.filter((_, i) => i !== index)
    }));
  };
  
  // Générer le document de fin de prêt
  const generateReturnDocument = async () => {
    // Créer un nouveau document PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Formater les dates
    const formattedStartDate = format(new Date(loan.start_date), 'dd/MM/yyyy', { locale: fr });
    const formattedEndDate = format(new Date(), 'dd/MM/yyyy', { locale: fr });
    
    // Ajouter un logo (simulé avec un rectangle pour l'exemple)
    doc.setFillColor(0, 123, 255);
    doc.rect(20, 15, 40, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AutoCoreAI', 25, 25);
    
    // Ajouter un titre
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRAT DE PRÊT DE VÉHICULE', 105, 20, { align: 'center' });
    
    // Informations du prêteur
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRÊTEUR :', 20, 35);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Carosserie du 13008', 20, 42);
    doc.text('180 avenue du prado', 20, 48);
    doc.text('13008 Marseille', 20, 54);
    doc.text('SIRET : 90117756800010', 20, 60);
    doc.text('TVA : FR29901177568', 20, 66);
    
    // Ligne de séparation
    doc.setDrawColor(120, 120, 120);
    doc.line(20, 72, 190, 72);
    
    // Informations de l'emprunteur
    doc.setFont('helvetica', 'bold');
    doc.text('EMPRUNTEUR :', 20, 82);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom du conducteur : ${loan.driver_name}`, 20, 89);
    doc.text(`Permis de conduire n° : ${loan.driver_license_number}`, 20, 96);
    doc.text(`Date de délivrance : ${format(new Date(loan.driver_license_issue_date), 'dd/MM/yyyy', { locale: fr })}`, 20, 103);
    doc.text(`Date de naissance : ${format(new Date(loan.driver_birthdate), 'dd/MM/yyyy', { locale: fr })}`, 20, 110);
    doc.text(`Lieu de naissance : ${loan.driver_birthplace}`, 20, 117);
    
    // Ligne de séparation
    doc.line(20, 123, 190, 123);
    
    // Informations du véhicule
    doc.setFont('helvetica', 'bold');
    doc.text('VÉHICULE PRÊTÉ :', 20, 133);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Marque et modèle : ${loan.loan_vehicles.make} ${loan.loan_vehicles.model}`, 20, 140);
    doc.text(`Immatriculation : ${loan.loan_vehicles.registration || 'Non renseignée'}`, 20, 147);
    doc.text(`N° de châssis : ${loan.loan_vehicles.chassis_number || 'Non renseigné'}`, 20, 154);
    doc.text(`Kilométrage de départ : ${loan.start_mileage} km`, 20, 161);
    doc.text(`Kilométrage de retour : ${returnData.endMileage} km`, 20, 168);
    doc.text(`Niveau de carburant de départ : ${loan.start_fuel_level}%`, 20, 175);
    doc.text(`Niveau de carburant de retour : ${returnData.endFuelLevel}%`, 20, 182);
    
    // Ligne de séparation
    doc.line(20, 188, 190, 188);
    
    // Conditions du prêt
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS DU PRÊT :', 20, 198);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Date de début : ${formattedStartDate}`, 20, 205);
    doc.text(`Date de fin prévue : ${format(new Date(loan.expected_end_date), 'dd/MM/yyyy', { locale: fr })}`, 20, 212);
    doc.text(`Date de fin réelle : ${formattedEndDate}`, 20, 219);
    doc.text(`Durée : ${Math.abs(Math.floor((new Date() - new Date(loan.start_date)) / (1000 * 60 * 60 * 24)))} jours`, 20, 226);
    doc.text(`Assurance : ${loan.insurance_company}`, 20, 233);
    doc.text(`N° de police : ${loan.insurance_policy_number}`, 20, 240);
    
    // Notes
    if (returnData.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVATIONS :', 20, 250);
      
      doc.setFont('helvetica', 'normal');
      const notes = doc.splitTextToSize(returnData.notes, 150);
      doc.text(notes, 20, 257);
    }
    
    // Ajouter une nouvelle page pour les conditions générales
    doc.addPage();
    
    // Titre des conditions générales
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS GÉNÉRALES DU PRÊT', 105, 20, { align: 'center' });
    
    // Conditions générales
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("1. L'emprunteur s'engage à utiliser le véhicule en bon père de famille et à le restituer dans l'état où il lui a été", 20, 35);
    doc.text("confié.", 20, 40);
    
    doc.text("2. L'emprunteur s'engage à ne pas prêter ou louer le véhicule à un tiers.", 20, 50);
    
    doc.text("3. L'emprunteur s'engage à respecter le code de la route et à payer toute contravention éventuelle.", 20, 60);
    
    doc.text("4. L'emprunteur reconnaît que le véhicule est assuré par sa propre assurance pour toute la durée du prêt.", 20, 70);
    
    doc.text("5. En cas d'accident, l'emprunteur s'engage à prévenir immédiatement le prêteur.", 20, 80);
    
    doc.text("6. Le véhicule devra être restitué avec le même niveau de carburant qu'au départ.", 20, 90);
    
    doc.text("7. En cas de retard dans la restitution du véhicule, des frais pourront être facturés.", 20, 100);
    
    doc.text("8. Le prêteur se réserve le droit de réclamer une indemnisation pour tout dommage constaté lors de la", 20, 110);
    doc.text("restitution.", 20, 115);
    
    doc.text("9. Conformément à la réglementation française 2025, l'emprunteur est responsable de toute infraction", 20, 125);
    doc.text("commise pendant la durée du prêt.", 20, 130);
    
    doc.text("10. Ce contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents.", 20, 140);
    
    // Signatures
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURES', 105, 160, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Fait à Marseille, le ${formattedEndDate}`, 105, 170, { align: 'center' });
    
    doc.text('Le prêteur:', 40, 190);
    doc.text('L\'emprunteur:', 150, 190);
    
    // Ajouter une signature pour le carrossier (prêteur)
    // Simuler une signature manuscrite pour le prêteur avec un style plus professionnel
    doc.setDrawColor(0, 0, 128); // Bleu foncé pour la signature
    doc.setLineWidth(0.7);
    
    // Créer une signature manuscrite stylisée
    doc.lines([
      [10, 3], [5, -2], [3, 2], [4, -1], [8, 3], [4, -4], [2, 2]
    ], 40, 205);
    
    // Ajouter le nom du prêteur sous la signature
    doc.setFontSize(8);
    doc.text("Jean DURAND", 40, 215);
    doc.text("Carrosserie du 13008", 40, 220);
    
    // Ajouter un tampon d'entreprise professionnel
    // Cercle extérieur du tampon
    doc.setDrawColor(0, 0, 150); // Bleu foncé
    doc.setLineWidth(1);
    doc.circle(60, 210, 18); // Cercle extérieur
    
    // Cercle intérieur du tampon
    doc.setDrawColor(0, 0, 150);
    doc.setLineWidth(0.5);
    doc.circle(60, 210, 15); // Cercle intérieur
    
    // Texte dans le tampon
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 150);
    doc.text('CARROSSERIE', 60, 204, { align: 'center' });
    doc.text('DU 13008', 60, 210, { align: 'center' });
    doc.text('SIRET 90117756800010', 60, 216, { align: 'center' });
    doc.text('TVA FR29901177568', 60, 222, { align: 'center' });
    
    // Ajouter une étoile ou élément décoratif pour le tampon
    // Ajouter 8 petites étoiles autour du cercle pour donner un aspect officiel
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x = 60 + 17 * Math.cos(angle);
      const y = 210 + 17 * Math.sin(angle);
      
      // Petite étoile à 5 branches
      doc.setFillColor(0, 0, 150);
      doc.circle(x, y, 0.8, 'F');
    }
    
    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('www.autocoreai.fr • contact@autocoreai.fr • 01 23 45 67 89', 105, 280, { align: 'center' });
    
    // Retourner le document
    return doc;
  };
  
  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validation des données
      if (returnData.endMileage < loan.start_mileage) {
        throw new Error("Le kilométrage de retour doit être supérieur au kilométrage de départ");
      }
      
      // Génération du document de fin de prêt
      const returnDoc = await generateReturnDocument();
      
      // Sauvegarder le PDF et obtenir l'URL
      const pdfBlob = returnDoc.output('blob');
      const returnFile = new File([pdfBlob], `fin_pret_${loan.driver_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`, { type: 'application/pdf' });
      
      // Créer un nom de fichier unique
      const fileExt = 'pdf';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `loan_vehicles/returns/${fileName}`;
      
      // Télécharger le fichier vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(filePath, returnFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) throw error;
      
      // Obtenir l'URL public
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);
      
      // Mettre à jour le prêt avec les informations de retour
      await VehicleLoan.endLoan(id, {
        endMileage: returnData.endMileage,
        endFuelLevel: returnData.endFuelLevel,
        notes: returnData.notes,
        returnDocUrl: publicUrl
      });
      
      // Afficher un message de succès
      setSuccess(true);
      
      // Rediriger vers la page de détail après 2 secondes
      setTimeout(() => {
        navigate(`/dashboard/loans/${id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error ending loan:', error);
      setError(error.message || "Une erreur est survenue lors de la clôture du prêt");
      setIsSubmitting(false);
    }
  };
  
  // Afficher un message de succès
  if (success) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto bg-card rounded-lg border p-6 text-center">
          <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full inline-block mb-4">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Prêt clôturé avec succès</h2>
          <p className="text-muted-foreground mb-4">
            Le véhicule a été marqué comme retourné et le prêt a été clôturé.
          </p>
          <Link to={`/dashboard/loans/${id}`} className="btn-primary py-2 px-4">
            Voir les détails
          </Link>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
          <Link to="/dashboard/loans" className="text-sm underline mt-2 inline-block">
            Retour à la liste des prêts
          </Link>
        </div>
      </div>
    );
  }
  
  if (!loan) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Prêt introuvable</p>
          </div>
          <Link to="/dashboard/loans" className="text-sm underline mt-2 inline-block">
            Retour à la liste des prêts
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center space-x-2 mb-6">
        <Link to={`/dashboard/loans/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Clôturer le prêt</h1>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Informations de retour */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="font-medium text-lg mb-4">Informations de retour</h2>
              
              {/* Erreur */}
              {error && (
                <div className="mb-6 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Kilométrage */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Kilométrage au retour *</label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={returnData.endMileage}
                        onChange={(e) => handleChange('endMileage', parseInt(e.target.value))}
                        className="w-full pl-10"
                        min={loan.start_mileage}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kilométrage de départ: {loan.start_mileage} km
                    </p>
                    {returnData.endMileage > 0 && returnData.endMileage > loan.start_mileage && (
                      <p className="text-xs text-primary">
                        Distance parcourue: {returnData.endMileage - loan.start_mileage} km
                      </p>
                    )}
                  </div>
                  
                  {/* Niveau de carburant */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Niveau de carburant au retour *</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={returnData.endFuelLevel}
                      onChange={(e) => handleChange('endFuelLevel', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Vide</span>
                      <span>1/4</span>
                      <span>1/2</span>
                      <span>3/4</span>
                      <span>Plein</span>
                    </div>
                    <p className="text-center font-medium">
                      {returnData.endFuelLevel}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Niveau de départ: {loan.start_fuel_level}%
                    </p>
                  </div>
                </div>
                
                {/* Images de retour */}
                <div className="space-y-2 pt-4 border-t">
                  <label className="block text-sm font-medium">Photos de l'état du véhicule (optionnel)</label>
                  <div className="p-3 border border-dashed rounded-md flex flex-col items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Ajouter des photos de l'état du véhicule au retour
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="btn-outline py-1.5 text-xs cursor-pointer"
                    >
                      Ajouter une photo
                    </label>
                  </div>
                  
                  {returnData.endImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                      {returnData.endImages.map((image, index) => (
                        <div key={index} className="relative border rounded-md overflow-hidden">
                          <img
                            src={image.url}
                            alt={`État du véhicule ${index + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Notes */}
                <div className="space-y-2 pt-4 border-t">
                  <label className="block text-sm font-medium">Notes de retour</label>
                  <textarea
                    value={returnData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="w-full h-24 resize-none"
                    placeholder="Observations sur l'état du véhicule, dommages constatés, etc."
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Récapitulatif du prêt */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-medium mb-4">Récapitulatif du prêt</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Client</h4>
                  </div>
                  <p className="text-sm">{loan.clients.first_name} {loan.clients.last_name}</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Véhicule</h4>
                  </div>
                  <p className="text-sm">
                    {loan.loan_vehicles.make} {loan.loan_vehicles.model}
                    {loan.loan_vehicles.registration && (
                      <span className="text-muted-foreground ml-1">
                        ({loan.loan_vehicles.registration})
                      </span>
                    )}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Période</h4>
                  </div>
                  <p className="text-sm">
                    Du {format(new Date(loan.start_date), 'dd/MM/yyyy', { locale: fr })} au {format(new Date(), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary py-2 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Clôturer le prêt
                    </>
                  )}
                </button>
                
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Cette action est définitive et générera un document de fin de prêt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EndLoanPage;