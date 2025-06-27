import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Upload, Building, MapPin, Phone, Mail, User, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    siret: '',
    addressStreet: '',
    addressZipCode: '',
    addressCity: '',
    addressCountry: 'France'
  });

  // Récupérer les informations de l'utilisateur depuis Supabase Auth
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || ''
      }));

      // Vérifier si l'utilisateur a déjà un profil complet
      checkExistingProfile(user.id);
    }
  }, [user]);

  // Vérifier si un profil existe déjà
  const checkExistingProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users_extended')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Si le profil existe et a des données importantes, rediriger vers le dashboard
      if (data && data.company_name && data.address_city) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du profil:', error);
    }
  };

  // Gérer les changements dans le formulaire
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Passer à l'étape suivante
  const nextStep = () => {
    if (step === 0 && (!formData.firstName || !formData.lastName)) {
      setError("Veuillez remplir votre nom et prénom");
      return;
    }
    if (step === 1 && !formData.companyName) {
      setError("Veuillez indiquer le nom de votre entreprise");
      return;
    }
    
    setError(null);
    setStep(prev => prev + 1);
  };

  // Étape précédente
  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    if (!user) {
      setError("Vous devez être connecté pour compléter votre profil");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Mettre à jour le profil utilisateur étendu
      const { error } = await supabase
        .from('users_extended')
        .upsert({
          id: user.id,
          company_name: formData.companyName,
          siret: formData.siret || null,
          address_street: formData.addressStreet,
          address_zip_code: formData.addressZipCode,
          address_city: formData.addressCity,
          address_country: formData.addressCountry,
          phone: formData.phone || null
        });
        
      if (error) throw error;
      
      // Mettre à jour les métadonnées utilisateur si nécessaire
      if (formData.firstName !== user.user_metadata?.first_name || 
          formData.lastName !== user.user_metadata?.last_name) {
        
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        });
        
        if (updateError) throw updateError;
      }
      
      // Rediriger vers le tableau de bord une fois l'enregistrement termine
      navigate('/dashboard', { replace: true });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      setError(error.message || "Une erreur est survenue lors de la mise à jour du profil");
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  };

  // Rendu des étapes du formulaire
  const renderStep = () => {
    switch(step) {
      case 0:
        return (
          <motion.div
            key="step1"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Bienvenue sur AutoCoreAI</h2>
              <p className="text-muted-foreground mt-2">Commençons par quelques informations de base</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Prénom</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="w-full"
                  placeholder="Votre prénom"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Nom</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="w-full"
                  placeholder="Votre nom"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Email professionnel</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full"
                  placeholder="vous@entreprise.com"
                  disabled={!!user?.email}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Téléphone</label>
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
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            key="step2"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Informations de votre entreprise</h2>
              <p className="text-muted-foreground mt-2">Ces informations apparaîtront sur vos factures</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Nom de l'entreprise</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full pl-9"
                    placeholder="Nom de votre entreprise"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">SIRET</label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => handleChange('siret', e.target.value)}
                  className="w-full"
                  placeholder="12345678900012"
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step3"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Adresse de l'entreprise</h2>
              <p className="text-muted-foreground mt-2">Pour compléter vos informations légales</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={formData.addressStreet}
                    onChange={(e) => handleChange('addressStreet', e.target.value)}
                    className="w-full pl-9"
                    placeholder="123 rue de Paris"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Code postal</label>
                  <input
                    type="text"
                    value={formData.addressZipCode}
                    onChange={(e) => handleChange('addressZipCode', e.target.value)}
                    className="w-full"
                    placeholder="75001"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Ville</label>
                  <input
                    type="text"
                    value={formData.addressCity}
                    onChange={(e) => handleChange('addressCity', e.target.value)}
                    className="w-full"
                    placeholder="Paris"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Pays</label>
                <input
                  type="text"
                  value={formData.addressCountry}
                  onChange={(e) => handleChange('addressCountry', e.target.value)}
                  className="w-full"
                  placeholder="France"
                />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="step4"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="space-y-6 text-center"
          >
            <div className="p-4 bg-primary/10 inline-flex rounded-full text-primary mx-auto">
              <Check className="h-8 w-8" />
            </div>
            
            <h2 className="text-2xl font-bold">Vous êtes prêt !</h2>
            
            <p className="text-muted-foreground">
              Votre compte est prêt. Vous allez maintenant être redirigé vers votre tableau de bord.
            </p>
            
            <div className="pt-4">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary py-2.5 px-6 mx-auto flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Finalisation...
                  </>
                ) : (
                  <>
                    Accéder au tableau de bord
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center">
            <Logo className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">
              AutoCore<span className="text-primary">AI</span>
            </h1>
          </div>
          <div className="text-sm text-muted-foreground">Configuration du profil</div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          {/* Progress steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index} 
                  className="flex flex-1 items-center relative"
                >
                  <div 
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                      ${index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                      ${index < step ? 'bg-primary text-primary-foreground' : ''}
                    `}
                  >
                    {index < step ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {index < 3 && (
                    <div 
                      className={`h-0.5 flex-1 mx-1 ${index < step ? 'bg-primary' : 'bg-muted'}`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form card */}
          <div className="bg-card rounded-lg shadow border p-6">
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center">
                <X className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            
            {renderStep()}
            
            {/* Navigation buttons */}
            {step < 3 && (
              <div className="flex justify-between mt-8">
                {step > 0 ? (
                  <button 
                    onClick={prevStep}
                    className="btn-outline py-2 px-4"
                  >
                    Précédent
                  </button>
                ) : (
                  <div></div>
                )}
                
                <button 
                  onClick={nextStep}
                  className="btn-primary py-2 px-4 flex items-center"
                >
                  {step === 2 ? 'Terminer' : 'Suivant'}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground mt-8">
            Propulsé par{" "}
            <span className="font-medium">
              AutoCore<span className="text-primary">AI</span>
            </span>
            {" "}- 100% français
          </div>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;