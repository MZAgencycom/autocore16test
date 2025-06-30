import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Plus, Check, AlertCircle, Search, Calendar, User, Car, FileText, ArrowLeft, Info, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Invoice } from '../../models/Invoice';
import { recalculateTotal, parseNumber, sanitizeParts, findExportDiscrepancies } from '../../utils/invoiceUtils.js';
import { useSession } from '../../hooks/useSession';
import { z } from 'zod';

// Form validation schema
const invoiceSchema = z.object({
  client_id: z.string().uuid("Vous devez sélectionner un client"),
  vehicle_id: z.string().uuid("Vous devez sélectionner un véhicule"),
  invoice_number: z.string().min(1, "Le numéro de facture est requis"),
  issue_date: z.string().min(1, "La date d'émission est requise"),
  due_date: z.string().min(1, "La date d'échéance est requise"),
  parts: z.array(
    z.object({
      description: z.string().min(1, "La description est requise"),
      quantity: z.number().min(1, "La quantité doit être d'au moins 1"),
      unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
      discount: z.number().min(0).max(100).optional()
    })
  ).min(1, "Ajoutez au moins une pièce"),
  labor_hours: z.number().min(0, "Le nombre d'heures doit être positif"),
  labor_rate: z.number().min(0, "Le taux horaire doit être positif"),
  tax_rate: z.number().min(0).max(1, "Le taux de TVA doit être entre 0 et 100%")
});

