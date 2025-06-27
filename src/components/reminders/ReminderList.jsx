import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bell, Clock, Calendar, Check, X, Pencil, Trash,
  AlertCircle, ChevronDown, Tag, Flag, 
  Mail, MessageSquare, FilterX, Search, UserRound, 
  Plus, FileText, Info, MoreHorizontal
} from 'lucide-react';
import { useReminders } from './RemindersContext';
import { Link } from 'react-router-dom';
import ReminderModal from './ReminderModal';
import ClientSearchInput from './ClientSearchInput';

const ReminderList = ({ clientId, compact = false, limit = null }) => {
  const { 
    getFilteredReminders, 
    getClientReminders, 
    updateReminder, 
    deleteReminder,
    updateFilters, 
    filters,
    isLoading,
    error,
    REMINDER_STATUSES,
    REMINDER_PRIORITIES,
    REMINDER_TYPES,
    addReminder
  } = useReminders();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [notification, setNotification] = useState(null);
  const [showActions, setShowActions] = useState({});
  
  // Définir les listes de rappels à afficher
  const reminders = clientId 
    ? getClientReminders(clientId) 
    : getFilteredReminders();
    
  // Limiter le nombre de rappels si nécessaire
  const displayReminders = limit ? reminders.slice(0, limit) : reminders;
  
  const priorityColors = {
    low: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    medium: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    high: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
    urgent: { bg: 'bg-red-500/10', text: 'text-red-500' }
  };
  
  const statusColors = {
    todo: { bg: 'bg-slate-500/10', text: 'text-slate-500' },
    inprogress: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    done: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    postponed: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    canceled: { bg: 'bg-red-500/10', text: 'text-red-500' }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (err) {
      return 'Date invalide';
    }
  };
  
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm', { locale: fr });
    } catch (err) {
      return '';
    }
  };
  
  const getDueDateFormatted = (dateString) => {
    const now = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Demain";
    } else if (diffDays < 0) {
      return `En retard (${Math.abs(diffDays)}j)`;
    } else {
      return `Dans ${diffDays}j`;
    }
  };
  
  const handleDelete = async (id) => {
    try {
      await deleteReminder(id);
      showNotification('success', 'Rappel supprimé avec succès');
    } catch (error) {
      showNotification('error', 'Erreur lors de la suppression du rappel');
    }
  };
  
  const handleStatusChange = async (id, newStatus) => {
    try {
      // Important: Conserver les données même si le statut est "done"
      // Ajouter une date de complétion si le statut est "done"
      const updateData = { 
        status: newStatus,
        // Ajouter timestamp si terminé ou annulé
        ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : {}),
        ...(newStatus === 'canceled' ? { canceled_at: new Date().toISOString() } : {})
      };
      
      await updateReminder(id, updateData);
      showNotification('success', 'Statut mis à jour');
    } catch (error) {
      showNotification('error', 'Erreur lors de la mise à jour du statut');
    }
  };
  
  const handleReminderToggle = async (id, isActive) => {
    try {
      await updateReminder(id, { reminder_active: !isActive });
      showNotification('success', isActive ? 'Notification désactivée' : 'Notification activée');
    } catch (error) {
      showNotification('error', 'Erreur lors de la mise à jour des notifications');
    }
  };
  
  const handleEditReminder = (reminder) => {
    setSelectedReminder(reminder);
    setShowModal(true);
  };
  
  const handleAddReminder = () => {
    setSelectedReminder(null);
    setShowModal(true);
  };
  
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const resetFilters = () => {
    updateFilters({
      status: null,
      priority: null,
      search: ''
    });
    setSearchValue('');
  };
  
  // Obtenir le label pour les statuts
  const getStatusLabel = (status) => {
    switch (status) {
      case 'todo': return 'À faire';
      case 'inprogress': return 'En cours';
      case 'done': return 'Fait';
      case 'postponed': return 'Reporté';
      case 'canceled': return 'Annulé';
      default: return status;
    }
  };
  
  // Obtenir le label pour les priorités
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'low': return 'Basse';
      case 'medium': return 'Moyenne';
      case 'high': return 'Haute';
      case 'urgent': return 'Urgente';
      default: return priority;
    }
  };
  
  const toggleActions = (id) => {
    setShowActions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Créer un rappel rapide avec les valeurs par défaut
  const handleQuickAdd = async () => {
    if (!clientId) return;
    
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000);
      tomorrow.setHours(9, 0, 0, 0);
      
      const newReminder = {
        title: 'Nouveau rappel',
        priority: 'medium',
        due_date: tomorrow.toISOString(),
        status: 'todo',
        notes: '',
        reminder_active: true,
        client_id: clientId,
        type: 'task',
        invoice_id: null,
        invoice_number: null
      };
      
      const result = await addReminder(newReminder);
      if (result) {
        showNotification('success', 'Rappel rapide ajouté');
        handleEditReminder(result); // Ouvrir immédiatement pour édition
      }
    } catch (error) {
      showNotification('error', 'Erreur lors de l\'ajout du rappel rapide');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 h-32">
        <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-2 rounded-md text-sm flex items-center ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-destructive/10 text-destructive'
            }`}>
            {notification.type === 'success' ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!clientId && !compact && (
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher dans les rappels..."
              className="w-full pl-9 pr-3 py-2 text-sm"
              value={searchValue}
              onChange={e => {
                setSearchValue(e.target.value);
                updateFilters({ search: e.target.value });
              }}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filters.status || ''}
              onChange={e => updateFilters({ status: e.target.value || null })}
            >
              <option value="">Tous les statuts</option>
              <option value="todo">À faire</option>
              <option value="inprogress">En cours</option>
              <option value="done">Fait</option>
              <option value="postponed">Reporté</option>
              <option value="canceled">Annulé</option>
            </select>
            
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filters.priority || ''}
              onChange={e => updateFilters({ priority: e.target.value || null })}
            >
              <option value="">Toutes les priorités</option>
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
            
            {(filters.status || filters.priority || filters.search) && (
              <button 
                onClick={resetFilters}
                className="btn-outline flex items-center gap-1.5 px-3 py-2 text-sm"
                title="Réinitialiser les filtres"
              >
                <FilterX className="h-4 w-4" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Si la liste est vide, afficher un message */}
      {displayReminders.length === 0 ? (
        <div className="text-center py-8 border rounded-md">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground">Aucun rappel programmé</p>
          <button
            onClick={handleAddReminder}
            className="mt-2 text-primary hover:underline text-sm flex items-center mx-auto"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter un rappel
          </button>
        </div>
      ) : (
        <>
          {/* Style inspiré de Notion pour les rappels */}
          <div className="border rounded-md overflow-hidden">
            {/* En-tête du tableau */}
            <div className="grid grid-cols-12 gap-1 bg-muted/5 p-2 border-b text-xs text-muted-foreground">
              <div className="col-span-4 flex items-center">
                <Tag className="h-3 w-3 mr-1" />
                <span>Sujet</span>
              </div>
              <div className="col-span-2 flex items-center">
                <Flag className="h-3 w-3 mr-1" />
                <span>Priorité</span>
              </div>
              <div className="col-span-3 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Échéance</span>
              </div>
              <div className="col-span-2 flex items-center">
                <Tag className="h-3 w-3 mr-1" />
                <span>État</span>
              </div>
              <div className="col-span-1 flex justify-center items-center">
                <MoreHorizontal className="h-3 w-3" />
              </div>
            </div>

            {/* Corps du tableau avec les rappels */}
            <div className="divide-y max-h-[calc(100vh-320px)] overflow-y-auto">
              {displayReminders.map(reminder => (
                <div key={reminder.id} className="grid grid-cols-12 gap-1 p-2 hover:bg-muted/5 transition-colors group relative">
                  {/* Sujet avec icône de type */}
                  <div className="col-span-4 flex items-start overflow-hidden pr-2">
                    <div className={`p-0.5 rounded flex-shrink-0 ${reminder.type === 'email' ? 'bg-blue-500/10' : 'bg-violet-500/10'} mr-1.5`}>
                      {reminder.type === 'email' ? (
                        <Mail className={`h-3 w-3 ${reminder.type === 'email' ? 'text-blue-500' : 'text-violet-500'}`} />
                      ) : (
                        <MessageSquare className="h-3 w-3 text-violet-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div 
                        className="text-xs font-medium truncate hover:text-primary cursor-pointer transition-colors"
                        onClick={() => handleEditReminder(reminder)}
                        title={reminder.title}
                      >
                        {reminder.title}
                        {reminder.invoice_number && (
                          <span className="ml-1 text-2xs text-primary">({reminder.invoice_number})</span>
                        )}
                      </div>
                      {reminder.client && (
                        <Link 
                          to={`/dashboard/clients/${reminder.client_id}`}
                          className="text-2xs text-muted-foreground hover:text-primary flex items-center"
                        >
                          <UserRound className="h-2.5 w-2.5 mr-0.5" />
                          {reminder.client.name}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Priorité */}
                  <div className="col-span-2">
                    <div className={`text-2xs px-1.5 py-0.5 rounded-full ${priorityColors[reminder.priority]?.bg || 'bg-muted/30'} ${priorityColors[reminder.priority]?.text || 'text-muted-foreground'} text-center`}>
                      {getPriorityLabel(reminder.priority)}
                    </div>
                  </div>

                  {/* Date d'échéance */}
                  <div className="col-span-3 overflow-hidden">
                    <div className="flex flex-col">
                      <div className="flex items-center text-2xs">
                        <Calendar className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                        <span className="truncate">{formatDate(reminder.due_date)}</span>
                      </div>
                      <div className={`flex items-center text-2xs ${
                        new Date(reminder.due_date) < new Date() ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        <Clock className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                        <span>{getDueDateFormatted(reminder.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Statut */}
                  <div className="col-span-2">
                    <select
                      className={`text-2xs px-1.5 py-0.5 rounded-full w-full border-none focus:ring-0 ${statusColors[reminder.status]?.bg || 'bg-muted/30'} ${statusColors[reminder.status]?.text || 'text-muted-foreground'}`}
                      value={reminder.status}
                      onChange={(e) => handleStatusChange(reminder.id, e.target.value)}
                    >
                      <option value="todo">À faire</option>
                      <option value="inprogress">En cours</option>
                      <option value="done">Fait</option>
                      <option value="postponed">Reporté</option>
                      <option value="canceled">Annulé</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-center items-center relative">
                    <button 
                      className="p-1 rounded-full hover:bg-muted/30"
                      onClick={() => toggleActions(reminder.id)}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    
                    <AnimatePresence>
                      {showActions[reminder.id] && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute right-0 top-full z-50 mt-1 bg-card border rounded-md shadow-md py-1 w-32"
                        >
                          <button
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/30 flex items-center"
                            onClick={() => handleEditReminder(reminder)}
                          >
                            <Pencil className="h-3 w-3 mr-2" />
                            Modifier
                          </button>
                          <button
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/30 flex items-center"
                            onClick={() => handleReminderToggle(reminder.id, reminder.reminder_active)}
                          >
                            <Bell className="h-3 w-3 mr-2" />
                            {reminder.reminder_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive flex items-center"
                            onClick={() => handleDelete(reminder.id)}
                          >
                            <Trash className="h-3 w-3 mr-2" />
                            Supprimer
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Notification badge pour les rappels actifs */}
                  {reminder.reminder_active && (
                    <div className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Si on a appliqué une limite, montrer un lien vers la vue complète */}
          {limit && reminders.length > limit && (
            <div className="text-center mt-2">
              <Link to="/dashboard/reminders" className="text-xs text-primary hover:underline flex items-center justify-center">
                Voir tous les rappels ({reminders.length})
                <ChevronDown className="h-3 w-3 ml-1" />
              </Link>
            </div>
          )}
        </>
      )}
      
      {/* Actions rapides inspirées de Notion */}
      <div className="flex justify-between items-center">
        {/* Bouton pour ajouter un rappel */}
        <button
          onClick={handleAddReminder}
          className="py-1.5 px-3 border rounded-md text-sm text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors flex items-center justify-center"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Ajouter un rappel
        </button>
        
        {/* Statistiques rapides si des rappels existent */}
        {displayReminders.length > 0 && (
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></div>
              <span>À faire: {displayReminders.filter(r => r.status === 'todo' || r.status === 'inprogress').length}</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></div>
              <span>Complétés: {displayReminders.filter(r => r.status === 'done').length}</span>
            </div>
          </div>
        )}
        
        {/* Ajout rapide pour le contexte d'un client */}
        {clientId && (
          <button
            onClick={handleQuickAdd}
            className="py-1 px-2 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors flex items-center"
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajout rapide
          </button>
        )}
      </div>
      
      {/* Modal pour ajouter/modifier un rappel */}
      <AnimatePresence>
        {showModal && (
          <ReminderModal
            reminder={selectedReminder}
            clientId={clientId}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              showNotification('success', selectedReminder ? 'Rappel mis à jour' : 'Rappel créé');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReminderList;