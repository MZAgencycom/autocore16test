import { useState, useEffect, useRef } from 'react';
import { User, Building, MapPin, CreditCard, Upload, X, Save, Loader, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';

// Form validation schema
const profileSchema = z.object({
  company_name: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
  address_street: z.string().min(2, "L'adresse doit contenir au moins 2 caractères"),
  address_zip_code: z.string().min(4, "Le code postal doit contenir au moins 4 caractères"),
  address_city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  address_country: z.string().default("France"),
  phone: z.string().optional(),
  iban: z.string().optional(),
  rcs_number: z.string().optional(),
  ape_code: z.string().optional(),
  hourly_rate: z.number().positive("Le taux horaire doit être positif").min(1, "Le taux horaire doit être au moins de 1€")
});

const UserSettings = () => {
  const [userData, setUserData] = useState(null);
  const [userAuth, setUserAuth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [formErrors, setFormErrors] = useState({});
  
  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsLoading(true);
        
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Session not found");
        }
        
        setUserAuth(session.user);
        
        // Fetch user extended profile
        const { data, error } = await supabase
          .from('users_extended')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) throw error;
        
        setUserData(data);
        
        // Set logo preview if available
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError("Impossible de charger vos informations");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserData();
  }, []);
  
  const handleChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user types
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };
  
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Only accept image files
      if (!file.type.startsWith('image/')) {
        setError("Seules les images sont acceptées (PNG, JPEG, SVG)");
        return;
      }
      
      // Limit file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Taille de fichier maximale: 5MB");
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const validateForm = () => {
    try {
      profileSchema.parse({
        company_name: userData.company_name,
        siret: userData.siret,
        vat_number: userData.vat_number,
        address_street: userData.address_street,
        address_zip_code: userData.address_zip_code,
        address_city: userData.address_city,
        address_country: userData.address_country || "France",
        phone: userData.phone,
        iban: userData.iban,
        rcs_number: userData.rcs_number,
        ape_code: userData.ape_code,
        hourly_rate: parseFloat(userData.hourly_rate)
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {};
        error.errors.forEach(err => {
          // Direct field name mapping
          fieldErrors[err.path[0]] = err.message;
        });
        setFormErrors(fieldErrors);
      }
      return false;
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Upload logo if provided
      let logoUrl = userData.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `company_logos/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports') // Using the reports bucket as it exists
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) throw new Error(`Error uploading logo: ${uploadError.message}`);
        
        const { data: { publicUrl } } = supabase.storage
          .from('reports')
          .getPublicUrl(filePath);
          
        logoUrl = publicUrl;
      }
      
      // Sauvegarder le profil de l'utilisateur (création ou mise à jour)
      const { error } = await supabase
        .from('users_extended')
        .upsert({
          id: userAuth.id,
          company_name: userData.company_name,
          siret: userData.siret,
          vat_number: userData.vat_number,
          address_street: userData.address_street,
          address_zip_code: userData.address_zip_code,
          address_city: userData.address_city,
          address_country: userData.address_country || "France",
          phone: userData.phone,
          iban: userData.iban || '',
          rcs_number: userData.rcs_number || null,
          ape_code: userData.ape_code || null,
          logo_url: logoUrl,
          hourly_rate: parseFloat(userData.hourly_rate) || 70,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || "Une erreur est survenue lors de la mise à jour du profil");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-lg border">
      <div className="p-6 border-b">
        <div className="flex items-center mb-4">
          <div className="p-2 rounded bg-primary/10 text-primary mr-3">
            <User className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Paramètres du compte</h3>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-6 bg-destructive/10 text-destructive p-3 rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-emerald-500/10 text-emerald-500 p-3 rounded-md flex items-center">
            <Check className="h-4 w-4 mr-2" />
            <span>Profil mis à jour avec succès</span>
          </div>
        )}
        
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center">
              <Building className="h-4 w-4 text-muted-foreground mr-2" />
              <h4 className="font-medium">Informations entreprise</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={userData?.company_name || ''}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className={`w-full ${formErrors.company_name ? 'border-destructive' : ''}`}
                />
                {formErrors.company_name && (
                  <p className="text-destructive text-xs">{formErrors.company_name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Logo
                </label>
                <div className="relative">
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="max-h-32 max-w-full rounded border p-2"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoChange}
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-outline inline-flex"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Télécharger un logo
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: PNG, JPG, SVG. Taille max: 5MB
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  SIRET
                </label>
                <input
                  type="text"
                  value={userData?.siret || ''}
                  onChange={(e) => handleChange('siret', e.target.value)}
                  className="w-full"
                  placeholder="Ex: 12345678900012"
                />
                {formErrors.siret && (
                  <p className="text-destructive text-xs">{formErrors.siret}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  N° TVA Intracommunautaire
                </label>
                <input
                  type="text"
                  value={userData?.vat_number || ''}
                  onChange={(e) => handleChange('vat_number', e.target.value)}
                  className="w-full"
                  placeholder="Ex: FR12345678900"
                />
                {formErrors.vat_number && (
                  <p className="text-destructive text-xs">{formErrors.vat_number}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Numéro RCS ou RM
                </label>
                <input
                  type="text"
                  value={userData?.rcs_number || ''}
                  onChange={(e) => handleChange('rcs_number', e.target.value)}
                  className="w-full"
                  placeholder="Ex: RCS Paris 123 456 789"
                />
                <p className="text-xs text-muted-foreground">
                  Numéro d'immatriculation au Registre du Commerce ou des Métiers
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Code APE / NAF
                </label>
                <input
                  type="text"
                  value={userData?.ape_code || ''}
                  onChange={(e) => handleChange('ape_code', e.target.value)}
                  className="w-full"
                  placeholder="Ex: 4520A"
                />
                <p className="text-xs text-muted-foreground">
                  Code d'Activité Principale de l'Entreprise
                </p>
              </div>
            </div>
            
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
              <h4 className="font-medium">Adresse</h4>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Rue *
              </label>
              <input
                type="text"
                value={userData?.address_street || ''}
                onChange={(e) => handleChange('address_street', e.target.value)}
                className={`w-full ${formErrors.address_street ? 'border-destructive' : ''}`}
                placeholder="Ex: 123 Rue de Paris"
              />
              {formErrors.address_street && (
                <p className="text-destructive text-xs">{formErrors.address_street}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Code postal *
                </label>
                <input
                  type="text"
                  value={userData?.address_zip_code || ''}
                  onChange={(e) => handleChange('address_zip_code', e.target.value)}
                  className={`w-full ${formErrors.address_zip_code ? 'border-destructive' : ''}`}
                  placeholder="Ex: 75001"
                />
                {formErrors.address_zip_code && (
                  <p className="text-destructive text-xs">{formErrors.address_zip_code}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Ville *
                </label>
                <input
                  type="text"
                  value={userData?.address_city || ''}
                  onChange={(e) => handleChange('address_city', e.target.value)}
                  className={`w-full ${formErrors.address_city ? 'border-destructive' : ''}`}
                  placeholder="Ex: Paris"
                />
                {formErrors.address_city && (
                  <p className="text-destructive text-xs">{formErrors.address_city}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Pays
                </label>
                <input
                  type="text"
                  value={userData?.address_country || 'France'}
                  onChange={(e) => handleChange('address_country', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
              <h4 className="font-medium">Facturation</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Taux horaire de main d'œuvre (€/h) *
                </label>
                <input
                  type="number"
                  value={userData?.hourly_rate || 70}
                  onChange={(e) => handleChange('hourly_rate', e.target.value)}
                  className={`w-full ${formErrors.hourly_rate ? 'border-destructive' : ''}`}
                  min="1"
                  step="0.5"
                />
                <p className="text-xs text-muted-foreground">
                  Ce taux sera utilisé par défaut lors de la création de factures
                </p>
                {formErrors.hourly_rate && (
                  <p className="text-destructive text-xs">{formErrors.hourly_rate}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={userData?.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full"
                  placeholder="Ex: 01 23 45 67 89"
                />
                {formErrors.phone && (
                  <p className="text-destructive text-xs">{formErrors.phone}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                IBAN (pour paiements bancaires)
              </label>
              <input
                type="text"
                value={userData?.iban || ''}
                onChange={(e) => handleChange('iban', e.target.value)}
                className="w-full"
                placeholder="Ex: FR76 1234 5678 9101 1121 3141 518"
              />
              <p className="text-xs text-muted-foreground">
                Votre IBAN sera affiché sur les factures pour faciliter les paiements par virement
              </p>
              {formErrors.iban && (
                <p className="text-destructive text-xs">{formErrors.iban}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserSettings;