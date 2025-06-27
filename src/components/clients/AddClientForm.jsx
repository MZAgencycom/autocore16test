import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader, Check, AlertCircle, X, User, Car, Mail, Phone, MapPin, Upload, ChevronDown } from 'lucide-react';
import { z } from 'zod';
import { Client } from '../../models/Client';
import { Vehicle } from '../../models/Vehicle';
import { useNavigate } from 'react-router-dom';

// Form validation schema
const clientSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal(''))
});

const vehicleSchema = z.object({
  make: z.string().min(2, "La marque doit contenir au moins 2 caractères"),
  model: z.string().min(1, "Le modèle est requis"),
  registration: z.string().optional().or(z.literal('')),
  vin: z.string().optional().or(z.literal('')),
  year: z.coerce.number().min(1900, "Année invalide").max(new Date().getFullYear() + 1, "Année invalide").optional().or(z.literal('')),
  mileage: z.coerce.number().min(0, "Kilométrage invalide").optional().or(z.literal(''))
});

const AddClientForm = ({ onClose, onSuccess } = {}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [formData, setFormData] = useState({
    client: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    vehicles: [
      {
        make: '',
        model: '',
        registration: '',
        vin: '',
        year: '',
        mileage: ''
      }
    ]
  });
  
  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      client: {
        ...prev.client,
        [name]: value
      }
    }));
    
    // Clear errors when user types
    if (errors.client && errors.client[name]) {
      setErrors(prev => ({
        ...prev,
        client: {
          ...prev.client,
          [name]: undefined
        }
      }));
    }
  };
  
  const handleVehicleChange = (index, field, value) => {
    const updatedVehicles = [...formData.vehicles];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      vehicles: updatedVehicles
    }));
    
    // Clear errors when user types
    if (errors.vehicles && errors.vehicles[index] && errors.vehicles[index][field]) {
      setErrors(prev => {
        const updatedVehicleErrors = [...(prev.vehicles || [])];
        if (updatedVehicleErrors[index]) {
          updatedVehicleErrors[index] = {
            ...updatedVehicleErrors[index],
            [field]: undefined
          };
        }
        return {
          ...prev,
          vehicles: updatedVehicleErrors
        };
      });
    }
  };
  
  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [
        ...prev.vehicles,
        {
          make: '',
          model: '',
          registration: '',
          vin: '',
          year: '',
          mileage: ''
        }
      ]
    }));
  };
  
  const removeVehicle = (index) => {
    if (formData.vehicles.length === 1) return;
    
    const updatedVehicles = [...formData.vehicles];
    updatedVehicles.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      vehicles: updatedVehicles
    }));
  };
  
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setPhotoFile(file);
    }
  };
  
  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const validateForm = () => {
    try {
      // Validate client data
      clientSchema.parse(formData.client);
      
      // Validate each vehicle
      formData.vehicles.forEach((vehicle, index) => {
        vehicleSchema.parse(vehicle);
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors = { client: {}, vehicles: [] };
        
        error.errors.forEach(err => {
          const path = err.path;
          if (path[0] === 'vehicles') {
            const vehicleIndex = parseInt(path[1]);
            const field = path[2];
            
            if (!formErrors.vehicles[vehicleIndex]) {
              formErrors.vehicles[vehicleIndex] = {};
            }
            
            formErrors.vehicles[vehicleIndex][field] = err.message;
          } else if (path[0] === 'client') {
            const field = path[1];
            formErrors.client[field] = err.message;
          } else {
            formErrors[path[0]] = err.message;
          }
        });
        
        setErrors(formErrors);
      }
      
      return false;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create client
      const clientId = await Client.create({
        firstName: formData.client.firstName,
        lastName: formData.client.lastName,
        email: formData.client.email || null,
        phone: formData.client.phone || null
      });
      
      // Create vehicles
      for (const vehicle of formData.vehicles) {
        await Vehicle.create(clientId, {
          make: vehicle.make,
          model: vehicle.model,
          registration: vehicle.registration || null,
          vin: vehicle.vin || null,
          year: vehicle.year ? parseInt(vehicle.year) : null,
          mileage: vehicle.mileage ? parseInt(vehicle.mileage) : null
        });
      }
      
      // If there's a photo, upload it (not actually implemented in the backend yet)
      if (photoFile) {
        if (import.meta?.env?.DEV) console.log("Would upload photo here in a real implementation");
      }
      
      // Récupérer le client complet pour un éventuel callback
      const newClient = await Client.getById(clientId);

      setSuccess(true);

      // Rediriger ou utiliser le callback après 2 secondes
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(newClient);
          if (onClose) onClose();
        } else {
          navigate(`/dashboard/clients/${clientId}`);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error creating client:', error);
      setErrors({
        form: error.message || 'Une erreur est survenue lors de la création du client'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  return (
    <div className="bg-card rounded-lg border p-6">
      {success ? (
        <div className="flex flex-col items-center justify-center py-8">
          <motion.div 
            className="bg-emerald-500/10 text-emerald-500 p-6 rounded-full mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="h-12 w-12" />
          </motion.div>
          <motion.h3 
            className="text-xl font-bold mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Client créé avec succès
          </motion.h3>
          <motion.p 
            className="text-muted-foreground text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Redirection vers la fiche client...
          </motion.p>
        </div>
      ) : (
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {errors.form && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{errors.form}</span>
            </div>
          )}
          
          <motion.div 
            className="space-y-4"
            variants={itemVariants}
          >
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Informations du client</h3>
            </div>
            
            <div className="grid md:grid-cols-[120px,1fr] gap-6">
              <div className="mx-auto">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Client preview" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-semibold">
                        {formData.client.firstName?.[0] || ''}
                        {formData.client.lastName?.[0] || ''}
                      </span>
                    )}
                  </div>
                  
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-1 -right-1 bg-destructive text-white h-5 w-5 rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  
                  <div className="mt-2 flex justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-primary hover:underline flex items-center"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {photoPreview ? 'Changer' : 'Ajouter une photo'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Prénom *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.client.firstName}
                      onChange={handleClientChange}
                      className={`w-full ${errors.client?.firstName ? 'border-destructive' : ''}`}
                    />
                    {errors.client?.firstName && (
                      <p className="text-destructive text-xs">{errors.client.firstName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Nom *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.client.lastName}
                      onChange={handleClientChange}
                      className={`w-full ${errors.client?.lastName ? 'border-destructive' : ''}`}
                    />
                    {errors.client?.lastName && (
                      <p className="text-destructive text-xs">{errors.client.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        name="email"
                        value={formData.client.email}
                        onChange={handleClientChange}
                        className={`w-full pl-10 ${errors.client?.email ? 'border-destructive' : ''}`}
                        placeholder="Ex: client@example.com"
                      />
                    </div>
                    {errors.client?.email && (
                      <p className="text-destructive text-xs">{errors.client.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.client.phone}
                        onChange={handleClientChange}
                        className={`w-full pl-10 ${errors.client?.phone ? 'border-destructive' : ''}`}
                        placeholder="Ex: 06 12 34 56 78"
                      />
                    </div>
                    {errors.client?.phone && (
                      <p className="text-destructive text-xs">{errors.client.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="space-y-4"
            variants={itemVariants}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Véhicules</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={addVehicle}
                className="btn-outline py-1 px-2 text-sm"
              >
                <Plus className="h-3 w-3 mr-1 inline-block" />
                Ajouter un véhicule
              </motion.button>
            </div>
            
            <AnimatePresence>
              {formData.vehicles.map((vehicle, index) => (
                <motion.div
                  key={index}
                  className="border rounded-lg p-4 space-y-4"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Véhicule {index + 1}</h4>
                    {formData.vehicles.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.05, color: 'rgb(239, 68, 68)' }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => removeVehicle(index)}
                        className="text-sm text-muted-foreground hover:text-destructive"
                      >
                        Supprimer
                      </motion.button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Marque *</label>
                      <input
                        type="text"
                        value={vehicle.make}
                        onChange={(e) => handleVehicleChange(index, 'make', e.target.value)}
                        className={`w-full ${errors.vehicles?.[index]?.make ? 'border-destructive' : ''}`}
                      />
                      {errors.vehicles?.[index]?.make && (
                        <p className="text-destructive text-xs">{errors.vehicles[index].make}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Modèle *</label>
                      <input
                        type="text"
                        value={vehicle.model}
                        onChange={(e) => handleVehicleChange(index, 'model', e.target.value)}
                        className={`w-full ${errors.vehicles?.[index]?.model ? 'border-destructive' : ''}`}
                      />
                      {errors.vehicles?.[index]?.model && (
                        <p className="text-destructive text-xs">{errors.vehicles[index].model}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Immatriculation</label>
                      <input
                        type="text"
                        value={vehicle.registration}
                        onChange={(e) => handleVehicleChange(index, 'registration', e.target.value)}
                        className={`w-full ${errors.vehicles?.[index]?.registration ? 'border-destructive' : ''}`}
                        placeholder="Ex: AB-123-CD"
                      />
                      {errors.vehicles?.[index]?.registration && (
                        <p className="text-destructive text-xs">{errors.vehicles[index].registration}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">VIN</label>
                      <input
                        type="text"
                        value={vehicle.vin}
                        onChange={(e) => handleVehicleChange(index, 'vin', e.target.value)}
                        className={`w-full ${errors.vehicles?.[index]?.vin ? 'border-destructive' : ''}`}
                      />
                      {errors.vehicles?.[index]?.vin && (
                        <p className="text-destructive text-xs">{errors.vehicles[index].vin}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Année</label>
                      <input
                        type="number"
                        value={vehicle.year}
                        onChange={(e) => handleVehicleChange(index, 'year', e.target.value)}
                        className={`w-full ${errors.vehicles?.[index]?.year ? 'border-destructive' : ''}`}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                      {errors.vehicles?.[index]?.year && (
                        <p className="text-destructive text-xs">{errors.vehicles[index].year}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Kilométrage</label>
                      <input
                        type="number"
                        value={vehicle.mileage}
                        onChange={(e) => handleVehicleChange(index, 'mileage', e.target.value)}
                        className={`w-full ${errors.vehicles?.[index]?.mileage ? 'border-destructive' : ''}`}
                        min="0"
                      />
                      {errors.vehicles?.[index]?.mileage && (
                        <p className="text-destructive text-xs">{errors.vehicles[index].mileage}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  navigate('/dashboard/clients');
                }
              }}
              className="btn-outline"
            >
              Annuler
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Créer le client
                </>
              )}
            </motion.button>
          </div>
        </motion.form>
      )}
    </div>
  );
};

export default AddClientForm;