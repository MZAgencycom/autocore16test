import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, Bell, User, Mail, AlertCircle, X, Send, CheckCircle } from 'lucide-react';
import { useReminders } from '../reminders/RemindersContext';

const ScheduledReminders = () => {
  const { getUpcomingReminders, updateReminder, deleteReminder } = useReminders();
  const [notification, setNotification] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  const formatDate = (date) => {
    return format(date, 'dd MMM', { locale: fr });
  };
  
  const formatTime = (date) => {
    return format(date, 'HH:mm', { locale: fr });
  };
  
  const getDueDateFormatted = (date) => {
    const now = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Demain";
    } else if (diffDays < 0) {
      return `${Math.abs(diffDays)}j de retard`;
    } else {
      return `Dans ${diffDays}j`;
    }
  };
  
  const handleSendNow = async (reminder) => {
    try {
      setActionInProgress(reminder.id);
      
      // Marquer comme fait - mais ne PAS supprimer
      await updateReminder(reminder.id, { 
        status: 'done',
        // Important: mettre à jour la date d'achèvement mais CONSERVER le rappel
        completed_at: new Date().toISOString()
      });
      
      // Afficher une notification de succès
      setNotification({
        type: 'success',
        message: `Action effectuée pour "${reminder.title}"`
      });
      
      // Masquer la notification après 3 secondes
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du mail:', error);
      
      // Afficher une notification d'erreur
      setNotification({
        type: 'error',
        message: 'Erreur lors de l\'action'
      });
      
      // Masquer la notification après 3 secondes
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setActionInProgress(null);
    }
  };
  
  const handleCancelReminder = async (reminder) => {
    try {
      setActionInProgress(reminder.id);
      
      // Marquer comme annulé - mais ne PAS supprimer
      await updateReminder(reminder.id, {
        status: 'canceled',
        // Important: conserver le rappel dans la base de données
        canceled_at: new Date().toISOString()
      });
      
      // Afficher une notification de succès
      setNotification({
        type: 'success',
        message: `Rappel annulé`
      });
      
      // Masquer la notification après 3 secondes
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Erreur lors de l\'annulation du rappel:', error);
      
      // Afficher une notification d'erreur
      setNotification({
        type: 'error',
        message: 'Erreur lors de l\'annulation du rappel'
      });
      
      // Masquer la notification après 3 secondes
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setActionInProgress(null);
    }
  };

  const upcomingReminders = getUpcomingReminders(5);

  return (
    <div className="bg-card rounded-lg border p-6 relative">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-4 right-4 p-2.5 rounded-md shadow-md z-50 max-w-xs text-xs ${
              notification.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              )}
              <span>{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-1.5 p-0.5 hover:bg-black/5 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="p-2 rounded-md bg-primary/10 text-primary mr-3">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Rappels programmés</h3>
        </div>
        <Link to="/dashboard/reminders" className="text-sm text-primary hover:underline">
          Voir tout
        </Link>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {upcomingReminders.length === 0 ? (
          <div className="text-center py-6 bg-muted/20 rounded-lg">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h4 className="font-medium mb-1">Aucun rappel programmé</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Vous n'avez aucun rappel programmé pour le moment
            </p>
            <Link to="/dashboard/reminders" className="btn-outline inline-flex">
              Programmer un rappel
            </Link>
          </div>
        ) : (
          upcomingReminders.map((reminder) => (
            <motion.div 
              key={reminder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1 flex items-center truncate">
                    <Mail className="h-3.5 w-3.5 mr-1.5 text-primary flex-shrink-0" />
                    <span className="truncate">{reminder.title}</span>
                  </h4>
                  
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {reminder.client && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1 flex-shrink-0" />
                        <Link 
                          to={`/dashboard/clients/${reminder.client_id}`}
                          className="hover:text-primary transition-colors truncate max-w-[100px]"
                          title={reminder.client.name}
                        >
                          {reminder.client.name}
                        </Link>
                      </div>
                    )}
                    
                    <div className="flex items-center whitespace-nowrap">
                      <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>
                        <span className="hidden sm:inline">{formatDate(reminder.due_date)}</span>
                        {" • "}
                        <span>{formatTime(reminder.due_date)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 ml-2">
                  <div className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-2xs whitespace-nowrap">
                    {getDueDateFormatted(reminder.due_date)}
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      className="p-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
                      onClick={() => handleSendNow(reminder)}
                      disabled={actionInProgress === reminder.id}
                      title="Marquer comme fait"
                    >
                      {actionInProgress === reminder.id ? (
                        <div className="animate-spin h-3 w-3 border-b-2 border-primary rounded-full"></div>
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </button>
                    
                    <button
                      className="p-1 rounded bg-muted/20 hover:bg-muted/40 transition-colors text-muted-foreground"
                      onClick={() => handleCancelReminder(reminder)}
                      disabled={actionInProgress === reminder.id}
                      title="Annuler le rappel"
                    >
                      {actionInProgress === reminder.id ? (
                        <div className="animate-spin h-3 w-3 border-b-2 border-muted-foreground rounded-full"></div>
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Notes (visible uniquement si présentes) */}
              {reminder.notes && (
                <div className="mt-1.5 text-2xs text-muted-foreground line-clamp-1" title={reminder.notes}>
                  {reminder.notes}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
      
      <div className="text-right mt-2">
        <Link 
          to="/dashboard/reminders" 
          className="text-xs text-primary hover:underline inline-flex items-center"
        >
          <Bell className="h-3 w-3 mr-1" />
          Gérer les rappels
        </Link>
      </div>
    </div>
  );
};

export default ScheduledReminders;