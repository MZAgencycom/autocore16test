import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, MinusIcon, BotIcon, User, Search, Clock, AlertCircle, ChevronDown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { checkActionPermission } from '../lib/subscriptionManager';
import SubscriptionLimitModal from './subscription/SubscriptionLimitModal';

const AutoCoreBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', content: 'Bonjour, je suis AutoCoreBot. Comment puis-je vous aider aujourd\'hui?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [threadHistory, setThreadHistory] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [showThreads, setShowThreads] = useState(false);
  const [enableLogging, setEnableLogging] = useState(config.enableChatbotLogging);
  
  // Subscription limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitInfo, setLimitInfo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);
  
  // Load conversation history
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (enableLogging) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data, error } = await supabase
              .from('chat_threads')
              .select('*')
              .eq('user_id', session.user.id)
              .order('updated_at', { ascending: false })
              .limit(10);
              
            if (error) throw error;
            if (data) {
              setThreadHistory(data);
            }
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    };
    
    if (isOpen) {
      loadConversationHistory();
    }
  }, [isOpen, enableLogging]);
  
  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };
  
  const minimizeChat = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Check subscription before processing
    const result = await checkActionPermission('assistant');
    if (!result.canProceed) {
      setLimitInfo(result);
      setShowLimitModal(true);
      return;
    }
    
    const userMessage = { id: Date.now(), type: 'user', content: inputValue.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      if (config.geminiApiKey) {
        // Use Gemini for conversation
        await askGemini(userMessage.content, [...messages, userMessage]);
      } else {
        // Fall back to mock responses if no API key
        setTimeout(() => {
          const botResponse = { 
            id: Date.now() + 1, 
            type: 'bot', 
            content: getMockResponse(inputValue)
          };
          
          setMessages((prev) => [...prev, botResponse]);
          setIsTyping(false);
          
          // Save conversation if logging is enabled
          if (enableLogging) {
            saveConversation([...messages, userMessage, botResponse]);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: "Désolé, j'ai rencontré une erreur en essayant de répondre. Veuillez réessayer."
      }]);
    }
  };
  
  const askGemini = async (userQuestion, currentMessages) => {
    try {
      setIsTyping(true);
      
      // Validate configuration before making API call
      if (!config.geminiEndpoint) {
        console.error('Gemini endpoint not configured');
        throw new Error('Configuration Gemini incomplète: endpoint manquant');
      }

      if (!config.geminiApiKey) {
        console.error('Gemini API key not provided');
        throw new Error('Configuration Gemini incomplète: clé API manquante');
      }

      const prompt = `
      Tu es AutoCoreBot, un assistant expert en carrosserie automobile. Tu dois répondre à des questions techniques, juridiques, et administratives dans le contexte français.
      
      Questions techniques: réparations, diagnostic, normes véhicules, types de pièces, etc.
      Questions juridiques: conformité assurance, droits clients, code de commerce / code des assurances 2025.
      Questions administratives: TVA, gestion factures, sinistres, création devis, relation assurance.

      Réponds à cette question de façon précise et professionnelle: ${userQuestion}
      `;
      
      // Set up timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      
      try {
        if (import.meta?.env?.DEV) console.log("Sending request to Gemini API...");
        
        const response = await fetch(`${config.geminiEndpoint}?key=${config.geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
        
        // Clear the timeout as soon as we get a response
        clearTimeout(timeoutId);
        
        // Handle HTTP error responses
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
        if (import.meta?.env?.DEV) console.log('Gemini API response received');
        
        // Validate response structure
        if (!data || !data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error('Invalid Gemini API response structure:', data);
          throw new Error('Structure de réponse Gemini invalide');
        }
        
        // Handle content extraction safely
        let botContent;
        try {
          botContent = data.candidates[0].content.parts[0].text;
        } catch (e) {
          console.error('Error extracting content from Gemini response:', e);
          throw new Error('Impossible d\'extraire le contenu de la réponse Gemini');
        }
        
        // Safeguard against empty responses
        if (!botContent || botContent.trim() === '') {
          console.warn('Empty response from Gemini API');
          botContent = 'Désolé, je n\'ai pas pu générer une réponse. Pourriez-vous reformuler votre question?';
        }
        
        const botResponse = { 
          id: Date.now() + 1, 
          type: 'bot', 
          content: botContent.trim()
        };
        
        setMessages((prev) => [...prev, botResponse]);
        
        // Save conversation if logging is enabled
        if (enableLogging) {
          saveConversation([...currentMessages, botResponse]);
        }
      } catch (fetchError) {
        // Clear the timeout in case of error
        clearTimeout(timeoutId);
        
        // Handle specific error types
        if (fetchError.name === 'AbortError') {
          console.error('Gemini API request timed out:', fetchError);
          throw new Error('Délai d\'attente dépassé pour la réponse Gemini');
        }
        
        // Rethrow any other fetch errors
        console.error('Fetch error with Gemini API:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error with Gemini API:', error);
      
      // Create a user-friendly error message based on the error type
      let errorMessage;
      
      if (error.message.includes('AbortError') || error.message.includes('timed out')) {
        errorMessage = "La requête a pris trop de temps. Veuillez vérifier votre connexion internet et réessayer.";
      } else if (error.name === 'TypeError' || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = "Impossible de se connecter au service Gemini. Veuillez vérifier votre connexion internet.";
      } else if (error.message.includes('429')) {
        errorMessage = "Trop de requêtes envoyées à Gemini. Veuillez réessayer dans quelques instants.";
      } else if (error.message.includes('403')) {
        errorMessage = "Accès au service Gemini refusé. La clé API pourrait être invalide ou expirée.";
      } else if (error.message.includes('401')) {
        errorMessage = "Authentification Gemini échouée. Veuillez vérifier votre clé API.";
      } else if (error.message.includes('500')) {
        errorMessage = "Erreur serveur Gemini. Le service est peut-être temporairement indisponible.";
      } else {
        // If we can't identify the specific error, use a generic message
        errorMessage = "Erreur lors de la communication avec Gemini. Je vais utiliser mes connaissances locales pour vous répondre.";
        if (import.meta?.env?.DEV) console.log("Falling back to mock response due to API error");
        
        // Fall back to mock response
        errorMessage = getMockResponse(userQuestion);
      }
      
      const botResponse = { 
        id: Date.now() + 1, 
        type: 'bot', 
        content: errorMessage
      };
      
      setMessages((prev) => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
  };
  
  const saveConversation = async (conversationMessages) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // If we have an active thread, update it
      if (activeThread) {
        await supabase
          .from('chat_threads')
          .update({
            messages: conversationMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', activeThread);
      } 
      // Otherwise create a new thread
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
            user_id: session.user.id,
            title,
            messages: conversationMessages,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (error) throw error;
        if (data) {
          setActiveThread(data[0].id);
          
          // Update thread history
          setThreadHistory(prev => [data[0], ...prev]);
        }
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };
  
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
      }
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  };
  
  const startNewThread = () => {
    setMessages([{ id: 1, type: 'bot', content: 'Bonjour, je suis AutoCoreBot. Comment puis-je vous aider aujourd\'hui?' }]);
    setActiveThread(null);
    setShowThreads(false);
  };
  
  // Mock response generator
  const getMockResponse = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('bonjour') || lowerQuestion.includes('salut')) {
      return 'Bonjour ! Comment puis-je vous aider concernant la carrosserie automobile aujourd\'hui ?';
    }
    
    if (lowerQuestion.includes('tva') || lowerQuestion.includes('taxe')) {
      return 'Pour la facturation automobile en France, le taux de TVA standard est de 20% pour les pièces et la main d\'œuvre. Certaines pièces peuvent bénéficier du taux réduit de 5.5% si elles concernent les équipements pour personnes handicapées. Assurez-vous d\'appliquer le bon taux sur vos factures.';
    }
    
    if (lowerQuestion.includes('assurance') || lowerQuestion.includes('expert')) {
      return 'En matière d\'assurance automobile, le code des assurances 2025 prévoit que les rapports d\'expertise doivent être fournis au garage dans un délai de 15 jours. Le client a le droit de choisir son réparateur, même si l\'assureur propose un garage agréé. Vous pouvez facturer directement à l\'assurance si vous avez une cession de créance signée par le client.';
    }
    
    if (lowerQuestion.includes('pièce') || lowerQuestion.includes('pièces')) {
      return 'Concernant les pièces détachées, depuis janvier 2023, vous devez proposer des pièces de réemploi (d\'occasion) pour les réparations non couvertes par la garantie. De plus, la législation 2025 impose une traçabilité complète des pièces remplacées, avec obligation de conservation des pièces remplacées pendant 15 jours après la restitution du véhicule au client, sauf mention contraire sur la facture.';
    }
    
    if (lowerQuestion.includes('facture') || lowerQuestion.includes('devis')) {
      return 'Une facture automobile doit obligatoirement mentionner : coordonnées complètes de votre entreprise (SIRET, n°TVA), date de la prestation, description précise des services rendus, détail des pièces utilisées, temps de main d\'œuvre, taux horaire, TVA applicable, conditions de paiement. Depuis 2024, vous devez également préciser la provenance des pièces (neuve, occasion, réparée).';
    }
    
    if (lowerQuestion.includes('devis')) {
      return 'Selon la réglementation 2025, tout devis pour des réparations supérieures à 150€ doit être écrit et détaillé. Le client doit donner son accord explicite avant toute réparation. Le devis est gratuit sauf si une dépose/expertise est nécessaire, auquel cas vous pouvez facturer ce diagnostic. Le devis accepté vaut contrat et les dépassements non autorisés peuvent être contestés.';
    }
    
    if (lowerQuestion.includes('garantie')) {
      return 'Pour les travaux de carrosserie, vous êtes tenu d\'appliquer une garantie légale de conformité de 2 ans sur les pièces neuves et la main d\'œuvre. Pour les pièces d\'occasion (réemploi), la garantie légale est de 12 mois. La garantie couvre les défauts de pose et les pièces défectueuses, mais pas l\'usure normale ni les dommages causés par le client.';
    }
    
    if (lowerQuestion.includes('délai') || lowerQuestion.includes('delai')) {
      return 'Les délais de réparation doivent être indiqués sur le devis et tout dépassement significatif (>25% du temps estimé) doit faire l\'objet d\'une information au client. En cas de sinistre assuré, vous devez informer à la fois le client et l\'assureur de tout retard. Pour les pièces en commande, le délai maximal légal avant annulation possible est de 30 jours.';
    }
    
    // Default response for other questions
    return 'En tant qu\'expert automobile, je peux vous renseigner sur les aspects techniques des réparations, la réglementation en vigueur pour les carrossiers et garages, ainsi que les bonnes pratiques administratives. Pourriez-vous préciser votre question pour que je puisse vous apporter une réponse plus adaptée ?';
  };

  return (
    <>
      {/* Subscription limitation modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        reason={limitInfo?.reason}
        details={limitInfo?.details}
        upgradePriceId={limitInfo?.upgrade}
      />
      
      {/* Chat toggle button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 bg-primary text-white rounded-full p-3 shadow-lg hover:bg-primary/90 transition-all z-40"
        aria-label="Chat with AutoCoreBot"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
      
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 w-full sm:w-96 h-[80vh] sm:h-[500px] bg-card border rounded-lg shadow-xl overflow-hidden z-40 flex flex-col max-w-[calc(100vw-2rem)]"
          >
            {/* Chat header */}
            <div className="p-3 sm:p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
              <div className="flex items-center space-x-2">
                <BotIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <div>
                  <h3 className="font-medium text-sm sm:text-base">AutoCoreBot</h3>
                  <p className="text-xs opacity-90">Assistant IA pour carrossiers</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={minimizeChat}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Minimize"
                >
                  <MinusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
            
            {/* Thread selector (if logging is enabled) */}
            {enableLogging && threadHistory.length > 0 && (
              <div className="border-b">
                <button
                  onClick={() => setShowThreads(!showThreads)}
                  className="w-full px-3 sm:px-4 py-2 text-left flex justify-between items-center hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium text-xs sm:text-sm">
                    {activeThread ? 
                      threadHistory.find(t => t.id === activeThread)?.title || "Conversation actuelle" : 
                      "Nouvelle conversation"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showThreads ? 'rotate-180' : ''}`} />
                </button>
                
                {showThreads && (
                  <div className="max-h-48 overflow-y-auto border-t">
                    <button
                      onClick={startNewThread}
                      className="w-full px-3 sm:px-4 py-2 text-left flex items-center space-x-2 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-medium text-primary">+ Nouvelle conversation</span>
                    </button>
                    
                    {threadHistory.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => loadThread(thread.id)}
                        className={`w-full px-3 sm:px-4 py-2 text-left hover:bg-muted/30 transition-colors ${
                          activeThread === thread.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="text-xs sm:text-sm truncate">{thread.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(thread.updated_at).toLocaleDateString('fr-FR')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'bot' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2 sm:p-3 ${
                      message.type === 'bot'
                        ? 'bg-muted/30 text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === 'bot' && (
                        <BotIcon className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" />
                      )}
                      <div className="text-sm sm:text-base break-words whitespace-pre-line">
                        {message.content}
                      </div>
                      {message.type === 'user' && (
                        <User className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg p-2 sm:p-3 bg-muted/30 text-foreground">
                    <div className="flex items-center space-x-2">
                      <BotIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                      <span className="inline-flex">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat input */}
            <form onSubmit={handleSubmit} className="border-t p-2 sm:p-3 flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className={`px-3 py-2 rounded-lg ${
                  !inputValue.trim() || isTyping
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AutoCoreBot;