import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight, ChevronRight, Star, CircleDollarSign, Calendar, TrendingUp, Clock, BarChart3, Users, Send, FileText, ScrollText, CreditCard, Brain as Robot } from 'lucide-react';
import FAQSection from '../components/FAQSection';

// Hero section with enhanced visuals
const Hero = () => {
  return (
    <section className="relative w-full py-32 lg:py-40 overflow-hidden">
      {/* Background with enhanced gradient and shapes */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background to-background/95 pointer-events-none" />
      
      {/* Animated gradient orbs for background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            repeatType: "reverse"
          }}
        />
        <motion.div 
          className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-violet-500/5 rounded-full blur-3xl" 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div 
          className="absolute top-[30%] left-[20%] w-[20%] h-[20%] bg-cyan-500/5 rounded-full blur-xl" 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="container relative z-10">
        <motion.div 
          className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="flex flex-col justify-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Enhanced badge with animation */}
            <motion.div 
              className="inline-block"
              whileHover={{ scale: 1.05 }}
            >
              <div className="inline-flex items-center rounded-full bg-primary/10 backdrop-blur px-4 py-1.5 text-sm font-medium border border-primary/20 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary mr-2" />
                Nouveau 
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Beta
                </span>
              </div>
            </motion.div>
            
            {/* Enhanced typography with gradient and shadow */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-sm">
              Simplifiez la gestion de votre{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">carrosserie</span>
                <span className="absolute -bottom-1.5 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-blue-400/40 opacity-50 rounded-full"></span>
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/90 max-w-[600px] drop-shadow-sm">
              AutoCore AI automatise l'analyse des rapports d'expertise, la génération de factures
              et la communication client pour vous faire gagner un temps précieux.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to="/register" className="bg-gradient-to-r from-primary to-blue-500 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 text-center flex items-center justify-center">
                  Démarrer l'essai gratuit
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <a href="#features" className="bg-background/80 border border-primary/20 backdrop-blur-sm hover:bg-background/90 px-6 py-3 rounded-lg font-medium text-center transition-all duration-300 flex items-center justify-center">
                  Découvrir les fonctionnalités
                </a>
              </motion.div>
            </div>
            
            <motion.p 
              className="text-xs text-foreground/70 flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <span className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 inline-block mr-2"></span>
              Aucune carte de crédit requise. Essai gratuit de 14 jours.
            </motion.p>
          </motion.div>
          
          {/* Enhanced visualization with more animation and style */}
          <motion.div 
            className="mx-auto lg:mr-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ProcessVisualization />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive process visualization component with enhanced design
const ProcessVisualization = () => {
  const [activeStep, setActiveStep] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % steps.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      icon: FileText,
      title: "Analyse PDF",
      description: "L'IA détecte automatiquement les informations depuis vos rapports d'expertise."
    },
    {
      icon: ScrollText,
      title: "Factures Pro",
      description: "Générez des factures professionnelles en un clic avec des templates modernes."
    },
    {
      icon: Send,
      title: "Communication",
      description: "Envoyez des emails professionnels avec factures jointes automatiquement."
    },
    {
      icon: BarChart3,
      title: "Dashboard",
      description: "Suivez vos performances avec un tableau de bord intuitif et complet."
    }
  ];
  
  return (
    <div className="relative h-[500px] w-full max-w-[500px] rounded-xl bg-gradient-to-b from-primary/5 to-background backdrop-blur border border-primary/10 shadow-lg shadow-primary/5 p-3">
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-background/60 rounded-lg" />
      <div className="relative h-full w-full rounded-lg bg-background/75 backdrop-blur-sm overflow-hidden border border-white/10 shadow-inner">
        {/* App Content with enhanced design */}
        <div className="p-6 flex flex-col h-full">
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-between items-center"
            >
              <div className="flex items-center">
                <Robot className="h-5 w-5 text-primary mr-2" />
                <h3 className="font-bold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">
                  AutoCore AI
                </h3>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                Optimisez votre travail
              </span>
            </motion.div>
            
            <StepAnimation steps={steps} activeStep={activeStep} />
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -top-3 -right-3 h-6 w-6 bg-primary/20 rounded-full blur-xl"></div>
      <div className="absolute -bottom-3 -left-3 h-6 w-6 bg-blue-400/20 rounded-full blur-xl"></div>
    </div>
  )
}

// Animated step-by-step process with enhanced design
const StepAnimation = ({ steps, activeStep }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        {steps.map((_, index) => (
          <div 
            key={index}
            className="relative"
          >
            <div className={`h-1 w-16 rounded-full transition-colors duration-300 ${
              index === activeStep ? 'bg-primary' : 'bg-muted'
            }`}></div>
            {index === activeStep && (
              <motion.div 
                className="absolute top-0 left-0 h-1 w-1 bg-white rounded-full"
                animate={{ 
                  x: [0, 64, 0],
                  opacity: [0.2, 1, 0.2] 
                }}
                transition={{ 
                  duration: 3,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop"
                }}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="relative h-[350px]">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="absolute inset-0 rounded-lg border border-primary/10 bg-card/70 backdrop-blur-sm p-6 shadow-lg"
            initial={{ opacity: 0, x: 50 }}
            animate={{ 
              opacity: activeStep === index ? 1 : 0,
              x: activeStep === index ? 0 : 50,
              zIndex: activeStep === index ? 10 : 0 
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-start">
                <div className="p-3 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-inner">
                  <step.icon size={24} />
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-lg">{step.title}</h4>
                  <p className="text-foreground/70 text-sm">{step.description}</p>
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center">
                <StepContent stepIndex={index} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Custom content for each step with enhanced visuals
const StepContent = ({ stepIndex }) => {
  const contents = [
    // PDF Analysis content with enhanced design
    <div className="w-full space-y-4" key="pdf-analysis">
      <div className="p-4 border border-primary/10 rounded-lg bg-background/60 shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium bg-gradient-to-r from-primary/80 to-blue-500/80 text-transparent bg-clip-text">Détails client détectés</p>
            <div className="mt-2 space-y-1 text-sm text-foreground/80">
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                Dupont Marie
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                Renault Clio
              </p>
              <p className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                AB-123-CD
              </p>
            </div>
          </div>
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <motion.div 
          className="p-3 border border-primary/10 rounded-lg bg-background/60 shadow-md"
          whileHover={{ y: -2, boxShadow: "0 10px 15px -5px rgba(0, 0, 0, 0.1)" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <p className="text-xs text-muted-foreground">Pièces détectées</p>
          <p className="font-semibold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">12</p>
        </motion.div>
        <motion.div 
          className="p-3 border border-primary/10 rounded-lg bg-background/60 shadow-md"
          whileHover={{ y: -2, boxShadow: "0 10px 15px -5px rgba(0, 0, 0, 0.1)" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <p className="text-xs text-muted-foreground">Temps M.O</p>
          <p className="font-semibold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">2,5 h</p>
        </motion.div>
      </div>
    </div>,
    
    // Invoice generation content with enhanced design
    <div className="w-full border border-primary/10 rounded-lg p-4 space-y-3 bg-background/60 shadow-md" key="invoice">
      <div className="flex justify-between items-start">
        <div className="font-medium bg-gradient-to-r from-primary/80 to-blue-500/80 text-transparent bg-clip-text">Facture F-2023-042</div>
        <ScrollText className="h-5 w-5 text-primary" />
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-primary/5 pb-1">
          <span className="text-foreground/80">Pare-choc avant</span>
          <span className="font-medium">320,00 €</span>
        </div>
        <div className="flex justify-between border-b border-primary/5 pb-1">
          <span className="text-foreground/80">Phare avant gauche</span>
          <span className="font-medium">210,00 €</span>
        </div>
        <div className="flex justify-between border-b border-primary/5 pb-1">
          <span className="text-foreground/80">Main d'œuvre (2,5h)</span>
          <span className="font-medium">175,00 €</span>
        </div>
      </div>
      
      <div className="flex justify-between font-medium">
        <span>Total</span>
        <span className="text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">705,00 €</span>
      </div>
    </div>,
    
    // Email content with enhanced design
    <div className="w-full border border-primary/10 rounded-lg p-4 space-y-3 bg-background/60 shadow-md" key="email">
      <div className="flex justify-between items-start">
        <div className="font-medium bg-gradient-to-r from-primary/80 to-blue-500/80 text-transparent bg-clip-text">Email au client</div>
        <Send className="h-5 w-5 text-primary" />
      </div>
      
      <div className="space-y-3 text-sm">
        <p className="text-foreground/70 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
          À: marie.dupont@email.com
        </p>
        <p className="text-foreground/70 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
          Objet: Votre facture - Réparation Renault Clio
        </p>
        <div className="bg-background/80 border border-primary/10 rounded p-2 shadow-inner">
          <p>Bonjour Marie,</p>
          <p className="my-1">Veuillez trouver ci-joint la facture pour les réparations effectuées sur votre Renault Clio.</p>
        </div>
        <div className="flex items-center space-x-2">
          <motion.div 
            className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20"
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ScrollText className="h-4 w-4 text-primary" />
          </motion.div>
          <span className="text-foreground/70">Facture-F-2023-042.pdf</span>
        </div>
      </div>
    </div>,
    
    // Dashboard content with enhanced design
    <div className="w-full border border-primary/10 rounded-lg p-4 space-y-3 bg-background/60 shadow-md" key="dashboard">
      <div className="flex justify-between items-start">
        <div className="font-medium bg-gradient-to-r from-primary/80 to-blue-500/80 text-transparent bg-clip-text">Dashboard</div>
        <BarChart3 className="h-5 w-5 text-primary" />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <motion.div 
          className="p-2 bg-primary/5 border border-primary/10 rounded shadow-sm"
          whileHover={{ y: -2, boxShadow: "0 10px 15px -5px rgba(0, 0, 0, 0.1)" }}
        >
          <p className="text-xs text-muted-foreground">Factures du mois</p>
          <p className="font-semibold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">42</p>
        </motion.div>
        <motion.div 
          className="p-2 bg-primary/5 border border-primary/10 rounded shadow-sm"
          whileHover={{ y: -2, boxShadow: "0 10px 15px -5px rgba(0, 0, 0, 0.1)" }}
        >
          <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
          <p className="font-semibold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">28 450 €</p>
        </motion.div>
        <motion.div 
          className="p-2 bg-primary/5 border border-primary/10 rounded shadow-sm"
          whileHover={{ y: -2, boxShadow: "0 10px 15px -5px rgba(0, 0, 0, 0.1)" }}
        >
          <p className="text-xs text-muted-foreground">Temps économisé</p>
          <p className="font-semibold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">18h</p>
        </motion.div>
        <motion.div 
          className="p-2 bg-primary/5 border border-primary/10 rounded shadow-sm"
          whileHover={{ y: -2, boxShadow: "0 10px 15px -5px rgba(0, 0, 0, 0.1)" }}
        >
          <p className="text-xs text-muted-foreground">Taux de croissance</p>
          <p className="font-semibold text-lg bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">+12%</p>
        </motion.div>
      </div>
    </div>,
  ];
  
  return contents[stepIndex];
};

// Features section with enhanced visuals
const Features = () => {
  const features = [
    {
      icon: FileText,
      title: "Analyse de rapports d'expertise",
      description: "Notre IA détecte automatiquement les informations clés dans vos rapports d'expertise : coordonnées client, détails véhicule, pièces détachées et temps de main-d'œuvre."
    },
    {
      icon: ScrollText,
      title: "Génération de factures",
      description: "Créez des factures professionnelles en un clic avec nos 3 templates élégants. Toutes les informations sont préremplies à partir de l'analyse du rapport."
    },
    {
      icon: BarChart3,
      title: "Dashboard personnalisé",
      description: "Suivez vos performances avec un tableau de bord intuitif présentant l'historique des factures, statistiques financières et indicateurs de performance."
    },
    {
      icon: Send,
      title: "Communication automatisée",
      description: "Envoyez des emails professionnels avec vos factures en pièce jointe. Le système détecte automatiquement l'adresse email du client."
    },
    {
      icon: Users,
      title: "Mini CRM intégré",
      description: "Gérez vos clients et leurs véhicules dans un système CRM intuitif. Créez automatiquement des fiches client lors de l'analyse des rapports."
    },
    {
      icon: Clock,
      title: "Gain de temps considérable",
      description: "Réduisez jusqu'à 70% le temps consacré aux tâches administratives et concentrez-vous sur votre cœur de métier."
    },
    {
      icon: CreditCard,
      title: "Facturation optimisée",
      description: "Ne manquez plus jamais de facturer une pièce ou des heures de main-d'œuvre. Optimisez votre rentabilité grâce à une facturation précise."
    },
    {
      icon: TrendingUp,
      title: "Expérience client améliorée",
      description: "Offrez une expérience premium à vos clients avec des documents professionnels et une communication fluide et réactive."
    }
  ];
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 50,
        damping: 10
      }
    }
  };
  
  return (
    <section id="features" className="py-20 w-full relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[60%] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="absolute top-[20%] right-0 w-[1px] h-[30%] bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-[10%] left-0 w-[1px] h-[40%] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent"></div>
      </div>

      <div className="container relative z-10">
        <motion.div 
          className="text-center max-w-[800px] mx-auto mb-16 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-primary text-sm font-medium bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 inline-flex items-center">
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            Fonctionnalités puissantes
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">
            <span className="bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">Outils intelligents</span> pour 
            votre carrosserie
          </h2>
          <p className="text-foreground/80 text-lg max-w-[600px] mx-auto">
            Des outils conçus spécifiquement pour répondre aux besoins des carrossiers et des réparateurs automobiles.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative group p-6 rounded-xl border bg-card hover:shadow-lg transition-all overflow-hidden backdrop-blur-sm"
              whileHover={{ 
                y: -5, 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                borderColor: "rgba(var(--primary), 0.3)"
              }}
            >
              {/* Enhanced hover effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-blue-400/40 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              {/* Icon with enhanced style */}
              <div className="p-3 rounded-lg w-fit mb-4 transition-colors bg-primary/10 text-primary border border-primary/20 shadow-sm group-hover:bg-primary/15 relative">
                <feature.icon className="h-6 w-6 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-400 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-300" />
              </div>

              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-foreground/70 group-hover:text-foreground/90 transition-colors">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Testimonials section with enhanced design
const Testimonials = () => {
  const testimonials = [
    {
      quote: "Depuis que nous utilisons AutoCore AI, nous avons réduit de 60% le temps passé sur les tâches administratives. Les factures sont générées en quelques secondes et nos clients sont impressionnés par notre réactivité.",
      author: "Jean Dubois",
      role: "Directeur de Carrosserie Elite",
      initials: "JD"
    },
    {
      quote: "L'analyse automatique des rapports d'expertise est bluffante. Plus besoin de saisir manuellement les informations, tout est détecté avec une précision remarquable. Un gain de temps incroyable !",
      author: "Sophie Martin",
      role: "Gérante de Garage Moderne",
      initials: "SM"
    },
    {
      quote: "Le suivi client intégré nous permet de fidéliser notre clientèle. Nous avons toutes les informations à portée de main et pouvons proposer un service personnalisé qui fait la différence.",
      author: "Thomas Leroy",
      role: "Propriétaire de Carrosserie Express",
      initials: "TL"
    },
    {
      quote: "La génération automatique de factures m'a permis d'économiser près de 15 heures par semaine. L'interface est intuitive et les templates sont vraiment professionnels.",
      author: "Marie Dupont",
      role: "Responsable administrative, AutoRépar",
      initials: "MD"
    },
    {
      quote: "Notre comptabilité est devenue beaucoup plus simple avec AutoCore AI. Les statistiques nous aident à mieux gérer notre activité et à anticiper les périodes chargées.",
      author: "Pierre Lambert",
      role: "Gérant de CarsExpert",
      initials: "PL"
    },
    {
      quote: "L'intégration avec notre système existant a été très facile. Le support client est réactif et l'équipe est à l'écoute de nos besoins spécifiques.",
      author: "Isabelle Roux",
      role: "Directrice financière, Groupe Autoplus",
      initials: "IR"
    }
  ];
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 50,
        damping: 10
      }
    }
  };
  
  const RatingStars = () => (
    <div className="flex mb-2">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
      ))}
    </div>
  );
  
  return (
    <section className="py-20 relative">
      {/* Enhanced background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.07),transparent)] pointer-events-none"></div>
      
      <div className="container relative z-10">
        <motion.div 
          className="text-center max-w-[800px] mx-auto mb-16 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-primary text-sm font-medium bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 inline-flex items-center">
            <Star className="h-3.5 w-3.5 mr-2 fill-primary" />
            Témoignages clients
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">
            Ils <span className="bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">nous font confiance</span>
          </h2>
          <p className="text-foreground/80 text-lg max-w-[600px] mx-auto">
            Découvrez ce que nos clients disent d'AutoCore AI et comment notre solution a transformé leur activité.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="h-full bg-card/50 backdrop-blur-sm border border-primary/10 rounded-lg p-6 shadow-md"
              whileHover={{ 
                y: -5, 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <RatingStars />
              <p className="mb-4 text-foreground/90 relative">
                <span className="absolute -top-2 -left-1 text-5xl text-primary/20 font-serif">"</span>
                <span className="relative">{testimonial.quote}</span>
              </p>
              <div className="flex items-center">
                <div className="h-10 w-10 mr-3 rounded-full bg-gradient-to-br from-primary to-blue-400 text-white flex items-center justify-center text-sm font-medium shadow-sm">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-medium">{testimonial.author}</p>
                  <p className="text-xs text-foreground/70">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Pricing section with enhanced design
const Pricing = () => {
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const plans = [
    {
      name: "Starter",
      description: "Pour les petites structures qui débutent",
      price: "29",
      features: [
        "10 rapports d'expertise par mois",
        "Analyse PDF automatique",
        "Génération de factures",
        "1 template de facture",
        "Dashboard basique",
        "Email de support"
      ],
      cta: "Essai gratuit",
      popular: false
    },
    {
      name: "Pro",
      description: "Pour les garages en pleine croissance",
      price: "79",
      features: [
        "50 rapports d'expertise par mois",
        "Analyse PDF avancée",
        "Génération de factures illimitée",
        "3 templates de facture",
        "Dashboard complet avec statistiques",
        "Mini CRM intégré",
        "Module d'envoi d'email",
        "Support prioritaire"
      ],
      cta: "Essai gratuit",
      popular: true
    },
    {
      name: "Enterprise",
      description: "Pour les grandes structures",
      price: "199",
      features: [
        "Rapports d'expertise illimités",
        "Analyse PDF premium",
        "Templates de facture personnalisables",
        "Dashboard avancé avec exports",
        "CRM avancé avec historique complet",
        "Intégration API avec vos outils",
        "Accès multi-utilisateurs",
        "Support dédié"
      ],
      cta: "Contacter commercial",
      popular: false
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 50,
        damping: 10
      }
    }
  };
  
  return (
    <section id="pricing" className="py-20 relative">
      {/* Enhanced background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--primary),0.05),transparent_50%)] pointer-events-none"></div>
      
      <div className="container relative z-10">
        <motion.div 
          className="text-center max-w-[800px] mx-auto mb-16 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-primary text-sm font-medium bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 inline-flex items-center">
            <CreditCard className="h-3.5 w-3.5 mr-2" />
            Tarification
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">
            Tarifs <span className="bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">transparents</span> et accessibles
          </h2>
          <p className="text-foreground/80 text-lg max-w-[600px] mx-auto">
            Choisissez le plan qui correspond à vos besoins et commencez à optimiser votre activité dès aujourd'hui.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-6 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className={`flex flex-col rounded-xl border bg-card/70 backdrop-blur-sm overflow-hidden relative shadow-md ${
                plan.popular ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-primary/10'
              }`}
              onMouseEnter={() => setHoveredPlan(index)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              {/* Enhanced background effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent transition-opacity duration-300 ${hoveredPlan === index ? 'opacity-100' : 'opacity-0'}`} />
              
              {plan.popular && (
                <div className="py-1 px-4 bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-medium tracking-wider uppercase text-center shadow-md">
                  Recommandé
                </div>
              )}
              <div className="p-6 relative z-10">
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">{plan.name}</h3>
                <p className="text-foreground/70 text-sm">{plan.description}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold">{plan.price}€</span>
                  <span className="ml-1 text-foreground/70">/mois</span>
                </div>
              </div>
              
              <div className="flex-grow p-6 pt-0 relative z-10">
                <ul className="space-y-3 mt-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-sm">
                      <div className="rounded-full p-1 bg-primary/10 text-primary mr-2 mt-0.5">
                        <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-6 pt-0 relative z-10">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link 
                    to={plan.name === "Enterprise" ? "/contact" : "/register"} 
                    className={`w-full block text-center py-2.5 px-4 rounded-lg shadow-sm transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-primary to-blue-500 text-white font-medium shadow-md hover:shadow-lg'
                        : 'bg-card border border-primary/20 hover:bg-primary/10'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              </div>
              
              {/* Decorative corner accent for popular plan */}
              {plan.popular && (
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 transform rotate-45 translate-x-8 -translate-y-8 border-b border-primary/20"></div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 text-center text-foreground/60">
          <p>Tous les prix sont hors taxes. Facturation annuelle disponible avec 2 mois offerts.</p>
        </div>
      </div>
    </section>
  );
};

// Call to action section with enhanced design
const Cta = () => {
  return (
    <section id="contact" className="py-20 relative">
      <div className="container relative z-10">
        <motion.div 
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 lg:p-16 border shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Enhanced background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-blue-500/5 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.1),transparent_50%)] pointer-events-none"></div>
          
          {/* Additional decorative elements */}
          <div className="absolute top-0 right-0 h-px w-40 bg-gradient-to-l from-transparent via-primary/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 h-px w-40 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl opacity-50"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl opacity-50"></div>

          <div className="relative max-w-3xl mx-auto text-center">
            <motion.span 
              className="text-primary text-sm font-medium bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 inline-flex items-center mb-6"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Prêt à transformer votre activité ?
            </motion.span>
            
            <motion.h2 
              className="text-3xl font-bold mb-6 md:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Rejoignez les professionnels qui <span className="bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">gagnent du temps</span> chaque jour
            </motion.h2>
            
            <motion.p 
              className="text-foreground/80 text-lg max-w-[600px] mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Rejoignez les centaines de professionnels de l'automobile qui font confiance à AutoCore AI pour optimiser leur quotidien.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link to="/register" className="shadow-lg shadow-primary/10 bg-gradient-to-r from-primary to-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-xl transition-all duration-300 text-center flex items-center justify-center">
                  Démarrer votre essai gratuit
                  <ArrowRight className="ml-2 inline-block h-4 w-4" />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <a href="mailto:contact@autocoreai.fr" className="border border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-background/90 px-6 py-3 rounded-lg font-medium text-center transition-all duration-300 shadow-md hover:shadow-lg">
                  Demander une démo
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              className="pt-8 flex items-center justify-center gap-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">Essai 14 jours</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Sans engagement</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-sm font-medium">Annulation facile</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Main HomePage component
const HomePage = () => {
  return (
    <div className="mt-16">
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQSection /> {/* Ajout du composant FAQ ici */}
      <Cta />
    </div>
  );
};

export default HomePage;