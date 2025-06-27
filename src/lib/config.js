// Configuration centralisée pour l'application
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env;

export const config = {
  // API keys
  openaiApiKey: env.VITE_OPENAI_API_KEY || '',
  geminiApiKey: env.VITE_GEMINI_API_KEY || '',
  
  // Feature flags
  enableOpenAI: true, // Utiliser OpenAI pour l'analyse des rapports
  enableChatbotLogging: true, // Enregistrer les conversations du chatbot
  enableExpenses: env.VITE_ENABLE_EXPENSES === 'true', // Activer le module Dépenses
  
  // Application settings
  defaultLaborRate: 70.00, // Taux horaire par défaut en €/h
  defaultTaxRate: 0.20, // Taux de TVA par défaut (20%)
  // Montant par défaut appliqué aux petites fournitures lorsqu'aucun prix n'est détecté
  defaultSuppliesAmount: 10,
  
  // API endpoints
  openaiEndpoint: "https://api.openai.com/v1/chat/completions",
  geminiEndpoint: env.VITE_GEMINI_ENDPOINT || "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent",
  
  // Templates disponibles pour les factures
  invoiceTemplates: [
    { id: "white", name: "Blanc Pro" },
    { id: "carbon", name: "Carbone" },
    { id: "tech", name: "Tech Bleu" }
  ]
};