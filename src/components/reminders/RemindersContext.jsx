import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from "../../lib/supabaseClient";
import { useAuth } from '../../contexts/AuthContext';

// Créer le contexte
const RemindersContext = createContext(null);

// Statut des rappels
const REMINDER_STATUSES = {
  TODO: 'todo',
  INPROGRESS: 'inprogress', 
  DONE: 'done',
  POSTPONED: 'postponed',
  CANCELED: 'canceled'
};

// Priorités des rappels
const REMINDER_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Types de rappels
const REMINDER_TYPES = {
  EMAIL: 'email',
  TASK: 'task'
};

// Nom de la table dans Supabase
const REMINDERS_TABLE = 'reminders';

export const RemindersProvider = ({ children }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    clientId: null,
    status: null,
    priority: null,
    search: ''
  });
  
  // Charger tous les rappels
  const loadReminders = useCallback(async () => {
    if (!user) {
      // Si aucun utilisateur n'est défini, arrêter le chargement pour éviter
      // un état d'attente infini
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      if (import.meta?.env?.DEV) console.log("Chargement des rappels depuis Supabase...");
      
      // Récupérer les rappels depuis la table Supabase
      const { data, error } = await supabase
        .from(REMINDERS_TABLE)
        .select(`
          *,
          clients (id, first_name, last_name, email, phone),
          invoices (id, invoice_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erreur lors du chargement des rappels:", error);
        throw error;
      } else {
        // Formater les données des rappels
        const formattedReminders = (data || []).map(reminder => {
          // Ajouter les propriétés client et invoice_number pour faciliter l'accès
          const client = reminder.clients ? {
            id: reminder.clients.id,
            name: `${reminder.clients.first_name} ${reminder.clients.last_name}`,
            first_name: reminder.clients.first_name,
            last_name: reminder.clients.last_name,
            email: reminder.clients.email,
            phone: reminder.clients.phone
          } : null;
          
          return {
            ...reminder,
            client,
            invoice_number: reminder.invoice_number || reminder.invoices?.invoice_number || null
          };
        });
        
        setReminders(formattedReminders);
        if (import.meta?.env?.DEV) console.log(`${formattedReminders.length} rappels chargés:`, formattedReminders);
      }
    } catch (err) {
      console.error('Error loading reminders:', err);
      setError('Impossible de charger les rappels');
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    loadReminders();
  }, [loadReminders]);
  
  // Ajouter un rappel
  const addReminder = useCallback(async (reminderData) => {
    if (!user) return null;
    
    try {
      if (import.meta?.env?.DEV) console.log("Ajout d'un nouveau rappel avec les données:", reminderData);
      
      // Préparer les données à enregistrer
      const { client, ...dataToSave } = reminderData;
      
      // Ajouter à Supabase
      const { data, error } = await supabase
        .from(REMINDERS_TABLE)
        .insert([{
          ...dataToSave,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error("Erreur lors de l'ajout du rappel:", error);
        throw error;
      }
      
      // Si pas d'erreur, ajouter le nouveau rappel à l'état local
      if (data && data.length > 0) {
        if (import.meta?.env?.DEV) console.log("Rappel ajouté avec succès:", data[0]);
        
        const newReminder = {
          ...data[0],
          client,
          invoice_number: reminderData.invoice_number
        };
        
        setReminders(prev => [newReminder, ...prev]);
        return newReminder;
      } else {
        console.warn("Rappel ajouté mais aucune donnée retournée");
      }
      
      // Recharger explicitement les rappels pour s'assurer que tout est à jour
      loadReminders();
      
      return null;
    } catch (err) {
      console.error('Error adding reminder:', err);
      throw err;
    }
  }, [user, loadReminders]);
  
  // Mettre à jour un rappel
  const updateReminder = useCallback(async (id, updatedData) => {
    if (!user) return false;
    
    try {
      if (import.meta?.env?.DEV) console.log(`Mise à jour du rappel ${id} avec les données:`, updatedData);
      
      // Enlever les données client qui ne sont pas dans le schéma de la table
      const { client, ...dataToUpdate } = updatedData;
      
      // Mettre à jour l'état local immédiatement pour une meilleure UX
      setReminders(prev => prev.map(reminder => 
        reminder.id === id 
          ? { 
              ...reminder, 
              ...updatedData, 
              // Maintenir l'objet client s'il existe déjà mais n'est pas inclus dans updatedData
              client: updatedData.client || reminder.client
            } 
          : reminder
      ));
      
      // Mettre à jour dans Supabase
      const { error } = await supabase
        .from(REMINDERS_TABLE)
        .update({
          ...dataToUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error("Erreur lors de la mise à jour du rappel:", error);
        throw error;
      }
      
      // Recharger explicitement pour s'assurer que tout est à jour
      loadReminders();
      
      return true;
    } catch (err) {
      console.error('Error updating reminder:', err);
      throw err;
    }
  }, [user, loadReminders]);
  
  // Supprimer un rappel
  const deleteReminder = useCallback(async (id) => {
    if (!user) return false;
    
    try {
      if (import.meta?.env?.DEV) console.log(`Suppression du rappel ${id}`);
      
      // Mettre à jour l'état local immédiatement pour une meilleure UX
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      
      // Supprimer de Supabase
      const { error } = await supabase
        .from(REMINDERS_TABLE)
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Erreur lors de la suppression du rappel:", error);
        throw error;
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting reminder:', err);
      throw err;
    }
  }, [user]);
  
  // Obtenir les rappels filtrés
  const getFilteredReminders = useCallback(() => {
    return reminders.filter(reminder => {
      // Filtrer par client si un clientId est spécifié
      if (filters.clientId && reminder.client_id !== filters.clientId) {
        return false;
      }
      
      // Filtrer par statut si un statut est spécifié
      if (filters.status && reminder.status !== filters.status) {
        return false;
      }
      
      // Filtrer par priorité si une priorité est spécifiée
      if (filters.priority && reminder.priority !== filters.priority) {
        return false;
      }
      
      // Filtrer par recherche si une recherche est spécifiée
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          reminder.title?.toLowerCase().includes(searchLower) ||
          (reminder.notes && reminder.notes.toLowerCase().includes(searchLower)) ||
          (reminder.client?.name && reminder.client.name.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    }).sort((a, b) => {
      // Trier par date d'échéance (du plus proche au plus éloigné)
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [reminders, filters]);
  
  // Obtenir les rappels pour un client spécifique
  const getClientReminders = useCallback((clientId) => {
    return reminders
      .filter(reminder => reminder.client_id === clientId)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  }, [reminders]);
  
  // Obtenir les prochains rappels (pour le dashboard)
  const getUpcomingReminders = useCallback((limit = 5) => {
    // IMPORTANT: Ne pas supprimer, juste filtrer pour l'affichage dans le dashboard
    return reminders
      .filter(reminder => reminder.status !== REMINDER_STATUSES.DONE && reminder.status !== REMINDER_STATUSES.CANCELED)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, limit);
  }, [reminders]);
  
  // Mettre à jour les filtres
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  
  const value = {
    reminders,
    isLoading,
    error,
    filters,
    loadReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    getFilteredReminders,
    getClientReminders,
    getUpcomingReminders,
    updateFilters,
    REMINDER_STATUSES,
    REMINDER_PRIORITIES,
    REMINDER_TYPES
  };
  
  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
};

export const useReminders = () => {
  const context = useContext(RemindersContext);
  
  if (!context) {
    throw new Error('useReminders must be used within a RemindersProvider');
  }
  
  return context;
};