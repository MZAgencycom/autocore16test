import { useState } from 'react';
import { HelpCircle, File, Send, FileQuestion, Search, PanelRightOpen, MessageSquare, Plus, Minus, Mail } from 'lucide-react';

const helpCategories = [
  {
    id: 'getting-started',
    title: 'Premiers pas',
    icon: File,
    articles: [
      {
        id: 'gs-1',
        title: 'Bienvenue dans AutoCore AI',
        content: `
## Bienvenue dans AutoCore AI

AutoCore AI est une plateforme conçue pour les professionnels de l'automobile, en particulier les carrossiers et garages, pour automatiser et simplifier la gestion administrative.

### Principales fonctionnalités :

1. **Analyse automatique des rapports d'expertise**
   - Détection automatique des informations client et véhicule
   - Extraction des pièces à remplacer et des heures de main d'œuvre
   
2. **Génération de factures professionnelles**
   - Création de factures à partir des rapports d'expertise
   - Calculs automatiques des montants et TVA
   
3. **Gestion de clients (CRM)**
   - Base de données centralisée de vos clients
   - Historique complet des interventions et factures

4. **Communication client**
   - Envoi de factures par email
   - Modèles de communication préconçus

### Pour commencer :

- Configurez votre profil d'entreprise dans **Paramètres**
- Importez votre premier rapport d'expertise
- Créez votre première facture

Si vous avez besoin d'aide, n'hésitez pas à explorer les autres sections d'aide ou à nous contacter à contact@autocoreai.fr.
        `
      },
      {
        id: 'gs-2',
        title: 'Configuration du profil',
        content: `
## Configuration de votre profil entreprise

La configuration correcte de votre profil est essentielle pour générer des documents professionnels.

### Comment configurer votre profil :

1. Cliquez sur "Paramètres" dans le menu de gauche
2. Renseignez les informations de votre entreprise :
   - Nom de l'entreprise
   - SIRET
   - N° TVA (si applicable)
   - Adresse complète
3. Ajoutez votre logo d'entreprise (formats acceptés : PNG, JPG, SVG)
4. Définissez votre taux horaire de main d'œuvre par défaut
5. Enregistrez vos modifications

Ces informations apparaîtront sur toutes vos factures et communications avec vos clients.

### Astuce :

Un profil complet avec logo renforce votre image professionnelle auprès de vos clients et des compagnies d'assurance.
        `
      }
    ]
  },
  {
    id: 'reports',
    title: 'Rapports d\'expertise',
    icon: FileQuestion,
    articles: [
      {
        id: 'reports-1',
        title: 'Importer un rapport d\'expertise',
        content: `
## Comment importer un rapport d'expertise

L'importation de rapports d'expertise est la première étape pour profiter pleinement des fonctionnalités d'AutoCore AI.

### Instructions étape par étape :

1. **Accéder au module Rapports** :
   - Cliquez sur "Rapports" dans le menu de navigation
   - Cliquez sur le bouton "Importer un rapport"

2. **Sélectionner votre fichier** :
   - Glissez-déposez votre fichier PDF ou image dans la zone prévue
   - Ou cliquez sur "Parcourir" pour sélectionner manuellement le fichier
   - Formats acceptés : PDF, JPG, PNG

3. **Analyser le rapport** :
   - Cliquez sur "Analyser le rapport"
   - Notre IA va traiter le document et extraire automatiquement les informations

4. **Vérifier les résultats** :
   - Les informations du client et du véhicule sont détectées automatiquement
   - La liste des pièces à remplacer est identifiée
   - Le temps de main d'œuvre est calculé

5. **Gestion des doublons** :
   - Si un client ou un véhicule similaire est détecté, le système vous proposera de choisir entre utiliser l'existant ou créer un nouveau

6. **Finalisation** :
   - Une fois l'analyse terminée, vous pouvez directement générer une facture ou importer un nouveau rapport

### Astuces pour de meilleurs résultats :

- Utilisez des rapports d'expertise bien numérisés avec un texte lisible
- Assurez-vous que les informations essentielles (client, véhicule, pièces) sont visibles
- Pour les images, choisissez une résolution suffisante pour que le texte soit net

Si vous rencontrez des problèmes lors de l'analyse, n'hésitez pas à contacter notre support à contact@autocoreai.fr.
        `
      },
      {
        id: 'reports-2',
        title: 'Comprendre les données extraites',
        content: `
## Comprendre les données extraites des rapports

AutoCore AI utilise une technologie avancée de reconnaissance de texte et d'IA pour analyser les rapports d'expertise automobile.

### Informations détectées automatiquement :

#### 1. Données client
- **Nom/prénom** : extraits des sections "Client", "Assuré" ou équivalent
- **Coordonnées** : email et téléphone lorsqu'ils sont présents dans le document

#### 2. Informations véhicule
- **Marque et modèle** : identification automatique des marques courantes
- **Immatriculation** : détection des formats français (AB-123-CD)
- **VIN** (Numéro d'identification du véhicule) : séquence alphanumérique de 17 caractères
- **Kilométrage** : extraction du compteur kilométrique

#### 3. Réparations
- **Liste des pièces** : identification des pièces de carrosserie à remplacer
- **Temps de main d'œuvre** : extraction du nombre d'heures nécessaires aux réparations

#### 4. Données financières (quand disponibles)
- **Montants** : prix des pièces, taux horaire, total HT et TTC
- **TVA** : détection du montant ou taux de TVA applicable

### Limites et conseils :

- La qualité de l'extraction dépend de la qualité du document scanné
- Les documents manuscrits ou de mauvaise qualité peuvent nécessiter des corrections manuelles
- Notre système apprend en continu pour améliorer la précision des extractions

Si certaines informations ne sont pas correctement détectées, vous pouvez les compléter manuellement lors de la génération de facture.

Pour toute assistance, contactez-nous à contact@autocoreai.fr.
        `
      }
    ]
  },
  {
    id: 'invoices',
    title: 'Facturation',
    icon: File,
    articles: [
      {
        id: 'invoices-1',
        title: 'Générer une facture',
        content: `
## Comment générer une facture

AutoCore AI vous permet de créer rapidement des factures professionnelles à partir des rapports d'expertise analysés.

### Instructions étape par étape :

1. **Commencer à partir d'un rapport analysé** :
   - Une fois qu'un rapport est analysé, cliquez sur "Générer une facture"
   - Vous pouvez également créer une facture depuis la section Factures
   
2. **Vérifier les informations préremplies** :
   - Client et véhicule (automatiquement importés du rapport)
   - Liste des pièces détectées
   - Temps de main d'œuvre
   - Numéro de facture (généré automatiquement)
   
3. **Compléter les informations manquantes** :
   - Ajouter un prix unitaire pour chaque pièce
   - Ajuster le taux horaire si nécessaire
   - Modifier les quantités si besoin
   
4. **Ajouter des éléments supplémentaires** :
   - Cliquez sur "Ajouter" pour insérer des pièces ou services additionnels
   - Utilisez le champ Notes pour ajouter des conditions de paiement ou autres mentions
   
5. **Vérifier les calculs** :
   - Sous-total HT
   - Montant de TVA (taux sélectionnable)
   - Total TTC
   
6. **Finaliser la facture** :
   - Cliquez sur "Enregistrer" pour sauvegarder la facture
   - "Exporter en PDF" pour télécharger une copie
   - "Envoyer par email" pour transmettre directement au client

### Conseils :

- Vous pouvez modifier le template de la facture dans vos paramètres
- Assurez-vous que votre profil est complet pour que vos coordonnées apparaissent correctement
- Pour une expérience optimale, ajoutez votre logo d'entreprise dans les paramètres

En cas de difficultés, notre équipe de support est disponible à contact@autocoreai.fr.
        `
      },
      {
        id: 'invoices-2',
        title: 'Envoyer une facture aux assurances',
        content: `
## Envoyer une facture aux compagnies d'assurance

Une communication efficace avec les compagnies d'assurance est essentielle pour accélérer vos remboursements.

### Préparation des documents :

1. **Documents nécessaires** :
   - Facture générée au format PDF
   - Rapport d'expertise original (si requis par l'assureur)
   - Photos des dommages (si disponibles)

### Instructions d'envoi :

1. **Depuis une facture existante** :
   - Accédez à la facture concernée dans la liste des factures
   - Cliquez sur "Envoyer par email"
   
2. **Sélection du destinataire** :
   - Choisissez l'assurance comme destinataire
   - Ajoutez les coordonnées si elles ne sont pas déjà enregistrées
   
3. **Utilisation du modèle d'email** :
   - Sélectionnez le template "Envoi à l'assurance"
   - Personnalisez l'objet et le contenu selon vos besoins
   - La facture est automatiquement jointe
   
4. **Ajout de pièces jointes supplémentaires** :
   - Cliquez sur "Ajouter un fichier" pour joindre les documents complémentaires
   - Le rapport d'expertise peut être important pour justifier les réparations

5. **Finalisation et suivi** :
   - Cliquez sur "Envoyer" pour transmettre l'email
   - La facture sera marquée comme "Envoyée" dans votre système
   - Vous pourrez suivre son statut de paiement

### Conseils pour un remboursement plus rapide :

- Respectez scrupuleusement le format demandé par chaque assurance
- Incluez toutes les références demandées (n° de sinistre, n° de dossier)
- Soyez réactif si des documents complémentaires sont demandés
- Suivez régulièrement l'état de vos factures en attente de paiement

AutoCore AI vous permet de garder une trace de toutes les communications envoyées aux assurances, facilitant ainsi le suivi de vos dossiers.

Pour toute question sur la communication avec les assurances, contactez-nous à contact@autocoreai.fr.
        `
      }
    ]
  },
  {
    id: 'clients',
    title: 'Gestion clients',
    icon: MessageSquare,
    articles: [
      {
        id: 'clients-1',
        title: 'Ajouter un client manuellement',
        content: `
## Comment ajouter un client manuellement

Bien que l'importation de rapports crée automatiquement des clients, vous pouvez également les ajouter manuellement.

### Instructions étape par étape :

1. **Accéder au module Clients** :
   - Cliquez sur "Clients" dans le menu de navigation
   - Cliquez sur le bouton "Ajouter un client"

2. **Saisir les informations du client** :
   - Prénom et nom (obligatoires)
   - Email (recommandé pour l'envoi de factures)
   - Numéro de téléphone
   
3. **Ajouter un véhicule** :
   - Marque et modèle (obligatoires)
   - Immatriculation (recommandée pour l'identification)
   - VIN (numéro d'identification du véhicule)
   - Année et kilométrage
   
4. **Ajouter plusieurs véhicules (optionnel)** :
   - Cliquez sur "Ajouter un véhicule" pour enregistrer plusieurs véhicules pour ce client
   
5. **Enregistrer le client** :
   - Cliquez sur "Créer le client" pour finaliser l'enregistrement
   
### Avantages de l'ajout manuel :

- Création anticipée de fiches client avant réception des rapports
- Possibilité d'ajouter des clients sans rapport d'expertise
- Préparation de devis pour de nouveaux clients

### Astuce :

Pensez à bien renseigner les coordonnées email pour faciliter la communication ultérieure avec le client.

Si vous avez besoin d'aide pour l'ajout de clients, contactez notre support à contact@autocoreai.fr.
        `
      },
      {
        id: 'clients-2',
        title: 'Gérer l\'historique des véhicules',
        content: `
## Gestion de l'historique des véhicules

AutoCore AI vous permet de suivre l'historique complet de chaque véhicule pour une meilleure traçabilité.

### Fonctionnalités principales :

1. **Accéder à l'historique d'un véhicule** :
   - Depuis la fiche client, cliquez sur le véhicule concerné
   - Ou utilisez la recherche pour trouver directement un véhicule

2. **Consulter les interventions passées** :
   - Visualiser tous les rapports d'expertise liés à ce véhicule
   - Voir l'historique des factures générées
   - Suivre les communications envoyées

3. **Ajouter des informations manuellement** :
   - Mettre à jour le kilométrage
   - Ajouter des notes sur l'état du véhicule
   - Enregistrer des interventions mineures

4. **Avantages pour votre activité** :
   - Meilleur suivi des clients récurrents
   - Anticipation des besoins d'entretien
   - Mise en évidence des problèmes récurrents

### Utilisation pour améliorer votre service :

- Proposez des contrôles préventifs basés sur l'historique
- Mentionnez les interventions précédentes lors des nouveaux devis
- Justifiez plus facilement vos interventions auprès des assurances

Un historique détaillé des véhicules renforce votre professionnalisme et améliore la relation avec vos clients sur le long terme.

Pour toute assistance concernant la gestion de véhicules, écrivez-nous à contact@autocoreai.fr.
        `
      }
    ]
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    articles: [
      {
        id: 'faq-1',
        title: 'Questions fréquentes',
        content: `
## Questions fréquemment posées

### Général

**Q: Comment fonctionne l'extraction automatique des données ?**  
R: Notre technologie utilise l'intelligence artificielle et la reconnaissance optique de caractères (OCR) pour analyser les rapports d'expertise et en extraire les informations pertinentes comme les coordonnées client, les caractéristiques du véhicule et les réparations à effectuer.

**Q: Puis-je utiliser le logiciel sans connexion internet ?**  
R: Non, AutoCore AI est une application web qui nécessite une connexion internet pour fonctionner, car elle utilise des services cloud pour l'analyse des documents.

**Q: Mes données sont-elles sécurisées ?**  
R: Oui, toutes vos données sont cryptées et stockées de manière sécurisée. Nous respectons le RGPD et n'avons jamais accès à vos informations clients sans votre autorisation explicite.

### Abonnement et facturation

**Q: Comment fonctionne la période d'essai gratuit ?**  
R: L'essai gratuit dure 14 jours et vous donne accès à toutes les fonctionnalités. Aucune carte bancaire n'est requise pour commencer l'essai.

**Q: Puis-je annuler mon abonnement à tout moment ?**  
R: Oui, vous pouvez annuler votre abonnement à tout moment depuis votre espace client, sans frais supplémentaires.

**Q: Existe-t-il des frais cachés ?**  
R: Non, nos tarifs sont transparents et incluent toutes les fonctionnalités. Il n'y a pas de frais d'installation ou de résiliation.

### Technique

**Q: Quels formats de fichiers sont supportés ?**  
R: Nous prenons en charge les formats PDF, JPEG et PNG pour l'importation des rapports d'expertise.

**Q: La reconnaissance fonctionne-t-elle avec tous les rapports d'expertise ?**  
R: Notre système est optimisé pour les formats standards utilisés par les principales compagnies d'assurance en France. La qualité de la reconnaissance dépend de la clarté du document source.

**Q: Comment corriger une information mal détectée ?**  
R: Vous pouvez facilement modifier manuellement toute information incorrecte dans l'interface après l'analyse, avant de générer une facture.

Si vous avez d'autres questions, n'hésitez pas à nous contacter à contact@autocoreai.fr.
        `
      },
      {
        id: 'faq-2',
        title: 'Support technique',
        content: `
## Support technique

Si vous rencontrez des difficultés techniques ou avez des questions qui ne sont pas couvertes dans notre documentation, notre équipe de support est là pour vous aider.

### Comment nous contacter :

1. **Email de support :**  
   contact@autocoreai.fr

2. **Téléphone (heures de bureau) :**  
   01 23 45 67 89  
   Du lundi au vendredi, 9h - 18h

3. **Chat en direct :**  
   Disponible depuis votre espace client (bouton en bas à droite)

### Informations à fournir pour une résolution plus rapide :

- Votre identifiant utilisateur
- Description précise du problème rencontré
- Captures d'écran si applicable
- Étapes pour reproduire le problème

### Délais de réponse :

- **Email :** Réponse sous 24h ouvrées
- **Téléphone :** Réponse immédiate pendant les heures de bureau
- **Chat :** Réponse sous 2h pendant les heures de bureau

### Formation et webinaires :

Nous proposons régulièrement des sessions de formation en ligne pour vous aider à tirer le meilleur parti d'AutoCore AI. Consultez le calendrier dans votre espace client.

### Mises à jour :

Suivez notre blog et nos réseaux sociaux pour être informé des nouvelles fonctionnalités et améliorations de notre service.

Pour toute urgence technique, contactez-nous directement à contact@autocoreai.fr en mentionnant [URGENT] dans l'objet de votre email.
        `
      }
    ]
  }
];

const HelpCenter = () => {
  const [activeCategory, setActiveCategory] = useState(helpCategories[0].id);
  const [activeArticle, setActiveArticle] = useState(helpCategories[0].articles[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState({});
  
  const selectedCategory = helpCategories.find(cat => cat.id === activeCategory);
  const selectedArticle = selectedCategory?.articles.find(article => article.id === activeArticle);
  
  const toggleFaq = (id) => {
    setExpandedFaqs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Filter articles based on search query
  const filteredArticles = searchQuery ? 
    helpCategories.flatMap(cat => 
      cat.articles.filter(article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      ).map(article => ({ ...article, category: cat.id, categoryTitle: cat.title }))
    ) : [];
  
  // Render markdown-like content
  const renderContent = (content) => {
    const parts = content.split(/\n(#+)\s(.+)/).filter(Boolean);
    const formattedContent = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('#')) {
        const level = parts[i].length;
        const title = parts[i+1];
        i++;
        
        // Add heading based on level
        if (level === 1) {
          formattedContent.push(<h2 key={`h-${i}`} className="text-2xl font-bold mb-4 mt-6">{title}</h2>);
        } else if (level === 2) {
          formattedContent.push(<h3 key={`h-${i}`} className="text-xl font-bold mb-3 mt-5">{title}</h3>);
        } else if (level === 3) {
          formattedContent.push(<h4 key={`h-${i}`} className="text-lg font-bold mb-2 mt-4">{title}</h4>);
        } else {
          formattedContent.push(<h5 key={`h-${i}`} className="text-base font-bold mb-2 mt-3">{title}</h5>);
        }
      } else if (parts[i].trim() === '') {
        // Skip empty lines
        continue;
      } else if (parts[i].startsWith('- ')) {
        // Handle list items
        const listItems = parts[i].split('\n- ').filter(Boolean);
        formattedContent.push(
          <ul key={`ul-${i}`} className="list-disc pl-6 mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} className="text-sm">{item.replace(/^- /, '')}</li>
            ))}
          </ul>
        );
      } else if (parts[i].startsWith('1. ')) {
        // Handle numbered list items
        const listItems = parts[i].split(/\n\d+\.\s/).filter(Boolean);
        formattedContent.push(
          <ol key={`ol-${i}`} className="list-decimal pl-6 mb-4 space-y-1">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} className="text-sm">{item.replace(/^\d+\.\s/, '')}</li>
            ))}
          </ol>
        );
      } else {
        // Handle regular paragraphs
        const paragraphs = parts[i].split('\n\n').filter(Boolean);
        paragraphs.forEach((para, idx) => {
          formattedContent.push(<p key={`p-${i}-${idx}`} className="mb-3 text-sm">{para}</p>);
        });
      }
    }
    
    return formattedContent;
  };
  
  return (
    <div className="bg-card rounded-lg border h-full">
      <div className="p-6 border-b">
        <div className="flex items-center mb-4">
          <div className="p-2 rounded bg-primary/10 text-primary mr-3">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h3 className="font-medium text-lg">Centre d'aide</h3>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Rechercher dans l'aide..."
            className="w-full py-2 pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 min-h-[600px]">
        {/* Sidebar */}
        <div className="border-r p-4 col-span-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Show categories if not searching */}
          {!searchQuery && (
            <nav className="space-y-6">
              {helpCategories.map((category) => (
                <div key={category.id}>
                  <button
                    className={`flex items-center text-sm font-medium mb-2 w-full text-left ${
                      activeCategory === category.id ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setActiveArticle(category.articles[0].id);
                    }}
                  >
                    <category.icon className="h-4 w-4 mr-2" />
                    {category.title}
                  </button>
                  
                  {activeCategory === category.id && (
                    <ul className="pl-6 space-y-1">
                      {category.articles.map(article => (
                        <li key={article.id}>
                          <button 
                            className={`text-sm py-1 hover:text-foreground w-full text-left ${
                              activeArticle === article.id 
                                ? 'text-foreground font-medium' 
                                : 'text-muted-foreground'
                            }`}
                            onClick={() => setActiveArticle(article.id)}
                          >
                            {article.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </nav>
          )}
          
          {/* Show search results */}
          {searchQuery && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Résultats de recherche</h4>
              
              {filteredArticles.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Aucun résultat trouvé pour "{searchQuery}"
                </p>
              ) : (
                <ul className="space-y-3">
                  {filteredArticles.map(article => (
                    <li key={article.id} className="border-b pb-2 last:border-0">
                      <button 
                        className="text-sm font-medium hover:text-primary w-full text-left"
                        onClick={() => {
                          setSearchQuery('');
                          setActiveCategory(article.category);
                          setActiveArticle(article.id);
                        }}
                      >
                        {article.title}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {article.categoryTitle}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        
        {/* Article content */}
        <div className="p-6 col-span-1 md:col-span-2 lg:col-span-3 overflow-y-auto max-h-[calc(100vh-200px)]">
          {selectedArticle ? (
            <div>
              <h2 className="text-2xl font-bold mb-6">{selectedArticle.title}</h2>
              
              <div className="prose max-w-none">
                {renderContent(selectedArticle.content)}
              </div>
              
              <div className="mt-8 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Cette réponse a-t-elle été utile ?
                </p>
                <div className="flex space-x-2 mt-2">
                  <button className="btn-outline text-sm py-1 px-3">Oui</button>
                  <button className="btn-outline text-sm py-1 px-3">Non</button>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm font-medium">Besoin de plus d'aide ?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Notre équipe de support est disponible pour répondre à vos questions.
                </p>
                <a 
                  href="mailto:contact@autocoreai.fr" 
                  className="mt-3 btn-primary text-sm inline-flex items-center"
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Contacter le support
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium">Sélectionnez un article</h3>
                <p className="text-muted-foreground">
                  Choisissez un article dans la liste ou effectuez une recherche
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;