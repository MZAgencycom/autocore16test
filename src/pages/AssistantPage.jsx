import { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Send, 
  Copy, 
  Bookmark, 
  FileDown, 
  User, 
  Search, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  ChevronDown,
  BotIcon,
  Star,
  X,
  CornerDownLeft,
  Menu,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import { checkActionPermission } from '../lib/subscriptionManager';
import SubscriptionLimitModal from '../components/subscription/SubscriptionLimitModal';

// Formatage de la date et heure en français
const formatDateTime = () => {
  const options = { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  return new Date().toLocaleDateString('fr-FR', options);
};

const AssistantPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threadHistory, setThreadHistory] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [showThreads, setShowThreads] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [factures, setFactures] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [chiffreAffaires, setChiffreAffaires] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(formatDateTime());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Subscription access check
  useEffect(() => {
    const checkAccessPermission = async () => {
      const result = await checkActionPermission('assistant');
      if (!result.canProceed) {
        setLimitInfo(result);
        setShowLimitModal(true);
      }
    };
    
    checkAccessPermission();
  }, []);

  // Mettre à jour l'heure toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(formatDateTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Charger les données utilisateur et initialiser la conversation
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        // Récupérer le prénom de l'utilisateur
        setFirstName(user.user_metadata?.first_name || 'utilisateur');
        
        try {
          // Charger les factures
          const { data: invoiceData, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (invoiceError) throw invoiceError;
          if (invoiceData) {
            setFactures(invoiceData);
            
            // Calculer le chiffre d'affaires (factures encaissées)
            const ca = invoiceData
              .filter(f => f.status === 'paid')
              .reduce((sum, f) => sum + f.total, 0);
            setChiffreAffaires(ca);
          }
          
          // Charger les rapports
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (reportError) throw reportError;
          if (reportData) {
            setRapports(reportData);
          }
          
          // Compter les clients
          const { count, error: clientError } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true });
            
          if (clientError) throw clientError;
          if (count !== null) {
            setClientsCount(count);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des données:', error);
        }
      }
    };
    
    loadUserData();
  }, [user]);

  // Initialiser le message d'accueil
  useEffect(() => {
    if (firstName) {
      setMessages([
        { 
          id: 1, 
          type: 'bot', 
          content: `Bonjour ${firstName} 👋, nous sommes le ${currentDateTime}. Que puis-je faire pour vous aujourd'hui ?` 
        }
      ]);
    }
  }, [firstName, currentDateTime]);

  // Charger l'historique des conversations
  useEffect(() => {
    const loadThreadHistory = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(15);
          
        if (error) throw error;
        if (data) {
          setThreadHistory(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
      }
    };
    
    loadThreadHistory();
  }, [user]);

  // Scroll vers le bas quand de nouveaux messages sont ajoutés
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filtrer les messages lorsque le terme de recherche change
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMessages([]);
      return;
    }
    
    const filtered = messages.filter(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMessages(filtered);
  }, [searchTerm, messages]);

  // Check subscription permission before sending a message
  const checkAssistantPermission = async () => {
    const result = await checkActionPermission('assistant');
    if (!result.canProceed) {
      setLimitInfo(result);
      setShowLimitModal(true);
      return false;
    }
    return true;
  };

  // Fonction pour envoyer un message à l'API Gemini
  const askGemini = async (userQuestion) => {
    try {
      setIsLoading(true);
      
      // Vérifier si Gemini API Key est configurée
      if (!config.geminiApiKey) {
        console.warn("Clé API Gemini non configurée. Utilisation des réponses pré-programmées.");
        return null; // Signale qu'on doit utiliser les réponses de secours
      }

      // Créer un prompt contextualisé pour l'assistant automobile
      const prompt = `
      Tu es AutoCoreBot, un assistant expert de carrosserie automobile et expert juridique développé par AutoCoreAI. Tu dois répondre à des questions techniques, juridiques, et administratives dans le contexte français.

      CONTEXTE CLIENT:
      - Prénom: ${firstName}
      - Nombre de clients gérés: ${clientsCount}
      - Nombre de rapports: ${rapports.length}
      - Nombre de factures: ${factures.length}
      - Chiffre d'affaires encaissé: ${chiffreAffaires.toFixed(2)} €

      SPÉCIFICITÉ DE TON DOMAINE D'EXPERTISE:
      Tu es spécialiste en:
      1. Questions techniques: réparations carrosserie, diagnostic, normes véhicules, types de pièces, etc.
      2. Questions juridiques: conformité assurance, droits clients, code de commerce / code des assurances 2025.
      3. Questions administratives: TVA, gestion factures, sinistres, création devis, relation assurance.

      CONTRAINTES DE RÉPONSES:
      - Sois précis et factuel, cite les textes de loi quand pertinent
      - Ne prétends pas être humain, tu es clairement un assistant IA
      - Garde un ton professionnel mais cordial
      - Limite tes réponses à 300 mots maximum pour rester concis
      - Si tu ne sais pas, dis-le clairement et propose des alternatives

      QUESTION DE L'UTILISATEUR:
      "${userQuestion}"
      `;

      // Configuration de la requête à l'API Gemini
      try {
        if (import.meta?.env?.DEV) console.log("Envoi de requête à l'API Gemini...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 15000); // Timeout de 15 secondes
        
        const response = await fetch(`${config.geminiEndpoint}?key=${config.geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024
            }
          }),
          signal: controller.signal
        });
        
        // Effacer le timeout
        clearTimeout(timeoutId);
        
        // Gestion des erreurs HTTP
        if (!response.ok) {
          const statusCode = response.status;
          let errorMessage = `Erreur API Gemini (${statusCode})`;
          
          try {
            const errorData = await response.json();
            errorMessage = `Erreur API Gemini: ${errorData.error?.message || 'Erreur inconnue'}`;
            console.error('Gemini API error response:', errorData);
          } catch (parseError) {
            const errorText = await response.text().catch(() => 'Détails non disponibles');
            errorMessage = `Erreur API Gemini (${statusCode}): ${errorText}`;
            console.error(`Gemini API error: ${response.status} ${response.statusText}`, errorText);
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        if (import.meta?.env?.DEV) console.log("Réponse reçue de l'API Gemini");
        
        // Valider la structure de la réponse
        if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error('Structure de réponse Gemini invalide:', data);
          throw new Error('Structure de réponse Gemini invalide');
        }
        
        // Extraire le contenu en toute sécurité
        let botContent;
        try {
          botContent = data.candidates[0].content.parts[0].text;
        } catch (e) {
          console.error("Erreur d'extraction du contenu de la réponse Gemini:", e);
          throw new Error("Impossible d'extraire le contenu de la réponse Gemini");
        }
        
        // Protection contre les réponses vides
        if (!botContent || botContent.trim() === '') {
          console.warn("Réponse vide de l'API Gemini");
          return null; // Signale qu'on doit utiliser les réponses de secours
        }
        
        return botContent.trim();
      } catch (fetchError) {
        // Gestion des erreurs spécifiques
        console.error('Erreur lors de la communication avec Gemini:', fetchError);
        
        // Ajouter l'erreur à la liste des erreurs
        setErrors(prev => [...prev, {
          time: new Date().toISOString(),
          error: fetchError.message || "Erreur de communication avec l'API"
        }]);
        
        return null; // Signale qu'on doit utiliser les réponses de secours
      }
    } catch (error) {
      console.error("Erreur générale avec l'API Gemini:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer la soumission du message
  const handleSubmit = async (e, promptText = null) => {
    e?.preventDefault();
    
    // Check if user can use the assistant
    const isAllowed = await checkAssistantPermission();
    if (!isAllowed) return;
    
    const messageText = promptText || inputValue;
    if (!messageText.trim()) return;
    
    const userMessage = { id: Date.now(), type: 'user', content: messageText.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Tenter d'obtenir une réponse via l'API Gemini
      const geminiResponse = await askGemini(messageText);
      
      let responseContent;
      if (geminiResponse) {
        responseContent = geminiResponse;
      } else {
        // Utiliser une réponse de secours si l'API Gemini échoue
        responseContent = generateBackupResponse(messageText);
      }
      
      const botResponse = { 
        id: Date.now() + 1, 
        type: 'bot', 
        content: responseContent
      };
      
      setMessages((prev) => [...prev, botResponse]);
      
      // Sauvegarder la conversation
      saveConversation([...messages, userMessage, botResponse]);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: "Désolé, j'ai rencontré une erreur en essayant de répondre. Veuillez réessayer."
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Générer une réponse de secours basée sur le message de l'utilisateur
  const generateBackupResponse = (userQuestion) => {
    const lowerQuestion = userQuestion.toLowerCase();
    
    // Questions sur la facturation
    if (lowerQuestion.includes('facture') || lowerQuestion.includes('facturation')) {
      return `Pour la facturation automobile en France, le taux de TVA standard est de 20% pour les pièces et la main d'œuvre. Assurez-vous d'appliquer le bon taux sur vos factures. \n\nChaque facture doit inclure vos coordonnées complètes (SIRET, TVA), la description détaillée des services, le détail des pièces utilisées, le temps de main d'œuvre, les conditions de paiement, et depuis 2023, la provenance des pièces (neuves, occasion, réparées).`;
    }
    
    // Questions sur l'assurance
    if (lowerQuestion.includes('assurance') || lowerQuestion.includes('assuranc')) {
      return `En matière d'assurance automobile, le code des assurances 2025 prévoit que les rapports d'expertise doivent être fournis au garage dans un délai de 15 jours. Le client a le droit de choisir son réparateur, même si l'assureur propose un garage agréé. \n\nVous pouvez facturer directement à l'assurance si vous avez une cession de créance signée par le client. Les délais de paiement légaux sont de 30 jours à compter de la réception de la facture.`;
    }
    
    // Questions sur les pièces détachées
    if (lowerQuestion.includes('pièce') || lowerQuestion.includes('piece')) {
      return `Concernant les pièces détachées, depuis janvier 2023, vous devez proposer des pièces de réemploi (d'occasion) pour les réparations non couvertes par la garantie. \n\nLa législation impose une traçabilité complète des pièces remplacées, avec obligation de conservation pendant 15 jours après la restitution du véhicule au client, sauf mention contraire sur la facture. \n\nPour les pièces de carrosserie, la disponibilité est garantie pendant au moins 15 ans après la fin de production du modèle.`;
    }
    
    // Questions sur les devis
    if (lowerQuestion.includes('devis')) {
      return `Selon la réglementation 2025, tout devis pour des réparations supérieures à 150€ doit être écrit et détaillé. Le client doit donner son accord explicite avant toute réparation. \n\nLe devis est gratuit sauf si une dépose/expertise est nécessaire, auquel cas vous pouvez facturer ce diagnostic. Le devis accepté vaut contrat et les dépassements non autorisés peuvent être contestés. Conservez une copie signée pour votre protection.`;
    }
    
    // Questions sur la garantie
    if (lowerQuestion.includes('garantie')) {
      return `Pour les travaux de carrosserie, vous êtes tenu d'appliquer une garantie légale de conformité de 2 ans sur les pièces neuves et la main d'œuvre. Pour les pièces d'occasion (réemploi), la garantie légale est de 12 mois. \n\nLa garantie couvre les défauts de pose et les pièces défectueuses, mais pas l'usure normale ni les dommages causés par le client. Mentionnez clairement les conditions de garantie sur vos factures.`;
    }
    
    // Questions sur les délais
    if (lowerQuestion.includes('délai') || lowerQuestion.includes('delai')) {
      return `Les délais de réparation doivent être indiqués sur le devis et tout dépassement significatif (>25% du temps estimé) doit faire l'objet d'une information au client. \n\nEn cas de sinistre assuré, vous devez informer à la fois le client et l'assureur de tout retard. Pour les pièces en commande, le délai maximal légal avant annulation possible est de 30 jours. \n\nLa jurisprudence considère qu'un retard injustifié peut donner lieu à des pénalités.`;
    }
    
    // Questions sur la TVA
    if (lowerQuestion.includes('tva') || lowerQuestion.includes('taxe')) {
      return `Le taux de TVA applicable aux réparations automobiles en France est de 20% (taux normal), tant pour les pièces que pour la main d'œuvre. \n\nPour facturer en exonération de TVA (cas des clients professionnels d'autres pays de l'UE), vous devez vérifier la validité de leur numéro de TVA intracommunautaire. \n\nLa TVA doit apparaître distinctement sur vos factures avec le montant HT, le taux appliqué et le montant de la taxe.`;
    }
    
    // Questions techniques
    if (lowerQuestion.includes('réparation') || lowerQuestion.includes('réparer')) {
      return `Les réparations de carrosserie doivent respecter les préconisations du constructeur. Pour les véhicules sous garantie constructeur, il est impératif d'utiliser des pièces d'origine ou de qualité équivalente. \n\nLes techniques modernes de redressage sans peinture (débosselage) sont soumises aux mêmes exigences de qualité. Pour toute intervention sur un véhicule électrique, assurez-vous de suivre les procédures spécifiques de mise en sécurité et d'obtenir l'habilitation requise.`;
    }
    
    // Réponse par défaut
    return `En tant qu'expert automobile, je peux vous renseigner sur les aspects techniques des réparations, la réglementation en vigueur pour les carrossiers et garages, ainsi que les bonnes pratiques administratives. \n\nN'hésitez pas à me poser des questions plus précises sur la gestion de votre atelier, la facturation, les relations avec les assurances, ou les aspects techniques des réparations de carrosserie.`;
  };
  
  // Sauvegarder la conversation dans Supabase
  const saveConversation = async (conversationMessages) => {
    try {
      if (!user) return;
      
      // Si nous avons un thread actif, le mettre à jour
      if (activeThread) {
        await supabase
          .from('chat_threads')
          .update({
            messages: conversationMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeThread);
      } 
      // Sinon créer un nouveau thread
      else {
        const firstUserMessage = conversationMessages.find(m => m.type === 'user');
        const title = firstUserMessage ? 
          (firstUserMessage.content.length > 30 ? 
            firstUserMessage.content.substring(0, 30) + '...' : 
            firstUserMessage.content) : 
          'Nouvelle conversation';
          
        const { data, error } = await supabase
          .from('chat_threads')
          .insert({
            user_id: user.id,
            title,
            messages: conversationMessages,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (error) throw error;
        if (data) {
          setActiveThread(data[0].id);
          
          // Mettre à jour l'historique des threads
          setThreadHistory(prev => [data[0], ...prev]);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la conversation:', error);
    }
  };
  
  // Charger un thread spécifique
  const loadThread = async (threadId) => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .single();
        
      if (error) throw error;
      if (data && data.messages) {
        setMessages(data.messages);
        setActiveThread(data.id);
        setShowThreads(false);
        setShowMobileMenu(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du thread:', error);
    }
  };
  
  // Démarrer un nouveau thread
  const startNewThread = () => {
    setMessages([{ 
      id: Date.now(), 
      type: 'bot', 
      content: `Bonjour ${firstName} 👋, nous sommes le ${currentDateTime}. Que puis-je faire pour vous aujourd'hui ?` 
    }]);
    setActiveThread(null);
    setShowThreads(false);
    setShowMobileMenu(false);
  };
  
  // Copier un message dans le presse-papiers
  const copyMessageToClipboard = (content) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // Ajouter une notification de succès
        alert('Message copié dans le presse-papiers !');
      })
      .catch(err => {
        console.error('Erreur lors de la copie :', err);
      });
  };
  
  // Exporter la conversation en PDF
  const exportConversation = () => {
    const title = "Conversation AutoCoreBot";
    const content = messages.map(msg => 
      `${msg.type === 'bot' ? 'Assistant' : 'Vous'}: ${msg.content}`
    ).join('\n\n');
    
    const element = document.createElement('a');
    const file = new Blob([`${title}\n\n${content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `conversation-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Définir des suggestions de prompts
  const suggestedPrompts = [
    {
      emoji: "🧾",
      text: "Aide-moi à créer une facture complète"
    },
    {
      emoji: "💸",
      text: "Dis-moi quelles factures sont en attente de paiement"
    },
    {
      emoji: "📊",
      text: "Fais-moi un résumé du chiffre d'affaires de ce mois"
    },
    {
      emoji: "🛠️",
      text: "Quels éléments ont été les plus remplacés cette semaine ?"
    },
    {
      emoji: "📨",
      text: "Rédige un message client pour envoyer la facture"
    },
    {
      emoji: "🧮",
      text: "Calcule le total HT/TTC de toutes mes factures ce mois"
    },
    {
      emoji: "📅",
      text: "Prévois-moi une relance automatique pour les impayés"
    },
    {
      emoji: "🔍",
      text: "Analyse ce rapport et dis-moi ce qu'il faut remplacer"
    }
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-card rounded-lg border h-full flex flex-col max-h-full overflow-hidden">
        {/* En-tête */}
        <div className="p-2 md:p-2.5 border-b flex justify-between items-center flex-shrink-0">
          <div className="flex items-center">
            <div className="md:hidden mr-2">
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
            <div className="p-1.5 rounded-full bg-primary/10 text-primary mr-2 hidden md:flex">
              <Brain className="h-3.5 w-3.5" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Mon assistant intelligent</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Posez-moi n'importe quelle question
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              className="p-1 hover:bg-muted rounded-full transition-colors"
              onClick={() => setShowSearch(!showSearch)}
              aria-label="Rechercher"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            
            <button 
              className="p-1 hover:bg-muted rounded-full transition-colors hidden sm:flex"
              onClick={exportConversation}
              title="Exporter la conversation"
              aria-label="Exporter"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        {/* Barre de recherche */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b overflow-hidden flex-shrink-0"
            >
              <div className="p-1.5 bg-muted/10">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-6 pr-6 py-1 text-xs rounded-md"
                  />
                  <button 
                    onClick={() => setShowSearch(false)}
                    className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                
                {searchTerm && filteredMessages.length > 0 && (
                  <div className="mt-1 space-y-1 max-h-16 overflow-y-auto">
                    {filteredMessages.map(msg => (
                      <div 
                        key={msg.id} 
                        className="p-1 bg-muted/30 rounded-md text-[10px] cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          document.getElementById(`message-${msg.id}`)?.scrollIntoView({ behavior: 'smooth' });
                          setSearchTerm('');
                          setShowSearch(false);
                        }}
                      >
                        <span className="font-medium">{msg.type === 'bot' ? 'Assistant' : 'Vous'}: </span>
                        {msg.content.substring(0, 50)}
                        {msg.content.length > 50 && '...'}
                      </div>
                    ))}
                  </div>
                )}
                
                {searchTerm && filteredMessages.length === 0 && (
                  <div className="mt-1 p-1 bg-muted/30 rounded-md text-[10px]">
                    Aucun résultat trouvé pour "{searchTerm}"
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex flex-1 overflow-hidden relative min-h-0">
          {/* Menu mobile pour les conversations */}
          <AnimatePresence>
            {showMobileMenu && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  className="md:hidden fixed inset-0 bg-black z-10"
                  onClick={() => setShowMobileMenu(false)}
                />
                <motion.div
                  initial={{ x: -200 }}
                  animate={{ x: 0 }}
                  exit={{ x: -200 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="md:hidden fixed inset-y-0 left-0 w-48 bg-background border-r z-20 p-2 pb-0"
                  style={{ maxHeight: 'calc(100vh - 4rem)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-xs">Conversations</h3>
                    <button 
                      onClick={startNewThread}
                      className="p-0.5 hover:bg-muted rounded-md transition-colors text-[10px] flex items-center text-primary"
                    >
                      <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                      Nouveau
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto pb-16" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                    {threadHistory.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => loadThread(thread.id)}
                        className={`w-full text-left p-1.5 text-xs rounded-md hover:bg-muted/50 transition-colors mb-1
                          ${activeThread === thread.id ? 'bg-muted/50' : ''}
                        `}
                      >
                        <div className="font-medium truncate text-[10px]">{thread.title}</div>
                        <div className="text-[8px] text-muted-foreground flex items-center">
                          <Clock className="h-2 w-2 mr-0.5 inline" />
                          {new Date(thread.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                    
                    {threadHistory.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-20" />
                        Aucune conversation
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Partie gauche : historique des conversations (visible uniquement sur desktop) */}
          <div className="w-40 md:w-48 border-r p-2 hidden md:block overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-xs">Conversations</h3>
              <button 
                onClick={startNewThread}
                className="p-0.5 hover:bg-muted rounded-md transition-colors text-[10px] flex items-center text-primary"
              >
                <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                Nouveau
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto pb-1" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              {threadHistory.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => loadThread(thread.id)}
                  className={`w-full text-left p-1.5 text-xs rounded-md hover:bg-muted/50 transition-colors
                    ${activeThread === thread.id ? 'bg-muted/50' : ''}
                  `}
                >
                  <div className="font-medium truncate text-[10px]">{thread.title}</div>
                  <div className="text-[8px] text-muted-foreground flex items-center">
                    <Clock className="h-2 w-2 mr-0.5 inline" />
                    {new Date(thread.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
              
              {threadHistory.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-20" />
                  Aucune conversation
                </div>
              )}
            </div>
          </div>
          
          {/* Partie centrale : zone de chat */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Zone de suggestions de prompts */}
            <div className="px-1.5 py-1 border-b overflow-x-auto whitespace-nowrap flex-shrink-0">
              <div className="flex space-x-1">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={async (e) => {
                      const isAllowed = await checkAssistantPermission();
                      if (isAllowed) {
                        handleSubmit(e, prompt.text);
                      }
                    }}
                    className="px-1.5 py-0.5 text-[10px] border rounded-full bg-muted/30 hover:bg-muted/50 transition-colors flex-shrink-0 flex items-center"
                  >
                    <span className="mr-0.5">{prompt.emoji}</span>
                    <span className="truncate max-w-[4.5rem] md:max-w-[6rem]">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {messages.map((message) => (
                <div
                  id={`message-${message.id}`}
                  key={message.id}
                  className={`flex ${message.type === 'bot' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[80%] rounded-md p-1.5 relative group ${
                      message.type === 'bot'
                        ? 'bg-muted/30 text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="flex items-start space-x-1.5">
                      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center 
                        ${message.type === 'bot' ? 'bg-primary/10 text-primary' : 'bg-primary-foreground/10 text-primary-foreground'}`}
                      >
                        {message.type === 'bot' ? (
                          <BotIcon className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                      </div>
                      <div className="space-y-0.5 w-full">
                        <div className="flex justify-between items-start">
                          <div className="text-[10px] font-medium">
                            {message.type === 'bot' ? 'Assistant' : 'Vous'}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-0.5">
                            <button 
                              onClick={() => copyMessageToClipboard(message.content)}
                              className="p-0.5 hover:bg-black/10 rounded"
                              title="Copier"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                            <button 
                              className="p-0.5 hover:bg-black/10 rounded"
                              title="Marquer comme important"
                            >
                              <Bookmark className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs whitespace-pre-line break-words">
                          {message.content}
                        </div>
                        
                        {/* Affichage des pièces jointes si présentes */}
                        {message.attachments?.map((attachment, idx) => (
                          <div key={idx} className="mt-1.5 rounded-md border p-1.5 bg-background">
                            {attachment.type === 'table' && (
                              <div>
                                <div className="font-medium mb-1 text-[10px]">{attachment.title}</div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[8px]">
                                    <thead className="border-b">
                                      <tr>
                                        {Object.keys(attachment.data[0] || {}).map((header) => (
                                          <th key={header} className="py-0.5 px-1 text-left">{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {attachment.data.map((row, rowIdx) => (
                                        <tr key={rowIdx} className="hover:bg-muted/20">
                                          {Object.values(row).map((cell, cellIdx) => (
                                            <td key={cellIdx} className="py-0.5 px-1">{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] md:max-w-[80%] rounded-md p-1.5 bg-muted/30 text-foreground">
                    <div className="flex items-start space-x-1.5">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <BotIcon className="h-3 w-3" />
                      </div>
                      <div>
                        <div className="text-[10px] font-medium mb-0.5">
                          Assistant
                        </div>
                        <span className="inline-flex">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Formulaire d'envoi */}
            <form onSubmit={handleSubmit} className="border-t p-1.5 flex-shrink-0">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Posez votre question..."
                  className="w-full border rounded-md pl-2.5 pr-8 py-1.5 text-xs"
                  disabled={isTyping}
                />
                <div className="absolute right-1.5 top-1/2 transform -translate-y-1/2 flex items-center">
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className={`p-1 rounded-md ${
                      !inputValue.trim() || isTyping
                        ? 'text-muted-foreground'
                        : 'text-primary'
                    }`}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
                
                <span className="sr-only">Envoyer</span>
              </div>
              
              <div className="mt-0.5 text-[8px] text-muted-foreground text-center flex items-center justify-center">
                <div className="relative flex items-center">
                  {!config.geminiApiKey ? (
                    <div className="flex items-center text-amber-500">
                      <AlertCircle className="h-2 w-2 mr-0.5" />
                      Mode hors ligne
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="h-1 w-1 rounded-full bg-green-500 mr-0.5"></div>
                      IA connectée
                    </div>
                  )}
                  <span className="mx-0.5">•</span>
                  <span className="hidden sm:inline">Vos conversations sont sauvegardées</span>
                  <span className="sm:hidden">Conversations sauvegardées</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Subscription limitation modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />
    </div>
  );
};

export default AssistantPage;