import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  Calendar, 
  Mail, 
  AlertCircle, 
  X, 
  Clock,
  Plus
} from 'lucide-react';

const ReminderSettings = ({ 
  onClose, 
  onSave,
  initialValues = { days: 3, notificationType: 'email', messageTemplate: 'standard' }
}) => {
  const [days, setDays] = useState(initialValues.days);
  const [notificationType, setNotificationType] = useState(initialValues.notificationType);
  const [messageTemplate, setMessageTemplate] = useState(initialValues.messageTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate inputs
      if (!days || days < 1) {
        throw new Error('Veuillez sélectionner un délai valide');
      }
      
      // In a real app, you would save this to the database
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Call the parent's onSave callback
      if (onSave) {
        onSave({
          days,
          notificationType,
          messageTemplate
        });
      }
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      setError(error.message || 'Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="bg-card rounded-lg shadow-lg max-w-md w-full overflow-hidden"
      >
        <div className="p-4 border-b flex justify-between items-center bg-primary/5">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-primary mr-2" />
            <h2 className="font-semibold">Paramètres de rappel de suivi</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-4">
              Configurez un rappel pour vous alerter si vous n'avez pas reçu de réponse à cet email dans le délai spécifié.
            </p>
            
            <div className="border rounded-md p-4 bg-muted/5 mb-4">
              <h3 className="font-medium text-sm mb-3">Délai de rappel</h3>
              
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 5, 7, 14].map((value) => (
                  <button
                    key={value}
                    className={`text-sm py-1.5 px-3 rounded-md border transition-colors ${
                      days === value 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setDays(value)}
                  >
                    {value === 1 ? '1 jour' : 
                     value === 7 ? '1 semaine' : 
                     value === 14 ? '2 semaines' : 
                     `${value} jours`}
                  </button>
                ))}
              </div>
              
              <div className="mt-3 flex items-center">
                <label className="text-sm mr-2">Personnalisé :</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-16 text-sm py-1 px-2"
                  value={!days || [1, 2, 3, 5, 7, 14].includes(days) ? '' : days}
                  onChange={(e) => setDays(parseInt(e.target.value) || '')}
                  placeholder="jours"
                />
                <span className="text-sm ml-2">jours</span>
              </div>
            </div>
            
            <div className="border rounded-md p-4 bg-muted/5 mb-4">
              <h3 className="font-medium text-sm mb-3">Type de notification</h3>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted/20 rounded-md">
                  <input 
                    type="radio" 
                    checked={notificationType === 'email'}
                    onChange={() => setNotificationType('email')}
                    className="rounded-full"
                  />
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Email de notification</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted/20 rounded-md">
                  <input 
                    type="radio"
                    checked={notificationType === 'system'}
                    onChange={() => setNotificationType('system')}
                    className="rounded-full"
                  />
                  <Bell className="h-4 w-4 text-primary" />
                  <span>Notification système</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted/20 rounded-md">
                  <input 
                    type="radio"
                    checked={notificationType === 'both'}
                    onChange={() => setNotificationType('both')}
                    className="rounded-full"
                  />
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Les deux</span>
                </label>
              </div>
            </div>
            
            <div className="border rounded-md p-4 bg-muted/5">
              <h3 className="font-medium text-sm mb-3">Message de rappel</h3>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted/20 rounded-md">
                  <input 
                    type="radio" 
                    checked={messageTemplate === 'standard'}
                    onChange={() => setMessageTemplate('standard')}
                    className="rounded-full"
                  />
                  <span>Message standard</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-muted/20 rounded-md">
                  <input 
                    type="radio"
                    checked={messageTemplate === 'custom'}
                    onChange={() => setMessageTemplate('custom')}
                    className="rounded-full"
                  />
                  <span>Message personnalisé</span>
                </label>
                
                {messageTemplate === 'custom' && (
                  <div className="mt-3 pl-6">
                    <textarea 
                      className="w-full h-20 text-sm"
                      placeholder="Saisissez votre message de rappel personnalisé..."
                    ></textarea>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4 flex justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1.5" />
              <span>
                {days === 1 ? 'Rappel dans 1 jour' : `Rappel dans ${days} jours`}
              </span>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-outline"
              >
                Annuler
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving || !days}
                className="btn-primary"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activer le rappel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReminderSettings;