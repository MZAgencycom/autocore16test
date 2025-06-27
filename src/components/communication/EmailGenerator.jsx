import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Send, 
  MessageSquare, 
  AlertCircle, 
  Check, 
  Sparkles,
  Loader,
  Lightbulb,
  RefreshCw,
  Star,
  Copy,
  Trash,
  FileText,
  Clock,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { config } from '../../lib/config';
import { supabase } from '../../lib/supabase';

const EmailGenerator = ({ 
  recipient, 
  vehicle, 
  invoice, 
  scenario = 'invoice',
  onEmailGenerated,
  onClose
}) => {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [enableAI, setEnableAI] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [invoiceData, setInvoiceData] = useState(null);
  
  // Fetch complete invoice data if an invoice ID is provided
  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (invoice && invoice.id) {
        try {
          const { data, error } = await supabase
            .from('invoices')
            .select(`
              *,
              clients(*),
              vehicles(*)
            `)
            .eq('id', invoice.id)
            .single();
            
          if (error) throw error;
          
          if (import.meta?.env?.DEV) console.log("Fetched invoice data:", data);
          setInvoiceData(data);
        } catch (err) {
          console.error("Error fetching invoice details:", err);
        }
      } else if (invoice) {
        // If we already have the full invoice data passed in
        setInvoiceData(invoice);
      }
    };
    
    fetchInvoiceData();
  }, [invoice]);
  
  // Préparer le prompt initial en fonction du scénario
  useEffect(() => {
    const clientName = recipient?.name || '[Nom Client]';
    const vehicleInfo = vehicle?.make && vehicle?.model ? `${vehicle.make} ${vehicle.model}` : '[Modèle Véhicule]';
    const registrationInfo = vehicle?.registration ? ` (${vehicle.registration})` : '';
    
    let templatePrompt = '';
    
    // Get invoice details for better prompts
    const invoiceNumber = invoiceData?.invoice_number || invoice?.invoice_number || '[N° Facture]';
    const invoiceTotal = invoiceData?.total || invoice?.total || 0;
    const formattedTotal = invoiceTotal ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceTotal) : '[Montant]';
    const issueDate = invoiceData?.issue_date ? new Date(invoiceData.issue_date).toLocaleDateString('fr-FR') : '[Date]';
    const dueDate = invoiceData?.due_date ? new Date(invoiceData.due_date).toLocaleDateString('fr-FR') : '[Échéance]';
    
    switch (scenario) {
      case 'invoice':
        templatePrompt = `Écris un email professionnel pour envoyer la facture ${invoiceNumber} d'un montant de ${formattedTotal} à ${clientName} concernant son ${vehicleInfo}${registrationInfo}. Facture émise le ${issueDate} et payable avant le ${dueDate}.`;
        break;
      case 'followup':
        templatePrompt = `Écris un email de suivi pour ${clientName} concernant les réparations en cours sur son ${vehicleInfo}${registrationInfo}. Les travaux avancent comme prévu.`;
        break;
      case 'reminder':
        templatePrompt = `Écris un email de relance courtois pour ${clientName} concernant la facture impayée ${invoiceNumber} d'un montant de ${formattedTotal} pour son ${vehicleInfo}${registrationInfo}.`;
        break;
      case 'delivery':
        templatePrompt = `Écris un email pour informer ${clientName} que son ${vehicleInfo}${registrationInfo} est prêt à être récupéré.`;
        break;
      case 'review':
        templatePrompt = `Écris un email pour demander à ${clientName} son avis sur les réparations effectuées sur son ${vehicleInfo}${registrationInfo}.`;
        break;
      case 'appointment':
        templatePrompt = `Écris un email pour confirmer un rendez-vous avec ${clientName} pour son ${vehicleInfo}${registrationInfo}.`;
        break;
      default:
        templatePrompt = `Écris un email professionnel pour ${clientName} concernant son ${vehicleInfo}${registrationInfo}.`;
    }
    
    setPrompt(templatePrompt);
  }, [scenario, recipient, vehicle, invoice, invoiceData]);
  
  // Générer l'email avec l'IA
  const generateEmail = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      if (!enableAI || !config.geminiApiKey) {
        console.warn("Clé API Gemini non configurée. Utilisation des réponses pré-programmées.");
        await mockGenerateEmail();
        return;
      }

      // Préparer le prompt complet avec toutes les instructions et les données précises de la facture
      const invoiceDetails = invoiceData || invoice || {};
      const invoiceTotal = invoiceDetails.total || 0;
      const formattedTotal = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceTotal);
      const issueDate = invoiceDetails.issue_date ? new Date(invoiceDetails.issue_date).toLocaleDateString('fr-FR') : '';
      const dueDate = invoiceDetails.due_date ? new Date(invoiceDetails.due_date).toLocaleDateString('fr-FR') : '';
      
      const completePrompt = `
      Tu es un spécialiste de la communication client pour une entreprise de carrosserie automobile en France.
      
      CONTEXTE CLIENT:
      - Client: ${recipient?.name || '[Nom Client]'} (${recipient?.email || 'email non disponible'})
      - Véhicule: ${vehicle?.make || ''} ${vehicle?.model || ''}${vehicle?.registration ? ` (${vehicle.registration})` : ''}
      
      DONNÉES FACTURE:
      - Numéro: ${invoiceDetails.invoice_number || ''}
      - Montant: ${formattedTotal}
      - Date d'émission: ${issueDate}
      - Date d'échéance: ${dueDate}
      
      INSTRUCTIONS:
      1. Crée un email ${tone} et ${length}
      2. Réponds exactement à cette demande: ${prompt}
      3. Inclus un objet pertinent et accrocheur
      4. Le contenu doit être bien structuré avec salutation et formule de politesse
      
      FORMAT DE RÉPONSE (JSON uniquement):
      {
        "subject": "Objet de l'email",
        "content": "Corps de l'email complet (avec salutations et signature)"
      }
      `;
      
      // Configuration de la requête API
      const requestBody = {
        contents: [{
          parts: [{
            text: completePrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };
      
      // Vérifier si l'API endpoint et l'API key sont disponibles
      if (!config.geminiEndpoint) {
        throw new Error("L'URL de l'API Gemini n'est pas configurée");
      }
      
      if (!config.geminiApiKey) {
        throw new Error("Clé API Gemini non configurée");
      }
      
      // Appeler l'API Gemini avec gestion d'erreur améliorée
      try {
        const apiUrl = `${config.geminiEndpoint}?key=${config.geminiApiKey}`;
        
        if (import.meta?.env?.DEV) console.log("Envoi de la requête à Gemini API...");
        // Ne pas logger le prompt complet pour des raisons de sécurité
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
        });
        
        if (import.meta?.env?.DEV) console.log(`Statut de la réponse API: ${response.status}`);
        
        if (!response.ok) {
          // Extraire plus d'informations sur l'erreur
          let errorDetail = "";
          try {
            const errorData = await response.json();
            errorDetail = errorData.error?.message || errorData.message || "";
          } catch (e) {
            // Impossible de parser le JSON d'erreur
          }
          
          if (response.status === 400) {
            throw new Error(`Requête invalide: ${errorDetail || "Le format de la requête est incorrect ou le prompt est trop long"}`);
          } else if (response.status === 401 || response.status === 403) {
            throw new Error(`Problème d'authentification: ${errorDetail || "Vérifiez votre clé API Gemini"}`);
          } else if (response.status === 429) {
            throw new Error(`Limite d'API dépassée: ${errorDetail || "Veuillez réessayer plus tard"}`);
          } else {
            throw new Error(`Erreur API (${response.status}): ${errorDetail || "Une erreur s'est produite lors de la communication avec l'API"}`);
          }
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          throw new Error("Format de réponse invalide de l'API");
        }
        
        // Extraire le contenu JSON de la réponse
        const responseText = data.candidates[0].content.parts[0].text;
        
        try {
          // Essayer d'extraire le JSON de la réponse qui pourrait contenir des délimiteurs markdown
          let jsonContent = responseText;
          
          // Vérifier si le texte contient des délimiteurs markdown pour JSON
          const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
          const match = responseText.match(jsonRegex);
          
          if (match && match[1]) {
            jsonContent = match[1];
            if (import.meta?.env?.DEV) console.log("Extracted JSON content from markdown code block");
          }
          
          // Essayer de parser le JSON
          let parsedResponse = null;
          
          try {
            parsedResponse = JSON.parse(jsonContent);
          } catch (parseError) {
            if (import.meta?.env?.DEV) console.log("Failed to parse JSON directly, attempting to extract properties manually", parseError);
            
            // Essayer d'extraire le contenu si ce n'est pas du JSON valide
            const subjectMatch = jsonContent.match(/"subject"\s*:\s*"([^"]*)"/);
            const contentMatch = jsonContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            
            if (subjectMatch && contentMatch) {
              parsedResponse = {
                subject: subjectMatch[1],
                content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
              };
            } else {
              throw new Error("Impossible d'extraire les propriétés subject et content");
            }
          }
          
          // Valider le format
          if (!parsedResponse || !parsedResponse.subject || !parsedResponse.content) {
            throw new Error("La réponse ne contient pas tous les champs requis");
          }
          
          // Ajouter à l'historique
          const historyItem = {
            id: Date.now(),
            subject: parsedResponse.subject,
            content: parsedResponse.content,
            timestamp: new Date(),
            tone,
            length
          };
          
          setGenerationHistory(prev => [historyItem, ...prev]);
          setResult(parsedResponse);
          setRetryCount(0); // Réinitialiser le compteur en cas de succès
          
        } catch (parseError) {
          console.error("Erreur de parsing JSON:", parseError);
          if (import.meta?.env?.DEV) console.log("Réponse brute:", responseText);
          
          // Tentative supplémentaire avec une approche plus flexible
          try {
            // Rechercher des patterns qui ressemblent à un objet JSON
            const jsonObjectPattern = /\{[\s\S]*?\}/g;
            const jsonObjects = responseText.match(jsonObjectPattern);
            
            if (jsonObjects && jsonObjects.length > 0) {
              const potentialJson = jsonObjects[0];
              try {
                const parsedJson = JSON.parse(potentialJson);
                if (parsedJson.subject && parsedJson.content) {
                  const historyItem = {
                    id: Date.now(),
                    subject: parsedJson.subject,
                    content: parsedJson.content,
                    timestamp: new Date(),
                    tone,
                    length
                  };
                  
                  setGenerationHistory(prev => [historyItem, ...prev]);
                  setResult(parsedJson);
                  setRetryCount(0);
                  return;
                }
              } catch (e) {
                if (import.meta?.env?.DEV) console.log("Failed to parse extracted JSON object:", e);
              }
            }
            
            // Si aucune des approches ne fonctionne, utiliser le générateur local
            throw new Error("Impossible de parser la réponse de l'API. Format inattendu.");
          } catch (finalError) {
            console.error("Toutes les tentatives de parsing ont échoué:", finalError);
            throw finalError;
          }
        }
        
      } catch (apiError) {
        console.error("Erreur lors de l'appel API:", apiError);
        
        // Implémenter une logique de retry avec backoff exponentiel
        if (retryCount < 2) { // Maximum 2 tentatives
          setRetryCount(prev => prev + 1);
          const backoffTime = Math.pow(2, retryCount) * 1000; // 1s, puis 2s
          
          if (import.meta?.env?.DEV) console.log(`Nouvelle tentative dans ${backoffTime / 1000} secondes...`);
          setTimeout(() => generateEmail(), backoffTime);
          return;
        }
        
        throw apiError; // Remonter l'erreur après les tentatives
      }
      
    } catch (error) {
      console.error("Erreur lors de la génération:", error);
      
      // Message d'erreur amélioré avec conseils
      let errorMessage = error.message;
      
      // Ajouter des conseils en fonction du type d'erreur
      if (errorMessage.includes("trop long")) {
        errorMessage += ". Essayez de raccourcir vos instructions.";
      } else if (errorMessage.includes("limite")) {
        errorMessage += ". Réessayez plus tard ou vérifiez votre abonnement Gemini API.";
      } else if (errorMessage.includes("authentification") || errorMessage.includes("clé API")) {
        errorMessage += ". Vérifiez la configuration de l'API dans les paramètres.";
      }
      
      setError(errorMessage);
      
      // Fallback en cas d'erreur - utiliser le générateur local
      if (import.meta?.env?.DEV) console.log("Utilisation du générateur d'email de secours...");
      mockGenerateEmail();
    } finally {
      setGenerating(false);
    }
  };
  
  // Fonction simulant la génération d'email pour démonstration ou fallback
  const mockGenerateEmail = () => {
    return new Promise((resolve) => {
      // Simuler un délai de génération
      setTimeout(() => {
        const clientName = recipient?.name?.split(' ')[0] || 'Madame/Monsieur';
        const vehicleInfo = vehicle?.make && vehicle?.model ? `${vehicle.make} ${vehicle.model}` : 'votre véhicule';
        const regInfo = vehicle?.registration ? ` (${vehicle.registration})` : '';
        
        // Utiliser les données réelles de facture si disponibles
        const invoiceDetails = invoiceData || invoice || {};
        const invoiceNumber = invoiceDetails.invoice_number || 'F-2023-042';
        const invoiceTotal = invoiceDetails.total || 0;
        const formattedTotal = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceTotal);
        const issueDate = invoiceDetails.issue_date ? new Date(invoiceDetails.issue_date).toLocaleDateString('fr-FR') : '[date d\'émission]';
        const dueDate = invoiceDetails.due_date ? new Date(invoiceDetails.due_date).toLocaleDateString('fr-FR') : '[date d\'échéance]';
        
        let mockSubject = '';
        let mockContent = '';
        
        switch (scenario) {
          case 'invoice':
            mockSubject = `Facture ${invoiceNumber} - ${vehicleInfo}`;
            mockContent = `Bonjour ${clientName},

Veuillez trouver ci-joint la facture ${invoiceNumber} d'un montant de ${formattedTotal} concernant les réparations effectuées sur ${vehicleInfo}${regInfo}.

La facture a été émise le ${issueDate} et est payable avant le ${dueDate}.

N'hésitez pas à me contacter pour toute question.

Cordialement,
[Votre nom]`;
            break;
          case 'followup':
            mockSubject = `Suivi de réparation - ${vehicleInfo}`;
            mockContent = `Bonjour ${clientName},

Je me permets de vous contacter concernant les réparations en cours sur ${vehicleInfo}${regInfo}.

Les travaux avancent comme prévu et nous estimons que votre véhicule sera prêt le [DATE].

N'hésitez pas à me contacter pour toute question.

Cordialement,
[Votre nom]`;
            break;
          case 'reminder':
            mockSubject = `Rappel : Facture ${invoiceNumber} en attente de règlement`;
            mockContent = `Bonjour ${clientName},

Je me permets de vous rappeler que la facture ${invoiceNumber} d'un montant de ${formattedTotal} concernant les réparations de ${vehicleInfo}${regInfo} est toujours en attente de règlement.

Je vous remercie de bien vouloir procéder au paiement avant le ${dueDate}.

Cordialement,
[Votre nom]`;
            break;
          case 'delivery':
            mockSubject = `Votre véhicule est prêt - ${vehicleInfo}`;
            mockContent = `Bonjour ${clientName},

Nous avons le plaisir de vous informer que ${vehicleInfo}${regInfo} est prêt à être récupéré.

Vous pouvez venir le chercher à notre garage du lundi au vendredi de 8h à 19h et le samedi de 9h à 17h.

Cordialement,
[Votre nom]`;
            break;
          default:
            mockSubject = `Information concernant ${vehicleInfo}`;
            mockContent = `Bonjour ${clientName},

Je me permets de vous contacter au sujet de ${vehicleInfo}${regInfo}.

[Votre message ici]

Cordialement,
[Votre nom]`;
        }
        
        const mockResult = { subject: mockSubject, content: mockContent };
        
        // Ajouter à l'historique
        const historyItem = {
          id: Date.now(),
          subject: mockResult.subject,
          content: mockResult.content,
          timestamp: new Date(),
          tone,
          length
        };
        
        setGenerationHistory(prev => [historyItem, ...prev]);
        setResult(mockResult);
        resolve(mockResult);
        
      }, 1000); // Simuler un délai d'une seconde
    });
  };
  
  // Utiliser une entrée de l'historique
  const useHistoryItem = (item) => {
    setResult({
      subject: item.subject,
      content: item.content
    });
    setSelectedHistoryItem(item.id);
  };
  
  // Copier le résultat
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };
  
  // Utiliser le résultat généré
  const useGeneratedEmail = () => {
    if (result) {
      onEmailGenerated(result);
    }
  };
  
  // Extraire JSON depuis une réponse qui peut contenir des blocs de code markdown
  const extractJsonFromResponse = (text) => {
    // Essayer d'abord de parser directement comme JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      // Si ce n'est pas un JSON valide, essayer d'extraire le JSON d'un bloc de code markdown
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = text.match(jsonRegex);
      
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch (e2) {
          // Si ça échoue aussi, essayer de trouver les propriétés individuelles
          const subjectMatch = text.match(/"subject":\s*"([^"]*)"/);
          const contentMatch = text.match(/"content":\s*"([\s\S]*?)(?:"|$)/);
          
          if (subjectMatch && contentMatch) {
            return {
              subject: subjectMatch[1],
              content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
            };
          }
        }
      }
      
      // Si toutes les tentatives échouent, lever une erreur
      throw new Error("Impossible d'extraire un JSON valide de la réponse");
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-lg overflow-hidden max-h-[85vh] flex flex-col">
      <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-card z-10">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-primary/10 text-primary mr-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Assistant de rédaction</h2>
            <p className="text-sm text-muted-foreground">Générez automatiquement un email professionnel</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 h-full overflow-hidden">
        {/* Panneau de configuration */}
        <div className="lg:col-span-1 p-6 border-r overflow-y-auto max-h-[calc(85vh-4rem)]">
          <div className="space-y-6">
            {/* Informations du destinataire */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-1.5 text-primary" />
                Informations
              </h3>
              
              <div className="space-y-2">
                <div className="p-3 bg-muted/20 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground">Destinataire</div>
                  <div className="font-medium">{recipient?.name || "Non spécifié"}</div>
                  <div className="text-sm text-muted-foreground">{recipient?.email || "Email non spécifié"}</div>
                </div>
                
                <div className="p-3 bg-muted/20 rounded-md">
                  <div className="text-xs font-medium text-muted-foreground">Véhicule</div>
                  <div className="font-medium">{vehicle?.make} {vehicle?.model}</div>
                  {vehicle?.registration && (
                    <div className="text-sm text-muted-foreground">{vehicle.registration}</div>
                  )}
                </div>
                
                {(invoiceData || invoice) && (
                  <div className="p-3 bg-muted/20 rounded-md">
                    <div className="text-xs font-medium text-muted-foreground">Facture</div>
                    <div className="font-medium">{invoiceData?.invoice_number || invoice?.invoice_number}</div>
                    {(invoiceData?.total || invoice?.total) && (
                      <div className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoiceData?.total || invoice?.total)}
                      </div>
                    )}
                    <div className="text-xs flex justify-between mt-1">
                      {invoiceData?.issue_date && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span>Émise: {new Date(invoiceData.issue_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {invoiceData?.due_date && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span>Échéance: {new Date(invoiceData.due_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Type de message */}
            <div>
              <h3 className="text-sm font-medium mb-3">Type de message</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`p-2.5 text-sm text-center rounded-md border ${
                    scenario === 'invoice' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setPrompt(`Écris un email professionnel pour envoyer la facture ${invoiceData?.invoice_number || invoice?.invoice_number || '[N° Facture]'} à ${recipient?.name || '[Nom Client]'} concernant son ${vehicle?.make || ''} ${vehicle?.model || ''}.`)}
                >
                  Facture
                </button>
                <button
                  className={`p-2.5 text-sm text-center rounded-md border ${
                    scenario === 'followup' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setPrompt(`Écris un email de suivi pour ${recipient?.name || '[Nom Client]'} concernant les réparations en cours sur son ${vehicle?.make || ''} ${vehicle?.model || ''}.`)}
                >
                  Suivi
                </button>
                <button
                  className={`p-2.5 text-sm text-center rounded-md border ${
                    scenario === 'reminder' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setPrompt(`Écris un email de relance courtois pour ${recipient?.name || '[Nom Client]'} concernant la facture impayée ${invoiceData?.invoice_number || invoice?.invoice_number || '[N° Facture]'}.`)}
                >
                  Relance
                </button>
                <button
                  className={`p-2.5 text-sm text-center rounded-md border ${
                    scenario === 'delivery' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setPrompt(`Écris un email pour informer ${recipient?.name || '[Nom Client]'} que son ${vehicle?.make || ''} ${vehicle?.model || ''} est prêt à être récupéré.`)}
                >
                  Livraison
                </button>
              </div>
            </div>
            
            {/* Ton du message */}
            <div>
              <h3 className="text-sm font-medium mb-3">Ton du message</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTone('professional')}
                  className={`p-2 text-sm text-center rounded-md border ${
                    tone === 'professional' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  Professionnel
                </button>
                <button
                  onClick={() => setTone('friendly')}
                  className={`p-2 text-sm text-center rounded-md border ${
                    tone === 'friendly' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  Amical
                </button>
                <button
                  onClick={() => setTone('formal')}
                  className={`p-2 text-sm text-center rounded-md border ${
                    tone === 'formal' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  Formel
                </button>
              </div>
            </div>
            
            {/* Longueur du message */}
            <div>
              <h3 className="text-sm font-medium mb-3">Longueur</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setLength('short')}
                  className={`p-2 text-sm text-center rounded-md border ${
                    length === 'short' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  Court
                </button>
                <button
                  onClick={() => setLength('medium')}
                  className={`p-2 text-sm text-center rounded-md border ${
                    length === 'medium' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  Moyen
                </button>
                <button
                  onClick={() => setLength('long')}
                  className={`p-2 text-sm text-center rounded-md border ${
                    length === 'long' ? 'bg-primary/10 border-primary/20 text-primary' : 'hover:bg-muted/50'
                  }`}
                >
                  Long
                </button>
              </div>
            </div>
            
            {/* Prompt personnalisé */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-sm font-medium">Instructions</h3>
                <div className="flex items-center space-x-1">
                  <button 
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                    onClick={() => setPrompt('')}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </button>
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Instructions spécifiques pour l'IA..."
                className="w-full h-32 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Plus vous êtes précis, meilleur sera le résultat.
              </p>
            </div>
            
            {/* Options d'IA */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    checked={enableAI}
                    onChange={(e) => setEnableAI(e.target.checked)}
                    className="rounded"
                  />
                  <span>Utiliser l'IA pour la génération</span>
                </label>
                
                {enableAI && config.geminiApiKey && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1"></span>
                    Connecté
                  </span>
                )}
                
                {enableAI && !config.geminiApiKey && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Hors ligne
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <button
                onClick={generateEmail}
                disabled={generating || !prompt}
                className="w-full btn-primary py-2.5 flex items-center justify-center"
              >
                {generating ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer un email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Panneau de résultat */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive/10 text-destructive p-4 rounded-md mb-4 flex items-start"
              >
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Erreur de génération</p>
                  <p className="text-sm">{error}</p>
                  <button 
                    onClick={generateEmail}
                    className="text-sm underline mt-1"
                  >
                    Réessayer
                  </button>
                </div>
              </motion.div>
            )}
            
            {!result && !generating && !error && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="p-6 rounded-full bg-muted/30 mb-6">
                  <Lightbulb className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold mb-2">Générateur d'emails IA</h3>
                <p className="text-muted-foreground max-w-md">
                  Cliquez sur "Générer un email" pour créer automatiquement un message professionnel selon vos critères.
                </p>
                {generationHistory.length > 0 && (
                  <button
                    onClick={() => useHistoryItem(generationHistory[0])}
                    className="mt-4 text-primary hover:underline flex items-center"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Utiliser la dernière génération
                  </button>
                )}
              </div>
            )}
            
            {generating && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-50"></div>
                  <div className="relative p-6 rounded-full bg-primary/20">
                    <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mt-6 mb-2">Génération en cours...</h3>
                <p className="text-muted-foreground">
                  L'IA rédige votre email professionnel, veuillez patienter.
                </p>
              </div>
            )}
            
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="border rounded-lg shadow-sm"
              >
                <div className="p-4 border-b bg-muted/10 flex justify-between items-center">
                  <h3 className="font-medium">Email généré</h3>
                  
                  {showCopied ? (
                    <span className="text-xs flex items-center text-emerald-600 px-2 py-1 rounded-md bg-emerald-500/10">
                      <Check className="h-3 w-3 mr-1" />
                      Copié !
                    </span>
                  ) : (
                    <button
                      onClick={() => copyToClipboard(result.content)}
                      className="text-xs flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copier le texte
                    </button>
                  )}
                </div>
                
                <div className="p-4 border-b">
                  <h4 className="text-sm font-medium mb-1">Objet</h4>
                  <div className="p-3 bg-muted/20 rounded-md">
                    {result.subject}
                  </div>
                </div>
                
                <div className="p-4">
                  <h4 className="text-sm font-medium mb-1">Message</h4>
                  <div className="p-3 bg-muted/20 rounded-md whitespace-pre-line">
                    {result.content}
                  </div>
                </div>
                
                <div className="p-4 bg-muted/10 border-t flex justify-between items-center">
                  <button
                    onClick={() => generateEmail()}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regénérer
                  </button>
                  
                  <div>
                    <button
                      onClick={() => setResult(null)}
                      className="btn-outline text-sm py-1.5 mr-2"
                    >
                      Annuler
                    </button>
                    
                    <button
                      onClick={useGeneratedEmail}
                      className="btn-primary text-sm py-1.5"
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Utiliser ce message
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Historique des générations */}
          {generationHistory.length > 0 && (
            <div className="border-t p-3 overflow-hidden">
              <div className="flex items-center justify-between px-3 mb-2">
                <h3 className="text-sm font-medium">Historique des générations</h3>
                <button 
                  onClick={() => setGenerationHistory([])}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center"
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Effacer
                </button>
              </div>
              
              <div className="overflow-x-auto whitespace-nowrap pb-1.5">
                <div className="flex space-x-2">
                  {generationHistory.map((item, index) => (
                    <button
                      key={item.id}
                      className={`px-4 py-3 border rounded-lg min-w-[200px] text-left ${
                        selectedHistoryItem === item.id ? 'bg-primary/10 border-primary/20' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => useHistoryItem(item)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                        {item.tone === 'professional' && (
                          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                            Pro
                          </span>
                        )}
                        {item.tone === 'friendly' && (
                          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">
                            Amical
                          </span>
                        )}
                        {item.tone === 'formal' && (
                          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
                            Formel
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm truncate">{item.subject}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {item.content.split('\n')[0]}
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-2xs text-muted-foreground">
                          {index === 0 ? 'Dernier' : `#${generationHistory.length - index}`}
                        </span>
                        <Star className="h-3 w-3 text-muted-foreground hover:text-amber-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailGenerator;