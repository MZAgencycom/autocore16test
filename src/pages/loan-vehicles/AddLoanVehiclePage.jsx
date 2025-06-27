import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Car,
  ArrowLeft,
  Plus,
  Upload,
  Check,
  X,
  AlertCircle,
  Loader,
  ImageIcon,
  FileText,
  Shield,
  Info,
  ChevronRight,
  ChevronLeft,
  Camera,
} from "lucide-react";
import { LoanVehicle } from "../../models/LoanVehicle";
import { supabase } from "../../lib/supabase";
import { checkActionPermission } from "../../lib/subscriptionManager";
import SubscriptionLimitModal from "../../components/subscription/SubscriptionLimitModal";

const AddLoanVehiclePage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [damages, setDamages] = useState([]);

  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);

  // Check access permission on component mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await checkActionPermission("loan_vehicles");
        if (!result.canProceed) {
          setLimitInfo(result);
          setShowLimitModal(true);
        }
      } catch (error) {
        console.error("Error checking access permission:", error);
      }
    };

    checkAccess();
  }, []);

  // Références pour les fichiers
  const registrationFileRef = useRef(null);
  const registrationCameraRef = useRef(null);
  const insuranceFileRef = useRef(null);
  const insuranceCameraRef = useRef(null);
  const frontImageRef = useRef(null);
  const frontCameraRef = useRef(null);
  const rearImageRef = useRef(null);
  const rearCameraRef = useRef(null);
  const leftSideImageRef = useRef(null);
  const leftCameraRef = useRef(null);
  const rightSideImageRef = useRef(null);
  const rightCameraRef = useRef(null);

  // État pour les données du véhicule
  const [vehicleData, setVehicleData] = useState({
    make: "",
    model: "",
    registration: "",
    chassisNumber: "",
    engineNumber: "",
    initialMileage: "",
    currentMileage: "",
    color: "",
    fuelLevel: 50,
    status: "available",
    registrationDocUrl: "",
    insuranceDocUrl: "",
    frontImageUrl: "",
    rearImageUrl: "",
    leftSideImageUrl: "",
    rightSideImageUrl: "",
    notes: "",
  });

  // État pour les prévisualisations
  const [previews, setPreviews] = useState({
    registrationDoc: null,
    insuranceDoc: null,
    frontImage: null,
    rearImage: null,
    leftSideImage: null,
    rightSideImage: null,
  });

  // Tableau des pièces du véhicule pour les dommages
  const vehicleParts = [
    { id: "front_bumper", label: "Pare-chocs avant", position: "front" },
    { id: "rear_bumper", label: "Pare-chocs arrière", position: "rear" },
    { id: "hood", label: "Capot", position: "front" },
    { id: "trunk", label: "Coffre", position: "rear" },
    { id: "left_front_door", label: "Porte avant gauche", position: "left" },
    { id: "right_front_door", label: "Porte avant droite", position: "right" },
    { id: "left_rear_door", label: "Porte arrière gauche", position: "left" },
    { id: "right_rear_door", label: "Porte arrière droite", position: "right" },
    { id: "left_front_wing", label: "Aile avant gauche", position: "left" },
    { id: "right_front_wing", label: "Aile avant droite", position: "right" },
    { id: "left_rear_wing", label: "Aile arrière gauche", position: "left" },
    { id: "right_rear_wing", label: "Aile arrière droite", position: "right" },
    { id: "roof", label: "Toit", position: "top" },
    { id: "windshield", label: "Pare-brise", position: "front" },
    { id: "rear_window", label: "Lunette arrière", position: "rear" },
    { id: "left_front_wheel", label: "Roue avant gauche", position: "left" },
    { id: "right_front_wheel", label: "Roue avant droite", position: "right" },
    { id: "left_rear_wheel", label: "Roue arrière gauche", position: "left" },
    { id: "right_rear_wheel", label: "Roue arrière droite", position: "right" },
  ];

  // Types de dommages
  const damageTypes = [
    { id: "scratch", label: "Rayure", color: "bg-blue-500/20 text-blue-600" },
    {
      id: "dent",
      label: "Choc/Bosse",
      color: "bg-amber-500/20 text-amber-600",
    },
    { id: "broken", label: "Cassé/HS", color: "bg-red-500/20 text-red-600" },
  ];

  // Ajout ou suppression d'un dommage
  const toggleDamage = (partId, damageType) => {
    // Vérifier si ce dommage existe déjà
    const existingDamageIndex = damages.findIndex(
      (d) => d.partId === partId && d.type === damageType,
    );

    if (existingDamageIndex >= 0) {
      // Supprimer le dommage existant
      setDamages(damages.filter((_, i) => i !== existingDamageIndex));
    } else {
      // Ajouter un nouveau dommage
      const part = vehicleParts.find((p) => p.id === partId);
      setDamages([
        ...damages,
        {
          partId,
          partLabel: part?.label || partId,
          type: damageType,
          typeLabel:
            damageTypes.find((t) => t.id === damageType)?.label || damageType,
          notes: "",
          severity: "minor",
        },
      ]);
    }
  };

  // Vérifier si un dommage existe pour une pièce et un type
  const hasDamage = (partId, damageType) => {
    return damages.some((d) => d.partId === partId && d.type === damageType);
  };

  // Fonction pour passer à l'étape suivante
  const nextStep = () => {
    // Valider le formulaire pour l'étape actuelle
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Fonction pour revenir à l'étape précédente
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Fonction pour valider une étape
  const validateStep = (step) => {
    setError(null);

    switch (step) {
      case 1: // Détails du véhicule
        if (!vehicleData.make) {
          setError("La marque du véhicule est requise");
          return false;
        }
        if (!vehicleData.model) {
          setError("Le modèle du véhicule est requis");
          return false;
        }
        if (!vehicleData.registration) {
          setError("L'immatriculation est requise");
          return false;
        }
        if (!vehicleData.initialMileage) {
          setError("Le kilométrage initial est requis");
          return false;
        }
        if (!vehicleData.currentMileage) {
          setError("Le kilométrage actuel est requis");
          return false;
        }
        return true;

      case 2: // Chocs et rayures
        // Pas de validation requise pour cette étape
        return true;

      case 3: // Images & carburant
        // Pas de validation stricte requise pour cette étape
        return true;

      case 4: // Documents
        // Validation optionnelle, on peut passer sans documents
        return true;

      default:
        return true;
    }
  };

  // Fonction pour gérer les changements dans le formulaire
  const handleChange = (field, value) => {
    setVehicleData({
      ...vehicleData,
      [field]: value,
    });
  };

  // Fonction pour gérer le téléchargement de fichiers
  const handleFileUpload = async (file, fileType) => {
    try {
      if (!file) return null;

      // Créer un nom de fichier unique
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `loan_vehicles/${fileName}`;

      // Télécharger le fichier vers Supabase Storage
      const { data, error } = await supabase.storage
        .from("reports") // Réutiliser le bucket existant
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Obtenir l'URL public
      const {
        data: { publicUrl },
      } = supabase.storage.from("reports").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  // Fonction pour gérer le changement de fichier
  const handleFileChange = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => ({
          ...prev,
          [fileType]: e.target.result,
        }));
      };
      reader.readAsDataURL(file);

      // Télécharger le fichier et obtenir l'URL
      const fileUrl = await handleFileUpload(file, fileType);

      // Mettre à jour les données du véhicule avec l'URL
      const fieldMapping = {
        registrationDoc: "registrationDocUrl",
        insuranceDoc: "insuranceDocUrl",
        frontImage: "frontImageUrl",
        rearImage: "rearImageUrl",
        leftSideImage: "leftSideImageUrl",
        rightSideImage: "rightSideImageUrl",
      };

      setVehicleData((prev) => ({
        ...prev,
        [fieldMapping[fileType]]: fileUrl,
      }));
    } catch (error) {
      console.error("Error handling file:", error);
      setError(`Erreur lors du téléchargement du fichier: ${error.message}`);
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    try {
      // Check if user can use loan vehicles feature
      const result = await checkActionPermission("loan_vehicles");
      if (!result.canProceed) {
        setLimitInfo(result);
        setShowLimitModal(true);
        return;
      }

      setIsSubmitting(true);
      setError(null);

      // Création du véhicule
      const newVehicle = await LoanVehicle.create(vehicleData);

      // Création des dommages si présents
      if (damages.length > 0) {
        for (const damage of damages) {
          await LoanVehicle.addDamage(newVehicle.id, {
            bodyPart: damage.partLabel,
            damageType: damage.typeLabel,
            severity: damage.severity,
            description:
              damage.notes || `${damage.typeLabel} sur ${damage.partLabel}`,
            imageUrl: null, // Pas d'image pour les dommages initiaux
          });
        }
      }

      // Redirection vers la page de détail
      navigate(`/dashboard/loan-vehicles/${newVehicle.id}`);
    } catch (error) {
      console.error("Error creating loan vehicle:", error);
      setError(
        error.message ||
          "Une erreur est survenue lors de la création du véhicule",
      );
      setIsSubmitting(false);
    }
  };

  // Rendu du stepper
  const renderStepIndicator = () => {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex flex-1 items-center">
              <div
                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                  ${step === currentStep ? "bg-primary text-primary-foreground" : step < currentStep ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground"}
                `}
              >
                {step < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{step}</span>
                )}
              </div>

              {step < 5 && (
                <div
                  className={`h-0.5 flex-1 ${step < currentStep ? "bg-primary/60" : "bg-muted/60"}`}
                ></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-1">
          <span>Détails</span>
          <span>Dommages</span>
          <span>Photos</span>
          <span>Documents</span>
          <span>Validation</span>
        </div>
      </div>
    );
  };

  // Rendu de l'étape 1: Détails du véhicule
  const renderStep1 = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Marque *</label>
            <input
              type="text"
              value={vehicleData.make}
              onChange={(e) => handleChange("make", e.target.value)}
              className="w-full"
              placeholder="ex: Renault"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Modèle *</label>
            <input
              type="text"
              value={vehicleData.model}
              onChange={(e) => handleChange("model", e.target.value)}
              className="w-full"
              placeholder="ex: Clio"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Immatriculation *
            </label>
            <input
              type="text"
              value={vehicleData.registration}
              onChange={(e) => handleChange("registration", e.target.value)}
              className="w-full"
              placeholder="ex: AB-123-CD"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Couleur</label>
            <input
              type="text"
              value={vehicleData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-full"
              placeholder="ex: Blanc"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">N° de châssis</label>
            <input
              type="text"
              value={vehicleData.chassisNumber}
              onChange={(e) => handleChange("chassisNumber", e.target.value)}
              className="w-full"
              placeholder="ex: VF1RB070012345678"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">N° de moteur</label>
            <input
              type="text"
              value={vehicleData.engineNumber}
              onChange={(e) => handleChange("engineNumber", e.target.value)}
              className="w-full"
              placeholder="ex: K7M710123456"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Kilométrage initial *
            </label>
            <input
              type="number"
              value={vehicleData.initialMileage}
              onChange={(e) => handleChange("initialMileage", e.target.value)}
              className="w-full"
              placeholder="ex: 10000"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Kilométrage actuel *
            </label>
            <input
              type="number"
              value={vehicleData.currentMileage}
              onChange={(e) => handleChange("currentMileage", e.target.value)}
              className="w-full"
              placeholder="ex: 10000"
              min="0"
            />
          </div>
        </div>
      </div>
    );
  };

  // Rendu de l'étape 2: Chocs et rayures
  const renderStep2 = () => {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Sélectionnez les dommages existants sur le véhicule. Cela permettra de
          les documenter avant tout prêt.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Pièce</th>
                {damageTypes.map((type) => (
                  <th
                    key={type.id}
                    className={`p-3 text-center text-sm font-medium ${type.color}`}
                  >
                    {type.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicleParts.map((part, index) => (
                <tr
                  key={part.id}
                  className={index % 2 === 0 ? "bg-muted/20" : ""}
                >
                  <td className="p-3 text-sm">{part.label}</td>
                  {damageTypes.map((type) => (
                    <td
                      key={`${part.id}-${type.id}`}
                      className="p-3 text-center"
                    >
                      <div className="flex justify-center">
                        <button
                          type="button"
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                            hasDamage(part.id, type.id)
                              ? type.color
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                          onClick={() => toggleDamage(part.id, type.id)}
                        >
                          {hasDamage(part.id, type.id) ? (
                            <Check className="h-3 w-3" />
                          ) : null}
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {damages.length > 0 && (
          <div className="p-4 bg-muted/20 rounded-lg">
            <h3 className="font-medium text-sm mb-3">Dommages sélectionnés:</h3>
            <ul className="space-y-2">
              {damages.map((damage, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="font-medium">{damage.partLabel}</span>:{" "}
                    {damage.typeLabel}
                  </span>
                  <button
                    type="button"
                    className="p-1 hover:bg-muted/50 rounded-full"
                    onClick={() => toggleDamage(damage.partId, damage.type)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Rendu de l'étape 3: Photos & carburant
  const renderStep3 = () => {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground mb-4">
          Ajoutez des photos du véhicule sous différents angles et indiquez le
          niveau de carburant actuel.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Images du véhicule */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Photos du véhicule</h3>

            <div className="space-y-3">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                  <span className="text-sm font-medium">Face avant</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="file"
                      ref={frontImageRef}
                      onChange={(e) => handleFileChange(e, "frontImage")}
                      className="hidden"
                      accept="image/*"
                    />
                    <input
                      type="file"
                      ref={frontCameraRef}
                      onChange={(e) => handleFileChange(e, "frontImage")}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                    />
                    <button
                      type="button"
                      onClick={() => frontImageRef.current?.click()}
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {previews.frontImage ? "Changer" : "Télécharger"}
                    </button>
                    <button
                      type="button"
                      onClick={() => frontCameraRef.current?.click()}
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Prendre photo
                    </button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-center bg-muted/10 h-40">
                  {previews.frontImage ? (
                    <img
                      src={previews.frontImage}
                      alt="Face avant"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <span className="text-xs">Aucune image</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                  <span className="text-sm font-medium">Face arrière</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="file"
                      ref={rearImageRef}
                      onChange={(e) => handleFileChange(e, "rearImage")}
                      className="hidden"
                      accept="image/*"
                    />
                    <input
                      type="file"
                      ref={rearCameraRef}
                      onChange={(e) => handleFileChange(e, "rearImage")}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                    />
                    <button
                      type="button"
                      onClick={() => rearImageRef.current?.click()}
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {previews.rearImage ? "Changer" : "Télécharger"}
                    </button>
                    <button
                      type="button"
                      onClick={() => rearCameraRef.current?.click()}
                      className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Prendre photo
                    </button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-center bg-muted/10 h-40">
                  {previews.rearImage ? (
                    <img
                      src={previews.rearImage}
                      alt="Face arrière"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <span className="text-xs">Aucune image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                <span className="text-sm font-medium">Côté gauche</span>
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={leftSideImageRef}
                    onChange={(e) => handleFileChange(e, "leftSideImage")}
                    className="hidden"
                    accept="image/*"
                  />
                  <input
                    type="file"
                    ref={leftCameraRef}
                    onChange={(e) => handleFileChange(e, "leftSideImage")}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                  <button
                    type="button"
                    onClick={() => leftSideImageRef.current?.click()}
                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {previews.leftSideImage ? "Changer" : "Télécharger"}
                  </button>
                  <button
                    type="button"
                    onClick={() => leftCameraRef.current?.click()}
                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Prendre photo
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-center bg-muted/10 h-40">
                {previews.leftSideImage ? (
                  <img
                    src={previews.leftSideImage}
                    alt="Côté gauche"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs">Aucune image</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                <span className="text-sm font-medium">Côté droit</span>
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={rightSideImageRef}
                    onChange={(e) => handleFileChange(e, "rightSideImage")}
                    className="hidden"
                    accept="image/*"
                  />
                  <input
                    type="file"
                    ref={rightCameraRef}
                    onChange={(e) => handleFileChange(e, "rightSideImage")}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                  <button
                    type="button"
                    onClick={() => rightSideImageRef.current?.click()}
                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {previews.rightSideImage ? "Changer" : "Télécharger"}
                  </button>
                  <button
                    type="button"
                    onClick={() => rightCameraRef.current?.click()}
                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2 py-1 rounded-md flex items-center"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Prendre photo
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-center bg-muted/10 h-40">
                {previews.rightSideImage ? (
                  <img
                    src={previews.rightSideImage}
                    alt="Côté droit"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs">Aucune image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Niveau de carburant */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium text-sm mb-3">Niveau de carburant</h3>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={vehicleData.fuelLevel}
                onChange={(e) =>
                  handleChange("fuelLevel", parseInt(e.target.value))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Vide</span>
                <span>1/4</span>
                <span>1/2</span>
                <span>3/4</span>
                <span>Plein</span>
              </div>
            </div>

            <div className="p-3 bg-muted/20 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">Niveau actuel:</span>
              <span className="text-sm font-medium">
                {vehicleData.fuelLevel}%
              </span>
            </div>
          </div>
        </div>

        {/* Notes supplémentaires */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium text-sm mb-3">Notes supplémentaires</h3>

          <div className="space-y-2">
            <textarea
              value={vehicleData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full h-24"
              placeholder="Entrez des notes ou informations supplémentaires sur l'état du véhicule..."
            ></textarea>
          </div>
        </div>
      </div>
    );
  };

  // Rendu de l'étape 4: Documents
  const renderStep4 = () => {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground mb-4">
          Ajoutez les documents officiels du véhicule (carte grise, assurance,
          etc.).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted/30 border-b">
              <h3 className="font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                Carte grise
              </h3>
            </div>
            <div className="p-6 flex flex-col items-center justify-center bg-muted/10">
              {previews.registrationDoc ? (
                <div className="w-full">
                  <div className="relative w-full h-40 mb-4">
                    <img
                      src={previews.registrationDoc}
                      alt="Carte grise"
                      className="max-h-full max-w-full object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviews((prev) => ({
                          ...prev,
                          registrationDoc: null,
                        }));
                        setVehicleData((prev) => ({
                          ...prev,
                          registrationDocUrl: "",
                        }));
                        if (registrationFileRef.current)
                          registrationFileRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-emerald-600 font-medium flex items-center justify-center">
                      <Check className="h-3 w-3 mr-1" /> Document ajouté
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Ajoutez une copie de la carte grise du véhicule
                  </p>
                  <input
                    type="file"
                    ref={registrationFileRef}
                    onChange={(e) => handleFileChange(e, "registrationDoc")}
                    className="hidden"
                    accept=".pdf,image/*"
                  />
                  <input
                    type="file"
                    ref={registrationCameraRef}
                    onChange={(e) => handleFileChange(e, "registrationDoc")}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => registrationFileRef.current?.click()}
                      className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-1.5" />
                      Télécharger fichier
                    </button>
                    <button
                      type="button"
                      onClick={() => registrationCameraRef.current?.click()}
                      className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                    >
                      <Camera className="h-4 w-4 mr-1.5" />
                      Prendre photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted/30 border-b">
              <h3 className="font-medium flex items-center">
                <Shield className="h-4 w-4 mr-2 text-primary" />
                Carte verte d'assurance
              </h3>
            </div>
            <div className="p-6 flex flex-col items-center justify-center bg-muted/10">
              {previews.insuranceDoc ? (
                <div className="w-full">
                  <div className="relative w-full h-40 mb-4">
                    <img
                      src={previews.insuranceDoc}
                      alt="Carte verte d'assurance"
                      className="max-h-full max-w-full object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviews((prev) => ({
                          ...prev,
                          insuranceDoc: null,
                        }));
                        setVehicleData((prev) => ({
                          ...prev,
                          insuranceDocUrl: "",
                        }));
                        if (insuranceFileRef.current)
                          insuranceFileRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-emerald-600 font-medium flex items-center justify-center">
                      <Check className="h-3 w-3 mr-1" /> Document ajouté
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Ajoutez une copie de la carte verte d'assurance
                  </p>
                  <input
                    type="file"
                    ref={insuranceFileRef}
                    onChange={(e) => handleFileChange(e, "insuranceDoc")}
                    className="hidden"
                    accept=".pdf,image/*"
                  />
                  <input
                    type="file"
                    ref={insuranceCameraRef}
                    onChange={(e) => handleFileChange(e, "insuranceDoc")}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => insuranceFileRef.current?.click()}
                      className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                    >
                      <Upload className="h-4 w-4 mr-1.5" />
                      Télécharger fichier
                    </button>
                    <button
                      type="button"
                      onClick={() => insuranceCameraRef.current?.click()}
                      className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                    >
                      <Camera className="h-4 w-4 mr-1.5" />
                      Prendre photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Rendu de l'étape 5: Récapitulatif
  const renderStep5 = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Récapitulatif du véhicule</h3>

        <div className="bg-muted/10 rounded-lg p-4 border">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-2">
                Informations générales
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Marque / Modèle:</dt>
                  <dd className="font-medium">
                    {vehicleData.make} {vehicleData.model}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Immatriculation:</dt>
                  <dd className="font-medium">{vehicleData.registration}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Couleur:</dt>
                  <dd className="font-medium">{vehicleData.color || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">N° de châssis:</dt>
                  <dd className="font-medium">
                    {vehicleData.chassisNumber || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">N° de moteur:</dt>
                  <dd className="font-medium">
                    {vehicleData.engineNumber || "-"}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">État du véhicule</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Kilométrage initial:
                  </dt>
                  <dd className="font-medium">
                    {vehicleData.initialMileage} km
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Kilométrage actuel:</dt>
                  <dd className="font-medium">
                    {vehicleData.currentMileage} km
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Niveau de carburant:
                  </dt>
                  <dd className="font-medium">{vehicleData.fuelLevel}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Dommages existants:</dt>
                  <dd className="font-medium">{damages.length}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {damages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Dommages existants</h4>
            <div className="bg-muted/10 rounded-lg p-4 border">
              <ul className="space-y-2">
                {damages.map((damage, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <span
                      className={`w-2 h-2 rounded-full mr-2 ${
                        damage.type === "scratch"
                          ? "bg-blue-500"
                          : damage.type === "dent"
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                    ></span>
                    <span>
                      <span className="font-medium">{damage.partLabel}</span>:{" "}
                      {damage.typeLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Photos du véhicule */}
        {(previews.frontImage ||
          previews.rearImage ||
          previews.leftSideImage ||
          previews.rightSideImage) && (
          <div>
            <h4 className="text-sm font-medium mb-2">Photos du véhicule</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {previews.frontImage && (
                <div className="border rounded-md overflow-hidden">
                  <div className="p-1 bg-muted/20 text-xs text-center">
                    Face avant
                  </div>
                  <img
                    src={previews.frontImage}
                    alt="Face avant"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
              {previews.rearImage && (
                <div className="border rounded-md overflow-hidden">
                  <div className="p-1 bg-muted/20 text-xs text-center">
                    Face arrière
                  </div>
                  <img
                    src={previews.rearImage}
                    alt="Face arrière"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
              {previews.leftSideImage && (
                <div className="border rounded-md overflow-hidden">
                  <div className="p-1 bg-muted/20 text-xs text-center">
                    Côté gauche
                  </div>
                  <img
                    src={previews.leftSideImage}
                    alt="Côté gauche"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
              {previews.rightSideImage && (
                <div className="border rounded-md overflow-hidden">
                  <div className="p-1 bg-muted/20 text-xs text-center">
                    Côté droit
                  </div>
                  <img
                    src={previews.rightSideImage}
                    alt="Côté droit"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {(previews.registrationDoc || previews.insuranceDoc) && (
          <div>
            <h4 className="text-sm font-medium mb-2">Documents</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previews.registrationDoc && (
                <div className="border rounded-md p-3 flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <span className="text-sm font-medium">Carte grise</span>
                    <p className="text-xs text-emerald-600">Document ajouté</p>
                  </div>
                </div>
              )}
              {previews.insuranceDoc && (
                <div className="border rounded-md p-3 flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <span className="text-sm font-medium">
                      Carte verte d'assurance
                    </span>
                    <p className="text-xs text-emerald-600">Document ajouté</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bouton de validation finale */}
        <div className="mt-6 pt-6 border-t">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full btn-primary py-2.5 flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Création en cours...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Créer le véhicule de prêt
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // Rendu du contenu en fonction de l'étape courante
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  // Animation variants
  const variants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  };

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center space-x-2 mb-6">
        <Link
          to="/dashboard/loan-vehicles"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Ajouter un véhicule de prêt</h1>
      </div>

      {/* Subscription limitation modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />

      {/* Conteneur principal */}
      <div className="bg-card rounded-lg border p-6">
        {/* Stepper */}
        {renderStepIndicator()}

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Contenu de l'étape courante */}
        <motion.div
          key={currentStep}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>

        {/* Navigation entre les étapes */}
        {currentStep < 5 && (
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={
                currentStep === 1
                  ? "invisible"
                  : "btn-outline py-2 px-4 flex items-center"
              }
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Précédent
            </button>

            <button
              type="button"
              onClick={nextStep}
              className="btn-primary py-2 px-4 flex items-center"
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddLoanVehiclePage;