const InvoiceEditor = () => {
  const navigate = useNavigate();
  const { executeWithValidSession, refreshSession } = useSession();
  const { invoiceId } = useParams();

  // Mode d'utilisation de ce composant
  const mode = 'edit';
  
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const loadingStartTimeRef = useRef(null)
  const [success, setSuccess] = useState(false);
  const [updatedInvoiceId, setUpdatedInvoiceId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [disableAutoRecalculation, setDisableAutoRecalculation] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [itemAdded, setItemAdded] = useState(false);
  const [itemDeleted, setItemDeleted] = useState(false);
  const [itemEdited, setItemEdited] = useState(false);
  const [diffAlert, setDiffAlert] = useState('');

  // Provide access to the invoice loader for visibility handler
  const fetchInvoiceDetailsRef = useRef(null);

  // Ensure session is fresh when opening the editor
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);


  const round = (num) => Math.round(num * 100) / 100;
  
  // Référence pour suivre si un recalcul manuel est en cours
  const isManualRecalculationRef = useRef(false);
  const clientSearchRef = useRef(null);
  const initialLoadingDoneRef = useRef(false);
  const hasUserModifiedItems = useRef(false);
  const initialTotalsRef = useRef({ subtotal: 0, tax: 0, total: 0 });

  // Log des valeurs initiales pour debug
  useEffect(() => {
    if (isReady) {
      if (import.meta?.env?.DEV) console.log('Articles initiaux:', invoiceData.parts);
      if (import.meta?.env?.DEV) console.log(
        'Main d\u2019\u0153uvre initiale:',
        invoiceData.laborDetails && invoiceData.laborDetails.length > 0
          ? invoiceData.laborDetails
          : [{ hours: invoiceData.labor_hours, rate: invoiceData.labor_rate }]
      );
      if (import.meta?.env?.DEV) console.log('TVA:', invoiceData.tax_rate);
    }
  }, [isReady]);
  
  // État du formulaire
  const [invoiceData, setInvoiceData] = useState({
    client_id: '',
    client: null,
    vehicle_id: '',
    vehicle: null,
    invoice_number: '',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // +30 jours
    parts: [{ description: '', quantity: 1, unitPrice: 0, discount: 0 }],
    labor_hours: 0,
    labor_rate: 70,
    laborDetails: [],
    subtotal: 0,
    tax_rate: 0.2,
    tax_amount: 0,
    total: 0,
    status: 'pending',
    template: 'white',
    template_color: 'blue',
    payment_method: 'Virement bancaire',
    notes: '',
    insurer: null
  });

  // Persist form state to avoid losing data when switching tabs
  useEffect(() => {
    if (invoiceId) {
      sessionStorage.setItem(
        'invoiceEditorData',
        JSON.stringify({ id: invoiceId, data: invoiceData })
      )
    }
  }, [invoiceData, invoiceId])

  useEffect(() => {
    return () => sessionStorage.removeItem('invoiceEditorData')
  }, [])

  const invoiceDataRef = useRef(invoiceData)
  useEffect(() => {
    invoiceDataRef.current = invoiceData
  }, [invoiceData])

  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    const stored = sessionStorage.getItem('invoiceEditorData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id === invoiceId) {
          invoiceDataRef.current = parsed.data;
          setInvoiceData(parsed.data);
        }
      } catch (e) {
        console.error('Erreur lors de la restauration de la facture:', e);
      }
    }
  }, [invoiceId])

  useEffect(() => {
    if (isSaving) {
      loadingStartTimeRef.current = Date.now()
    } else {
      loadingStartTimeRef.current = null
    }
  }, [isSaving])

  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false)
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [isLoading])

  // Display an error if saving takes too long
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsSaving(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [isSaving])

  // Removed visibility/tab recovery logic to keep state untouched

  // Charger la facture existante
  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    const loadInvoice = async () => {
      try {
        setIsLoading(true);
        
        const invoice = await Invoice.getById(invoiceId);
        
        if (!invoice) {
          throw new Error("Facture introuvable");
        }
        
        // Vérifier si la facture est éditable (statut pending)
        if (invoice.status !== 'pending') {
          setGeneralError("Seules les factures avec statut 'Générée' peuvent être modifiées");
        }
        
        // Fetch user profile for default hourly rate
        const { data: { session } } = await supabase.auth.getSession();
        let userProfileData = null;
        if (session) {
          const { data: profile, error: profileError } = await supabase
            .from('users_extended')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!profileError && profile) {
            userProfileData = profile;
          }
        }
        
        // Formater les dates pour les inputs de type date
        const formattedIssueDate = format(new Date(invoice.issue_date), 'yyyy-MM-dd');
        const formattedDueDate = format(new Date(invoice.due_date), 'yyyy-MM-dd');
        
        // IMPORTANT: Conserver les valeurs exactes des montants sans recalculer
        const normalizedTaxRate = invoice.tax_rate > 1 ? invoice.tax_rate / 100 : invoice.tax_rate;

        const updatedInvoice = {
          client_id: invoice.client_id,
          client: invoice.clients,
          vehicle_id: invoice.vehicle_id,
          vehicle: invoice.vehicles,
          invoice_number: invoice.invoice_number,
          issue_date: formattedIssueDate,
          due_date: formattedDueDate,
          parts: sanitizeParts(invoice.parts || []).map(p => ({ ...p, discount: p.discount ?? 0 })),
          labor_hours: invoice.labor_hours || 0,
          labor_rate: invoice.labor_rate || userProfileData?.hourly_rate || 70,
          laborDetails: invoice.laborDetails || [],
          subtotal: invoice.subtotal || 0,
          tax_rate: normalizedTaxRate || 0.2,
          tax_amount: invoice.tax_amount || 0,
          total: invoice.total || 0,
          status: invoice.status || 'pending',
          template: invoice.template || 'white',
          template_color: invoice.template_color || 'blue',
          payment_method: invoice.payment_method || 'Virement bancaire',
          notes: invoice.notes || '',
          insurer: invoice.insurer || null,
          report_id: invoice.report_id || null,
          report: invoice.reports || null
        };
        
        // Enregistrer les totaux initiaux pour vérification ultérieure
        initialTotalsRef.current = {
          subtotal: invoice.subtotal || 0,
          tax: invoice.tax_amount || 0,
          total: invoice.total || 0
        };

        // Définir les données du formulaire sans recalculer
        setInvoiceData(updatedInvoice);
        setInitialDataLoaded(true);
        setIsReady(true);
        
      } catch (error) {
        console.error('Erreur lors du chargement de la facture:', error);
        setGeneralError(error.message || "Erreur lors du chargement de la facture");
        navigate('/dashboard/invoices');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoiceDetailsRef.current = loadInvoice;
    loadInvoice();
  }, [invoiceId, navigate]);

  // Ne rien faire quand l'onglet redevient actif
  useEffect(() => {
    const handleTabFocus = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App] Onglet redevenu actif – ne rien faire');
      }
    };

    document.addEventListener('visibilitychange', handleTabFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleTabFocus);
    };
  }, [invoiceId]);

  // Vérifier la cohérence entre l'aperçu OCR et l'éditeur
  useEffect(() => {
    if (!isReady || !invoiceData.report || !invoiceData.report.extracted_data) return;

    const extracted = invoiceData.report.extracted_data;
    const mismatches = findExportDiscrepancies(extracted, invoiceData);

    if (mismatches.length > 0) {
      setDiffAlert(`Incohérence détectée entre l'aperçu OCR et l'éditeur: ${mismatches.join(', ')}`);
    } else if (extracted.warnings && extracted.warnings.includes('auto_interpreted')) {
      setDiffAlert('Certaines lignes ont été automatiquement interprétées. Merci de vérifier et corriger si besoin.');
    } else {
      setDiffAlert('');
    }
  }, [isReady, invoiceData]);
  

  // Charger le profil utilisateur, les clients et les véhicules
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingClients(true);
        const { data, error } = await supabase
          .from('clients')
          .select('*, vehicles(*)')
          .order('last_name', { ascending: true });
          
        if (error) throw error;
        
        setClients(data || []);
        setFilteredClients(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
        setGeneralError("Erreur lors du chargement des clients");
      } finally {
        setIsLoadingClients(false);
      }
    };

    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) throw error;
        
        setUserProfile(data);
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };

    fetchUserProfile();
    fetchData();
  }, []);

  // Mettre à jour les véhicules lorsqu'un client est sélectionné
  useEffect(() => {
    if (invoiceData.client_id) {
      const client = clients.find(c => c.id === invoiceData.client_id);
      if (client) {
        setInvoiceData(prev => ({ ...prev, client }));
        setSelectedVehicles(client.vehicles || []);
      }
    } else {
      setSelectedVehicles([]);
    }
  }, [invoiceData.client_id, clients]);

  // Recherche de clients
  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client => 
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.phone && client.phone.includes(searchTerm))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  // Click à l'extérieur du champ de recherche
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target)) {
        setShowClientSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Recalculer automatiquement les totaux uniquement si l'utilisateur a modifié quelque chose
  useEffect(() => {
    if (!isReady) return;
    if (disableAutoRecalculation) return;
    if (!(itemAdded || itemDeleted || itemEdited)) return;

    const validParts = invoiceData.parts.filter(
      (p) => {
        const qty = parseNumber(p.quantity);
        const price = parseNumber(p.unitPrice);

        return (
          p.description?.trim() &&
          !isNaN(qty) &&
          qty > 0 &&
          !isNaN(price) &&
          price > 0
        );
      }
    );

    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [{ hours: invoiceData.labor_hours, rate: invoiceData.labor_rate }];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      validParts,
      laborArray,
      invoiceData.tax_rate
    );

    if (import.meta?.env?.DEV) console.log('\ud83d\udd0d Recalcul total', { mode, trigger: 'fields-change' });

    setInvoiceData((prev) => ({
      ...prev,
      subtotal: round(totalHT),
      tax_amount: round(tva),
      total: round(totalTTC)
    }));
    hasUserModifiedItems.current = false;
    setItemAdded(false);
    setItemDeleted(false);
    setItemEdited(false);
  }, [
    invoiceData.parts,
    invoiceData.labor_hours,
    invoiceData.labor_rate,
    invoiceData.tax_rate,
    disableAutoRecalculation,
    isReady,
    itemAdded,
    itemDeleted,
    itemEdited
  ]);

  // Recalculer tous les montants à partir des articles actuels
  const calculateInvoice = () => {
    hasUserModifiedItems.current = true;
    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [{ hours: invoiceData.labor_hours, rate: invoiceData.labor_rate }];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      invoiceData.parts,
      laborArray,
      invoiceData.tax_rate
    );

    setInvoiceData((prev) => ({
      ...prev,
      subtotal: round(totalHT),
      tax_amount: round(tva),
      total: round(totalTTC)
    }));
    setItemEdited(true);
  };

  // Sélectionner un client
  const selectClient = (client) => {
    setInvoiceData(prev => ({
      ...prev,
      client_id: client.id,
      client: client,
      vehicle_id: '',
      vehicle: null
    }));
    setShowClientSearch(false);
    setSearchTerm('');
    
    // Si ce client a des véhicules, les charger
    if (client.vehicles) {
      setSelectedVehicles(client.vehicles);
    }
    
    // Effacer l'erreur si elle existe
    if (formErrors.client_id) {
      setFormErrors(prev => ({
        ...prev,
        client_id: undefined
      }));
    }
  };

  // Sélectionner un véhicule
  const selectVehicle = (vehicle) => {
    setInvoiceData(prev => ({
      ...prev,
      vehicle_id: vehicle.id,
      vehicle: vehicle
    }));
    
    // Effacer l'erreur si elle existe
    if (formErrors.vehicle_id) {
      setFormErrors(prev => ({
        ...prev,
        vehicle_id: undefined
      }));
    }
  };

  // Ajout d'un nouvel article à la liste existante
  const handleAddItem = (newItem) => {
    hasUserModifiedItems.current = true;
    setInvoiceData((prev) => {
      const updatedParts = [...prev.parts, { discount: 0, ...newItem }];
      const laborArray = prev.laborDetails && prev.laborDetails.length > 0
        ? prev.laborDetails
        : [{ hours: prev.labor_hours, rate: prev.labor_rate }];
      const { totalHT, tva, totalTTC } = recalculateTotal(
        updatedParts,
        laborArray,
        prev.tax_rate
      );
      return {
        ...prev,
        parts: updatedParts,
        subtotal: round(totalHT),
        tax_amount: round(tva),
        total: round(totalTTC)
      };
    });
    setItemAdded(true);
  };

  // Ajouter une ligne d'article sans déclencher de recalcul automatique
  const addPart = () => {
    // Suspendre temporairement le recalcul automatique tant que la ligne n'est pas renseignée
    setDisableAutoRecalculation(true);
    hasUserModifiedItems.current = true;
    // Ajouter simplement la ligne, les totaux resteront inchangés
    setInvoiceData(prev => ({
      ...prev,
      parts: [...prev.parts, { description: '', quantity: 1, unitPrice: 0, discount: 0 }]
    }));
    // Réinitialiser les indicateurs de modification pour éviter un recalcul intempestif
    setItemAdded(false);
    setItemDeleted(false);
    setItemEdited(false);
  };

  // Supprimer une ligne d'article
  const removePart = (index) => {
    if (invoiceData.parts.length <= 1) return;

    const removed = invoiceData.parts[index];
    const removedAmount =
      parseNumber(removed.quantity) * parseNumber(removed.unitPrice);
    const updated = invoiceData.parts.filter((_, i) => i !== index);
    hasUserModifiedItems.current = true;

    if (removedAmount === 0 || !removed.description?.trim()) {
      setInvoiceData(prev => ({ ...prev, parts: updated }));
      const allValid = updated.every(
        p =>
          p.description?.trim() &&
          parseNumber(p.quantity) > 0 &&
          parseNumber(p.unitPrice) > 0
      );
      if (allValid) setDisableAutoRecalculation(false);
      // S'assurer qu'aucun recalcul n'est déclenché
      setItemAdded(false);
      setItemDeleted(false);
      setItemEdited(false);
      return;
    }

    const laborArray = invoiceData.laborDetails && invoiceData.laborDetails.length > 0
      ? invoiceData.laborDetails
      : [{ hours: invoiceData.labor_hours, rate: invoiceData.labor_rate }];
    const { totalHT, tva, totalTTC } = recalculateTotal(
      updated,
      laborArray,
      invoiceData.tax_rate
    );
    setInvoiceData(prev => ({
      ...prev,
      parts: updated,
      subtotal: round(totalHT),
      tax_amount: round(tva),
      total: round(totalTTC)
    }));
    setItemDeleted(true);
    const allValid = updated.every(
      p =>
        p.description?.trim() &&
        parseNumber(p.quantity) > 0 &&
        parseNumber(p.unitPrice) > 0
    );
  if (allValid) setDisableAutoRecalculation(false);
  };

  // Ajouter une ligne de main d'œuvre
  const addLaborLine = () => {
    setInvoiceData(prev => ({
      ...prev,
      laborDetails: [...(prev.laborDetails || []), { type: '', hours: 0, rate: prev.labor_rate || 0 }]
    }));
    setDisableAutoRecalculation(true);
  };

  // Supprimer une ligne de main d'œuvre
  const removeLaborLine = (index) => {
    setInvoiceData(prev => {
      const updated = prev.laborDetails.filter((_, i) => i !== index);
      const totalHours = updated.reduce((sum, l) => sum + (parseNumber(l.hours) || 0), 0);
      const totalCost = updated.reduce((sum, l) => sum + ((parseNumber(l.hours) || 0) * (parseNumber(l.rate) || 0)), 0);
      const avgRate = totalHours > 0 ? totalCost / totalHours : prev.labor_rate;
      const { totalHT, tva, totalTTC } = recalculateTotal(
        prev.parts,
        updated.length > 0 ? updated : [{ hours: totalHours, rate: avgRate }],
        prev.tax_rate
      );
      return {
        ...prev,
        laborDetails: updated,
        labor_hours: totalHours,
        labor_rate: avgRate,
        subtotal: round(totalHT),
        tax_amount: round(tva),
        total: round(totalTTC)
      };
    });
    setItemEdited(true);
  };

  // Mettre à jour une ligne de main d'œuvre
  const updateLaborDetail = (index, field, value) => {
    hasUserModifiedItems.current = true;
    const parsedValue = field === 'hours' || field === 'rate' ? parseNumber(value) || 0 : value;
    setInvoiceData(prev => {
      const details = [...prev.laborDetails];
      details[index] = { ...details[index], [field]: parsedValue };
      const totalHours = details.reduce((sum, l) => sum + (parseNumber(l.hours) || 0), 0);
      const totalCost = details.reduce((sum, l) => sum + ((parseNumber(l.hours) || 0) * (parseNumber(l.rate) || 0)), 0);
      const avgRate = totalHours > 0 ? totalCost / totalHours : prev.labor_rate;
      const { totalHT, tva, totalTTC } = recalculateTotal(
        prev.parts,
        details,
        prev.tax_rate
      );
      return {
        ...prev,
        laborDetails: details,
        labor_hours: totalHours,
        labor_rate: avgRate,
        subtotal: round(totalHT),
        tax_amount: round(tva),
        total: round(totalTTC)
      };
    });
    setItemEdited(true);
  };

  // Mettre à jour une pièce
  const updatePart = (index, field, value) => {
    hasUserModifiedItems.current = true;
    const parsedValue =
      field === 'quantity' || field === 'unitPrice'
        ? parseNumber(value) || 0
        : field === 'discount'
        ? Math.min(Math.max(parseNumber(value) || 0, 0), 100)
        : value;
    const newParts = [...invoiceData.parts];
    if (newParts[index] && newParts[index][field] === parsedValue) return;
    newParts[index] = {
      ...newParts[index],
      [field]: parsedValue
    };

    const part = newParts[index];
    const qty = parseNumber(part.quantity) || 0;
    const price = parseNumber(part.unitPrice) || 0;

    if (!part.description?.trim() || qty === 0 || price === 0) {
      // Update state but skip recalculation when line is incomplete
      setInvoiceData(prev => ({ ...prev, parts: newParts }));
      setItemEdited(true);
      return;
    }

    setInvoiceData(prev => {
      const laborArray = prev.laborDetails && prev.laborDetails.length > 0
        ? prev.laborDetails
        : [{ hours: prev.labor_hours, rate: prev.labor_rate }];
      const { totalHT, tva, totalTTC } = recalculateTotal(
        newParts,
        laborArray,
        prev.tax_rate
      );
      return {
        ...prev,
        parts: newParts,
        subtotal: round(totalHT),
        tax_amount: round(tva),
        total: round(totalTTC)
      };
    });
    setItemEdited(true);

    // Si la ligne mise à jour est complète et valide, réactiver le recalcul automatique
    const isValid =
      part.description?.trim() &&
      parseNumber(part.quantity) > 0 &&
      parseNumber(part.unitPrice) > 0;
    if (isValid) {
      setDisableAutoRecalculation(false);
    }
    
    // Effacer les erreurs potentielles
    if (formErrors.parts && formErrors.parts[index] && formErrors.parts[index][field]) {
      const newFormErrors = { ...formErrors };
      if (newFormErrors.parts) {
        newFormErrors.parts[index] = {
          ...newFormErrors.parts[index],
          [field]: undefined
        };
      }
      setFormErrors(newFormErrors);
    }
  };

  // Mettre à jour la main d'œuvre avec recalcul manuel
  const updateLabor = (field, value) => {
    hasUserModifiedItems.current = true;
    value = parseNumber(value) || 0;

    setInvoiceData((prev) => {
      if (prev[field] === value) return prev;
      const updated = { ...prev, [field]: value };
      const laborArray = updated.laborDetails && updated.laborDetails.length > 0
        ? updated.laborDetails
        : [{ hours: updated.labor_hours, rate: updated.labor_rate }];
      const { totalHT, tva, totalTTC } = recalculateTotal(
        updated.parts,
        laborArray,
        updated.tax_rate
      );
      return {
        ...updated,
        subtotal: round(totalHT),
        tax_amount: round(tva),
        total: round(totalTTC)
      };
    });
    setItemEdited(true);
    
    // Effacer l'erreur si elle existe
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Mettre à jour le taux de TVA
  const updateTaxRate = (rate) => {
    hasUserModifiedItems.current = true;
    const taxRate = parseNumber(rate) / 100;

    setInvoiceData((prev) => {
      if (prev.tax_rate === taxRate) return prev;
      const updated = { ...prev, tax_rate: taxRate };
      const laborArray = updated.laborDetails && updated.laborDetails.length > 0
        ? updated.laborDetails
        : [{ hours: updated.labor_hours, rate: updated.labor_rate }];
      const { totalHT, tva, totalTTC } = recalculateTotal(
        updated.parts,
        laborArray,
        updated.tax_rate
      );
      return {
        ...updated,
        subtotal: round(totalHT),
        tax_amount: round(tva),
        total: round(totalTTC)
      };
    });
    setItemEdited(true);
  };

  // Mettre à jour un champ
  const updateField = (field, value) => {
    setInvoiceData(prev => {
      if (prev[field] === value) return prev;
      return {
        ...prev,
        [field]: value
      };
    });
    
    // Effacer l'erreur si elle existe
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Valider le formulaire
  const validateForm = () => {
    try {
      // Transformer les données pour la validation
      const dataToValidate = {
        client_id: invoiceData.client_id,
        vehicle_id: invoiceData.vehicle_id,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        parts: invoiceData.parts.map(part => ({
          description: part.description,
          quantity: Number(part.quantity),
          unitPrice: Number(part.unitPrice)
        })),
        labor_hours: Number(invoiceData.labor_hours),
        labor_rate: Number(invoiceData.labor_rate),
        tax_rate: Number(invoiceData.tax_rate)
      };
      
      invoiceSchema.parse(dataToValidate);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj = {};
        
        error.errors.forEach(err => {
          const path = err.path;
          
          if (path[0] === 'parts' && path.length > 1) {
            // Gestion des erreurs pour les pièces
            const index = parseInt(path[1]);
            const field = path[2];
            
            if (!errorObj.parts) {
              errorObj.parts = [];
            }
            
            if (!errorObj.parts[index]) {
              errorObj.parts[index] = {};
            }
            
            errorObj.parts[index][field] = err.message;
          } else {
            // Erreurs générales
            errorObj[path[0]] = err.message;
          }
        });
        
        setFormErrors(errorObj);
      } else {
        setGeneralError("Une erreur s'est produite lors de la validation du formulaire");
      }
      return false;
    }
  };

  // Appliquer les valeurs extraites du rapport pour corriger la facture
  const applyExtractedValues = () => {
    if (!invoiceData.report || !invoiceData.report.extracted_data) return;
    const ex = invoiceData.report.extracted_data;
    setInvoiceData(prev => ({
      ...prev,
      parts: sanitizeParts(ex.parts || prev.parts),
      subtotal: round(parseNumber(ex.totalHT ?? prev.subtotal)),
      tax_amount: round(parseNumber(ex.taxAmount ?? prev.tax_amount)),
      total: round(parseNumber(ex.totalTTC ?? prev.total)),
      labor_hours: parseNumber(ex.laborHours ?? prev.labor_hours),
      labor_rate: parseNumber(ex.laborRate ?? prev.labor_rate),
      tax_rate: ex.taxRate !== undefined ? parseNumber(ex.taxRate) : prev.tax_rate,
      report: { ...prev.report, reportNumber: ex.report?.reportNumber }
    }));
    setDiffAlert('');
  };

  // Mettre à jour la facture
  const updateInvoice = async () => {
    if (document.visibilityState !== 'visible') return;
    if (isSaving) return; // protection anti double clic
    console.log('submit triggered manuellement');
    console.log('updateInvoice triggered', invoiceDataRef.current);

    if (!invoiceDataRef.current || !invoiceDataRef.current.invoice_number || !invoiceDataRef.current.parts) {
      toast.error('Erreur : données manquantes, rechargez la page.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      setGeneralError(null);

      // Nettoyer les pièces sans réappliquer les remises
      const sanitizedParts = sanitizeParts(invoiceDataRef.current.parts);

      const laborArray =
        invoiceDataRef.current.laborDetails && invoiceDataRef.current.laborDetails.length > 0
          ? invoiceDataRef.current.laborDetails
          : [{ hours: invoiceDataRef.current.labor_hours, rate: invoiceDataRef.current.labor_rate }];

      const { totalHT, tva, totalTTC } = recalculateTotal(
        sanitizedParts,
        laborArray,
        invoiceDataRef.current.tax_rate
      );

      const diff = Math.abs(totalTTC - initialTotalsRef.current.total);
      const finalTotals = diff < 0.01
        ? {
            subtotal: initialTotalsRef.current.subtotal,
            tax: initialTotalsRef.current.tax,
            total: initialTotalsRef.current.total
          }
        : {
            subtotal: totalHT,
            tax: tva,
            total: totalTTC
          };

      if (diff > 0.01) {
        setGeneralError(`Écart de total détecté (${diff.toFixed(2)} €)`);
      }

      // Préparation des données pour la mise à jour
      const invoicePayload = {
        clientId: invoiceDataRef.current.client_id,
        vehicleId: invoiceDataRef.current.vehicle_id,
        reportId: invoiceDataRef.current.report_id,
        invoiceNumber: invoiceDataRef.current.invoice_number,
        issueDate: new Date(invoiceDataRef.current.issue_date).toISOString(),
        dueDate: new Date(invoiceDataRef.current.due_date).toISOString(),
        parts: sanitizedParts,
        laborHours: invoiceDataRef.current.labor_hours,
        laborRate: invoiceDataRef.current.labor_rate,
        laborDetails: invoiceDataRef.current.laborDetails,
        subtotal: finalTotals.subtotal,
        taxRate: invoiceDataRef.current.tax_rate,
        taxAmount: finalTotals.tax,
        total: finalTotals.total,
        status: invoiceDataRef.current.status,
        notes: invoiceDataRef.current.notes,
        template: invoiceDataRef.current.template,
        templateColor: invoiceDataRef.current.template_color,
        paymentMethod: invoiceDataRef.current.payment_method,
        insurer: invoiceDataRef.current.insurer
      };
      
      const result = await executeWithValidSession(async () => {
        return await Invoice.update(invoiceId, invoicePayload);
      });

      setSuccess(true);
      setUpdatedInvoiceId(invoiceId);

      setTimeout(() => {
        navigate(`/dashboard/invoices/${invoiceId}`);
      }, 2000);

    } catch (error) {
      console.error('Erreur:', error);
      setGeneralError(error.message || "Une erreur s'est produite");
    } finally {
      setIsSaving(false);
    }
  };

  // Formater un montant en euros
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Si succès, afficher un message et rediriger
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
          
          <h1 className="text-2xl font-bold mb-2">Facture mise à jour avec succès !</h1>
          <p className="text-muted-foreground mb-6">
            Votre facture a été mise à jour et est prête à être envoyée au client.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Link 
              to={`/dashboard/invoices/${updatedInvoiceId}`} 
              className="btn-primary"
            >
              Voir la facture
            </Link>
            <Link to="/dashboard/invoices" className="btn-outline">
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Afficher un loader pendant le chargement des données
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-2xl font-bold">Modifier la facture</h1>
          <p className="text-muted-foreground">
            Modifiez les informations de la facture {invoiceData.invoice_number}
          </p>
        </div>
      </div>

      {/* Message d'erreur général */}
      {generalError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <div>
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{generalError}</p>
          </div>
        </div>
      )}

      {diffAlert && (
        <div className="bg-amber-100 text-amber-800 p-4 rounded-lg mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <div>
            <p className="font-medium">Alerte</p>
            <p className="text-sm mb-2">{diffAlert}</p>
            <button
              type="button"
              onClick={applyExtractedValues}
              className="btn-primary btn-xs"
            >
              Corriger automatiquement
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-12">
        {/* Formulaire principal */}
        <div className="md:col-span-8 bg-card rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Informations de la facture</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="editor-invoice-number" className="block text-sm font-medium">N° de facture</label>
                <input
                  id="editor-invoice-number"
                  name="invoice_number"
                  type="text"
                  value={invoiceData.invoice_number}
                  onChange={(e) => updateField('invoice_number', e.target.value)}
                  className={`w-full ${formErrors.invoice_number ? 'border-destructive' : ''}`}
                />
                {formErrors.invoice_number && (
                  <p className="text-destructive text-xs">{formErrors.invoice_number}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="editor-issue-date" className="block text-sm font-medium">Date d'émission</label>
                <input
                  id="editor-issue-date"
                  name="issue_date"
                  type="date"
                  value={invoiceData.issue_date}
                  onChange={(e) => updateField('issue_date', e.target.value)}
                  className={`w-full ${formErrors.issue_date ? 'border-destructive' : ''}`}
                />
                {formErrors.issue_date && (
                  <p className="text-destructive text-xs">{formErrors.issue_date}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="editor-due-date" className="block text-sm font-medium">Date d'échéance</label>
                <input
                  id="editor-due-date"
                  name="due_date"
                  type="date"
                  value={invoiceData.due_date}
                  onChange={(e) => updateField('due_date', e.target.value)}
                  className={`w-full ${formErrors.due_date ? 'border-destructive' : ''}`}
                />
                {formErrors.due_date && (
                  <p className="text-destructive text-xs">{formErrors.due_date}</p>
                )}
              </div>
            </div>

            {/* Sélection du client */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Client</label>
              <div className="bg-muted/20 p-3 rounded-lg">
                {invoiceData.client ? (
                  <div className="flex flex-col">
                    <span className="font-medium">{invoiceData.client.first_name} {invoiceData.client.last_name}</span>
                    {invoiceData.client.email && <span className="text-sm text-muted-foreground">{invoiceData.client.email}</span>}
                    {invoiceData.client.phone && <span className="text-sm text-muted-foreground">{invoiceData.client.phone}</span>}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Client non trouvé</span>
                )}
              </div>
            </div>
            
            {/* Sélection du véhicule */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Véhicule</label>
              
              {invoiceData.client_id ? (
                selectedVehicles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedVehicles.map(vehicle => (
                      <div
                        key={vehicle.id}
                        className={`p-3 rounded-md cursor-pointer border ${
                          invoiceData.vehicle_id === vehicle.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/30'
                        }`}
                        onClick={() => selectVehicle(vehicle)}
                      >
                        <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.registration && <span>Immatriculation: {vehicle.registration}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-muted/20 rounded-md">
                    <Car className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Ce client n'a pas de véhicule enregistré</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <Link to={`/dashboard/clients/${invoiceData.client_id}`} className="text-primary hover:underline">
                        Ajouter un véhicule
                      </Link>
                    </p>
                  </div>
                )
              ) : (
                <div className="p-4 text-center bg-muted/20 rounded-md">
                  <p className="text-muted-foreground">Veuillez d'abord sélectionner un client</p>
                </div>
              )}
              
              {formErrors.vehicle_id && (
                <p className="text-destructive text-xs">{formErrors.vehicle_id}</p>
              )}
              
              {/* Affichage du véhicule sélectionné */}
              {invoiceData.vehicle && (
                <div className="mt-2 p-3 bg-primary/5 border border-primary rounded-md">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{invoiceData.vehicle.make} {invoiceData.vehicle.model}</p>
                      <div className="text-sm">
                        {invoiceData.vehicle.registration && <p>Immatriculation: {invoiceData.vehicle.registration}</p>}
                        {invoiceData.vehicle.vin && <p>VIN: {invoiceData.vehicle.vin}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Séparateur */}
            <hr className="my-6" />

            {/* Lignes de facturation */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-medium">Articles</h3>
                <button
                  type="button"
                  onClick={addPart}
                  className="btn-outline py-1 px-3 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1 inline" />
                  Ajouter un article
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full mb-6">
                  <thead className="border-b">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase w-24">Remise (%)</th>
                      <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground uppercase w-20">Qté</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase w-32">Prix unitaire</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase w-32">Total</th>
                      <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoiceData.parts.map((part, index) => (
                      <tr key={index}>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={part.description}
                            onChange={(e) => updatePart(index, 'description', e.target.value)}
                            placeholder="Description"
                            className={`w-full ${formErrors.parts && formErrors.parts[index]?.description ? 'border-destructive' : ''}`}
                          />
                          {formErrors.parts && formErrors.parts[index]?.description && (
                            <p className="text-destructive text-xs mt-1">{formErrors.parts[index].description}</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={part.discount ?? 0}
                            onChange={(e) => updatePart(index, 'discount', e.target.value)}
                            className="w-full text-right"
                            title="Entrez un pourcentage de remise. Le total se mettra à jour automatiquement."
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                            className={`w-full text-center ${formErrors.parts && formErrors.parts[index]?.quantity ? 'border-destructive' : ''}`}
                          />
                          {formErrors.parts && formErrors.parts[index]?.quantity && (
                            <p className="text-destructive text-xs mt-1">{formErrors.parts[index].quantity}</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={part.unitPrice}
                            onChange={(e) => updatePart(index, 'unitPrice', e.target.value)}
                            className={`w-full text-right ${formErrors.parts && formErrors.parts[index]?.unitPrice ? 'border-destructive' : ''}`}
                          />
                          {formErrors.parts && formErrors.parts[index]?.unitPrice && (
                            <p className="text-destructive text-xs mt-1">{formErrors.parts[index].unitPrice}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {formatCurrency((part.quantity || 1) * (part.unitPrice || 0) * (1 - (part.discount || 0) / 100))}
                          {part.discount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Remise appliquée : –{formatCurrency((part.quantity || 1) * (part.unitPrice || 0) * (part.discount || 0) / 100)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
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

              <div className="flex justify-between items-center mt-6">
                <h3 className="text-base font-medium">Main d'œuvre</h3>
                <button
                  type="button"
                  onClick={addLaborLine}
                  className="btn-outline py-1 px-3 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1 inline" />
                  Ajouter MO
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground uppercase">Poste</th>
                      <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground uppercase w-20">Heures</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase w-32">Taux horaire</th>
                      <th className="py-2 px-3 text-right text-xs font-medium text-muted-foreground uppercase w-32">Total</th>
                      <th className="py-2 px-3 text-center text-xs font-medium text-muted-foreground uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoiceData.laborDetails && invoiceData.laborDetails.length > 0 ? (
                      invoiceData.laborDetails.map((labor, index) => (
                        <tr key={`labor-${index}`} className="bg-muted/10">
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={labor.type}
                              onChange={(e) => updateLaborDetail(index, 'type', e.target.value)}
                              className="w-full"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={labor.hours}
                              onChange={(e) => updateLaborDetail(index, 'hours', e.target.value)}
                              className="w-full text-center"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={labor.rate}
                              onChange={(e) => updateLaborDetail(index, 'rate', e.target.value)}
                              className="w-full text-right"
                            />
                          </td>
                          <td className="py-3 px-3 text-right">
                            {formatCurrency(
                              labor.total && (!labor.hours || labor.hours === 0)
                                ? labor.total
                                : (labor.hours || 0) * (labor.rate || 0)
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLaborLine(index)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="bg-muted/10">
                        <td className="py-3 px-3 font-medium">Main d'œuvre</td>
                        <td className="py-3 px-3"></td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={invoiceData.labor_hours}
                            onChange={(e) => updateLabor('labor_hours', e.target.value)}
                            className={`w-full text-center bg-transparent ${formErrors.labor_hours ? 'border-destructive' : ''}`}
                          />
                          {formErrors.labor_hours && (
                            <p className="text-destructive text-xs mt-1">{formErrors.labor_hours}</p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={invoiceData.labor_rate}
                            onChange={(e) => updateLabor('labor_rate', e.target.value)}
                            className={`w-full text-right bg-transparent ${formErrors.labor_rate ? 'border-destructive' : ''}`}
                          />
                          {formErrors.labor_rate && (
                            <p className="text-destructive text-xs mt-1">{formErrors.labor_rate}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {formatCurrency((invoiceData.labor_hours || 0) * (invoiceData.labor_rate || 0))}
                        </td>
                        <td className="py-3 px-3"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Taux de TVA */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Taux de TVA (%)</label>
              <div className="flex space-x-2">
                {[20, 10, 5.5, 0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => updateTaxRate(rate)}
                    className={`px-3 py-1 rounded text-sm ${
                      Math.abs(invoiceData.tax_rate - rate / 100) < 0.001
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
                
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={(invoiceData.tax_rate * 100).toFixed(1)}
                  onChange={(e) => updateTaxRate(e.target.value)}
                  className="w-20 text-center"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={invoiceData.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Notes ou conditions spécifiques..."
                className="w-full h-24"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Sidebar - Options et totaux */}
        <div className="md:col-span-4 space-y-6">
          {/* Totaux */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-medium mb-4">Totaux</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sous-total:</span>
                <span className="font-medium">{formatCurrency(invoiceData.subtotal || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">TVA ({((invoiceData.tax_rate || 0.2) * 100).toFixed(1)}%):</span>
                <span className="font-medium">{formatCurrency(invoiceData.tax_amount || 0)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoiceData.total || 0)}</span>
              </div>
            </div>

            {invoiceData.report && invoiceData.report.extracted_data && (
              <div className="mt-4 text-sm bg-muted/20 p-3 rounded">
                <p className="font-medium mb-1">Traçabilité</p>
                <p>Rapport: {formatCurrency(invoiceData.report.extracted_data.totalTTC || 0)}</p>
                <p>Facture actuelle: {formatCurrency(invoiceData.total || 0)}</p>
              </div>
            )}
          </div>

          {/* Méthode de paiement */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-medium mb-4">Méthode de paiement</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Virement bancaire', 'Chèque', 'Espèces', 'Carte bancaire'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => updateField('payment_method', method)}
                  className={`p-2 text-sm text-center rounded-md border ${
                    invoiceData.payment_method === method
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Informations d'assurance */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-medium mb-4">Informations d'assurance</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assureur</label>
                <input
                  type="text"
                  value={invoiceData.insurer?.name || ''}
                  onChange={(e) => updateField('insurer', { ...invoiceData.insurer || {}, name: e.target.value })}
                  className="w-full"
                  placeholder="Nom de l'assureur"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">N° de police</label>
                  <input
                    type="text"
                    value={invoiceData.insurer?.policyNumber || ''}
                    onChange={(e) => updateField('insurer', { ...invoiceData.insurer || {}, policyNumber: e.target.value })}
                    className="w-full"
                    placeholder="N° de police"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">N° de sinistre</label>
                  <input
                    type="text"
                    value={invoiceData.insurer?.claimNumber || ''}
                    onChange={(e) => updateField('insurer', { ...invoiceData.insurer || {}, claimNumber: e.target.value })}
                    className="w-full"
                    placeholder="N° de sinistre"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Style de template */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-medium mb-4">Style de facture</h3>
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
                        invoiceData.template === template.id
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
                      onClick={() => updateField('template_color', color.id)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        invoiceData.template_color === color.id
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
          <div className="bg-card rounded-lg border p-6">
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={updateInvoice}
                disabled={isSaving}
                className="btn-primary py-2.5"
              >
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Mise à jour en cours...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Mettre à jour la facture
                  </>
                )}
              </button>
              
              <Link 
                to={`/dashboard/invoices/${invoiceId}`}
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

export default InvoiceEditor;

// Helper function to format date as YYYY-MM-DD
function format(date, formatStr) {
  const pad = (num) => String(num).padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  
  if (formatStr === 'yyyy-MM-dd') {
    return `${year}-${month}-${day}`;
  }
  
  return `${year}-${month}-${day}`;
}
