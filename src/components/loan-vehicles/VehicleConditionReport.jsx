import { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  Camera,
  Upload,
  PenTool as Tool, 
  Check, 
  X, 
  AlertCircle, 
  Save, 
  Loader, 
  ChevronRight, 
  ChevronLeft,
  Droplets, 
  Gauge,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

/**
 * Composant d'état des lieux du véhicule pour l'ouverture et la clôture du prêt
 * Permet de documenter l'état du véhicule avec des photos et des annotations
 */
const VehicleConditionReport = ({
  vehicleData,
  initialCondition = null,
  onSave,
  onCancel,
  isClosing = false
}) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [activeView, setActiveView] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  
  const [conditionData, setConditionData] = useState({
    mileage: vehicleData?.current_mileage || 0,
    fuelLevel: vehicleData?.fuel_level || 50,
    cleanlinessExterior: 'good',
    cleanlinessInterior: 'good',
    tireCondition: 'good',
    lightsCondition: 'good',
    damages: [],
    notes: '',
    date: new Date().toISOString()
  });
  
  // Charger les données initiales si disponibles
  useEffect(() => {
    if (initialCondition && isClosing) {
      setConditionData(prev => ({
        ...prev,
        // Ne pas écraser les valeurs actuelles avec les anciennes
        mileage: prev.mileage,
        fuelLevel: prev.fuelLevel,
        // Mais garder les dommages précédents
        damages: [
          ...(initialCondition.damages || []).map(damage => ({
            ...damage,
            initial: true, // Marquer comme dommage initial
          })),
          ...prev.damages.filter(damage => !damage.initial)
        ]
      }));
    } else if (initialCondition) {
      setConditionData(prev => ({
        ...initialCondition,
        date: new Date().toISOString()
      }));
      
      // Charger les photos existantes
      if (initialCondition.photos && initialCondition.photos.length > 0) {
        setPhotos(initialCondition.photos);
      }
    }
  }, [initialCondition, isClosing]);
  
  // Liste des zones du véhicule pour les dommages
  const vehicleParts = [
    { id: 'front_bumper', label: 'Pare-chocs avant', position: 'front' },
    { id: 'rear_bumper', label: 'Pare-chocs arrière', position: 'rear' },
    { id: 'hood', label: 'Capot', position: 'front' },
    { id: 'trunk', label: 'Coffre', position: 'rear' },
    { id: 'left_front_door', label: 'Porte avant gauche', position: 'left' },
    { id: 'right_front_door', label: 'Porte avant droite', position: 'right' },
    { id: 'left_rear_door', label: 'Porte arrière gauche', position: 'left' },
    { id: 'right_rear_door', label: 'Porte arrière droite', position: 'right' },
    { id: 'left_front_wing', label: 'Aile avant gauche', position: 'left' },
    { id: 'right_front_wing', label: 'Aile avant droite', position: 'right' },
    { id: 'left_rear_wing', label: 'Aile arrière gauche', position: 'left' },
    { id: 'right_rear_wing', label: 'Aile arrière droite', position: 'right' },
    { id: 'roof', label: 'Toit', position: 'top' },
    { id: 'windshield', label: 'Pare-brise', position: 'front' },
    { id: 'rear_window', label: 'Lunette arrière', position: 'rear' },
    { id: 'left_headlight', label: 'Phare gauche', position: 'front' },
    { id: 'right_headlight', label: 'Phare droit', position: 'front' },
    { id: 'left_taillight', label: 'Feu arrière gauche', position: 'rear' },
    { id: 'right_taillight', label: 'Feu arrière droit', position: 'rear' },
    { id: 'front_license_plate', label: 'Plaque d\'immatriculation avant', position: 'front' },
    { id: 'rear_license_plate', label: 'Plaque d\'immatriculation arrière', position: 'rear' },
    { id: 'dashboard', label: 'Tableau de bord', position: 'interior' },
    { id: 'seats', label: 'Sièges', position: 'interior' },
    { id: 'carpets', label: 'Tapis', position: 'interior' },
    { id: 'steering_wheel', label: 'Volant', position: 'interior' },
    { id: 'gear_shift', label: 'Levier de vitesse', position: 'interior' },
    { id: 'radio', label: 'Radio/GPS', position: 'interior' }
  ];
  
  // Types de dommages
  const damageTypes = [
    { id: 'scratch', label: 'Rayure', color: 'bg-blue-500/20 text-blue-600' },
    { id: 'dent', label: 'Choc/Bosse', color: 'bg-amber-500/20 text-amber-600' },
    { id: 'broken', label: 'Cassé/HS', color: 'bg-red-500/20 text-red-600' },
    { id: 'stain', label: 'Tâche', color: 'bg-purple-500/20 text-purple-600' },
    { id: 'missing', label: 'Manquant', color: 'bg-orange-500/20 text-orange-600' }
  ];
  
  // États de propreté
  const cleanlinessLevels = [
    { id: 'excellent', label: 'Excellent' },
    { id: 'good', label: 'Bon' },
    { id: 'fair', label: 'Moyen' },
    { id: 'poor', label: 'Mauvais' }
  ];
  
  // Ajouter un dommage
  const addDamage = (part, damageType) => {
    const partDetails = vehicleParts.find(p => p.id === part);
    const damageTypeDetails = damageTypes.find(t => t.id === damageType);
    
    if (!partDetails || !damageTypeDetails) return;
    
    const newDamage = {
      id: `${part}-${damageType}-${Date.now()}`,
      part,
      partLabel: partDetails.label,
      type: damageType,
      typeLabel: damageTypeDetails.label,
      severity: 'medium',
      notes: '',
      isNew: isClosing, // Marquer comme nouveau dommage en cas de clôture
      position: partDetails.position
    };
    
    setConditionData(prev => ({
      ...prev,
      damages: [...prev.damages, newDamage]
    }));
  };
  
  // Supprimer un dommage
  const removeDamage = (id) => {
    setConditionData(prev => ({
      ...prev,
      damages: prev.damages.filter(d => d.id !== id)
    }));
  };
  
  // Mettre à jour un dommage
  const updateDamage = (id, field, value) => {
    setConditionData(prev => ({
      ...prev,
      damages: prev.damages.map(d => {
        if (d.id === id) {
          return { ...d, [field]: value };
        }
        return d;
      })
    }));
  };
  
  // Gérer le changement des champs généraux
  const handleChange = (field, value) => {
    setConditionData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Uploader une photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `condition_${Date.now()}.${fileExt}`;
      const filePath = `loan_vehicles/conditions/${fileName}`;
      
      // Uploader vers Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, file, {
          contentType: 'image/*',
          cacheControl: '3600'
        });
        
      if (uploadError) throw uploadError;
      
      // Récupérer l'URL
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);
        
      // Ajouter à la liste des photos
      const newPhoto = {
        id: Date.now(),
        url: publicUrl,
        name: file.name,
        description: '',
        position: 'other'
      };
      
      setPhotos(prev => [...prev, newPhoto]);
      
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err.message || 'Erreur lors du téléchargement de la photo');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Supprimer une photo
  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };
  
  // Mettre à jour la description d'une photo
  const updatePhotoDescription = (id, description) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, description };
      }
      return p;
    }));
  };
  
  // Mettre à jour la position d'une photo
  const updatePhotoPosition = (id, position) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, position };
      }
      return p;
    }));
  };
  
  // Enregistrer l'état des lieux
  const saveConditionReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Vérifier les données minimales
      if (!conditionData.mileage) {
        throw new Error("Le kilométrage est requis");
      }
      
      // Préparer les données finales
      const finalData = {
        ...conditionData,
        photos: photos
      };
      
      // Appeler le callback
      await onSave(finalData);
    } catch (err) {
      console.error('Error saving condition report:', err);
      setError(err.message || 'Erreur lors de la sauvegarde de l\'état des lieux');
      setIsLoading(false);
    }
  };
  
  // Rendu de la vue générale
  const renderGeneralView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Kilométrage *</label>
          <div className="relative">
            <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              value={conditionData.mileage}
              onChange={(e) => handleChange('mileage', parseInt(e.target.value))}
              className="w-full pl-10"
              min="0"
              required
            />
          </div>
          {isClosing && initialCondition && (
            <p className="text-xs text-muted-foreground">
              Kilométrage initial: {initialCondition.mileage} km
              {conditionData.mileage > initialCondition.mileage && (
                <span className="text-primary ml-2">
                  (+{conditionData.mileage - initialCondition.mileage} km)
                </span>
              )}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium">Niveau de carburant *</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={conditionData.fuelLevel}
            onChange={(e) => handleChange('fuelLevel', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <div className="text-center mt-2 font-medium">{conditionData.fuelLevel}%</div>
          
          {isClosing && initialCondition && (
            <p className="text-xs text-muted-foreground text-center">
              Niveau initial: {initialCondition.fuelLevel}%
              {conditionData.fuelLevel !== initialCondition.fuelLevel && (
                <span className={conditionData.fuelLevel > initialCondition.fuelLevel ? "text-primary ml-2" : "text-destructive ml-2"}>
                  ({conditionData.fuelLevel > initialCondition.fuelLevel ? '+' : ''}{conditionData.fuelLevel - initialCondition.fuelLevel}%)
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Propreté extérieure</label>
          <select
            value={conditionData.cleanlinessExterior}
            onChange={(e) => handleChange('cleanlinessExterior', e.target.value)}
            className="w-full"
          >
            {cleanlinessLevels.map(level => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium">Propreté intérieure</label>
          <select
            value={conditionData.cleanlinessInterior}
            onChange={(e) => handleChange('cleanlinessInterior', e.target.value)}
            className="w-full"
          >
            {cleanlinessLevels.map(level => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">État des pneumatiques</label>
          <select
            value={conditionData.tireCondition}
            onChange={(e) => handleChange('tireCondition', e.target.value)}
            className="w-full"
          >
            {cleanlinessLevels.map(level => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium">État des feux</label>
          <select
            value={conditionData.lightsCondition}
            onChange={(e) => handleChange('lightsCondition', e.target.value)}
            className="w-full"
          >
            {cleanlinessLevels.map(level => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Notes supplémentaires</label>
        <textarea
          value={conditionData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full h-24"
          placeholder="Remarques supplémentaires sur l'état du véhicule..."
        ></textarea>
      </div>
    </div>
  );
  
  // Rendu de la vue des dommages
  const renderDamagesView = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium">Sélectionnez les dommages sur le véhicule</h3>
      
      {isClosing && initialCondition && initialCondition.damages.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <h4 className="text-amber-600 font-medium mb-2 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Dommages existants
          </h4>
          <div className="space-y-2">
            {initialCondition.damages.map((damage) => (
              <div
                key={damage.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/20"
              >
                <div>
                  <span className="font-medium">{damage.partLabel}</span>
                  <span className="mx-2">-</span>
                  <span className="text-muted-foreground">{damage.typeLabel}</span>
                </div>
                <div className="text-xs text-muted-foreground">Pré-existant</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sélecteur de zone */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Zone du véhicule</label>
            <div className="p-4 border rounded-lg bg-muted/10 h-80 overflow-y-auto">
              <div className="space-y-1">
                {vehicleParts.map(part => {
                  const hasDamage = conditionData.damages.some(d => d.part === part.id && (!isClosing || d.isNew));
                  
                  return (
                    <button
                      key={part.id}
                      type="button"
                      className={`w-full text-left p-2 rounded-md transition-colors ${
                        hasDamage
                          ? 'bg-primary/10 text-primary'
                          : selectedPart === part.id
                            ? 'bg-muted/30'
                            : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedPart(part.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{part.label}</span>
                        {(hasDamage || selectedPart === part.id) && (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Liste des dommages sélectionnés */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Dommages signalés {isClosing ? '(nouveaux)' : ''}</label>
            <div className="p-4 border rounded-lg bg-muted/10 h-80 overflow-y-auto">
              {conditionData.damages.filter(d => !isClosing || d.isNew).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tool className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                  <p>Aucun dommage {isClosing ? 'nouveau ' : ''}signalé</p>
                  <p className="text-xs mt-1">Sélectionnez une zone du véhicule pour ajouter un dommage</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditionData.damages
                    .filter(d => !isClosing || d.isNew)
                    .map(damage => {
                      const damageType = damageTypes.find(t => t.id === damage.type) || { color: '' };
                      
                      return (
                        <div 
                          key={damage.id} 
                          className="p-3 border rounded-md"
                        >
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center">
                              <span className={`px-2 py-1 rounded-full text-xs ${damageType.color}`}>
                                {damage.typeLabel}
                              </span>
                              <span className="ml-2 font-medium">{damage.partLabel}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDamage(damage.id)}
                              className="p-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-muted/30 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="mt-2">
                            <div className="mb-2">
                              <label className="block text-xs font-medium mb-1">Sévérité</label>
                              <select
                                value={damage.severity}
                                onChange={(e) => updateDamage(damage.id, 'severity', e.target.value)}
                                className="w-full text-xs"
                              >
                                <option value="minor">Mineur</option>
                                <option value="medium">Moyen</option>
                                <option value="major">Important</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium mb-1">Notes</label>
                              <input
                                type="text"
                                value={damage.notes}
                                onChange={(e) => updateDamage(damage.id, 'notes', e.target.value)}
                                className="w-full text-xs"
                                placeholder="Description du dommage..."
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-2 overflow-x-auto flex-nowrap pb-2">
              {damageTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  className={`px-2 py-1 rounded text-xs ${type.color}`}
                  disabled={!selectedPart}
                  onClick={() => {
                    if (selectedPart) {
                      addDamage(selectedPart, type.id);
                      setSelectedPart(null);
                    }
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Rendu de la vue des photos
  const renderPhotosView = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium">Photos du véhicule</h3>
      
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
        <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground mb-4">
          Ajoutez des photos de l'état du véhicule
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handlePhotoUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline py-1.5 px-4 inline-flex items-center text-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choisir une photo
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="btn-outline py-1.5 px-4 inline-flex items-center text-sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            Prendre une photo
          </button>
        </div>
      </div>
      
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {photos.map((photo) => (
            <div key={photo.id} className="border rounded-lg overflow-hidden">
              <div className="relative">
                <img 
                  src={photo.url} 
                  alt="État du véhicule" 
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="mb-2">
                  <select
                    value={photo.position}
                    onChange={(e) => updatePhotoPosition(photo.id, e.target.value)}
                    className="w-full text-xs mb-2"
                  >
                    <option value="other">Sélectionner une position</option>
                    <option value="front">Avant</option>
                    <option value="rear">Arrière</option>
                    <option value="left">Côté gauche</option>
                    <option value="right">Côté droit</option>
                    <option value="interior">Intérieur</option>
                    <option value="damage">Dommage</option>
                  </select>
                  <input
                    type="text"
                    value={photo.description}
                    onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                    className="w-full text-xs"
                    placeholder="Description..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // Rendu principal
  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-6">
        {isClosing ? "État des lieux de clôture" : "État des lieux d'ouverture"} - {vehicleData?.make} {vehicleData?.model}
      </h2>
      
      {error && (
        <div className="mb-6 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Navigation entre les vues */}
      <div className="mb-6">
        <div className="flex border-b">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'general' ? 'border-primary' : 'border-transparent'
            }`}
            onClick={() => setActiveView('general')}
          >
            Général
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'damages' ? 'border-primary' : 'border-transparent'
            }`}
            onClick={() => setActiveView('damages')}
          >
            Dommages
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeView === 'photos' ? 'border-primary' : 'border-transparent'
            }`}
            onClick={() => setActiveView('photos')}
          >
            Photos
          </button>
        </div>
      </div>
      
      {/* Contenu de la vue active */}
      <div className="mb-8">
        {activeView === 'general' && renderGeneralView()}
        {activeView === 'damages' && renderDamagesView()}
        {activeView === 'photos' && renderPhotosView()}
      </div>
      
      {/* Navigation et enregistrement */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline py-2"
        >
          <X className="h-4 w-4 mr-2" />
          Annuler
        </button>
        
        <div className="flex space-x-2">
          {activeView === 'general' ? (
            <button
              type="button"
              onClick={() => setActiveView('damages')}
              className="btn-outline py-2 flex items-center"
            >
              Dommages
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          ) : activeView === 'damages' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveView('general')}
                className="btn-outline py-2 flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Général
              </button>
              <button
                type="button"
                onClick={() => setActiveView('photos')}
                className="btn-outline py-2 flex items-center"
              >
                Photos
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveView('damages')}
                className="btn-outline py-2 flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Dommages
              </button>
              <button
                type="button"
                onClick={saveConditionReport}
                className="btn-primary py-2 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleConditionReport;