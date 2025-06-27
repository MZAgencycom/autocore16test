import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Upload, 
  X, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Bell,
  Save,
  Sparkles,
  Clock,
  Download,
  User,
  Car,
  ScrollText,
  Mail,
  Loader
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ClientSearchInput from './ClientSearchInput';
import EmailGenerator from './EmailGenerator';
import ReminderSettings from './ReminderSettings';
import { supabase } from '../../lib/supabase';

const EmailSender = ({
  recipient = { name: '', email: '' },
  vehicle = { make: '', model: '', registration: '' },
  invoice = null,
  preselectedTemplate = null,
  generatedContent = null,
  generatedSubject = null,
  initialAttachments = []
}) => {
  // État du formulaire
  const [subject, setSubject] = useState(
    generatedSubject || 
    (invoice 
      ? `Facture ${invoice.invoice_number} - ${vehicle.make} ${vehicle.model}` 
      : `Informations concernant votre ${vehicle.make} ${vehicle.model}`)
  );
  
  const [message, setMessage] = useState(
    generatedContent ||
    (invoice 
      ? `Bonjour ${recipient.name},\n\nVeuillez trouver ci-joint la facture ${invoice.invoice_number} concernant les réparations effectuées sur votre ${vehicle.make} ${vehicle.model}${vehicle.registration ? ` (${vehicle.registration})` : ''}.\n\nN'hésitez pas à me contacter pour toute question.\n\nCordialement,\n[Votre nom]`
      : `Bonjour ${recipient.name},\n\nJe vous contacte concernant votre ${vehicle.make} ${vehicle.model}${vehicle.registration ? ` (${vehicle.registration})` : ''}.\n\nCordialement,\n[Votre nom]`)
  );
  
  const [attachments, setAttachments] = useState(
    invoice
      ? [{ name: `Facture_${invoice.invoice_number}.pdf`, size: '145 KB', type: 'application/pdf' }]
      : initialAttachments
  );
  
  const [templates, setTemplates] = useState([
    { id: 'invoice', name: 'Envoi de facture', subject: 'Facture {invoice_number} - {vehicle}', 
      content: 'Bonjour {client},\n\nVeuillez trouver ci-joint la facture {invoice_number} concernant les réparations effectuées sur votre {vehicle}.\n\nN\'hésitez pas à me contacter pour toute question.\n\nCordialement,\n[Votre nom]' },
    { id: 'followup', name: 'Suivi de réparation', subject: 'Suivi de réparation - {vehicle}', 
      content: 'Bonjour {client},\n\nJe me permets de vous contacter concernant les réparations en cours sur votre {vehicle}.\n\nLes travaux avancent comme prévu et nous estimons que votre véhicule sera prêt le [DATE].\n\nN\'hésitez pas à me contacter pour toute question.\n\nCordialement,\n[Votre nom]' }
  ]);
  
  // Nouvel état pour les fonctionnalités améliorées
  const [selectedTemplate, setSelectedTemplate] = useState(preselectedTemplate || (invoice ? 'invoice' : ''));
  const [selectedClient, setSelectedClient] = useState(
    recipient.name ? { name: recipient.name, email: recipient.email } : null
  );
  const [selectedVehicle, setSelectedVehicle] = useState(
    vehicle.make ? { 
      make: vehicle.make, 
      model: vehicle.model, 
      registration: vehicle.registration 
    } : null
  );
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState(null);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [reminder, setReminder] = useState(null);
  const [scheduledSend, setScheduledSend] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [clientReports, setClientReports] = useState([]);
  const [currentStep, setCurrentStep] = useState('recipient');
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [completeInvoiceData, setCompleteInvoiceData] = useState(null);
  
  // Charger les données du client, les factures et les rapports associés
  useEffect(() => {
    if (recipient?.name) {
      setSelectedClient({ 
        name: recipient.name, 
        email: recipient.email 
      });
    }
    
    if (vehicle?.make) {
      setSelectedVehicle({
        make: vehicle.make,
        model: vehicle.model,
        registration: vehicle.registration || ''
      });
    }
    
    if (generatedContent) {
      setMessage(generatedContent);
    }
    
    if (generatedSubject) {
      setSubject(generatedSubject);
    }
  }, [recipient, vehicle, generatedContent, generatedSubject]);
  
  // Charger les détails complets de la facture si une facture est fournie
  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      if (invoice && invoice.id) {
        try {
          const { data, error } = await supabase
            .from('invoices')
            .select(`
              *,
              clients(*),
              vehicles(*)
            `)
            .eq('id', invoice.id)
            .single();
            
          if (error) throw error;
          
          if (import.meta?.env?.DEV) console.log("Fetched complete invoice data:", data);
          setCompleteInvoiceData(data);
          
          // Update the message with accurate invoice information
          if (data) {
            const formattedTotal = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.total);
            const issueDateStr = data.issue_date ? new Date(data.issue_date).toLocaleDateString('fr-FR') : '';
            const dueDateStr = data.due_date ? new Date(data.due_date).toLocaleDateString('fr-FR') : '';
            
            const updatedMessage = `Bonjour ${recipient.name},

Veuillez trouver ci-joint la facture ${data.invoice_number} d'un montant de ${formattedTotal} concernant les réparations effectuées sur votre ${vehicle.make} ${vehicle.model}${vehicle.registration ? ` (${vehicle.registration})` : ''}.

${dueDateStr ? `La facture est payable avant le ${dueDateStr}.` : ''}

N'hésitez pas à me contacter pour toute question.

Cordialement,
[Votre nom]`;

            setMessage(updatedMessage);
            
            // Update the subject too
            setSubject(`Facture ${data.invoice_number} - ${vehicle.make} ${vehicle.model}`);
          }
        } catch (err) {
          console.error("Error fetching invoice details:", err);
        }
      }
    };
    
    fetchInvoiceDetails();
  }, [invoice, recipient, vehicle]);
  
  // Mettre à jour le contenu en fonction du template sélectionné
  useEffect(() => {
    if (selectedTemplate) {
      applyTemplate(selectedTemplate);
    }
  }, [selectedTemplate, selectedClient, selectedVehicle, invoice, completeInvoiceData]);
  
  // Charger les données du client quand un client est sélectionné
  useEffect(() => {
    const loadClientData = async () => {
      if (!selectedClient?.id) return;
      
      try {
        // Charger les factures du client
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', selectedClient.id)
          .order('created_at', { ascending: false });
          
        if (invoicesError) throw invoicesError;
        setClientInvoices(invoicesData || []);
        
        // Calculer le chiffre d'affaires (factures encaissées)
        const ca = invoicesData
          .filter(f => f.status === 'paid')
          .reduce((sum, f) => sum + f.total, 0);
          
        // Charger les rapports du client
        const { data: reportsData, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('client_id', selectedClient.id)
          .order('created_at', { ascending: false });
          
        if (reportsError) throw reportsError;
        setClientReports(reportsData || []);
        
        // Si le client a une facture récente, la sélectionner par défaut
        if (invoicesData && invoicesData.length > 0 && !invoice) {
          // Mettre à jour le sujet et le message avec les infos de la facture
          const latestInvoice = invoicesData[0];
          setSubject(`Facture ${latestInvoice.invoice_number} - ${selectedVehicle?.make || vehicle.make} ${selectedVehicle?.model || vehicle.model}`);
          
          // Charger les détails complets de la facture la plus récente
          try {
            const { data: completeInvoice, error: completeInvoiceError } = await supabase
              .from('invoices')
              .select(`
                *,
                clients(*),
                vehicles(*)
              `)
              .eq('id', latestInvoice.id)
              .single();
              
            if (!completeInvoiceError && completeInvoice) {
              setCompleteInvoiceData(completeInvoice);
              
              // Mettre à jour le message avec le montant exact
              const formattedTotal = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(completeInvoice.total);
              const updatedMessage = `Bonjour ${selectedClient.name.split(' ')[0]},

Veuillez trouver ci-joint la facture ${completeInvoice.invoice_number} d'un montant de ${formattedTotal} concernant les réparations effectuées sur votre ${selectedVehicle?.make || vehicle.make} ${selectedVehicle?.model || vehicle.model}${selectedVehicle?.registration ? ` (${selectedVehicle.registration})` : ''}.

${completeInvoice.due_date ? `La facture est payable avant le ${new Date(completeInvoice.due_date).toLocaleDateString('fr-FR')}.` : ''}

N'hésitez pas à me contacter pour toute question.

Cordialement,
[Votre nom]`;

              setMessage(updatedMessage);
            }
          } catch (err) {
            console.error("Error fetching latest invoice details:", err);
          }
        }
        
      } catch (error) {
        console.error('Error loading client data:', error);
      }
    };
    
    loadClientData();
  }, [selectedClient?.id, vehicle, invoice]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSize = file.size / 1024; // KB
      const formattedSize = fileSize < 1024 
        ? `${Math.round(fileSize)} KB` 
        : `${(fileSize / 1024).toFixed(1)} MB`;
      
      setAttachments(prev => [...prev, {
        name: file.name,
        size: formattedSize,
        type: file.type,
        file
      }]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleClientSelect = (client) => {
    setSelectedClient(client);
    
    if (client.id) {
      setCurrentStep('content');
      
      // If client has vehicles, auto-select the first one
      if (client.vehicles && client.vehicles.length > 0) {
        const firstVehicle = client.vehicles[0];
        setSelectedVehicle({
          id: firstVehicle.id,
          make: firstVehicle.make,
          model: firstVehicle.model,
          registration: firstVehicle.registration || ''
        });
      }
    }
  };
  
  const applyTemplate = (templateId) => {
    setSelectedTemplate(templateId);
    
    if (!templateId) return;
    
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    let newSubject = template.subject;
    let newContent = template.content;
    
    // Get the most accurate invoice data
    const invoiceDetails = completeInvoiceData || invoice || {};
    const invoiceTotal = invoiceDetails.total || 0;
    const formattedTotal = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceTotal);
    const issueDate = invoiceDetails.issue_date ? new Date(invoiceDetails.issue_date).toLocaleDateString('fr-FR') : '';
    const dueDate = invoiceDetails.due_date ? new Date(invoiceDetails.due_date).toLocaleDateString('fr-FR') : '';
    
    // Replace placeholders with actual values
    const replacements = {
      '{client}': selectedClient?.name || recipient.name || '',
      '{vehicle}': `${selectedVehicle?.make || vehicle.make} ${selectedVehicle?.model || vehicle.model}${(selectedVehicle?.registration || vehicle.registration) ? ` (${selectedVehicle?.registration || vehicle.registration})` : ''}`,
      '{invoice_number}': invoiceDetails.invoice_number || '',
      '{total}': formattedTotal,
      '{issue_date}': issueDate,
      '{due_date}': dueDate,
      '{date}': format(new Date(), 'dd/MM/yyyy', { locale: fr })
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      newSubject = newSubject.replace(new RegExp(placeholder, 'g'), value);
      newContent = newContent.replace(new RegExp(placeholder, 'g'), value);
    });
    
    setSubject(newSubject);
    setMessage(newContent);
  };
  
  const handleSetReminder = (reminderData) => {
    setReminder(reminderData);
    setShowReminderSettings(false);
  };
  
  const handleScheduleSend = () => {
    // Set a default scheduled time (tomorrow at 10 AM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    setScheduledSend(tomorrow.toISOString());
    setShowPicker(!showPicker);
  };
  
  const handleScheduleChange = (e) => {
    const dateTime = e.target.value;
    if (dateTime) {
      setScheduledSend(new Date(dateTime).toISOString());
    } else {
      setScheduledSend(null);
    }
  };
  
  const handleCancelSchedule = () => {
    setScheduledSend(null);
    setShowPicker(false);
  };
  
  const handleSaveDraft = async () => {
    try {
      setSaveAsDraft(true);
      
      // In a real implementation, save to database
      await new Promise(resolve => setTimeout(resolve, 800));
      
      alert('Brouillon enregistré avec succès !');
      
      // Reset form or redirect as needed
    } catch (error) {
      console.error('Error saving draft:', error);
      setError('Erreur lors de l\'enregistrement du brouillon');
    } finally {
      setSaveAsDraft(false);
    }
  };
  
  const handleAIGenerate = () => {
    setShowEmailGenerator(true);
    setIsAiEnabled(true);
  };
  
  const handleEmailGenerated = (generatedEmail) => {
    if (generatedEmail) {
      setSubject(generatedEmail.subject);
      setMessage(generatedEmail.content);
      setIsAiEnabled(true);
      setIsAiGenerating(false);
    }
    setShowEmailGenerator(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    try {
      setSending(true);
      setError(null);
      
      // Validate form
      if (!selectedClient?.email && !recipient.email) {
        throw new Error("L'adresse email du destinataire est requise");
      }
      
      if (!subject.trim()) {
        throw new Error("L'objet de l'email est requis");
      }
      
      if (!message.trim()) {
        throw new Error("Le contenu de l'email est requis");
      }
      
      // If scheduling for later, save to scheduled emails
      if (scheduledSend) {
        // In a real implementation, save to database
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setEmailSent(true);
        setSending(false);
        return;
      }
      
      // If saving as draft, handle differently
      if (saveAsDraft) {
        await handleSaveDraft();
        return;
      }
      
      // For this demo, we'll just simulate sending by opening mailto
      const targetEmail = selectedClient?.email || recipient.email;
      if (targetEmail) {
        const mailtoLink = `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.open(mailtoLink);
      }
      
      // Save the reminder if set
      if (reminder) {
        if (import.meta?.env?.DEV) console.log('Saving reminder:', reminder);
        // In a real implementation, save to database
      }
      
      // Simulate successful sending
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setEmailSent(true);
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="bg-emerald-500/10 text-emerald-500 p-6 rounded-full mb-4"
          >
            <CheckCircle className="h-12 w-12" />
          </motion.div>
          
          <h3 className="text-xl font-bold mb-2">
            {scheduledSend ? 'Rappel programmé avec succès' : 'Email envoyé avec succès'}
          </h3>
          
          <p className="text-muted-foreground text-center mb-6">
            {scheduledSend ? (
              <>
                <strong>Vous recevrez une notification</strong> le {format(new Date(scheduledSend), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })} pour finaliser l'envoi manuel de ce message.
                <br/><br/>
                <span className="text-sm">Aucune action automatique ne sera faite à votre place.</span>
              </>
            ) : (
              <>
                Votre email a été envoyé à {selectedClient?.name || recipient.name} ({selectedClient?.email || recipient.email})
              </>
            )}
          </p>
          
          {reminder && (
            <div className="mb-6 p-3 rounded-md bg-blue-500/10 text-blue-500 flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              <span>Rappel programmé dans {reminder.days} jours si aucune réponse</span>
            </div>
          )}
          
          <button
            onClick={() => {
              setEmailSent(false);
              setSubject('');
              setMessage('');
              setAttachments([]);
              setSelectedClient(null);
              setSelectedTemplate('');
              setReminder(null);
              setScheduledSend(null);
            }}
            className="btn-primary"
          >
            Envoyer un autre email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border relative overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center mb-4 justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded bg-primary/10 text-primary mr-3">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Envoyer un email</h3>
              <p className="text-sm text-muted-foreground">Créez et envoyez un email à votre client</p>
            </div>
          </div>
          
          {/* Bouton Générer avec IA - AMÉLIORÉ et plus visible */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-primary to-blue-500 text-white font-medium py-2 px-4 rounded-lg shadow-md flex items-center gap-2 hover:shadow-lg transition-all duration-300"
            onClick={handleAIGenerate}
          >
            <Sparkles className="h-4 w-4" />
            <span>Générer avec IA</span>
          </motion.button>
        </div>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section destinataire améliorée avec autocomplétion */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-primary mr-1.5" />
                  <span>Destinataire</span>
                </div>
                {currentStep !== 'recipient' && selectedClient && (
                  <button 
                    className="text-xs text-primary hover:underline"
                    onClick={() => setCurrentStep('recipient')}
                  >
                    Modifier
                  </button>
                )}
              </label>
              
              {currentStep === 'recipient' ? (
                <ClientSearchInput
                  onClientSelect={handleClientSelect}
                  initialValue={selectedClient}
                  placeholder="Rechercher un client..."
                />
              ) : (
                selectedClient && (
                  <div className="p-3 border rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium flex items-center">
                          {selectedClient.name}
                          <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs rounded-full">
                            Client CRM
                          </span>
                        </div>
                        <div className="text-sm text-primary mt-0.5">{selectedClient.email}</div>
                      </div>
                    </div>
                  </div>
                )
              )}
              
              {clientInvoices.length > 0 && selectedClient && currentStep !== 'recipient' && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Dernière facture:</p>
                  <div className="flex items-center bg-muted/20 p-2 rounded-md text-xs">
                    <ScrollText className="h-3.5 w-3.5 text-primary mr-1.5" />
                    <span className="font-medium">{clientInvoices[0].invoice_number}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(clientInvoices[0].total)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Section véhicule */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1 flex items-center">
                <Car className="h-4 w-4 text-primary mr-1.5" />
                <span>Véhicule concerné</span>
              </label>
              
              {selectedClient ? (
                selectedClient.vehicles && selectedClient.vehicles.length > 0 ? (
                  <div className="p-3 border rounded-md">
                    <select 
                      className="w-full border-0 bg-transparent p-0 focus:ring-0"
                      onChange={(e) => {
                        const vehicleId = e.target.value;
                        const vehicle = selectedClient.vehicles.find(v => v.id === vehicleId);
                        if (vehicle) {
                          setSelectedVehicle({
                            id: vehicle.id,
                            make: vehicle.make,
                            model: vehicle.model,
                            registration: vehicle.registration || ''
                          });
                        }
                      }}
                    >
                      {selectedClient.vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.make} {v.model} {v.registration ? `(${v.registration})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : selectedVehicle ? (
                  <div className="p-3 border rounded-md">
                    <div className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</div>
                    {selectedVehicle.registration && (
                      <div className="text-sm text-muted-foreground mt-0.5">Immatriculation: {selectedVehicle.registration}</div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 border rounded-md text-muted-foreground">
                    Aucun véhicule associé à ce client
                  </div>
                )
              ) : (
                vehicle.make || vehicle.model ? (
                  <div className="p-3 border rounded-md">
                    <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                    {vehicle.registration && (
                      <div className="text-sm text-muted-foreground">Immatriculation: {vehicle.registration}</div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 border rounded-md text-muted-foreground">
                    Veuillez d'abord sélectionner un client
                  </div>
                )
              )}
              
              {clientReports.length > 0 && selectedClient && currentStep !== 'recipient' && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Dernier rapport:</p>
                  <div className="flex items-center bg-muted/20 p-2 rounded-md text-xs">
                    <FileText className="h-3.5 w-3.5 text-primary mr-1.5" />
                    <span className="font-medium">Rapport #{clientReports[0].id.substring(0, 8)}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(clientReports[0].created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section objet améliorée */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1">
                Objet
              </label>
              <input
                type="text"
                className="w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet de l'email"
              />
              
              {/* Badges pour les modèles */}
              <div className="flex flex-wrap gap-2 mt-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                      selectedTemplate === template.id 
                        ? 'bg-primary/10 border-primary/30 text-primary' 
                        : 'border-muted bg-muted/20 hover:bg-muted/30'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Options avancées */}
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1">
                Options
              </label>
              
              <div className="space-y-2">
                {/* Programmation d'envoi */}
                <div className="relative">
                  <button 
                    onClick={handleScheduleSend}
                    className={`w-full p-2.5 border rounded-md text-left flex justify-between items-center text-sm ${
                      scheduledSend ? 'border-primary/30 bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{scheduledSend ? 'Programmé pour:' : 'Programmer l\'envoi'}</span>
                    </div>
                    
                    {scheduledSend && (
                      <div className="flex items-center">
                        <span className="text-primary">
                          {format(new Date(scheduledSend), "dd/MM/yyyy à HH:mm")}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelSchedule();
                          }}
                          className="ml-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {showPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 mt-1 p-3 bg-card border rounded-md shadow-md w-full"
                      >
                        <label className="block text-xs font-medium mb-1">Sélectionner la date et l'heure</label>
                        <input 
                          type="datetime-local" 
                          className="w-full rounded-md text-sm"
                          min={new Date().toISOString().slice(0, -8)} // Disable past dates/times
                          onChange={handleScheduleChange}
                        />
                        
                        <div className="mt-3 flex justify-end space-x-2">
                          <button 
                            onClick={handleCancelSchedule}
                            className="px-3 py-1 text-xs rounded-md border hover:bg-muted/30"
                          >
                            Annuler
                          </button>
                          <button 
                            onClick={() => setShowPicker(false)}
                            className="px-3 py-1 text-xs bg-primary text-white rounded-md"
                          >
                            Confirmer
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Rappel de suivi */}
                <button 
                  onClick={() => setShowReminderSettings(true)}
                  className={`w-full p-2.5 border rounded-md text-left flex justify-between items-center text-sm ${
                    reminder ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 mr-2" />
                    <span>{reminder ? 'Rappel programmé:' : 'Rappel de suivi'}</span>
                  </div>
                  
                  {reminder && (
                    <div className="flex items-center">
                      <span className="text-primary">
                        {`Dans ${reminder.days} jour${reminder.days > 1 ? 's' : ''}`}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReminder(null);
                        }}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </button>
                
                {/* Enregistrer comme brouillon */}
                <button 
                  onClick={handleSaveDraft}
                  className="w-full p-2.5 border rounded-md text-left flex items-center text-sm hover:bg-muted/20"
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span>Enregistrer comme brouillon</span>
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Message
            </label>
            
            <div className="relative">
              {isAiEnabled && (
                <div className="absolute right-3 top-3 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full flex items-center">
                  <Sparkles className="h-3 w-3 mr-1" />
                  <span>Généré par IA</span>
                </div>
              )}
              
              <textarea
                className="w-full min-h-[200px] p-3 pr-24"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contenu de l'email"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Pièces jointes
            </label>
            <div className="border rounded-md p-4">
              <div className="space-y-3 mb-4">
                {attachments.length > 0 ? (
                  attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                      <div className="flex items-center">
                        <div className="p-2 bg-primary/10 text-primary rounded mr-3">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.size}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeAttachment(index)}
                        className="p-1 hover:bg-muted rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    Aucune pièce jointe
                  </div>
                )}
              </div>
              
              <div>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload">
                  <div className="btn-outline inline-flex cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Ajouter un fichier
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          {/* Bouton Enregistrer */}
          <button 
            onClick={handleSaveDraft}
            className="btn-outline flex items-center justify-center order-2 sm:order-1"
            disabled={sending || saveAsDraft}
          >
            {saveAsDraft ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer comme brouillon
              </>
            )}
          </button>
          
          {/* Bouton Prévisualiser - uniquement pour démo */}
          <button className="btn-outline order-3 sm:order-2">
            Prévisualiser
          </button>
          
          {/* Bouton Envoyer avec indicateur de statut */}
          <button 
            className="btn-primary flex items-center justify-center order-1 sm:order-3"
            onClick={handleSend}
            disabled={sending || !selectedClient?.email && !recipient.email}
          >
            {sending ? (
              <>
                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Envoi en cours...
              </>
            ) : scheduledSend ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Programmer l'envoi
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </>
            )}
          </button>
        </div>
        
        {/* Statut client connecté */}
        {selectedClient?.id && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5 mr-1.5" />
              <span>Client connecté: <span className="font-medium">{selectedClient.name}</span></span>
              {selectedClient.email && (
                <span className="ml-1">• {selectedClient.email}</span>
              )}
            </div>
            
            <Link 
              to={`/dashboard/clients/${selectedClient.id}`}
              className="text-xs text-primary hover:underline flex items-center"
            >
              Voir profil client
            </Link>
          </div>
        )}
        
        {reminder && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center">
                <Bell className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <span>
                  Rappel programmé {reminder.days} jour{reminder.days > 1 ? 's' : ''} après l'envoi
                </span>
              </div>
              <button 
                className="text-primary hover:underline"
                onClick={() => setShowReminderSettings(true)}
              >
                Modifier
              </button>
            </div>
          </div>
        )}
        
        {scheduledSend && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <span>
                  Programmé pour le {format(new Date(scheduledSend), "dd/MM/yyyy à HH:mm", { locale: fr })}
                </span>
              </div>
              <button 
                className="text-primary hover:underline"
                onClick={() => setShowPicker(true)}
              >
                Modifier
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal Reminder Settings */}
      <AnimatePresence>
        {showReminderSettings && (
          <ReminderSettings 
            onClose={() => setShowReminderSettings(false)} 
            onSave={handleSetReminder}
            initialValues={reminder || { days: 3, notificationType: 'email', messageTemplate: 'standard' }}
          />
        )}
      </AnimatePresence>
      
      {/* Modal Email Generator with AI */}
      <AnimatePresence>
        {showEmailGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Close only if clicking on the background
              if (e.target === e.currentTarget) {
                setShowEmailGenerator(false);
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <EmailGenerator
                recipient={selectedClient || recipient}
                vehicle={selectedVehicle || vehicle}
                invoice={completeInvoiceData || invoice}
                scenario={selectedTemplate || 'invoice'}
                onEmailGenerated={handleEmailGenerated}
                onClose={() => setShowEmailGenerator(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmailSender;