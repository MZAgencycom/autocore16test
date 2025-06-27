// Stripe product configuration
export const stripeProducts = [
  {
    name: "AutoCoreAI Starter",
    id: "prod_SLedDP0ZCqdKZF",
    priceId: "price_1RQxKMDhvHX38AogFdD6mseD",
    description: "Pour les petites structures qui débutent",
    mode: "subscription",
    features: [
      "10 rapports d'expertise par mois",
      "Analyse PDF automatique",
      "Génération de factures",
      "1 template de facture",
      "Dashboard basique",
      "Email de support"
    ],
    price: 29,
    currency: "EUR",
    interval: "month"
  },
  {
    name: "AutoCoreAI Pro",
    id: "prod_SLefNeC5SMPaUO",
    priceId: "price_1RQxMWDhvHX38AogRq5vtcHR",
    description: "Pour les garages en pleine croissance",
    mode: "subscription",
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
    price: 79,
    currency: "EUR",
    interval: "month",
    popular: true
  },
  {
    name: "AutoCoreAI Enterprise",
    id: "prod_SLehf8f8tvjQCf",
    priceId: "price_1RQxOCDhvHX38Aoghn4UB3Wu",
    description: "Pour les grandes structures",
    mode: "subscription",
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
    price: 199,
    currency: "EUR",
    interval: "month"
  },
  {
    name: "Pack annuel AutoCoreAI",
    id: "prod_SLen6PhZOfggtn",
    priceId: "price_1RQxU8DhvHX38Aog1cB88SNs",
    description: "Pour garages et carrossiers professionnels",
    mode: "payment",
    features: [
      "Accès à toutes les fonctionnalités Pro pendant 1 an",
      "Rapports d'expertise illimités",
      "Génération de factures illimitée",
      "Tous les templates de facture",
      "Formation personnalisée incluse",
      "Support prioritaire"
    ],
    price: 790,
    currency: "EUR",
    popular: false
  }
];

// Helper function to get a product by ID
export const getProductById = (id) => {
  return stripeProducts.find(product => product.id === id);
};

// Helper function to get a product by price ID
export const getProductByPriceId = (priceId) => {
  return stripeProducts.find(product => product.priceId === priceId);
};

// Format price with currency
export const formatPrice = (price, currency = "EUR") => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(price);
}; 