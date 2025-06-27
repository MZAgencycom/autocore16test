import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Mail, Phone, MapPin, User, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Client } from '../../models/Client';

const ClientEditForm = ({ client, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialiser le formulaire avec les données du client
  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || ''
      });
    }
  }, [client]);
  
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Si une erreur existe pour ce champ, l'effacer
    if (error && error[field]) {
      setError(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'Le prénom est requis';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Le nom est requis';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    return Object.keys(errors).length === 0 ? null : errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Valider le formulaire
    const validationErrors = validateForm();
    if (validationErrors) {
      setError(validationErrors);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Mettre à jour le client dans la base de données
      await Client.update(client.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null
      });
      
      // Notifier le succès
      onSuccess();
    } catch (err) {
      console.error('Erreur lors de la mise à jour du client:', err);
      setError({ form: err.message || 'Une erreur est survenue' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        className="bg-card rounded-lg shadow-xl border max-w-md w-full p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", duration: 0.3 }}
        onClick={(e) => e.stopPropagation()} // Empêcher la propagation du clic
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Modifier le client</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {error && error.form && (
          <div className="mb-4 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error.form}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Prénom *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className={`w-full pl-9 ${error?.firstName ? 'border-destructive' : ''}`}
                    placeholder="Prénom"
                  />
                </div>
                {error?.firstName && (
                  <p className="text-destructive text-xs mt-1">{error.firstName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nom *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={`w-full pl-9 ${error?.lastName ? 'border-destructive' : ''}`}
                    placeholder="Nom"
                  />
                </div>
                {error?.lastName && (
                  <p className="text-destructive text-xs mt-1">{error.lastName}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full pl-9 ${error?.email ? 'border-destructive' : ''}`}
                  placeholder="email@exemple.com"
                />
              </div>
              {error?.email && (
                <p className="text-destructive text-xs mt-1">{error.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full pl-9"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Adresse
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <textarea 
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full pl-9"
                  placeholder="Adresse complète"
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ClientEditForm;