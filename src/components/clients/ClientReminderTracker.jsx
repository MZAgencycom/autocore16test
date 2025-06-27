import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useReminders } from '../reminders/RemindersContext';
import ReminderList from '../reminders/ReminderList';

const ClientReminderTracker = ({ clientId, onReminderChange }) => {
  const { getClientReminders, addReminder, updateReminder, deleteReminder } = useReminders();
  const [remindersVisible, setRemindersVisible] = useState(true);
  
  // Lorsqu'un rappel est ajouté, mis à jour ou supprimé, notifier le composant parent
  useEffect(() => {
    if (onReminderChange) {
      const reminders = getClientReminders(clientId);
      onReminderChange(reminders);
    }
  }, [getClientReminders, clientId, onReminderChange]);
  
  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Suivi des rappels et relances</h3>
        </div>
      </div>

      {/* Liste des rappels */}
      <ReminderList clientId={clientId} />
    </div>
  );
};

export default ClientReminderTracker;