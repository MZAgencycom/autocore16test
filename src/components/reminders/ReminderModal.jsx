import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { 
  X, AlertCircle, Calendar, Bell, Clock, 
  Tag, FileText, CheckCircle, Loader, User,
  MessageSquare, Mail
} from 'lucide-react';

const ReminderModal = ({ 
  isOpen = true, 
  onClose, 
  onSuccess, 
  onSave,
  reminder = null,
  clientId = null, 
  modalPosition = null
}) => {
  // Form state with default values
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16), // Default: 3 days from now
    status: 'todo',
    notes: '',
    reminder_active: true,
    client_id: clientId,
    type: 'task',
    invoice_id: null,
    invoice_number: null
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedClientData, setSelectedClientData] = useState(null);
  
  // Set form data from initialData if provided
  useEffect(() => {
    if (reminder) {
      // Format the date properly for datetime-local input
      let formattedDueDate = reminder.due_date;
      if (reminder.due_date) {
        const date = new Date(reminder.due_date);
        formattedDueDate = date.toISOString().slice(0, 16);
      }
      
      setFormData({
        ...reminder,
        due_date: formattedDueDate
      });
      
      // Si le rappel a un client, définir le terme de recherche
      if (reminder.client) {
        setClientSearchTerm(`${reminder.client.first_name} ${reminder.client.last_name}`);
        setSelectedClientData(reminder.client);
      }
    } else {
      // Reset form for new reminder
      setFormData({
        title: '',
        priority: 'medium',
        due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
        status: 'todo',
        notes: '',
        reminder_active: true,
        client_id: clientId,
        type: 'task',
        invoice_id: null,
        invoice_number: null
      });
    }
  }, [reminder, clientId]);
  
  // Load client info if clientId is provided directly (from client detail page)
  useEffect(() => {
    const loadClientData = async () => {
      if (clientId && !selectedClientData) {
        try {
          setIsLoading(true);
          const { data: client, error } = await supabase
            .from('clients')
            .select('id, first_name, last_name')
            .eq('id', clientId)
            .single();
            
          if (error) throw error;
          
          if (client) {
            setSelectedClientData(client);
            setClientSearchTerm(`${client.first_name} ${client.last_name}`);
          }
        } catch (error) {
          console.error('Error loading client data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadClientData();
  }, [clientId, selectedClientData]);
  
  // Load clients and invoices
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .order('last_name');
          
        if (clientsError) throw clientsError;
        setClients(clientsData || []);
        setFilteredClients(clientsData || []);
        
        // Fetch invoices for selected client
        if (clientId || (reminder && reminder.client_id)) {
          const targetClientId = clientId || reminder.client_id;
          const { data: invoicesData, error: invoicesError } = await supabase
            .from('invoices')
            .select('id, invoice_number, total, status, issue_date')
            .eq('client_id', targetClientId)
            .order('created_at', { ascending: false });
            
          if (invoicesError) throw invoicesError;
          setInvoices(invoicesData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [clientId, reminder]);
  
  // Update filtered clients when search term changes
  useEffect(() => {
    if (!clientSearchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const filtered = clients.filter(client => 
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );
    
    setFilteredClients(filtered);
  }, [clientSearchTerm, clients]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear errors when field is updated
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Handle client selection from dropdown
  const handleClientSelect = async (client) => {
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setClientSearchTerm(`${client.first_name} ${client.last_name}`);
    setSelectedClientData(client);
    setShowClientDropdown(false);
    
    // Load invoices for selected client
    try {
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, status, issue_date')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
        
      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };
  
  // Handle invoice selection
  const handleInvoiceChange = (e) => {
    const selectedInvoiceId = e.target.value;
    const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);
    
    setFormData(prev => ({
      ...prev,
      invoice_id: selectedInvoiceId === "" ? null : selectedInvoiceId,
      invoice_number: selectedInvoice ? selectedInvoice.invoice_number : null
    }));
  };
  
  // Validate the form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }
    
    if (!formData.due_date) {
      newErrors.due_date = "La date d'échéance est requise";
    }
    
    if (!formData.client_id) {
      newErrors.client_id = "Veuillez sélectionner un client";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (import.meta?.env?.DEV) console.log("Début de l'enregistrement du rappel avec les données:", formData);
      
      // Extraire seulement les champs de la table reminders
      const reminderData = {
        title: formData.title,
        priority: formData.priority,
        due_date: new Date(formData.due_date).toISOString(),
        status: formData.status,
        notes: formData.notes,
        reminder_active: formData.reminder_active,
        client_id: formData.client_id,
        type: formData.type,
        invoice_id: formData.invoice_id,
        invoice_number: formData.invoice_number
      };
      
      if (import.meta?.env?.DEV) console.log("Données à enregistrer dans la base de données:", reminderData);
      
      let result;
      
      if (reminder && reminder.id) {
        // Update existing reminder
        if (import.meta?.env?.DEV) console.log(`Mise à jour du rappel existant ID: ${reminder.id}`);
        const { data, error } = await supabase
          .from('reminders')
          .update(reminderData)
          .eq('id', reminder.id)
          .select();
          
        if (error) {
          console.error("Erreur lors de la mise à jour du rappel:", error);
          throw error;
        }
        
        if (import.meta?.env?.DEV) console.log("Rappel mis à jour avec succès:", data);
        result = data[0];
      } else {
        // Insert new reminder
        if (import.meta?.env?.DEV) console.log("Création d'un nouveau rappel");
        const { data, error } = await supabase
          .from('reminders')
          .insert(reminderData)
          .select();
          
        if (error) {
          console.error("Erreur lors de la création du rappel:", error);
          throw error;
        }
        
        if (import.meta?.env?.DEV) console.log("Nouveau rappel créé avec succès:", data);
        result = data[0];
      }
      
      // Call appropriate callback
      if (onSave) {
        if (import.meta?.env?.DEV) console.log("Appel du callback onSave");
        onSave(result);
      } else if (onSuccess) {
        if (import.meta?.env?.DEV) console.log("Appel du callback onSuccess");
        onSuccess(result);
      }
      
      // Fermeture du modal
      if (import.meta?.env?.DEV) console.log("Fermeture du modal");
      onClose();
      
    } catch (error) {
      console.error('Error saving reminder:', error);
      setErrors({ submit: `Erreur lors de l'enregistrement du rappel: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };
  
  // If modal is closed and isOpen prop is false, don't render anything
  if (!isOpen && isOpen !== undefined) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8"
        style={modalPosition ? {
          position: 'absolute',
          top: `${modalPosition.top}px`,
          left: `${modalPosition.left}px`,
        } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">
            {reminder ? 'Modifier le rappel' : 'Nouveau rappel'}
          </h2>
          <button 
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Title field */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full p-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Titre du rappel"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>
            
            {/* Client field with autocomplete */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              {clientId ? (
                // If clientId is provided (from client detail page), show client info without ability to change
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      <span>Chargement des informations client...</span>
                    </div>
                  ) : selectedClientData ? (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-medium">{selectedClientData.first_name} {selectedClientData.last_name}</span>
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Pré-sélectionné</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Client inconnu</span>
                  )}
                </div>
              ) : (
                // Normal client selection UI for when adding from reminders page
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className={`w-full p-2 border rounded-md ${errors.client_id ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Rechercher un client..."
                  />
                  {showClientDropdown && filteredClients.length > 0 && !clientId && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.map(client => (
                        <div
                          key={client.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleClientSelect(client)}
                        >
                          {client.first_name} {client.last_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {errors.client_id && (
                <p className="mt-1 text-sm text-red-500">{errors.client_id}</p>
              )}
            </div>
            
            {/* Type and Priority row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className={`flex-1 p-2 border rounded-md text-sm flex items-center justify-center ${
                      formData.type === 'task' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300'
                    }`}
                    onClick={() => handleChange({ target: { name: 'type', value: 'task' } })}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Tâche
                  </button>
                  <button
                    type="button"
                    className={`flex-1 p-2 border rounded-md text-sm flex items-center justify-center ${
                      formData.type === 'email' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300'
                    }`}
                    onClick={() => handleChange({ target: { name: 'type', value: 'email' } })}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Email
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Priorité <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
            
            {/* Date and Status row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date d'échéance <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md ${errors.due_date ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none h-5 w-5" />
                </div>
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-500">{errors.due_date}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="todo">À faire</option>
                  <option value="inprogress">En cours</option>
                  <option value="done">Fait</option>
                  <option value="postponed">Reporté</option>
                  <option value="canceled">Annulé</option>
                </select>
              </div>
            </div>
            
            {/* Associated invoice */}
            <div>
              <label className="block text-sm font-medium mb-1">Facture associée</label>
              <select
                name="invoice_id"
                value={formData.invoice_id || ""}
                onChange={handleInvoiceChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Aucune facture</option>
                {invoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.total)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes || ""}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md h-24"
                placeholder="Détails supplémentaires..."
              ></textarea>
            </div>
            
            {/* Reminder toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="reminder_active"
                name="reminder_active"
                checked={formData.reminder_active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="reminder_active" className="ml-2 text-sm text-gray-700">
                Activer les notifications
              </label>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader className="inline-block h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="inline-block h-4 w-4 mr-2" />
                  {reminder ? 'Mettre à jour' : 'Créer le rappel'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ReminderModal;