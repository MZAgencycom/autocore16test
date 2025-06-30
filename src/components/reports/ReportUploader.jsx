import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { withTimeout } from '../../utils/withTimeout';
import downloadFile from '../../utils/downloadFile';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileIcon, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Sparkles,
  Brain,
  Scan,
  Loader,
  User,
  Car,
  Check,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { analyzePDF } from '../../lib/ocr';
import DuplicateClientAlert from './DuplicateClientAlert';
import { Client } from '../../models/Client';
import { Vehicle } from '../../models/Vehicle';
import { Report } from '../../models/Report';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../../components/subscription/SubscriptionLimitModal';

const ReportUploader = ({ showReportLists = true }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ status: '', progress: 0 });
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [duplicateData, setDuplicateData] = useState({ clients: [], vehicles: [] });
  const fileInputRef = useRef(null);
  // Add state to store uploaded file metadata
  const [uploadedFileMeta, setUploadedFileMeta] = useState({ fileUrl: null, fileName: null });
  
  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setIsLoadingReports(true);
      const data = await withTimeout(Report.getAll(), 10000, 'timeout');
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error(error.message || 'Échec de chargement des rapports');
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    // Only accept PDF and images
    if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError("Format de fichier non supporté. Veuillez sélectionner un PDF ou une image.");
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    // Check subscription limits before processing
    const result = await checkActionPermission('report');
    if (!result.canProceed) {
      setLimitInfo(result);
      setShowLimitModal(true);
      return;
    }
    
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(10); // Start progress
      setError(null);
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `reports/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, file);
        
      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`);
      }
      
      setUploadProgress(100); // Complete progress
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);
      
      // Store the file metadata
      setUploadedFileMeta({ fileUrl: publicUrl, fileName: file.name });
      
      // Start analyzing the PDF
      await analyzeReport(file, publicUrl, file.name);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(error.message || "Une erreur est survenue lors du téléchargement");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const analyzeReport = async (file, fileUrl, fileName) => {
    try {
      setIsAnalyzing(true);
      setAnalyzeProgress({ status: 'starting', progress: 0 });
      
      // Analyze the PDF
      const data = await analyzePDF(file, (progressData) => {
        setAnalyzeProgress(progressData);
      });
      
      // Update extracted data
      setExtractedData(data);
      
      // Check for duplicate clients
      if (data.client.firstName && data.client.lastName) {
        const duplicateCheckResult = await Client.findDuplicate(
          data.client.firstName,
          data.client.lastName,
          data.vehicle.registration
        );
        
        if (duplicateCheckResult.isDuplicate) {
          setDuplicateData(duplicateCheckResult);
          setShowDuplicateAlert(true);
        } else {
          // No duplicates, proceed with creating the client and vehicle
          await createClientVehicleAndReport(data, fileUrl, fileName);
        }
      } else {
        await createClientVehicleAndReport(data, fileUrl, fileName);
      }
      
    } catch (error) {
      console.error("Error analyzing report:", error);
      setError(error.message || "Une erreur est survenue lors de l'analyse du rapport");
      setIsAnalyzing(false);
    }
  };
  
  const createClientVehicleAndReport = async (data, fileUrl, fileName) => {
    try {
      // Create client
      const clientId = await Client.create({
        firstName: data.client.firstName || 'Unknown',
        lastName: data.client.lastName || 'Unknown',
        email: data.client.email,
        phone: data.client.phone,
        address: data.client.address
      });
      
      // Create vehicle
      const vehicleId = await Vehicle.create(clientId, {
        make: data.vehicle.make || 'Unknown',
        model: data.vehicle.model || 'Unknown',
        registration: data.vehicle.registration,
        vin: data.vehicle.vin,
        year: data.vehicle.year ? parseInt(data.vehicle.year) : null,
        mileage: data.vehicle.mileage ? parseInt(data.vehicle.mileage) : null
      });
      
      // Create report
      const report = await Report.create({
        clientId,
        vehicleId,
        fileUrl,
        fileName,
        status: 'analyzed',
        extractedData: data,
        partsCount: data.parts ? data.parts.length : 0,
        laborHours: data.laborHours || 0
      });
      
      // Show success and reload reports
      setSuccess(true);
      await loadReports();
      
      // Navigate to report details after 2 seconds
      setTimeout(() => {
        navigate(`/dashboard/reports/${report.id}`);
      }, 2000);
      
    } catch (error) {
      console.error("Error creating client, vehicle and report:", error);
      setError(error.message || "Une erreur est survenue lors de la création des données");
      setIsAnalyzing(false);
    }
  };
  
  const handleDuplicateDecision = async (decision) => {
    setShowDuplicateAlert(false);
    
    if (decision.cancelled) {
      setIsAnalyzing(false);
      return;
    }
    
    try {
      let clientId;
      let vehicleId;
      
      if (decision.useExistingClient) {
        clientId = decision.selectedClientId;
        
        if (decision.useExistingVehicle) {
          vehicleId = decision.selectedVehicleId;
        } else {
          // Create a new vehicle for existing client
          vehicleId = await Vehicle.create(clientId, {
            make: extractedData.vehicle.make || 'Unknown',
            model: extractedData.vehicle.model || 'Unknown',
            registration: extractedData.vehicle.registration,
            vin: extractedData.vehicle.vin,
            year: extractedData.vehicle.year ? parseInt(extractedData.vehicle.year) : null,
            mileage: extractedData.vehicle.mileage ? parseInt(extractedData.vehicle.mileage) : null
          });
        }
      } else {
        // Create a new client
        clientId = await Client.create({
          firstName: extractedData.client.firstName || 'Unknown',
          lastName: extractedData.client.lastName || 'Unknown',
          email: extractedData.client.email,
          phone: extractedData.client.phone,
          address: extractedData.client.address
        });
        
        // Create a new vehicle
        vehicleId = await Vehicle.create(clientId, {
          make: extractedData.vehicle.make || 'Unknown',
          model: extractedData.vehicle.model || 'Unknown',
          registration: extractedData.vehicle.registration,
          vin: extractedData.vehicle.vin,
          year: extractedData.vehicle.year ? parseInt(extractedData.vehicle.year) : null,
          mileage: extractedData.vehicle.mileage ? parseInt(extractedData.vehicle.mileage) : null
        });
      }
      
      // Create the report - Use the stored file metadata instead of extractedData
      const report = await Report.create({
        clientId,
        vehicleId,
        fileUrl: uploadedFileMeta.fileUrl, // Use stored file URL
        fileName: uploadedFileMeta.fileName, // Use stored file name
        status: 'analyzed',
        extractedData,
        partsCount: extractedData.parts ? extractedData.parts.length : 0,
        laborHours: extractedData.laborHours || 0
      });
      
      // Show success and reload reports
      setSuccess(true);
      await loadReports();
      
      // Navigate to report details after 2 seconds
      setTimeout(() => {
        navigate(`/dashboard/reports/${report.id}`);
      }, 2000);
      
    } catch (error) {
      console.error("Error after duplicate decision:", error);
      setError(error.message || "Une erreur est survenue lors du traitement des données");
      setIsAnalyzing(false);
    }
  };
  
  const renderUploadZone = () => (
    <div
      id="report-dropzone"
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center">
        <div className="mb-4 p-3 rounded-full bg-muted">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Déposez votre rapport d'expertise</h3>
        <div className="mb-4 text-muted-foreground flex items-center space-x-2">
          <span>ou</span>
          <button
            type="button"
            className="btn-gradient flex items-center space-x-2 text-sm shadow"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            <span>Parcourir</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          PDF ou image, max 10MB
        </p>
        <input 
          type="file" 
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,image/*"
        />
      </div>
    </div>
  );
  
  const renderSelectedFile = () => (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-muted rounded">
            <FileIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={removeFile}
          className="text-muted-foreground hover:text-destructive p-1 rounded-full hover:bg-muted/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4">
        <button 
          type="button" 
          className="btn-primary w-full py-2 flex items-center justify-center"
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Téléchargement en cours ({uploadProgress}%)...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Télécharger et analyser
            </>
          )}
        </button>
      </div>
    </div>
  );
  
  const getAnalysisStatusText = (status) => {
    switch(status) {
      case 'starting': return 'Démarrage de l\'analyse...';
      case 'extracting': return 'Extraction du texte...';
      case 'recognizing': return 'Reconnaissance du texte...';
      case 'processing': return 'Traitement du document...';
      case 'processing-page': return 'Traitement des pages...';
      case 'converting-fallback': return 'Conversion du document...';
      case 'openai_processing': return 'Analyse IA avancée...';
      case 'analyzing': return 'Analyse des données...';
      case 'analyzing_labor': return 'Analyse des heures de main d\'œuvre...';
      default: return 'Analyse en cours...';
    }
  };
  
  const renderAnalysisProgress = () => (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <div className="relative">
            <Brain className="h-10 w-10 text-primary" />
            <motion.div 
              className="absolute inset-0 rounded-full bg-primary/20" 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Analyse du rapport en cours</h3>
        <p className="mb-6 text-muted-foreground">
          {getAnalysisStatusText(analyzeProgress.status)}
        </p>
        <div className="w-full mb-3 bg-muted/30 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="bg-primary h-full" 
            animate={{ width: `${analyzeProgress.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {Math.round(analyzeProgress.progress)}% complété
        </p>
      </div>
    </div>
  );
  
  const renderSuccess = () => (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col items-center text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="bg-emerald-500/10 text-emerald-500 p-6 rounded-full mb-4"
        >
          <CheckCircle className="h-10 w-10" />
        </motion.div>
        
        <h3 className="text-xl font-bold mb-2">Analyse terminée avec succès !</h3>
        
        <p className="mb-6 text-muted-foreground">
          Le rapport a été analysé et les données ont été extraites. 
          Vous allez être redirigé vers les détails du rapport...
        </p>
        
        <div className="animate-pulse">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
  
  // Split reports into analyzed and pending
  const analyzedReports = reports.filter(report => report.status === 'analyzed');
  const pendingReports = reports.filter(report => report.status !== 'analyzed');

  if (!showReportLists) {
    return (
      <div className="p-4 sm:p-6">
        {/* Subscription limitation modal */}
        <SubscriptionLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          reason={limitInfo?.reason}
          details={limitInfo?.details}
          upgradePriceId={limitInfo?.upgrade}
        />

        <h1 className="text-2xl font-bold mb-6">Importer un rapport d'expertise</h1>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1 text-left space-y-2">
            <h2 className="text-xl font-semibold">Analyse automatique</h2>
            <p className="text-sm text-muted-foreground">
              Importez un rapport d'expertise PDF pour extraire automatiquement les informations client, véhicule et les travaux à effectuer.
            </p>
          </div>
          <div className="flex-1">
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Erreur</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {!file && !isAnalyzing && !success && renderUploadZone()}
            {file && !isUploading && !isAnalyzing && !success && renderSelectedFile()}
            {(isUploading || isAnalyzing) && !success && renderAnalysisProgress()}
            {success && renderSuccess()}

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>L'IA analyse automatiquement le rapport et en extrait les informations pertinentes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-primary/10 text-primary rounded-full">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Analyse IA avancée</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Notre IA détecte automatiquement les informations suivantes :
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center space-x-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Coordonnées client</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Détails du véhicule</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Pièces à remplacer</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Temps de main d'œuvre</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showDuplicateAlert && (
            <DuplicateClientAlert
              duplicateData={duplicateData}
              extractedData={extractedData}
              onDecision={handleDuplicateDecision}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6`}>
      {/* Subscription limitation modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />
      
      <h1 className="text-2xl font-bold mb-6">Importer un rapport d'expertise</h1>
      
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-5 space-y-6">
          <div className="bg-card rounded-lg border p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Analyse automatique</h2>
            <p className="mb-6 text-muted-foreground">
              Importez un rapport d'expertise PDF pour extraire automatiquement les informations client, véhicule et les travaux à effectuer.
            </p>
            
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Erreur</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {!file && !isAnalyzing && !success && renderUploadZone()}
            {file && !isUploading && !isAnalyzing && !success && renderSelectedFile()}
            {(isUploading || isAnalyzing) && !success && renderAnalysisProgress()}
            {success && renderSuccess()}
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>L'IA analyse automatiquement le rapport et en extrait les informations pertinentes</span>
              </div>
            </div>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Analyse IA avancée</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Notre IA détecte automatiquement les informations suivantes :
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-center space-x-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>Coordonnées client</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>Détails du véhicule</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>Pièces à remplacer</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>Temps de main d'œuvre</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {showReportLists && (
        <div className="md:col-span-7">
          <div className="space-y-6">
            {/* Section des rapports analysés */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Rapports analysés récemment</h2>
              
              {isLoadingReports ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : analyzedReports.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {analyzedReports.slice(0, 4).map((report) => (
                    <Link
                      key={report.id}
                      to={`/dashboard/reports/${report.id}`}
                      className="border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-primary/10 text-primary rounded">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3
                              className="font-medium text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis"
                              title={report.file_name}
                            >
                              {report.file_name || `Rapport #${report.id.substring(0, 8)}`}
                            </h3>
                            {report.file_url && (
                              <button
                                type="button"
                                className="ml-2 text-muted-foreground hover:text-primary"
                                title="Télécharger"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await downloadFile(report.file_url, 'rapport.pdf')
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 mr-2">
                              Analysé
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">
                                {report.clients?.first_name} {report.clients?.last_name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Car className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">
                                {report.vehicles?.make} {report.vehicles?.model}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-1">Aucun rapport analysé</h3>
                  <p className="text-muted-foreground mb-6">
                    Importez votre premier rapport pour commencer
                  </p>
                </div>
              )}
              
              {analyzedReports.length > 4 && (
                <div className="mt-3 text-center">
                  <Link to="/dashboard/reports" className="text-primary text-sm hover:underline">
                    Voir tous les rapports analysés ({analyzedReports.length})
                  </Link>
                </div>
              )}
            </div>
            
            {/* Section des rapports en attente */}
            {pendingReports.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Rapports en attente</h2>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingReports.slice(0, 4).map((report) => (
                    <Link
                      key={report.id}
                      to={`/dashboard/reports/${report.id}`}
                      className="border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3
                              className="font-medium text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis"
                              title={report.file_name}
                            >
                              {report.file_name || `Rapport #${report.id.substring(0, 8)}`}
                            </h3>
                            {report.file_url && (
                              <button
                                type="button"
                                className="ml-2 text-muted-foreground hover:text-primary"
                                title="Télécharger"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await downloadFile(report.file_url, 'rapport.pdf')
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 mr-2">
                              En attente
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">
                                {report.clients?.first_name} {report.clients?.last_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                
                {pendingReports.length > 4 && (
                  <div className="mt-3 text-center">
                    <Link to="/dashboard/reports/pending" className="text-primary text-sm hover:underline">
                      Voir tous les rapports en attente ({pendingReports.length})
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <AnimatePresence>
        {showDuplicateAlert && (
          <DuplicateClientAlert
            duplicateData={duplicateData}
            extractedData={extractedData}
            onDecision={handleDuplicateDecision}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReportUploader;