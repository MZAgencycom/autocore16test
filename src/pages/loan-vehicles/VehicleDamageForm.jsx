import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Camera, 
  PenTool as Tool, 
  Save, 
  Check, 
  Loader, 
  AlertCircle,
  Upload,
  X
} from 'lucide-react';
import { LoanVehicle } from '../../models/LoanVehicle';
import { supabase } from '../../lib/supabase';

const VehicleDamageForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    bodyPart: '',
    damageType: 'Rayure',
    severity: 'minor',
    description: '',
    imageUrl: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  
  // Body parts options
  const bodyParts = [
    'Pare-choc avant', 'Pare-choc arrière', 'Aile avant gauche', 'Aile avant droite',
    'Aile arrière gauche', 'Aile arrière droite', 'Portière avant gauche', 'Portière avant droite',
    'Portière arrière gauche', 'Portière arrière droite', 'Capot', 'Toit', 'Coffre',
    'Phare avant gauche', 'Phare avant droit', 'Feu arrière gauche', 'Feu arrière droit',
    'Pare-brise', 'Vitre arrière', 'Rétroviseur gauche', 'Rétroviseur droit',
    'Jante avant gauche', 'Jante avant droite', 'Jante arrière gauche', 'Jante arrière droite',
    'Autre'
  ];
  
  // Damage types
  const damageTypes = [
    { id: 'Rayure', label: 'Rayure' },
    { id: 'Choc', label: 'Choc/Bosse' },
    { id: 'Cassé', label: 'Cassé/HS' }
  ];
  
  // Severity levels
  const severityLevels = [
    { id: 'minor', label: 'Mineur' },
    { id: 'moderate', label: 'Modéré' },
    { id: 'major', label: 'Important' }
  ];
  
  // Charger les informations du véhicule
  useEffect(() => {
    const loadVehicleDetails = async () => {
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
    
    loadVehicleDetails();
  }, [id]);
  
  // Gérer les changements dans le formulaire
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
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
      const filePath = `loan_vehicles/damages/${fileName}`;
      
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
      setFormData({
        ...formData,
        imageUrl: publicUrl
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(`Erreur lors du téléchargement de l'image: ${error.message}`);
    }
  };
  
  // Supprimer l'image
  const removeImage = () => {
    setImagePreview(null);
    setFormData({
      ...formData,
      imageUrl: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Valider les données du formulaire
      if (!formData.bodyPart) {
        throw new Error("Veuillez sélectionner une partie du véhicule");
      }
      if (!formData.damageType) {
        throw new Error("Veuillez sélectionner un type de dommage");
      }
      
      // Créer la description si non fournie
      const description = formData.description || `${formData.damageType} sur ${formData.bodyPart} (${severityLevels.find(s => s.id === formData.severity)?.label})`;
      
      // Ajouter le dommage
      await LoanVehicle.addDamage(id, {
        bodyPart: formData.bodyPart,
        damageType: formData.damageType,
        severity: formData.severity,
        description,
        imageUrl: formData.imageUrl
      });
      
      // Afficher un message de succès
      setSuccess(true);
      
      // Rediriger vers la page de détail du véhicule après 2 secondes
      setTimeout(() => {
        navigate(`/dashboard/loan-vehicles/${id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error adding damage:', error);
      setError(error.message || "Une erreur est survenue lors de l'ajout du dommage");
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

  // Affichage en cas d'erreur
  if (error && !vehicle) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
          <Link to="/dashboard/loan-vehicles" className="text-sm underline mt-2 inline-block">
            Retour à la liste des véhicules
          </Link>
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
          <h2 className="text-2xl font-bold mb-2">Dommage ajouté</h2>
          <p className="text-muted-foreground mb-4">
            Le dommage a été enregistré avec succès.
          </p>
          <Link to={`/dashboard/loan-vehicles/${id}`} className="btn-primary py-2 px-4">
            Retour au véhicule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center space-x-2 mb-6">
        <Link to={`/dashboard/loan-vehicles/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Ajouter un dommage</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="bg-card rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Partie du véhicule *</label>
              <select
                value={formData.bodyPart}
                onChange={(e) => handleChange('bodyPart', e.target.value)}
                className="w-full"
                required
              >
                <option value="">Sélectionnez une partie</option>
                {bodyParts.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type de dommage *</label>
              <div className="grid grid-cols-3 gap-3">
                {damageTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`p-2 border rounded-md text-sm text-center ${
                      formData.damageType === type.id 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleChange('damageType', type.id)}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Sévérité</label>
              <div className="grid grid-cols-3 gap-3">
                {severityLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className={`p-2 border rounded-md text-sm text-center ${
                      formData.severity === level.id 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleChange('severity', level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full h-24"
                placeholder="Description détaillée du dommage..."
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Photo du dommage</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Dommage"
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
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground mb-4">
                      Ajoutez une photo du dommage (optionnel)
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
            
            <div className="pt-4 flex justify-end space-x-3">
              <Link
                to={`/dashboard/loan-vehicles/${id}`}
                className="btn-outline py-2"
              >
                Annuler
              </Link>
              
              <button
                type="submit"
                disabled={isSaving || !formData.bodyPart || !formData.damageType}
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
        
        {/* Information sur le véhicule */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-medium mb-4">Véhicule</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Véhicule:</span>
                <span className="font-medium">{vehicle?.make} {vehicle?.model}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Immatriculation:</span>
                <span className="font-medium">{vehicle?.registration || '-'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Couleur:</span>
                <span className="font-medium">{vehicle?.color || '-'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kilométrage:</span>
                <span className="font-medium">{vehicle?.current_mileage || 0} km</span>
              </div>
            </div>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Tool className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Conseils pour documenter les dommages</p>
                <ul className="list-disc ml-4 mt-2 text-sm space-y-1 text-muted-foreground">
                  <li>Prenez des photos claires et bien éclairées</li>
                  <li>Photographiez sous plusieurs angles si nécessaire</li>
                  <li>Incluez une photo de l'ensemble du véhicule pour le contexte</li>
                  <li>Ajoutez des mesures ou échelles si possible</li>
                  <li>Décrivez précisément le dommage pour faciliter l'évaluation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDamageForm;