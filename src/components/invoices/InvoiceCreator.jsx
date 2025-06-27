import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Check, AlertCircle, Search, Calendar, User, Car, FileText, ArrowLeft, Info, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Invoice } from '../../models/Invoice';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { checkActionPermission } from '../../lib/subscriptionManager';
import SubscriptionLimitModal from '../subscription/SubscriptionLimitModal';
import AddClientModal from '../clients/AddClientModal.jsx';
import { recalculateTotal, parseNumber } from '../../utils/invoiceUtils.js';
import { useSession } from '../../hooks/useSession';

// Schéma de validation pour la facture
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
  laborDetails: z
    .array(
      z.object({
        type: z.string().optional(),
        hours: z.number().min(0),
        rate: z.number().min(0)
      })
    )
    .optional(),
  tax_rate: z.number().min(0).max(1, "Le taux de TVA doit être entre 0 et 100%")
});

const InvoiceCreator = () => {
  const navigate = useNavigate();
  const { executeWithValidSession } = useSession();
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [currentStep, setCurrentStep] = useState('recipient');
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [completeInvoiceData, setCompleteInvoiceData] = useState(null);
  
  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Reference to reload data when returning to the tab
  const fetchInvoiceDataRef = useRef(null);
  const [limitInfo, setLimitInfo] = useState(null);
  
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
    labor_rate: 70, // Taux par défaut
    laborDetails: [],
    subtotal: 0,
    tax_rate: 0.2, // 20%
    tax_amount: 0,
    total: 0,
    status: 'pending',
    template: 'white',
    template_color: 'blue',
    payment_method: 'Virement bancaire',
    notes: '',
    insurer: null
  });

  const invoiceDataRef = useRef(invoiceData);
  useEffect(() => {
    invoiceDataRef.current = invoiceData;
  }, [invoiceData]);

  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    const stored = sessionStorage.getItem('invoiceCreatorData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        invoiceDataRef.current = parsed;
        setInvoiceData(parsed);
      } catch (e) {
        console.error('Erreur lors de la restauration de la facture:', e);
      }
    }
  }, []);

  // Persist form state to survive tab switches
  useEffect(() => {
    sessionStorage.setItem('invoiceCreatorData', JSON.stringify(invoiceData));
  }, [invoiceData]);

  useEffect(() => {
    return () => sessionStorage.removeItem('invoiceCreatorData');
  }, []);

  // Références
  const clientSearchRef = useRef(null);
  const loadingStartTimeRef = useRef(null);

  // Keep track of when a save operation started to recover gracefully after
  // returning from another browser tab
  useEffect(() => {
    if (isSaving) {
      loadingStartTimeRef.current = Date.now();
    } else {
      loadingStartTimeRef.current = null;
    }
  }, [isSaving]);

  // Display an error if saving takes too long
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsSaving(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isSaving]);



  // Check subscription limits on initial load
  useEffect(() => {
    const checkSubscriptionLimits = async () => {
      const result = await checkActionPermission('invoice');
      if (!result.canProceed) {
        setLimitInfo(result);
        setShowLimitModal(true);
      }
    };
    
    checkSubscriptionLimits();
  }, []);

  // Charger les clients au chargement du composant
  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    const fetchClients = async () => {
      try {
        setIsLoadingClients(true);
        const { data, error } = await supabase
          .from('clients')
          .select('*, vehicles(*)');
          
        if (error) throw error;
        
        setClients(data || []);
        setFilteredClients(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
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
        
        // Utiliser le taux horaire de l'utilisateur comme valeur par défaut
        if (data && data.hourly_rate) {
          setInvoiceData(prev => ({
            ...prev,
            labor_rate: data.hourly_rate
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };

    const getNextInvoiceNumber = async () => {
      try {
        const nextNumber = await Invoice.getNextInvoiceNumber();
        setInvoiceData(prev => ({
          ...prev,
          invoice_number: nextNumber
        }));
      } catch (error) {
        console.error('Erreur lors de la récupération du numéro de facture:', error);
      }
    };

    const fetchInvoiceData = async () => {
      await fetchClients();
      await fetchUserProfile();
      await getNextInvoiceNumber();
    };

    fetchInvoiceDataRef.current = fetchInvoiceData;
    fetchInvoiceData();
  }, []);

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

  // Calcul automatique des totaux
  useEffect(() => {
    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [
            {
              hours: parseNumber(invoiceData.labor_hours) || 0,
              rate: parseNumber(invoiceData.labor_rate) || 0
            }
          ];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      invoiceData.parts,
      laborArray,
      invoiceData.tax_rate
    );

    setInvoiceData(prev => ({
      ...prev,
      subtotal: Math.round(totalHT * 100) / 100,
      tax_amount: Math.round(tva * 100) / 100,
      total: Math.round(totalTTC * 100) / 100
    }));
  }, [
    invoiceData.parts,
    invoiceData.labor_hours,
    invoiceData.labor_rate,
    invoiceData.laborDetails,
    invoiceData.tax_rate
  ]);

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
      setFormErrors(prev => ({ ...prev, client_id: undefined }));
    }
    
    // Générer des suggestions d'articles basées sur l'historique du client
    generateSuggestions(client.id);
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
      setFormErrors(prev => ({ ...prev, vehicle_id: undefined }));
    }
  };

  // Ajouter une ligne d'article
  const addPart = () => {
    const updatedParts = [
      ...invoiceData.parts,
      { description: '', quantity: 1, unitPrice: 0, discount: 0 }
    ];

    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [
            {
              hours: parseNumber(invoiceData.labor_hours) || 0,
              rate: parseNumber(invoiceData.labor_rate) || 0
            }
          ];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      updatedParts,
      laborArray,
      invoiceData.tax_rate
    );

    setInvoiceData(prev => ({
      ...prev,
      parts: updatedParts,
      subtotal: Math.round(totalHT * 100) / 100,
      tax_amount: Math.round(tva * 100) / 100,
      total: Math.round(totalTTC * 100) / 100
    }));
  };

  // Supprimer une ligne d'article
  const removePart = (index) => {
    if (invoiceData.parts.length <= 1) return;

    const updatedParts = invoiceData.parts.filter((_, i) => i !== index);

    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [
            {
              hours: parseNumber(invoiceData.labor_hours) || 0,
              rate: parseNumber(invoiceData.labor_rate) || 0
            }
          ];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      updatedParts,
      laborArray,
      invoiceData.tax_rate
    );

    setInvoiceData(prev => ({
      ...prev,
      parts: updatedParts,
      subtotal: Math.round(totalHT * 100) / 100,
      tax_amount: Math.round(tva * 100) / 100,
      total: Math.round(totalTTC * 100) / 100
    }));
  };

  // Ajouter une ligne de main d'œuvre
  const addLaborLine = () => {
    setInvoiceData(prev => ({
      ...prev,
      laborDetails: [...(prev.laborDetails || []), { type: '', hours: 0, rate: prev.labor_rate || 0 }]
    }));
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
        subtotal: Math.round(totalHT * 100) / 100,
        tax_amount: Math.round(tva * 100) / 100,
        total: Math.round(totalTTC * 100) / 100
      };
    });
  };

  // Mettre à jour une ligne de main d'œuvre
  const updateLaborDetail = (index, field, value) => {
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
        subtotal: Math.round(totalHT * 100) / 100,
        tax_amount: Math.round(tva * 100) / 100,
        total: Math.round(totalTTC * 100) / 100
      };
    });
  };

  // Mettre à jour une pièce
  const updatePart = (index, field, value) => {
    const newParts = [...invoiceData.parts];
    
    if (field === 'quantity') {
      value = parseInt(value) || 1;
    } else if (field === 'unitPrice') {
      value = parseNumber(value) || 0;
    } else if (field === 'discount') {
      value = Math.min(Math.max(parseNumber(value) || 0, 0), 100);
    }
    
    newParts[index] = {
      ...newParts[index],
      [field]: value
    };
    
    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [
            {
              hours: parseNumber(invoiceData.labor_hours) || 0,
              rate: parseNumber(invoiceData.labor_rate) || 0
            }
          ];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      newParts,
      laborArray,
      invoiceData.tax_rate
    );

    setInvoiceData(prev => ({
      ...prev,
      parts: newParts,
      subtotal: Math.round(totalHT * 100) / 100,
      tax_amount: Math.round(tva * 100) / 100,
      total: Math.round(totalTTC * 100) / 100
    }));
    
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

  // Mettre à jour la main d'œuvre
  const updateLabor = (field, value) => {
    value = parseNumber(value) || 0;

    const updated = {
      ...invoiceData,
      [field]: value
    };

    const laborArray =
      updated.laborDetails && updated.laborDetails.length > 0
        ? updated.laborDetails
        : [
            {
              hours: parseNumber(updated.labor_hours) || 0,
              rate: parseNumber(updated.labor_rate) || 0
            }
          ];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      updated.parts,
      laborArray,
      updated.tax_rate
    );

    setInvoiceData(prev => ({
      ...prev,
      [field]: value,
      subtotal: Math.round(totalHT * 100) / 100,
      tax_amount: Math.round(tva * 100) / 100,
      total: Math.round(totalTTC * 100) / 100
    }));
    
    // Effacer l'erreur si elle existe
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Mettre à jour le taux de TVA
  const updateTaxRate = (rate) => {
    const taxRate = parseNumber(rate) / 100;

    const laborArray =
      invoiceData.laborDetails && invoiceData.laborDetails.length > 0
        ? invoiceData.laborDetails
        : [
            {
              hours: parseNumber(invoiceData.labor_hours) || 0,
              rate: parseNumber(invoiceData.labor_rate) || 0
            }
          ];

    const { totalHT, tva, totalTTC } = recalculateTotal(
      invoiceData.parts,
      laborArray,
      taxRate
    );

    setInvoiceData(prev => ({
      ...prev,
      tax_rate: taxRate,
      subtotal: Math.round(totalHT * 100) / 100,
      tax_amount: Math.round(tva * 100) / 100,
      total: Math.round(totalTTC * 100) / 100
    }));
  };

  // Mettre à jour le champ client_id
  const updateField = (field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur si elle existe
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
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
        laborDetails: invoiceData.laborDetails,
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

  // Sauvegarder la facture
  const saveInvoice = async () => {
    if (document.visibilityState !== 'visible') return;
    if (isSaving) return; // protection anti double clic
    console.log('submit triggered manuellement');
    console.log('saveInvoice triggered', invoiceData);

    if (!invoiceData || !invoiceData.invoice_number || !invoiceData.parts) {
      toast.error('Erreur : données manquantes, rechargez la page.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      await supabase.auth.refreshSession();
    }
    
    // Check subscription limits before saving
    const checkResult = await checkActionPermission('invoice');
    if (!checkResult.canProceed) {
      setLimitInfo(checkResult);
      setShowLimitModal(true);
      return;
    }
    
    try {
      setGeneralError(null);

      const result = await executeWithValidSession(async () => {
        const invoicePayload = {
          clientId: invoiceData.client_id,
          vehicleId: invoiceData.vehicle_id,
          reportId: null,
          invoiceNumber: invoiceData.invoice_number,
          issueDate: new Date(invoiceData.issue_date).toISOString(),
          dueDate: new Date(invoiceData.due_date).toISOString(),
          parts: invoiceData.parts,
          laborHours: invoiceData.labor_hours,
          laborRate: invoiceData.labor_rate,
          laborDetails: invoiceData.laborDetails,
          subtotal: invoiceData.subtotal,
          taxRate: invoiceData.tax_rate,
          taxAmount: invoiceData.tax_amount,
          total: invoiceData.total,
          status: 'pending',
          notes: invoiceData.notes,
          template: invoiceData.template,
          templateColor: invoiceData.template_color,
          paymentMethod: invoiceData.payment_method,
          insurer: invoiceData.insurer
        };
        return await Invoice.create(invoicePayload);
      });

      setSuccess(true);
      setCreatedInvoiceId(result.id);

      setTimeout(() => {
        navigate(`/dashboard/invoices/${result.id}`);
      }, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      setGeneralError(error.message || "Une erreur s'est produite");
    } finally {
      setIsSaving(false);
    }
  };

  // Obtenir des suggestions d'articles basées sur l'historique du client
  const generateSuggestions = async (clientId) => {
    if (!clientId) return;
    
    try {
      setIsGeneratingSuggestions(true);
      
      // Récupérer les factures précédentes du client
      const { data: previousInvoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (previousInvoices && previousInvoices.length > 0) {
        // Compiler toutes les pièces des factures précédentes
        let allParts = [];
        
        previousInvoices.forEach(invoice => {
          if (invoice.parts && Array.isArray(invoice.parts)) {
            allParts = [...allParts, ...invoice.parts];
          }
        });
        
        // Trouver les pièces les plus fréquentes
        const partCounts = {};
        allParts.forEach(part => {
          if (!part.description) return;
          
          const key = part.description.toLowerCase();
          if (!partCounts[key]) {
            partCounts[key] = { count: 0, part };
          }
          partCounts[key].count += 1;
        });
        
        // Trier par fréquence
        const sortedParts = Object.values(partCounts)
          .sort((a, b) => b.count - a.count)
          .map(item => item.part)
          .slice(0, 5); // Prendre les 5 plus fréquentes
        
        if (sortedParts.length > 0) {
          setAiSuggestions(sortedParts);
          setShowSuggestions(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la génération de suggestions:', error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Ajouter une pièce suggérée
  const addSuggestedPart = (part) => {
    setInvoiceData(prev => ({
      ...prev,
      parts: [...prev.parts, { ...part }]
    }));
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
          
          <h1 className="text-2xl font-bold mb-2">Facture créée avec succès !</h1>
          <p className="text-muted-foreground mb-6">
            Votre facture a été enregistrée et est prête à être envoyée au client.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Link 
              to={`/dashboard/invoices/${createdInvoiceId}`} 
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

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <Link to="/dashboard/invoices" className="text-muted-foreground hover:text-foreground flex items-center mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux factures
          </Link>
          <h1 className="text-2xl font-bold">Créer une facture</h1>
          <p className="text-muted-foreground">
            Créez une facture manuellement en remplissant le formulaire ci-dessous
          </p>
        </div>
      </div>

      {/* Subscription limit modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />
      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        onSuccess={(client) => selectClient(client)}
      />

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
                <label htmlFor="creator-invoice-number" className="block text-sm font-medium">N° de facture</label>
                <input
                  id="creator-invoice-number"
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
                <label htmlFor="creator-issue-date" className="block text-sm font-medium">Date d'émission</label>
                <input
                  id="creator-issue-date"
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
                <label htmlFor="creator-due-date" className="block text-sm font-medium">Date d'échéance</label>
                <input
                  id="creator-due-date"
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
            <div className="space-y-2 relative" ref={clientSearchRef}>
              <label className="block text-sm font-medium">Client</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowClientSearch(true)}
                  className={`w-full pl-9 ${formErrors.client_id ? 'border-destructive' : ''}`}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {invoiceData.client && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2 flex items-center">
                    <button
                      className="p-1 hover:bg-muted rounded-full"
                      onClick={() => {
                        setInvoiceData(prev => ({ ...prev, client_id: '', client: null }));
                        setSearchTerm('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {formErrors.client_id && (
                <p className="text-destructive text-xs">{formErrors.client_id}</p>
              )}
              
              {/* Affichage du client sélectionné */}
              {invoiceData.client && (
                <div className="mt-2 p-3 bg-muted/20 rounded-md">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{invoiceData.client.first_name} {invoiceData.client.last_name}</p>
                      <div className="text-sm text-muted-foreground">
                        {invoiceData.client.email && <p>{invoiceData.client.email}</p>}
                        {invoiceData.client.phone && <p>{invoiceData.client.phone}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Résultats de la recherche de clients */}
              {showClientSearch && (
                <div className="absolute z-10 mt-1 w-full bg-card rounded-md border shadow-lg max-h-64 overflow-y-auto">
                  {isLoadingClients ? (
                    <div className="p-4 text-center">
                      <Loader className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Chargement des clients...</p>
                    </div>
                  ) : filteredClients.length > 0 ? (
                    <div>
                      {filteredClients.map(client => (
                        <div
                          key={client.id}
                          className="p-3 hover:bg-muted/50 cursor-pointer"
                          onClick={() => selectClient(client)}
                        >
                          <div className="font-medium">{client.first_name} {client.last_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.email && <span>{client.email}</span>}
                            {client.email && client.phone && <span className="mx-1">•</span>}
                            {client.phone && <span>{client.phone}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Aucun client trouvé
                    </div>
                  )}
                </div>
              )}
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

            {/* Suggestions basées sur l'IA */}
            {isGeneratingSuggestions && (
              <div className="bg-muted/10 p-4 rounded-md flex items-center">
                <Loader className="h-5 w-5 animate-spin mr-3 text-primary" />
                <p>Génération de suggestions basées sur l'historique du client...</p>
              </div>
            )}
            
            {showSuggestions && aiSuggestions && aiSuggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-lg p-4"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 mr-2 text-primary" />
                    <h3 className="text-sm font-medium">Articles suggérés (basés sur l'historique)</h3>
                  </div>
                  <button 
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowSuggestions(false)}
                  >
                    Masquer
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {aiSuggestions.map((part, index) => (
                    <button
                      key={index}
                      className="p-2 text-sm bg-card hover:bg-muted/50 rounded border flex justify-between items-center"
                      onClick={() => addSuggestedPart(part)}
                    >
                      <div className="truncate">
                        <span className="font-medium">{part.description}</span>
                        <span className="text-muted-foreground ml-2">{formatCurrency(part.unitPrice)}</span>
                      </div>
                      <Plus className="ml-2 h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

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
                            {formatCurrency((labor.hours || 0) * (labor.rate || 0))}
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
              <label className="block text-sm font-medium">Taux de TVA (%)</label>
              <div className="flex space-x-2">
                {[20, 10, 5.5, 0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => updateTaxRate(rate)}
                    className={`px-3 py-1 rounded text-sm ${
                      invoiceData.tax_rate === rate / 100
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
                  value={invoiceData.tax_rate * 100}
                  onChange={(e) => updateTaxRate(e.target.value)}
                  className="w-20 text-center"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Notes</label>
              <textarea
                value={invoiceData.notes}
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
                <span className="font-medium">{formatCurrency(invoiceData.subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">TVA ({(invoiceData.tax_rate * 100).toFixed(1)}%):</span>
                <span className="font-medium">{formatCurrency(invoiceData.tax_amount)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoiceData.total)}</span>
              </div>
            </div>
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
                onClick={saveInvoice}
                disabled={isSaving}
                className="btn-primary py-2.5"
              >
                {isSaving ? (
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

export default InvoiceCreator;

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
