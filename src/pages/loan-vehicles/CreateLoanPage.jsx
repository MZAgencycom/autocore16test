import { useState, useEffect, useRef } from "react";
import { withTimeout } from "../../utils/withTimeout";
import heic2any from "heic2any";
import compressImage from "../../utils/imageCompression.js";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Car,
  Calendar,
  User,
  CreditCard,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader,
  Search,
  Shield,
  Camera,
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { LoanVehicle } from "../../models/LoanVehicle";
import { VehicleLoan } from "../../models/VehicleLoan";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { checkActionPermission } from "../../lib/subscriptionManager";
import SubscriptionLimitModal from "../../components/subscription/SubscriptionLimitModal";
import VehicleConditionReport from "../../components/loan-vehicles/VehicleConditionReport";
import ElectronicSignature from "../../components/loan-vehicles/ElectronicSignature";

// Supabase storage buckets have a 5MB limit as defined in migrations
const MAX_LICENSE_SIZE = 5 * 1024 * 1024; // 5MB

const CreateLoanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const frontLicenseRef = useRef(null);
  const frontLicenseCameraRef = useRef(null);
  const backLicenseRef = useRef(null);
  const backLicenseCameraRef = useRef(null);

  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdLoanId, setCreatedLoanId] = useState(null);
  const [submittedWithSignatures, setSubmittedWithSignatures] = useState(false);
  const [step, setStep] = useState(1);
  const [userProfile, setUserProfile] = useState(null);

  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);

  // États pour les différentes étapes
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [conditionReport, setConditionReport] = useState(null);
  const [searchTerms, setSearchTerms] = useState({ vehicle: "", client: "" });
  const [clientSignature, setClientSignature] = useState(null);
  const [dealerSignature, setDealerSignature] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(null); // 'client' ou 'dealer'

  // État du formulaire
  const [formData, setFormData] = useState({
    vehicleId: "",
    clientId: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    expectedEndDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    startMileage: "",
    startFuelLevel: 50,
    driverName: "",
    driverLicenseNumber: "",
    driverLicenseIssueDate: "",
    driverBirthdate: "",
    driverBirthplace: "",
    driverLicenseFrontUrl: null,
    driverLicenseBackUrl: null,
    insuranceCompany: "",
    insurancePolicyNumber: "",
    notes: "",
  });

  // Prévisualisations des images de permis
  const [licensePreviews, setLicensePreviews] = useState({
    front: null,
    back: null,
  });

  // Track license upload in progress to avoid premature validation
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);

  // Check access permission and load initial data
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check subscription permission
        const result = await checkActionPermission("loan_vehicles");
        if (!result.canProceed) {
          setLimitInfo(result);
          setShowLimitModal(true);
          return;
        }

        setIsLoading(true);

        // Check URL parameters
        const params = new URLSearchParams(location.search);
        const vehicleId = params.get("vehicle");
        const clientId = params.get("client");

        // Load user profile
        const { data: profile, error: profileError } = await supabase
          .from("users_extended")
          .select("*")
          .single();

        if (!profileError) {
          setUserProfile(profile);
        }

        // Load available vehicles
        const availableVehicles = await LoanVehicle.getAvailableVehicles();
        setVehicles(availableVehicles || []);

        // Load clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*")
          .order("last_name", { ascending: true });

        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        // Set preselected values from URL params
        if (vehicleId) {
          const vehicle = availableVehicles.find((v) => v.id === vehicleId);
          if (vehicle) {
            handleVehicleSelect(vehicle);
          }
        }

        if (clientId) {
          const client = clientsData.find((c) => c.id === clientId);
          if (client) {
            handleClientSelect(client);
          }
        }
      } catch (error) {
        console.error("Error initializing loan creation:", error);
        setError(
          error.message || "Une erreur est survenue lors de l'initialisation",
        );
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [location]);

  // Filtrer les véhicules et clients en fonction des termes de recherche
  const filteredVehicles = vehicles.filter((vehicle) =>
    `${vehicle.make} ${vehicle.model} ${vehicle.registration || ""}`
      .toLowerCase()
      .includes(searchTerms.vehicle.toLowerCase()),
  );

  const filteredClients = clients.filter((client) =>
    `${client.first_name} ${client.last_name}`
      .toLowerCase()
      .includes(searchTerms.client.toLowerCase()),
  );

  // Sélectionner un véhicule
  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData((prev) => ({
      ...prev,
      vehicleId: vehicle.id,
      startMileage: vehicle.current_mileage,
      startFuelLevel: vehicle.fuel_level,
    }));
    setSearchTerms((prev) => ({ ...prev, vehicle: "" }));
  };

  // Sélectionner un client
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setFormData((prev) => ({
      ...prev,
      clientId: client.id,
    }));
    setSearchTerms((prev) => ({ ...prev, client: "" }));
  };

  // Mettre à jour les champs du formulaire
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Gérer le téléchargement du permis de conduire
  const handleLicenseUpload = async (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLicense(true);
    const timeoutId = setTimeout(() => {
      console.warn("License upload timed out");
      setIsUploadingLicense(false);
    }, 15000);

    try {
      let processedFile = file;

      // Convert HEIC/HEIF images to JPEG for compatibility
      if (
        /image\/heic|image\/heif/i.test(file.type) ||
        /\.heic$/i.test(file.name)
      ) {
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8,
        });
        processedFile = new File(
          [converted],
          file.name.replace(/\.heic$/i, ".jpg"),
          { type: "image/jpeg" },
        );
      }

      // Compress image to avoid exceeding storage limits
      processedFile = await compressImage(processedFile, 0.8);

      if (processedFile.size > MAX_LICENSE_SIZE) {
        setError(
          "La photo est trop lourde, veuillez réessayer avec une résolution plus basse ou utiliser l'upload depuis la galerie."
        );
        return;
      }

      const previewUrl = URL.createObjectURL(processedFile);

      // Set preview image
      setLicensePreviews((prev) => ({
        ...prev,
        [side]: previewUrl,
      }));
      // Immediately store preview URL for validation
      setFormData((prev) => ({
        ...prev,
        [side === "front" ? "driverLicenseFrontUrl" : "driverLicenseBackUrl"]:
          previewUrl,
      }));

      if (/Mobi/i.test(navigator.userAgent)) {
        if (import.meta?.env?.DEV) console.log("mobile license preview", side, previewUrl);
      }

      // Generate unique file path
      let fileExt = "jpg";
      if (processedFile.name && processedFile.name.includes(".")) {
        fileExt = processedFile.name.split(".").pop();
      } else if (processedFile.type && processedFile.type.includes("/")) {
        fileExt = processedFile.type.split("/").pop();
      }
      const fileName = `license_${side}_${Date.now()}.${fileExt}`;
      const filePath = `loan_vehicles/licenses/${fileName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from("reports")
        .upload(filePath, processedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("reports").getPublicUrl(filePath);

      // Update form state
      setFormData((prev) => ({
        ...prev,
        [side === "front" ? "driverLicenseFrontUrl" : "driverLicenseBackUrl"]:
          publicUrl,
      }));
    } catch (error) {
      console.error(`Error uploading license ${side}:`, error);
      setError(
        `Erreur lors du téléchargement du permis (${side}): ${error.message}`,
      );
    } finally {
      clearTimeout(timeoutId);
      setIsUploadingLicense(false);
    }
  };

  // Retirer une image du permis
  const removeLicense = (side) => {
    setLicensePreviews((prev) => {
      if (prev[side]) {
        URL.revokeObjectURL(prev[side]);
      }
      return {
        ...prev,
        [side]: null,
      };
    });

    setFormData((prev) => ({
      ...prev,
      [side === "front" ? "driverLicenseFrontUrl" : "driverLicenseBackUrl"]:
        null,
    }));

    // Réinitialiser l'input file
    if (side === "front" && frontLicenseRef.current) {
      frontLicenseRef.current.value = "";
    } else if (side === "back" && backLicenseRef.current) {
      backLicenseRef.current.value = "";
    }
  };

  // Formater une date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
    } catch (error) {
      return dateString;
    }
  };

  // Passer à l'étape suivante
  const goToNextStep = () => {
    // Valider l'étape courante avant de passer à la suivante
    if (validateCurrentStep()) {
      setStep((prev) => prev + 1);
    }
  };

  // Revenir à l'étape précédente
  const goToPreviousStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  // Valider l'étape courante
  const validateCurrentStep = () => {
    setError(null);

    switch (step) {
      case 1: // Sélection du véhicule et du client
        if (!formData.vehicleId) {
          setError("Veuillez sélectionner un véhicule");
          return false;
        }
        if (!formData.clientId) {
          setError("Veuillez sélectionner un client");
          return false;
        }
        return true;

      case 2: // Informations sur le prêt
        if (!formData.startDate) {
          setError("Veuillez sélectionner une date de début");
          return false;
        }
        if (!formData.expectedEndDate) {
          setError("Veuillez sélectionner une date de fin prévue");
          return false;
        }
        if (!formData.startMileage) {
          setError("Veuillez indiquer le kilométrage de départ");
          return false;
        }
        return true;

      case 3: // État des lieux
        if (!conditionReport) {
          setError("Veuillez compléter l'état des lieux");
          return false;
        }
        return true;

      case 4: // Informations du conducteur
        if (!formData.driverName) {
          setError("Veuillez indiquer le nom du conducteur");
          return false;
        }
        if (!formData.driverLicenseNumber) {
          setError("Veuillez indiquer le numéro de permis de conduire");
          return false;
        }
        if (!formData.driverLicenseIssueDate) {
          setError("Veuillez indiquer la date de délivrance du permis");
          return false;
        }
        if (!formData.driverBirthdate) {
          setError("Veuillez indiquer la date de naissance du conducteur");
          return false;
        }
        if (!formData.driverBirthplace) {
          setError("Veuillez indiquer le lieu de naissance du conducteur");
          return false;
        }
        if (!formData.driverLicenseFrontUrl && !licensePreviews.front) {
          setError("Veuillez télécharger le recto du permis de conduire");
          return false;
        }
        return true;

      case 5: // Informations d'assurance
        if (!formData.insuranceCompany) {
          setError("Veuillez indiquer la compagnie d'assurance");
          return false;
        }
        if (!formData.insurancePolicyNumber) {
          setError("Veuillez indiquer le numéro de police d'assurance");
          return false;
        }
        return true;

      case 6: // Signatures
        if (!clientSignature) {
          setError("La signature du client est requise");
          return false;
        }
        if (!dealerSignature) {
          setError("Votre signature est requise");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Valider toutes les données avant soumission finale
  const validateAllData = () => {
    setError(null);

    // Vérifier les données essentielles
    if (!formData.vehicleId) {
      setError("Aucun véhicule sélectionné");
      return false;
    }

    if (!formData.clientId) {
      setError("Aucun client sélectionné");
      return false;
    }

    if (!formData.startDate) {
      setError("Date de début manquante");
      return false;
    }

    if (!formData.expectedEndDate) {
      setError("Date de fin prévue manquante");
      return false;
    }

    if (!formData.startMileage) {
      setError("Kilométrage de départ manquant");
      return false;
    }

    if (!conditionReport) {
      setError("État des lieux manquant");
      return false;
    }

    if (!formData.driverName) {
      setError("Nom du conducteur manquant");
      return false;
    }

    if (!formData.driverLicenseNumber) {
      setError("Numéro de permis de conduire manquant");
      return false;
    }

    if (!formData.driverLicenseIssueDate) {
      setError("Date de délivrance du permis manquante");
      return false;
    }

    if (!formData.driverBirthdate) {
      setError("Date de naissance du conducteur manquante");
      return false;
    }

    if (!formData.driverBirthplace) {
      setError("Lieu de naissance du conducteur manquant");
      return false;
    }

    if (!formData.driverLicenseFrontUrl) {
      setError("Recto du permis de conduire manquant");
      return false;
    }

    if (!formData.insuranceCompany) {
      setError("Compagnie d'assurance manquante");
      return false;
    }

    if (!formData.insurancePolicyNumber) {
      setError("Numéro de police d'assurance manquant");
      return false;
    }

    return true;
  };

  // Enregistrer l'état des lieux
  const handleConditionReportSave = (reportData) => {
    setConditionReport(reportData);
    goToNextStep();
  };

  // Enregistrer la signature du client
  const handleClientSignatureSave = (signatureUrl) => {
    setClientSignature(signatureUrl);
    setShowSignatureModal(null);
  };

  // Enregistrer la signature du carrossier
  const handleDealerSignatureSave = (signatureUrl) => {
    setDealerSignature(signatureUrl);
    setShowSignatureModal(null);
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    let timeoutId;
    setIsSubmitting(true);
    setError(null);

    try {
      // Valider toutes les données avant soumission
      if (!validateAllData()) {
        return;
      }

      timeoutId = setTimeout(() => {
        console.warn('Loan creation timed out');
        setIsSubmitting(false);
      }, 15000);

      // Vérifier que les signatures sont présentes
      const hasAllSignatures = clientSignature && dealerSignature;
      setSubmittedWithSignatures(hasAllSignatures);
      if (!hasAllSignatures) {
        toast.error(
          "Signature non enregistrée, vous pourrez la compléter plus tard.",
        );
      }

      // Préparer les données pour la création du prêt avec les bons noms de colonnes
      const loanData = {
        vehicle_id: formData.vehicleId,
        client_id: formData.clientId,
        start_date: formData.startDate,
        expected_end_date: formData.expectedEndDate,
        start_mileage: parseInt(formData.startMileage),
        start_fuel_level: parseInt(formData.startFuelLevel),
        driver_name: formData.driverName,
        driver_license_number: formData.driverLicenseNumber,
        driver_license_issue_date: formData.driverLicenseIssueDate,
        driver_birthdate: formData.driverBirthdate,
        driver_birthplace: formData.driverBirthplace,
        driver_license_front_url: formData.driverLicenseFrontUrl,
        driver_license_back_url: formData.driverLicenseBackUrl,
        insurance_company: formData.insuranceCompany,
        insurance_policy_number: formData.insurancePolicyNumber,
        notes: formData.notes,
        client_signature_url: clientSignature,
        dealer_signature_url: dealerSignature,
        signature_date: hasAllSignatures ? new Date().toISOString() : null,
        contract_signed: Boolean(hasAllSignatures), // Explicitly convert to boolean
        initial_condition_report: conditionReport,
      };

      // Créer le prêt
      const createdLoan = await withTimeout(VehicleLoan.create(loanData), 15000);

      // Mettre à jour les signatures et générer le contrat
      let updatedLoanId = createdLoan.id;
      if (hasAllSignatures) {
        const updatedLoan = await withTimeout(
          VehicleLoan.updateSignatures(createdLoan.id, {
            client_signature_url: clientSignature,
            dealer_signature_url: dealerSignature,
          }),
          15000
        );
        updatedLoanId = updatedLoan.id;
      }

      // Enregistrer l'ID du prêt créé
      setCreatedLoanId(updatedLoanId);

      // Afficher le message de succès
      setSuccess(true);

      // Rediriger vers la page de détail du prêt après 2 secondes
      setTimeout(() => {
        navigate(`/dashboard/loans/${updatedLoanId}`);
      }, 2000);
    } catch (error) {
      console.error("Error creating loan:", error);
      setError(
        error.message || "Une erreur est survenue lors de la création du prêt",
      );
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
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
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Prêt créé avec succès</h2>
          <p className="text-muted-foreground mb-4">
            {submittedWithSignatures
              ? "Le contrat de prêt a été généré avec les signatures."
              : "Le prêt a été créé sans signature. Vous pourrez les ajouter ultérieurement."}
          </p>
          <Link
            to={`/dashboard/loans/${createdLoanId}`}
            className="btn-primary py-2 px-4"
          >
            Voir les détails du prêt
          </Link>
        </div>
      </div>
    );
  }

  // Affichage du formulaire de création de prêt
  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex items-center space-x-2 mb-6">
        <Link
          to="/dashboard/loans"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Créer un prêt de véhicule</h1>
      </div>

      {/* Subscription limitation modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />

      {/* Indicateur d'étape */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4, 5, 6, 7].map((stepNumber) => (
            <div key={stepNumber} className="flex flex-1 items-center">
              <div
                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                  ${step === stepNumber ? "bg-primary text-primary-foreground" : step < stepNumber ? "bg-muted text-muted-foreground" : "bg-primary/80 text-primary-foreground"}
                `}
              >
                {step > stepNumber ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>

              {stepNumber < 7 && (
                <div
                  className={`h-0.5 flex-1 ${step > stepNumber ? "bg-primary/60" : "bg-muted"}`}
                ></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-1">
          <span>Véhicule</span>
          <span>Dates</span>
          <span>État</span>
          <span>Conducteur</span>
          <span>Assurance</span>
          <span>Signatures</span>
          <span>Validation</span>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Contenu de l'étape active */}
      <div className="bg-card rounded-lg border p-6">
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-6">
                Sélection du véhicule et du client
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sélection du véhicule */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium">
                    Véhicule à prêter *
                  </label>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Rechercher un véhicule..."
                      value={searchTerms.vehicle}
                      onChange={(e) =>
                        setSearchTerms((prev) => ({
                          ...prev,
                          vehicle: e.target.value,
                        }))
                      }
                      className="w-full pl-9"
                    />
                  </div>

                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {filteredVehicles.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {vehicles.length === 0 ? (
                          <>
                            <Car className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="mb-2">Aucun véhicule disponible</p>
                            <Link
                              to="/dashboard/loan-vehicles/add"
                              className="text-primary hover:underline text-sm"
                            >
                              Ajouter un véhicule de prêt
                            </Link>
                          </>
                        ) : (
                          "Aucun véhicule ne correspond à votre recherche"
                        )}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className={`p-4 cursor-pointer hover:bg-muted/20 transition-colors ${
                              selectedVehicle?.id === vehicle.id
                                ? "bg-primary/5 border-primary"
                                : ""
                            }`}
                            onClick={() => handleVehicleSelect(vehicle)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {vehicle.make} {vehicle.model}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {vehicle.registration || "Non immatriculé"} •{" "}
                                  {vehicle.current_mileage} km
                                </div>
                              </div>
                              {selectedVehicle?.id === vehicle.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sélection du client */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium">Client *</label>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      value={searchTerms.client}
                      onChange={(e) =>
                        setSearchTerms((prev) => ({
                          ...prev,
                          client: e.target.value,
                        }))
                      }
                      className="w-full pl-9"
                    />
                  </div>

                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        {clients.length === 0 ? (
                          <>
                            <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="mb-2">Aucun client disponible</p>
                            <Link
                              to="/dashboard/clients/add"
                              className="text-primary hover:underline text-sm"
                            >
                              Ajouter un client
                            </Link>
                          </>
                        ) : (
                          "Aucun client ne correspond à votre recherche"
                        )}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className={`p-4 cursor-pointer hover:bg-muted/20 transition-colors ${
                              selectedClient?.id === client.id
                                ? "bg-primary/5 border-primary"
                                : ""
                            }`}
                            onClick={() => handleClientSelect(client)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {client.first_name} {client.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {client.email ||
                                    client.phone ||
                                    "Pas de coordonnées"}
                                </div>
                              </div>
                              {selectedClient?.id === client.id && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sélections actuelles */}
            {(selectedVehicle || selectedClient) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t">
                {selectedVehicle && (
                  <div className="bg-muted/10 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm mb-2 flex items-center">
                      <Car className="h-4 w-4 mr-2 text-primary" />
                      Véhicule sélectionné
                    </h3>
                    <div className="text-sm">
                      <p className="font-medium">
                        {selectedVehicle.make} {selectedVehicle.model}
                      </p>
                      <p className="text-muted-foreground">
                        Immatriculation:{" "}
                        {selectedVehicle.registration || "Non immatriculée"}
                      </p>
                      <p className="text-muted-foreground">
                        Kilométrage: {selectedVehicle.current_mileage} km
                      </p>
                    </div>
                  </div>
                )}

                {selectedClient && (
                  <div className="bg-muted/10 p-4 rounded-lg border">
                    <h3 className="font-medium text-sm mb-2 flex items-center">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      Client sélectionné
                    </h3>
                    <div className="text-sm">
                      <p className="font-medium">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </p>
                      {selectedClient.email && (
                        <p className="text-muted-foreground">
                          {selectedClient.email}
                        </p>
                      )}
                      {selectedClient.phone && (
                        <p className="text-muted-foreground">
                          {selectedClient.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-6">
                Dates et conditions du prêt
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date de début */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Date de début *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        handleChange("startDate", e.target.value)
                      }
                      className="w-full pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Date de fin prévue */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Date de fin prévue *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={formData.expectedEndDate}
                      onChange={(e) =>
                        handleChange("expectedEndDate", e.target.value)
                      }
                      className="w-full pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Kilométrage de départ */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Kilométrage de départ *
                  </label>
                  <input
                    type="number"
                    value={formData.startMileage}
                    onChange={(e) =>
                      handleChange("startMileage", parseInt(e.target.value))
                    }
                    className="w-full"
                    min="0"
                    required
                  />
                </div>

                {/* Niveau de carburant */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Niveau de carburant *
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.startFuelLevel}
                    onChange={(e) =>
                      handleChange("startFuelLevel", parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Vide</span>
                    <span>1/4</span>
                    <span>1/2</span>
                    <span>3/4</span>
                    <span>Plein</span>
                  </div>
                  <div className="text-center font-medium mt-2">
                    {formData.startFuelLevel}%
                  </div>
                </div>

                {/* Notes sur le prêt */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium">
                    Notes sur le prêt
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="w-full h-24"
                    placeholder="Conditions particulières, informations supplémentaires..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Récapitulatif du véhicule et du client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t">
              <div className="bg-muted/10 p-4 rounded-lg border">
                <h3 className="font-medium text-sm mb-2 flex items-center">
                  <Car className="h-4 w-4 mr-2 text-primary" />
                  Véhicule
                </h3>
                <div className="text-sm">
                  <p className="font-medium">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </p>
                  <p className="text-muted-foreground">
                    Immatriculation:{" "}
                    {selectedVehicle.registration || "Non immatriculée"}
                  </p>
                </div>
              </div>

              <div className="bg-muted/10 p-4 rounded-lg border">
                <h3 className="font-medium text-sm mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  Client
                </h3>
                <div className="text-sm">
                  <p className="font-medium">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </p>
                  {selectedClient.email && (
                    <p className="text-muted-foreground">
                      {selectedClient.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <VehicleConditionReport
            vehicleData={selectedVehicle}
            onSave={handleConditionReportSave}
            onCancel={() => goToPreviousStep()}
          />
        )}

        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-6">
                Informations du conducteur
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom du conducteur */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Nom du conducteur *
                  </label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => handleChange("driverName", e.target.value)}
                    className="w-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Par défaut, le nom du client
                  </p>
                </div>

                {/* Numéro de permis */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Numéro de permis de conduire *
                  </label>
                  <input
                    type="text"
                    value={formData.driverLicenseNumber}
                    onChange={(e) =>
                      handleChange("driverLicenseNumber", e.target.value)
                    }
                    className="w-full"
                    required
                  />
                </div>

                {/* Date de délivrance du permis */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Date de délivrance du permis *
                  </label>
                  <input
                    type="date"
                    value={formData.driverLicenseIssueDate}
                    onChange={(e) =>
                      handleChange("driverLicenseIssueDate", e.target.value)
                    }
                    className="w-full"
                    required
                  />
                </div>

                {/* Date de naissance */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Date de naissance *
                  </label>
                  <input
                    type="date"
                    value={formData.driverBirthdate}
                    onChange={(e) =>
                      handleChange("driverBirthdate", e.target.value)
                    }
                    className="w-full"
                    required
                  />
                </div>

                {/* Lieu de naissance */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium">
                    Lieu de naissance *
                  </label>
                  <input
                    type="text"
                    value={formData.driverBirthplace}
                    onChange={(e) =>
                      handleChange("driverBirthplace", e.target.value)
                    }
                    className="w-full"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Permis de conduire */}
            <div>
              <h3 className="text-base font-medium mb-4">Permis de conduire</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recto du permis */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Recto du permis *
                  </label>
                  <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    {licensePreviews.front ? (
                      <div className="relative">
                        <img
                          src={licensePreviews.front}
                          alt="Recto du permis"
                          className="max-h-48 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => removeLicense("front")}
                          className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-muted-foreground mb-4">
                          Téléchargez le recto du permis
                        </p>
                        <input
                          type="file"
                          ref={frontLicenseRef}
                          onChange={(e) => handleLicenseUpload(e, "front")}
                          accept="image/*"
                          className="hidden"
                        />
                        <input
                          type="file"
                          ref={frontLicenseCameraRef}
                          onChange={(e) => handleLicenseUpload(e, "front")}
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                        />
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => frontLicenseRef.current?.click()}
                            className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                          >
                            <Upload className="h-4 w-4 mr-1.5" />
                            Parcourir...
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              frontLicenseCameraRef.current?.click()
                            }
                            className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                          >
                            <Camera className="h-4 w-4 mr-1.5" />
                            Prendre une photo
                          </button>
                        </div>
                      </div>
                    )}

                    {isUploadingLicense && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                        <Loader className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Verso du permis */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Verso du permis
                  </label>
                  <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    {licensePreviews.back ? (
                      <div className="relative">
                        <img
                          src={licensePreviews.back}
                          alt="Verso du permis"
                          className="max-h-48 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => removeLicense("back")}
                          className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-muted-foreground mb-4">
                          Téléchargez le verso du permis
                        </p>
                        <input
                          type="file"
                          ref={backLicenseRef}
                          onChange={(e) => handleLicenseUpload(e, "back")}
                          accept="image/*"
                          className="hidden"
                        />
                        <input
                          type="file"
                          ref={backLicenseCameraRef}
                          onChange={(e) => handleLicenseUpload(e, "back")}
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                        />
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => backLicenseRef.current?.click()}
                            className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                          >
                            <Upload className="h-4 w-4 mr-1.5" />
                            Parcourir...
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              backLicenseCameraRef.current?.click()
                            }
                            className="btn-outline py-1.5 px-3 text-sm inline-flex items-center"
                          >
                            <Camera className="h-4 w-4 mr-1.5" />
                            Prendre une photo
                          </button>
                        </div>
                      </div>
                    )}

                    {isUploadingLicense && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-lg">
                        <Loader className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-6">
                Informations d'assurance
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Compagnie d'assurance */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Compagnie d'assurance *
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.insuranceCompany}
                      onChange={(e) =>
                        handleChange("insuranceCompany", e.target.value)
                      }
                      className="w-full pl-10"
                      placeholder="Ex: AXA, Allianz, MAIF..."
                      required
                    />
                  </div>
                </div>

                {/* Numéro de police */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Numéro de police d'assurance *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.insurancePolicyNumber}
                      onChange={(e) =>
                        handleChange("insurancePolicyNumber", e.target.value)
                      }
                      className="w-full pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1 text-amber-700">
                      Information importante
                    </p>
                    <p className="text-amber-600">
                      Assurez-vous que le véhicule est couvert par l'assurance
                      du conducteur pour la durée du prêt. En cas d'accident ou
                      de sinistre, c'est l'assurance du conducteur qui sera
                      sollicitée.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-6">Signature du contrat</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Signature du client */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Signature du client *
                  </label>
                  <div className="border rounded-lg p-4">
                    {clientSignature ? (
                      <div className="relative">
                        <img
                          src={clientSignature}
                          alt="Signature du client"
                          className="max-h-32 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setClientSignature(null)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-muted-foreground mb-4">
                          Signature du client requise
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSignatureModal("client")}
                          className="btn-primary py-1.5 px-4 text-sm inline-flex items-center"
                        >
                          Signer maintenant
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signature du carrossier */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Votre signature *
                  </label>
                  <div className="border rounded-lg p-4">
                    {dealerSignature ? (
                      <div className="relative">
                        <img
                          src={dealerSignature}
                          alt="Signature du carrossier"
                          className="max-h-32 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setDealerSignature(null)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-muted-foreground mb-4">
                          Votre signature est requise
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSignatureModal("dealer")}
                          className="btn-primary py-1.5 px-4 text-sm inline-flex items-center"
                        >
                          Signer maintenant
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">
                      Importance des signatures
                    </p>
                    <p>
                      Les signatures électroniques ont valeur légale en France
                      selon le Règlement eIDAS. Le contrat généré inclura ces
                      signatures ainsi qu'un tampon d'entreprise numérique.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium mb-6">
                Récapitulatif et validation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations générales */}
                <div className="bg-muted/10 p-4 rounded-lg border">
                  <h3 className="font-medium text-sm mb-3 border-b pb-2">
                    Informations générales
                  </h3>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Véhicule:
                        </p>
                        <p className="font-medium">
                          {selectedVehicle.make} {selectedVehicle.model}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Client:</p>
                        <p className="font-medium">
                          {selectedClient.first_name} {selectedClient.last_name}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Date de début:
                        </p>
                        <p className="font-medium">
                          {formatDate(formData.startDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Date de fin prévue:
                        </p>
                        <p className="font-medium">
                          {formatDate(formData.expectedEndDate)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Kilométrage:
                        </p>
                        <p className="font-medium">
                          {formData.startMileage} km
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Niveau carburant:
                        </p>
                        <p className="font-medium">
                          {formData.startFuelLevel}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations du conducteur */}
                <div className="bg-muted/10 p-4 rounded-lg border">
                  <h3 className="font-medium text-sm mb-3 border-b pb-2">
                    Informations du conducteur
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Conducteur:
                      </p>
                      <p className="font-medium">{formData.driverName}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Permis de conduire:
                      </p>
                      <p className="font-medium">
                        {formData.driverLicenseNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Date de naissance:
                        </p>
                        <p className="font-medium">
                          {formatDate(formData.driverBirthdate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Lieu de naissance:
                        </p>
                        <p className="font-medium">
                          {formData.driverBirthplace}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* État des lieux et Assurance */}
                <div className="bg-muted/10 p-4 rounded-lg border">
                  <h3 className="font-medium text-sm mb-3 border-b pb-2">
                    État des lieux
                  </h3>

                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Propreté extérieure:</span>{" "}
                      <span className="capitalize">
                        {conditionReport?.cleanlinessExterior || "Non spécifié"}
                      </span>
                    </p>

                    <p className="text-sm">
                      <span className="font-medium">Propreté intérieure:</span>{" "}
                      <span className="capitalize">
                        {conditionReport?.cleanlinessInterior || "Non spécifié"}
                      </span>
                    </p>

                    <p className="text-sm">
                      <span className="font-medium">Dommages signalés:</span>{" "}
                      <span>{conditionReport?.damages?.length || 0}</span>
                    </p>

                    <p className="text-sm">
                      <span className="font-medium">Photos:</span>{" "}
                      <span>{conditionReport?.photos?.length || 0}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-muted/10 p-4 rounded-lg border">
                  <h3 className="font-medium text-sm mb-3 border-b pb-2">
                    Assurance
                  </h3>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Compagnie:
                      </p>
                      <p className="font-medium">{formData.insuranceCompany}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">
                        N° de police:
                      </p>
                      <p className="font-medium">
                        {formData.insurancePolicyNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="md:col-span-2 bg-muted/10 p-4 rounded-lg border">
                  <h3 className="font-medium text-sm mb-3 border-b pb-2">
                    Signatures
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Signature du client:
                      </p>
                      {clientSignature ? (
                        <img
                          src={clientSignature}
                          alt="Signature du client"
                          className="max-h-16 mx-auto border p-1 rounded"
                        />
                      ) : (
                        <div className="p-2 bg-destructive/10 text-destructive rounded">
                          Signature manquante
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Signature du carrossier:
                      </p>
                      {dealerSignature ? (
                        <img
                          src={dealerSignature}
                          alt="Signature du carrossier"
                          className="max-h-16 mx-auto border p-1 rounded"
                        />
                      ) : (
                        <div className="p-2 bg-destructive/10 text-destructive rounded">
                          Signature manquante
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t">
                <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Prêt à finaliser</p>
                    <p>
                      En validant ce prêt, un contrat officiel sera généré avec
                      les signatures électroniques et le tampon de votre
                      entreprise. Ce document sera téléchargeable par vous et le
                      client.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation entre les étapes */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={step === 1}
            className={
              step === 1
                ? "invisible"
                : "btn-outline py-2 px-4 flex items-center"
            }
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="btn-primary py-2 px-4 flex items-center"
              disabled={
                isUploadingLicense ||
                (step === 1 && (!formData.vehicleId || !formData.clientId)) ||
                (step === 3 && !conditionReport)
              }
            >
              {isUploadingLicense && (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              )}
              Suivant
              {!isUploadingLicense && <ChevronRight className="h-4 w-4 ml-2" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !clientSignature || !dealerSignature}
              className="btn-primary py-2 px-4 flex items-center"
            >
              {isSubmitting ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Valider le prêt
            </button>
          )}
        </div>
      </div>

      {/* Modals pour les signatures */}
      {showSignatureModal === "client" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <ElectronicSignature
              onSave={handleClientSignatureSave}
              onCancel={() => setShowSignatureModal(null)}
              signerType="client"
              title="Signature du client"
            />
          </motion.div>
        </div>
      )}

      {showSignatureModal === "dealer" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <ElectronicSignature
              onSave={handleDealerSignatureSave}
              onCancel={() => setShowSignatureModal(null)}
              signerType="dealer"
              userProfile={userProfile}
              title="Votre signature"
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CreateLoanPage;
