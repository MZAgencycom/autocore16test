import { useState, useEffect, useRef } from 'react';

// ⚠️ IMPORTANT : ce formulaire doit rester fonctionnel même après un changement d'onglet
// Ne pas reset les états, ne pas désactiver les handlers, et restaurer les données si perdues
// But : permettre à l'utilisateur de travailler librement comme sur n'importe quelle app moderne
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, X, ArrowLeft, Calendar, User, Car, Loader, Sparkles, Building, CloudLightning as Lightning, Info, Plus } from 'lucide-react';
import { Invoice } from '../../models/Invoice';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { sanitizeParts, parseNumber, findMismatchLine, findExportDiscrepancies } from '../../utils/invoiceUtils.js';
import { useSession } from '../../hooks/useSession';

const round = (val) => Math.round(val * 100) / 100;

const impactingFields = ['laborHours', 'laborRate', 'taxRate'];


const InvoiceGenerator = ({ report, onClose }) => {
  // Preserve the report data across tab switches
  const reportRef = useRef(report)
  const essentialDataRef = useRef({
    report,
    vehicle: report?.vehicle,
    client: report?.client,
  });

  useEffect(() => {
    if (report) {
      reportRef.current = report;
      essentialDataRef.current = {
        report,
        vehicle: report.vehicle,
        client: report.client,
      };
    }
  }, [report]);

  const currentReport = reportRef.current;
  const navigate = useNavigate();
  const { executeWithValidSession } = useSession();
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    parts: [],
    laborHours: 0,
    laborRate: 70,
    laborDetails: [],
    subtotal: 0,
    taxRate: 0.2,
    taxAmount: 0,
    total: 0,
    notes: '',
    template: 'white',
    templateColor: 'blue',
    insurer: null,
    clientAddress: ''
  });

  // Persist form data to sessionStorage to survive tab switches
  useEffect(() => {
    if (currentReport) {
      sessionStorage.setItem(
        'invoiceGeneratorData',
        JSON.stringify({ reportId: currentReport.id, data: formData })
      )
    }
  }, [formData, currentReport])

  useEffect(() => {
    return () => sessionStorage.removeItem('invoiceGeneratorData')
  }, [])

  // Ne rien faire quand l'onglet redevient actif
  useEffect(() => {
    const handleTabFocus = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App] Onglet redevenu actif – ne rien faire');
      }
    };

    document.addEventListener('visibilitychange', handleTabFocus);
    return () => document.removeEventListener('visibilitychange', handleTabFocus);
  }, [currentReport]);

  // Désactivé: plus de récupération automatique de l'état à la remise au premier plan
  const formDataRef = useRef(formData)
  const [isLoading, setIsLoading] = useState(false);
  const [submitEnabled, setSubmitEnabled] = useState(true);
  const hasSubmitted = useRef(false);
  const loadingStartTimeRef = useRef(null)
  useEffect(() => { formDataRef.current = formData }, [formData])

  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    const stored = sessionStorage.getItem('invoiceGeneratorData')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (currentReport && parsed.reportId === currentReport.id) {
          formDataRef.current = parsed.data
          setFormData(parsed.data)
        }
      } catch (e) {
        console.error('Erreur lors de la restauration de la génération de facture:', e)
      }
    }
  }, [currentReport])

  useEffect(() => {
    if (isLoading) {
      loadingStartTimeRef.current = Date.now()
    } else {
      loadingStartTimeRef.current = null
    }
  }, [isLoading, navigate])

  // Display an error if loading takes too long
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // No tabVisibleAgain recovery to avoid state resets on tab switch

  // Removed visibility recovery logic to keep state untouched


  
  const [isDone, setIsDone] = useState(false);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showAddressAlert, setShowAddressAlert] = useState(true);
  const initialTotalsRef = useRef({ subtotal: 0, tax: 0, total: 0 });
  const [lineMismatch, setLineMismatch] = useState(null);
  const [totalsMismatch, setTotalsMismatch] = useState(false);
  
  // Initialiser les données du formulaire depuis le rapport
  useEffect(() => {
    if (currentReport) {
      // Calculer la date d'échéance (30 jours après la date d'émission)
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Générer un numéro de facture basé sur la date
      const invoiceNumber = `F-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Récupérer l'adresse client si elle existe
      const clientAddress = currentReport.client.address || '';
      
      // Utiliser directement les valeurs du rapport sans recalculer
      const updatedFormData = {
        invoiceNumber,
        issueDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        parts: sanitizeParts(currentReport.parts || []),
        laborHours: currentReport.laborHours || 0,
        laborRate: currentReport.laborRate || 70,
        laborDetails: currentReport.laborDetails || [],
        // Utiliser directement les montants du rapport s'ils existent
        subtotal: currentReport.totalHT || 0,
        taxAmount: currentReport.taxAmount || 0,
        total: currentReport.totalTTC || 0,
        taxRate: currentReport.taxRate || 0.2,
        notes: '',
        template: 'white',
        templateColor: 'blue',
        insurer: currentReport.insurer || null,
        clientAddress: clientAddress
      };

      setFormData(updatedFormData);
      initialTotalsRef.current = {
        subtotal: updatedFormData.subtotal,
        tax: updatedFormData.taxAmount,
        total: updatedFormData.total,
      };

      if (Math.abs((updatedFormData.subtotal + updatedFormData.taxAmount) - (currentReport.totalTTC || 0)) > 0.01) {
        setError('⚠️ Incohérence entre la facture générée et le rapport. Vérifiez les lignes manquantes.');
      } else {
        setError(null);
      }
    }
  }, [report]);
  
  // Calculer les totaux (sous-total, TVA, total)
  const calculateTotals = (data) => {
    // Filtrer les pièces valides avant de calculer
    const validParts = data.parts.filter(
      (p) =>
        p.description?.trim() &&
        parseFloat(p.quantity) > 0 &&
        parseFloat(p.unitPrice) > 0
    );

    // Calculer le total des pièces à partir des pièces filtrées
    const partsTotal = validParts.reduce((sum, part) => {
      const quantity = parseFloat(part.quantity) || 0;
      const unitPrice = parseFloat(part.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
    
    // Calculer le total de main d'œuvre
    const laborTotal = (data.laborHours || 0) * (data.laborRate || 0);
    
    // Sous-total
    const subtotal = round(partsTotal + laborTotal);
    
    // TVA
    const taxAmount = round(subtotal * (data.taxRate || 0.2));
    
    // Total
    const total = round(subtotal + taxAmount);
    
    // Mettre à jour les données
    data.subtotal = subtotal || 0;
    data.taxAmount = taxAmount || 0;
    data.total = total || 0;
    
    return data;
  };
  
  // Mettre à jour un champ du formulaire
  const updateField = (field, value) => {
    setFormData(prev => {
      if (prev[field] === value) return prev;
      const updated = { ...prev, [field]: value };

      if (impactingFields.includes(field)) {
        return calculateTotals(updated);
      }

      return updated;
    });
  };
  
  // Mettre à jour une pièce
  const updatePart = (index, field, value) => {
    setFormData(prev => {
      const updatedParts = [...prev.parts];
      if (updatedParts[index] && updatedParts[index][field] === value) return prev;
      updatedParts[index] = { ...updatedParts[index], [field]: value };

      const updated = { ...prev, parts: updatedParts };
      return calculateTotals(updated);
    });
  };
  
  // Ajouter une nouvelle pièce
  const addPart = () => {
    setFormData(prev => {
      const updatedParts = [...prev.parts, { description: '', quantity: 1, unitPrice: 0, category: 'piece' }];
      return { ...prev, parts: updatedParts };
    });
  };
  
  // Supprimer une pièce
  const removePart = (index) => {
    setFormData(prev => {
      // Créer une copie des pièces sans celle à supprimer
      const removed = prev.parts[index];
      const updatedParts = prev.parts.filter((_, i) => i !== index);

      const updated = { ...prev, parts: updatedParts };

      const isValidRemoved =
        removed?.description?.trim() &&
        parseFloat(removed.quantity) > 0 &&
        parseFloat(removed.unitPrice) > 0;

      if (!isValidRemoved) {
        return { ...updated };
      }

      return calculateTotals(updated);
    });
  };

  // Vérifier les incohérences à chaque modification
  useEffect(() => {
    if (!currentReport) return;
    const mismatch = findMismatchLine(currentReport.parts || [], formData.parts || []);
    setLineMismatch(mismatch);
    const mismatches = findExportDiscrepancies(currentReport, {
      ...formData,
      parts: formData.parts,
      subtotal: formData.subtotal,
      tax_amount: formData.taxAmount,
      total: formData.total,
      labor_hours: formData.laborHours,
      labor_rate: formData.laborRate,
      report: currentReport
    });
    setTotalsMismatch(mismatches.length > 0);
  }, [formData.parts, formData.subtotal, formData.taxAmount, formData.total, formData.laborHours, formData.laborRate, currentReport]);
  
  // Gérer la soumission du formulaire
  const submitInvoice = async () => {
    let timeout;
    try {
      console.log('submitInvoice called', { formData })
      setIsLoading(true);
      setError(null);
      timeout = setTimeout(() => {
        setIsLoading(false);
        alert('Temps dépassé. Veuillez réessayer.');
      }, 10000);


      const missing = [];
      if (!essentialDataRef.current.report) missing.push('report');
      if (!essentialDataRef.current.client) missing.push('client');
      if (!essentialDataRef.current.vehicle) missing.push('vehicle');
      if (formData.total == null) missing.push('amount');
      if (missing.length > 0) {
        console.error('Données manquantes pour la facture:', missing);
        setError(`Données manquantes: ${missing.join(', ')}`);
        setIsLoading(false);
        clearTimeout(timeout);
        return;
      }

      const mismatch = findMismatchLine(currentReport.parts || [], formData.parts || []);
      if (mismatch) {
        setError(`Incohérence détectée : ${mismatch}`);
      } else {
        const mismatches = findExportDiscrepancies(currentReport, {
          ...formData,
          parts: formData.parts,
          subtotal: formData.subtotal,
          tax_amount: formData.taxAmount,
          total: formData.total,
          labor_hours: formData.laborHours,
          labor_rate: formData.laborRate,
          report: currentReport
        });
        if (mismatches.length > 0) {
          setError(`Incohérence détectée : ${mismatches.join(', ')}`);
        } else {
          setError(null);
        }
      }

      // Créer l'objet de données pour la facture
      const invoiceData = {
        clientId: currentReport.client.id,
        vehicleId: currentReport.vehicle.id,
        reportId: currentReport.id,
        invoiceNumber: formData.invoiceNumber,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        parts: formData.parts,
        laborHours: formData.laborHours || 0,
        laborRate: formData.laborRate || 0,
        laborDetails: formData.laborDetails || [],
        subtotal: formData.subtotal || 0,
        taxRate: formData.taxRate || 0,
        taxAmount: formData.taxAmount || 0, // Ensure taxAmount is never null
        total: formData.total || 0,
        status: 'pending',
        notes: formData.notes || '',
        template: formData.template || 'white',
        template_color: formData.templateColor || 'blue', // Correct property name for the database
        insurer: formData.insurer || null,
        payment_method: 'Virement bancaire'
      };
      
      // Mettre à jour l'adresse du client avant de créer la facture
      if (formData.clientAddress && currentReport.client) {
        try {
          // Refresh session in case it expired while tab was inactive
          // Mettre à jour l'adresse du client dans la base de données
          const { data: updateData, error: updateError } = await supabase
            .from('clients')
            .update({ address: formData.clientAddress })
            .eq('id', currentReport.client.id);
            
          if (updateError) {
            console.warn("Impossible de mettre à jour l'adresse du client:", updateError);
          }
        } catch (addressError) {
          console.warn("Erreur lors de la mise à jour de l'adresse client:", addressError);
        }
      }
      
      const result = await executeWithValidSession(async () => {
        return await Invoice.create(invoiceData);
      });
      
      // Enregistrer l'ID de la facture générée
      setGeneratedInvoiceId(result.id);
      
      // Afficher l'animation de succès
      setShowSuccessAnimation(true);
      
      // Attendre quelques secondes avant de passer à l'écran de succès
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setIsDone(true);
      }, 3000);
      
      // Attendre avant de naviguer vers la facture
      setTimeout(() => {
        navigate(`/dashboard/invoices/${result.id}`);
      }, 5000);

      clearTimeout(timeout);
      
    } catch (error) {
      console.error('Erreur:', error)
      setError(error.message || "Une erreur s'est produite")
    } finally {
      clearTimeout(timeout)
      setIsLoading(false)
      setSubmitEnabled(true)
      hasSubmitted.current = false
      console.log('submitInvoice finished', { loading: false })
    }
  };

  const handleSubmit = async () => {
    if (document.visibilityState !== 'visible') return;
    if (isLoading || !submitEnabled || hasSubmitted.current) return;
    console.log('submit triggered manuellement');
    console.log('handleSubmit triggered', { isLoading, formData });

    if (!formData || !formData.invoiceNumber || !formData.parts?.length) {
      console.warn('Champs manquants détectés, pas de soumission');
      toast.error('Erreur : données manquantes, rechargez la page.');
      return;
    }

    setIsLoading(true);
    setSubmitEnabled(false);
    hasSubmitted.current = true;
    loadingStartTimeRef.current = Date.now();
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Session expir\u00e9e. Veuillez vous reconnecter.')
        navigate('/login')
        return
      }
      submitInvoice()
    } catch (err) {
      toast.error('Session expir\u00e9e. Veuillez vous reconnecter.')
      navigate('/login')
    } finally {
      setIsLoading(false)
      setSubmitEnabled(true)
      hasSubmitted.current = false
    }
  };
  
  // Formatter un montant en euros
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Animation de succès futuriste
  const SuccessAnimation = () => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <motion.div
          className="bg-card rounded-xl border border-primary/30 shadow-2xl p-8 max-w-md w-full relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
        >
          {/* Effet de particules et lumières */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full"></div>
          
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-500/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ repeat: 3, duration: 1.5 }}
          />
          
          <div className="relative z-10 text-center">
            <motion.div 
              className="mb-6 mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.2 }}
            >
              <div className="relative mx-auto w-fit">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl"></div>
                <div className="relative bg-gradient-to-br from-primary to-blue-500 text-white rounded-full p-6">
                  <Lightning className="h-10 w-10" />
                </div>
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.8 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </motion.div>
            
            <motion.h2
              className="text-2xl font-bold mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text">
                Félicitations!
              </span>
            </motion.h2>
            
            <motion.p
              className="text-xl mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Vous venez de gagner <strong>1 heure</strong> sur votre journée
            </motion.p>
            
            <motion.p
              className="text-base text-foreground/70 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              grâce à <span className="font-bold text-primary">AutoCore<span className="text-blue-500">AI</span></span>
            </motion.p>
            
            <motion.div
              className="relative h-1 w-full bg-muted/30 rounded-full overflow-hidden mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-blue-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeOut", delay: 1 }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  };
  
  // Afficher la page de succès après la génération de la facture
  if (isDone) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <div className="bg-emerald-500/10 text-emerald-500 p-4 inline-flex rounded-full mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Facture générée avec succès!</h2>
            <p className="text-muted-foreground mb-6">
              Votre facture a été créée et sera disponible dans quelques instants.
            </p>
            <button
              className="btn-primary py-2.5 px-4 w-full flex items-center justify-center"
              onClick={() => navigate(`/dashboard/invoices/${generatedInvoiceId}`)}
            >
              Voir la facture
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Animation de succès */}
      <AnimatePresence>
        {showSuccessAnimation && <SuccessAnimation />}
      </AnimatePresence>


      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-full mr-2"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold">Générer une facture</h2>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Étape {step} sur 2
        </div>
      </div>
      
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {!error && lineMismatch && (
        <div className="bg-yellow-500/10 text-yellow-700 p-4 rounded-md mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Incohérence détectée sur la ligne : {lineMismatch}</span>
        </div>
      )}

      {!error && !lineMismatch && totalsMismatch && (
        <div className="bg-yellow-500/10 text-yellow-700 p-4 rounded-md mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Incohérence détectée dans les totaux. Vérifiez HT, TVA et TTC.</span>
        </div>
      )}
      
      {/* Alerte pour l'adresse client */}
      {showAddressAlert && (
        <div className="bg-primary/10 border border-primary/30 text-foreground p-4 rounded-md mb-6 flex items-start">
          <Info className="h-5 w-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Important : adresse client requise</p>
            <p className="text-sm">
              Pour que l'adresse du client apparaisse sur la facture, veuillez remplir le champ "Adresse client" dans la section Client. Cette information est obligatoire pour la conformité à la réglementation française 2025.
            </p>
            <button 
              onClick={() => setShowAddressAlert(false)} 
              className="text-xs text-primary hover:underline mt-1 flex items-center"
            >
              J'ai compris
              <X className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-3 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Informations de la facture</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/10 rounded-lg border">
                <div className="space-y-2">
                  <label htmlFor="invoice-number" className="text-sm font-medium">N° de facture</label>
                  <input
                    id="invoice-number"
                    name="invoiceNumber"
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => updateField('invoiceNumber', e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="issue-date" className="text-sm font-medium">Date d'émission</label>
                  <div className="relative">
                    <input
                      id="issue-date"
                      name="issueDate"
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => updateField('issueDate', e.target.value)}
                      className="w-full"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="due-date" className="text-sm font-medium">Date d'échéance</label>
                  <div className="relative">
                    <input
                      id="due-date"
                      name="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                      className="w-full"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Client & Véhicule</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/10 rounded-lg border">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Client</label>
                    <div className="p-3 bg-muted/20 rounded-md">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{currentReport.client.firstName} {currentReport.client.lastName}</div>
                          {currentReport.client.email && <div className="text-sm text-primary">{currentReport.client.email}</div>}
                          {currentReport.client.phone && <div className="text-sm text-muted-foreground">{currentReport.client.phone}</div>}
                          
                          {/* Champ d'adresse éditable avec meilleure mise en évidence */}
                          <div className="mt-2 pt-2 border-t">
                            <label className="text-xs font-medium text-primary block mb-1">Adresse client (apparaîtra sur la facture)</label>
                            <textarea
                              value={formData.clientAddress}
                              onChange={(e) => updateField('clientAddress', e.target.value)}
                              className="w-full text-sm p-2 h-16 resize-none border border-primary/30 focus:border-primary focus:ring-primary"
                              placeholder="Adresse complète du client (obligatoire pour la réglementation française 2025)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Véhicule</label>
                    <div className="p-3 bg-muted/20 rounded-md">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <Car className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">{currentReport.vehicle.make} {currentReport.vehicle.model}</div>
                          {currentReport.vehicle.registration && <div className="text-sm text-muted-foreground">Immatriculation: {currentReport.vehicle.registration}</div>}
                          {currentReport.vehicle.vin && <div className="text-sm text-muted-foreground">VIN: {currentReport.vehicle.vin}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Informations d'assurance */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Building className="h-5 w-5 mr-2 text-primary" />
                  Informations d'assurance
                </h3>
                
                <div className="p-4 bg-muted/10 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="insurer-name" className="text-sm font-medium">Assureur</label>
                      <input
                        id="insurer-name"
                        name="insurerName"
                        type="text"
                        value={formData.insurer?.name || ''}
                        onChange={(e) => updateField('insurer', { ...formData.insurer || {}, name: e.target.value })}
                        className="w-full"
                        placeholder="Nom de l'assurance"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="policy-number" className="text-sm font-medium">N° de police</label>
                      <input
                        id="policy-number"
                        name="policyNumber"
                        type="text"
                        value={formData.insurer?.policyNumber || ''}
                        onChange={(e) => updateField('insurer', { ...formData.insurer || {}, policyNumber: e.target.value })}
                        className="w-full"
                        placeholder="Numéro de police"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="claim-number" className="text-sm font-medium">N° de sinistre</label>
                      <input
                        id="claim-number"
                        name="claimNumber"
                        type="text"
                        value={formData.insurer?.claimNumber || ''}
                        onChange={(e) => updateField('insurer', { ...formData.insurer || {}, claimNumber: e.target.value })}
                        className="w-full"
                        placeholder="Numéro de sinistre"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Remarques (facultatif)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="w-full h-24 resize-none"
                  placeholder="Conditions particulières, informations complémentaires, etc."
                ></textarea>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Détail des prestations</h3>
                <button
                  type="button"
                  onClick={addPart}
                  className="btn-primary text-xs py-1 px-2 flex items-center"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> 
                  Ajouter un article
                </button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="py-2 px-3 text-left">Description</th>
                      <th className="py-2 px-3 text-center w-20">Qté</th>
                      <th className="py-2 px-3 text-right w-32">Prix unitaire</th>
                      <th className="py-2 px-3 text-right w-32">Total HT</th>
                      <th className="py-2 px-3 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formData.parts.map((part, index) => (
                      <tr key={index} className="hover:bg-muted/10 transition-colors">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            name={`part-description-${index}`}
                            id={`part-description-${index}`}
                            value={part.description}
                            onChange={(e) => updatePart(index, 'description', e.target.value)}
                            className="w-full border-0 bg-transparent p-0 focus:ring-0"
                            placeholder="Description"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            name={`part-qty-${index}`}
                            id={`part-qty-${index}`}
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16 text-center border-0 bg-transparent p-0 focus:ring-0"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            name={`part-unit-${index}`}
                            id={`part-unit-${index}`}
                            min="0"
                            step="0.01"
                            value={part.unitPrice}
                            onChange={(e) => updatePart(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right border-0 bg-transparent p-0 focus:ring-0"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatCurrency((part.quantity || 0) * (part.unitPrice || 0))}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removePart(index)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-base font-medium">Main d'œuvre</h4>
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="py-2 px-3 text-left">Type</th>
                        <th className="py-2 px-3 text-center w-32">Heures</th>
                        <th className="py-2 px-3 text-right w-32">Taux horaire</th>
                        <th className="py-2 px-3 text-right w-32">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.laborDetails && formData.laborDetails.length > 0 ? (
                        // Afficher les détails de main d'œuvre s'ils existent
                        formData.laborDetails.map((labor, index) => (
                          <tr key={index} className="hover:bg-muted/10 transition-colors">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={labor.type}
                                onChange={(e) => {
                                  const updatedDetails = [...formData.laborDetails];
                                  updatedDetails[index].type = e.target.value;
                                  updateField('laborDetails', updatedDetails);
                                }}
                                className="w-full border-0 bg-transparent p-0 focus:ring-0"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={labor.hours}
                                onChange={(e) => {
                                  const updatedDetails = [...formData.laborDetails];
                                  updatedDetails[index].hours = parseFloat(e.target.value) || 0;
                                  // Recalculer le total de la ligne
                                  updatedDetails[index].total = updatedDetails[index].hours * updatedDetails[index].rate;
                                  // Mettre à jour le total des heures
                                  const totalHours = updatedDetails.reduce((sum, item) => sum + (item.hours || 0), 0);
                                  updateField('laborHours', totalHours);
                                  updateField('laborDetails', updatedDetails);
                                }}
                                className="w-16 text-center border-0 bg-transparent p-0 focus:ring-0"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={labor.rate}
                                onChange={(e) => {
                                  const updatedDetails = [...formData.laborDetails];
                                  updatedDetails[index].rate = parseFloat(e.target.value) || 0;
                                  // Recalculer le total de la ligne
                                  updatedDetails[index].total = updatedDetails[index].hours * updatedDetails[index].rate;
                                  // Mettre à jour le taux moyen
                                  const totalHours = updatedDetails.reduce((sum, item) => sum + (item.hours || 0), 0);
                                  const weightedRate = updatedDetails.reduce((sum, item) => sum + (item.hours * item.rate), 0) / totalHours;
                                  updateField('laborRate', weightedRate || 0);
                                  updateField('laborDetails', updatedDetails);
                                }}
                                className="w-20 text-right border-0 bg-transparent p-0 focus:ring-0"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                              {formatCurrency((labor.hours || 0) * (labor.rate || 0))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        // Sinon afficher une ligne unique pour la main d'œuvre
                        <tr className="hover:bg-muted/10 transition-colors">
                          <td className="py-2 px-3">Main d'œuvre</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={formData.laborHours}
                              onChange={(e) => updateField('laborHours', parseFloat(e.target.value) || 0)}
                              className="w-16 text-center border-0 bg-transparent p-0 focus:ring-0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.laborRate}
                                onChange={(e) => updateField('laborRate', parseFloat(e.target.value) || 0)}
                                className="w-16 text-right border-0 bg-transparent p-0 focus:ring-0"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency((formData.laborHours || 0) * (formData.laborRate || 0))}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="w-72 space-y-2 p-4 bg-muted/10 rounded-lg border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total HT:</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">TVA</span>
                      <select 
                        value={(formData.taxRate || 0.2) * 100} 
                        onChange={(e) => updateField('taxRate', parseFloat(e.target.value) / 100)}
                        className="text-xs border-none bg-muted/30 rounded p-0.5 focus:ring-0"
                      >
                        <option value="20">20%</option>
                        <option value="10">10%</option>
                        <option value="5.5">5.5%</option>
                        <option value="0">0%</option>
                      </select>
                    </div>
                    <span className="font-medium">{formatCurrency(formData.taxAmount || 0)}</span>
                  </div>
                  
                  <div className="pt-2 mt-2 border-t flex justify-between">
                    <span className="font-bold">Total TTC:</span>
                    <span className="font-bold">{formatCurrency(formData.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Colonne de droite : Résumé et Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Résumé</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facture:</span>
                <span className="font-medium">{formData.invoiceNumber}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{currentReport.client.firstName} {currentReport.client.lastName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Véhicule:</span>
                <span className="font-medium">{currentReport.vehicle.make} {currentReport.vehicle.model}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pièces:</span>
                <span className="font-medium">{formData.parts.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Main d'œuvre:</span>
                <span className="font-medium">{formData.laborHours} h</span>
              </div>
              
              <div className="flex justify-between pt-2 mt-2 border-t">
                <span className="font-medium">Total:</span>
                <span className="font-bold">{formatCurrency(formData.total || 0)}</span>
              </div>
              
              {/* Affichage du résumé des informations d'assurance */}
              {formData.insurer && (formData.insurer.name || formData.insurer.claimNumber || formData.insurer.policyNumber) && (
                <div className="pt-2 mt-2 border-t space-y-2">
                  <h4 className="font-medium text-sm">Assurance:</h4>
                  {formData.insurer.name && <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assureur:</span>
                    <span>{formData.insurer.name}</span>
                  </div>}
                  {formData.insurer.policyNumber && <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">N° Police:</span>
                    <span>{formData.insurer.policyNumber}</span>
                  </div>}
                  {formData.insurer.claimNumber && <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">N° Sinistre:</span>
                    <span>{formData.insurer.claimNumber}</span>
                  </div>}
                </div>
              )}
              
              {/* Affichage de l'adresse client */}
              {formData.clientAddress && (
                <div className="pt-2 mt-2 border-t">
                  <h4 className="font-medium text-sm mb-1">Adresse client:</h4>
                  <p className="text-sm whitespace-pre-line">{formData.clientAddress}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Style de facture</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'white', name: 'Blanc Pro' },
                    { id: 'carbon', name: 'Carbone' },
                    { id: 'tech', name: 'Tech Bleu' }
                  ].map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => updateField('template', template.id)}
                      className={`p-2 text-sm text-center rounded-md border ${
                        formData.template === template.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:bg-muted'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Couleur</label>
                <div className="flex space-x-3">
                  {[
                    { id: 'blue', color: 'bg-blue-500' },
                    { id: 'violet', color: 'bg-violet-500' },
                    { id: 'gray', color: 'bg-gray-500' }
                  ].map(color => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => updateField('templateColor', color.id)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        formData.templateColor === color.id
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-muted'
                      } ${color.color}`}
                      aria-label={`Couleur ${color.id}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !submitEnabled}
                className="btn-primary py-2.5"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Créer la facture
                  </>
                )}
              </button>
              
              <Link 
                to="/dashboard/invoices"
                className="btn-outline py-2.5 text-center"
              >
                Annuler
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;
