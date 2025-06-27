import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Shield, Brain, Clock, Users, FileText, ChevronRight, Search } from 'lucide-react';

const FAQSection = () => {
  const [activeCategory, setActiveCategory] = useState('security');
  const [openItems, setOpenItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  
  const faqCategories = [
    { id: 'security', name: 'Sécurité & CGI', icon: Shield },
    { id: 'ai', name: 'Intelligence Artificielle', icon: Brain },
    { id: 'usage', name: 'Utilisation quotidienne', icon: Clock },
    { id: 'crm', name: 'CRM & relation client', icon: Users },
    { id: 'documents', name: 'Factures & documents', icon: FileText }
  ];
  
  const faqItems = {
    security: [
      {
        question: "AutoCore AI respecte-t-il le RGPD 2025 ?",
        answer: "Oui, AutoCore AI est totalement conforme au RGPD 2025. Nous avons mis en place toutes les mesures nécessaires pour assurer la protection de vos données, y compris la nomination d'un Délégué à la Protection des Données, la réalisation d'analyses d'impact, et la mise en œuvre de mécanismes garantissant vos droits d'accès, de rectification et de suppression."
      },
      {
        question: "Mes données sont-elles sécurisées ?",
        answer: "Absolument. Nous utilisons les technologies de chiffrement les plus avancées pour protéger vos données (chiffrement AES-256 en transit et au repos). Notre infrastructure est régulièrement soumise à des tests d'intrusion et audits de sécurité par des experts indépendants. Vos données ne sont accessibles qu'à vous et aux personnes que vous autorisez."
      },
      {
        question: "Qui a accès à mes rapports et factures ?",
        answer: "Seuls vous et les membres de votre équipe que vous avez expressément autorisés peuvent accéder à vos documents. L'équipe d'AutoCore AI n'a jamais accès au contenu de vos documents, sauf si vous nous accordez un accès temporaire pour du support technique spécifique. Tout accès est systématiquement journalisé et auditable."
      },
      {
        question: "AutoCore revend-il mes données ?",
        answer: "Non, nous ne revendons jamais vos données. Notre modèle économique est basé exclusivement sur les abonnements à notre plateforme. Vos données vous appartiennent entièrement et nous nous engageons contractuellement à ne jamais les commercialiser, les partager ou les exploiter à des fins commerciales."
      },
      {
        question: "Où sont hébergées les données ?",
        answer: "Toutes vos données sont exclusivement hébergées dans l'Union Européenne (principalement en France et en Allemagne) sur des serveurs sécurisés certifiés ISO 27001. Cet hébergement européen garantit que vos données bénéficient des protections les plus strictes prévues par le RGPD et ne sont pas soumises à des législations extraterritoriales."
      }
    ],
    ai: [
      {
        question: "Comment fonctionne l'IA d'AutoCore ?",
        answer: "Notre intelligence artificielle combine des technologies avancées de reconnaissance optique de caractères (OCR) et des modèles de traitement du langage naturel spécifiquement entraînés sur des milliers de rapports d'expertise automobile. Elle identifie automatiquement les informations pertinentes comme les coordonnées client, caractéristiques du véhicule, pièces détachées et main d'œuvre. L'IA évolue constamment grâce à l'apprentissage continu."
      },
      {
        question: "Puis-je corriger l'IA ?",
        answer: "Oui, vous gardez toujours le contrôle. Si l'IA commet une erreur dans l'analyse d'un document, vous pouvez facilement la corriger. Chaque correction que vous apportez est utilisée pour améliorer la précision des analyses futures. Votre expertise humaine reste au centre du processus, l'IA est là pour vous faire gagner du temps, pas pour vous remplacer."
      },
      {
        question: "Est-ce que je dois être doué en informatique ?",
        answer: "Pas du tout ! AutoCore AI a été conçu spécifiquement pour les professionnels de l'automobile sans compétences informatiques particulières. L'interface est intuitive et ne nécessite que quelques minutes pour être prise en main. Notre équipe de support est également disponible pour vous accompagner dans vos premiers pas."
      },
      {
        question: "L'IA apprend-elle de mes habitudes ?",
        answer: "Oui, mais uniquement pour améliorer votre expérience personnelle. L'IA s'adapte progressivement à vos méthodes de travail, vos préférences de facturation et vos modèles de documents les plus utilisés. Cette personnalisation reste confidentielle et propre à votre compte. Aucune donnée d'apprentissage n'est partagée entre les différents utilisateurs."
      },
      {
        question: "Comment s'améliore l'intelligence artificielle ?",
        answer: "Notre IA s'améliore de deux façons : grâce aux corrections que vous apportez à vos propres documents (apprentissage personnalisé) et grâce à des mises à jour régulières de nos algorithmes par notre équipe d'ingénieurs. Ces mises à jour sont basées sur des données anonymisées et agrégées, garantissant la confidentialité des informations spécifiques à chaque utilisateur."
      }
    ],
    usage: [
      {
        question: "Quels sont les gains de temps concrets ?",
        answer: "Nos utilisateurs rapportent en moyenne une réduction de 70% du temps consacré aux tâches administratives. L'analyse automatique d'un rapport prend environ 30 secondes, contre 15-20 minutes manuellement. La génération de facture se fait en un clic, et l'envoi par email est automatisé. Au total, c'est environ 15 heures par semaine que vous pouvez réallouer à des tâches à plus forte valeur ajoutée."
      },
      {
        question: "Que puis-je automatiser ?",
        answer: "Vous pouvez automatiser l'ensemble du processus administratif : l'analyse des rapports d'expertise, l'extraction des informations client et véhicule, la création de devis et factures, l'envoi des documents par email, les relances de paiement, et le suivi client. Le système peut également générer des tableaux de bord et statistiques automatiques pour suivre votre activité."
      },
      {
        question: "Puis-je modifier les factures manuellement ?",
        answer: "Absolument. Bien que les factures soient générées automatiquement à partir des rapports d'expertise, vous conservez un contrôle total sur le résultat. Vous pouvez modifier tous les éléments avant finalisation : ajouter des pièces, ajuster les prix, modifier les taux horaires, ajouter des remises ou des commentaires spécifiques."
      },
      {
        question: "Est-ce adapté à tous les carrossiers ?",
        answer: "Oui, AutoCore AI est conçu pour s'adapter à toutes les tailles d'entreprises, du carrossier indépendant aux réseaux de franchisés. Nous proposons différentes formules d'abonnement en fonction de votre volume d'activité. La plateforme est particulièrement appréciée des petites structures qui n'ont pas de personnel administratif dédié."
      },
      {
        question: "Combien de temps faut-il pour maîtriser l'outil ?",
        answer: "La prise en main d'AutoCore AI est extrêmement rapide. La plupart des utilisateurs sont opérationnels en moins d'une heure. Nous proposons une série de tutoriels vidéo courts et un assistant virtuel pour vous guider. Pour les utilisateurs qui le souhaitent, nous organisons également des sessions de formation personnalisées de 30 minutes."
      }
    ],
    crm: [
      {
        question: "À quoi sert le CRM ?",
        answer: "Le CRM (Customer Relationship Management) intégré vous permet de centraliser toutes les informations de vos clients et de leurs véhicules. Vous pouvez y consulter l'historique complet des interactions, documents et factures. Il facilite le suivi client, permet d'anticiper leurs besoins et de personnaliser vos communications, renforçant ainsi leur fidélité."
      },
      {
        question: "Puis-je faire des relances automatiques ?",
        answer: "Oui, AutoCore AI vous permet de programmer des relances automatiques pour les factures impayées ou les suivis après réparation. Vous définissez les délais et le contenu des messages, et le système se charge de les envoyer au moment opportun. Vous recevez également des notifications pour les actions importantes nécessitant votre attention."
      },
      {
        question: "Les mails s'envoient-ils seuls ?",
        answer: "Par défaut, les emails sont préparés automatiquement mais nécessitent votre validation avant envoi, vous permettant de les personnaliser si nécessaire. Pour les communications récurrentes et standardisées (comme les confirmations de rendez-vous), vous pouvez activer l'envoi automatique après avoir validé les modèles. Vous gardez ainsi le contrôle tout en gagnant du temps."
      },
      {
        question: "Puis-je personnaliser mes communications ?",
        answer: "Absolument. AutoCore AI propose des modèles de communication professionnels que vous pouvez personnaliser selon vos besoins. Vous pouvez créer vos propres modèles, ajouter votre logo, adapter le ton et le contenu. Le système inclut également des variables dynamiques qui s'ajustent automatiquement à chaque client et véhicule."
      },
      {
        question: "Comment suivre l'historique de communication avec un client ?",
        answer: "Toutes les communications sont automatiquement enregistrées dans le profil du client. Vous pouvez consulter l'historique complet des emails envoyés, vérifier s'ils ont été ouverts, et voir les réponses reçues. Cette traçabilité complète vous permet de reprendre facilement le fil d'une conversation, même après plusieurs semaines."
      }
    ],
    documents: [
      {
        question: "Puis-je changer le modèle de facture ?",
        answer: "Oui, AutoCore AI propose plusieurs modèles de factures professionnels et personnalisables. Vous pouvez choisir celui qui correspond le mieux à votre image de marque, y ajouter votre logo, personnaliser les couleurs, et modifier les mentions légales. Vous pouvez également créer des modèles spécifiques pour différents types de prestations."
      },
      {
        question: "Est-ce que les montants sont fiables ?",
        answer: "Oui, notre système garantit une fiabilité financière maximale. Toutes les valeurs extraites des rapports d'expertise sont vérifiables visuellement, et les calculs (TVA, totaux) sont effectués avec précision. Le système attire automatiquement votre attention sur les anomalies potentielles pour une vérification humaine avant finalisation."
      },
      {
        question: "Est-ce que je peux envoyer la facture par mail ?",
        answer: "Oui, vous pouvez envoyer les factures directement depuis la plateforme, en un clic. Le système génère automatiquement un email professionnel avec la facture en pièce jointe au format PDF. Vous pouvez personnaliser le message avant envoi, et le système garde une trace de tous les documents envoyés."
      },
      {
        question: "Est-ce compatible avec mon système actuel ?",
        answer: "AutoCore AI est conçu pour s'intégrer facilement à votre écosystème existant. Nous proposons des exports dans les formats standard (PDF, CSV, Excel) compatibles avec la plupart des logiciels de comptabilité. Pour les utilisateurs avancés, nous disposons également d'une API permettant une intégration plus poussée avec votre système d'information."
      },
      {
        question: "Comment archiver mes documents légalement ?",
        answer: "Tous vos documents (rapports d'expertise, factures, devis) sont automatiquement archivés de manière sécurisée et conforme aux exigences légales françaises. L'archivage électronique respecte les normes NF Z 42-013 et ISO 14641-1. Vous pouvez accéder à vos archives à tout moment et les exporter si nécessaire pour un contrôle fiscal ou administratif."
      }
    ]
  };
  
  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const filteredFaqItems = searchQuery.length > 2
    ? Object.values(faqItems).flat().filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqItems[activeCategory];
    
  // Limit displayed questions based on showAllQuestions flag
  const displayedItems = searchQuery.length > 2 || showAllQuestions
    ? filteredFaqItems
    : filteredFaqItems.slice(0, 6);
  
  const totalQuestionsCount = Object.values(faqItems).flat().length;
  const currentCategoryQuestionsCount = faqItems[activeCategory].length;
  const filteredQuestionsCount = filteredFaqItems.length;
  
  return (
    <section id="faq" className="py-20 w-full relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[60%] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="absolute top-[20%] right-0 w-[1px] h-[30%] bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
        <div className="absolute bottom-[10%] left-0 w-[1px] h-[40%] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent"></div>
        <div className="absolute bottom-0 right-[20%] w-[60%] h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      </div>

      <div className="container relative z-10">
        <motion.div 
          className="text-center max-w-[800px] mx-auto mb-12 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Questions <span className="bg-gradient-to-r from-primary to-blue-400 text-transparent bg-clip-text">fréquemment posées</span>
          </h2>
          <p className="text-foreground/80 text-lg max-w-[600px] mx-auto">
            Nous avons rassemblé les questions les plus courantes pour vous aider à mieux comprendre notre solution.
          </p>
          
          {/* Search bar */}
          <div className="max-w-md mx-auto mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Rechercher une question..."
              className="w-full pl-9 pr-3 py-2 rounded-md border bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
        
        {/* Category tabs for desktop */}
        {searchQuery.length <= 2 && (
          <div className="flex flex-wrap justify-center gap-3 mb-8 hidden md:flex">
            {faqCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <button
                  key={category.id}
                  className={`px-4 py-2 rounded-full flex items-center transition-colors text-sm ${
                    activeCategory === category.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card hover:bg-muted/70 border'
                  }`}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setOpenItems({});
                  }}
                >
                  <CategoryIcon className="h-4 w-4 mr-2" />
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Mobile category dropdown */}
        {searchQuery.length <= 2 && (
          <div className="mb-6 md:hidden">
            <select 
              value={activeCategory}
              onChange={(e) => {
                setActiveCategory(e.target.value);
                setOpenItems({});
              }}
              className="w-full p-2.5 rounded-md border bg-card text-sm"
            >
              {faqCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* FAQ accordions */}
        <div className="max-w-3xl mx-auto mb-8">
          {searchQuery.length > 2 && filteredQuestionsCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg font-medium">Aucun résultat trouvé pour "{searchQuery}"</p>
              <p className="text-muted-foreground">Essayez d'autres termes de recherche ou parcourez les catégories</p>
              <button 
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                onClick={() => setSearchQuery('')}
              >
                Réinitialiser la recherche
              </button>
            </div>
          ) : (
            <>
              {/* Show search results or category title */}
              {searchQuery.length > 2 ? (
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  {filteredQuestionsCount} résultat{filteredQuestionsCount > 1 ? 's' : ''} trouvé{filteredQuestionsCount > 1 ? 's' : ''} pour "{searchQuery}"
                </p>
              ) : (
                <motion.h3 
                  key={activeCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xl font-semibold mb-6 text-center"
                >
                  {faqCategories.find(c => c.id === activeCategory)?.name || ''}
                </motion.h3>
              )}
            
              <div className="space-y-4">
                {displayedItems.map((item, index) => {
                  const itemId = searchQuery.length > 2 
                    ? `search-${index}` 
                    : `${activeCategory}-${index}`;
                    
                  return (
                    <motion.div 
                      key={itemId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border bg-card rounded-lg overflow-hidden"
                    >
                      <button 
                        className="w-full p-4 flex justify-between items-center text-left"
                        onClick={() => toggleItem(itemId)}
                      >
                        <span className="font-medium">{item.question}</span>
                        <span className="ml-4">
                          {openItems[itemId] ? (
                            <Minus className="h-5 w-5 flex-shrink-0 text-primary" />
                          ) : (
                            <Plus className="h-5 w-5 flex-shrink-0 text-primary" />
                          )}
                        </span>
                      </button>
                      
                      <AnimatePresence>
                        {openItems[itemId] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="p-4 pt-0 text-muted-foreground">
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
          
          {/* Show more button if needed */}
          {!searchQuery && filteredQuestionsCount > 6 && !showAllQuestions && (
            <div className="text-center mt-8">
              <button 
                className="inline-flex items-center px-4 py-2 border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-md transition-colors"
                onClick={() => setShowAllQuestions(true)}
              >
                Voir {currentCategoryQuestionsCount - 6} questions supplémentaires
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Reset view if showing all questions */}
          {!searchQuery && showAllQuestions && (
            <div className="text-center mt-8">
              <button 
                className="inline-flex items-center px-4 py-2 border rounded-md transition-colors"
                onClick={() => setShowAllQuestions(false)}
              >
                Afficher moins de questions
              </button>
            </div>
          )}
        </div>
        
        {/* Contact CTA */}
        <div className="text-center">
          <p className="mb-4 text-lg">
            Vous avez d'autres questions ? Nous sommes là pour vous aider.
          </p>
          <a 
            href="mailto:contact@autocore-ai.com" 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Contactez-nous
            <ChevronRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;