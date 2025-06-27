import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="container py-12 max-w-4xl">
      {/* En-tête */}
      <div className="mb-8">
        <Link to="/" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Retour à l'accueil
        </Link>
        <div className="flex items-center mb-4">
          <div className="p-2 rounded-full bg-primary/10 text-primary mr-3">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Conditions Générales d'Utilisation</h1>
        </div>
        <p className="text-muted-foreground">Dernière mise à jour : 27 Mai 2025</p>
      </div>

      {/* Contenu */}
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>Les présentes Conditions Générales d'Utilisation (ci-après dénommées "CGU") régissent l'utilisation de la plateforme AutoCore AI (ci-après dénommée "la Plateforme") exploitée par la société AutoCore AI, Société par Actions Simplifiée (SAS), immatriculée au Registre du Commerce et des Sociétés de Marseille sous le numéro 518 377 072, dont le siège social est situé au 180 Avenue du Prado, 13008 Marseille, France.</p>
          <p>En accédant à la Plateforme et en l'utilisant, vous reconnaissez avoir pris connaissance des présentes CGU et vous vous engagez à les respecter sans réserve.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description des Services</h2>
          <p>AutoCore AI propose une plateforme SaaS (Software as a Service) destinée aux professionnels de l'automobile, en particulier les carrossiers et garages automobiles. Les services proposés comprennent notamment :</p>
          <ul className="list-disc pl-6 mb-4">
            <li>L'analyse automatisée de rapports d'expertise automobile grâce à l'intelligence artificielle</li>
            <li>La génération automatique de factures à partir des rapports analysés</li>
            <li>La gestion de la relation client (CRM) adaptée aux professionnels de l'automobile</li>
            <li>Un système de communication avec les clients intégré à la plateforme</li>
            <li>Un assistant virtuel intelligent spécialisé dans le domaine de la carrosserie automobile</li>
          </ul>
          <p>AutoCore AI se réserve le droit de faire évoluer, de modifier ou de supprimer tout ou partie des services proposés, sans préavis et sans justification.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Accès à la Plateforme</h2>
          <h3 className="text-xl font-medium my-3">3.1 Conditions d'accès</h3>
          <p>L'accès à la Plateforme est réservé aux professionnels de l'automobile. L'utilisateur doit être une personne physique majeure ou une personne morale dûment représentée, disposant de la capacité juridique pour contracter.</p>
          
          <h3 className="text-xl font-medium my-3">3.2 Création de compte</h3>
          <p>Pour accéder aux services, l'utilisateur doit créer un compte en fournissant des informations exactes et à jour. L'utilisateur est seul responsable de la préservation de la confidentialité de ses identifiants de connexion et s'engage à ne pas les partager avec des tiers.</p>
          
          <h3 className="text-xl font-medium my-3">3.3 Période d'essai</h3>
          <p>AutoCore AI propose une période d'essai gratuit de 14 jours, sans engagement. À l'issue de cette période, l'utilisateur devra souscrire à un abonnement payant pour continuer à utiliser les services.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Abonnements et Paiements</h2>
          <h3 className="text-xl font-medium my-3">4.1 Formules d'abonnement</h3>
          <p>AutoCore AI propose différentes formules d'abonnement dont les caractéristiques et les tarifs sont détaillés sur la page Tarification de la Plateforme. Les prix indiqués sont hors taxes et en euros.</p>
          
          <h3 className="text-xl font-medium my-3">4.2 Modalités de paiement</h3>
          <p>Les paiements sont effectués par prélèvement automatique sur carte bancaire. L'utilisateur s'engage à maintenir ses informations de paiement à jour.</p>
          
          <h3 className="text-xl font-medium my-3">4.3 Renouvellement et résiliation</h3>
          <p>Les abonnements sont renouvelés automatiquement à l'échéance, sauf résiliation par l'utilisateur au moins 48 heures avant la date de renouvellement. La résiliation peut être effectuée directement depuis l'espace client ou par email à support@autocore-ai.com.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Propriété intellectuelle</h2>
          <p>L'ensemble des éléments composant la Plateforme (textes, images, logos, codes, bases de données, etc.) est protégé par le droit de la propriété intellectuelle et demeure la propriété exclusive d'AutoCore AI ou de ses partenaires.</p>
          <p>L'utilisateur s'engage à ne pas reproduire, copier, vendre, échanger, ou exploiter à des fins commerciales tout ou partie de la Plateforme sans autorisation préalable écrite d'AutoCore AI.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Données utilisateur</h2>
          <h3 className="text-xl font-medium my-3">6.1 Propriété des données</h3>
          <p>Les données importées, générées ou stockées par l'utilisateur sur la Plateforme demeurent sa propriété exclusive. AutoCore AI s'engage à ne pas utiliser ces données à des fins autres que la fourniture des services et l'amélioration de la Plateforme.</p>
          
          <h3 className="text-xl font-medium my-3">6.2 Confidentialité des données</h3>
          <p>AutoCore AI met en œuvre des mesures techniques et organisationnelles appropriées pour assurer la sécurité et la confidentialité des données utilisateur, conformément à sa Politique de Confidentialité et aux dispositions du Règlement Général sur la Protection des Données (RGPD).</p>
          
          <h3 className="text-xl font-medium my-3">6.3 Sauvegarde des données</h3>
          <p>Il est recommandé à l'utilisateur d'effectuer régulièrement des sauvegardes de ses données. AutoCore AI ne saurait être tenue responsable de la perte de données en cas de défaillance technique.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Limitation de responsabilité</h2>
          <p>AutoCore AI s'efforce d'assurer la disponibilité et le bon fonctionnement de la Plateforme, mais ne peut garantir une disponibilité continue et sans erreur. La responsabilité d'AutoCore AI ne saurait être engagée en cas d'interruption temporaire des services pour des raisons de maintenance ou en cas de force majeure.</p>
          <p>Les résultats fournis par les outils d'analyse et d'intelligence artificielle sont donnés à titre indicatif et doivent être vérifiés par l'utilisateur. AutoCore AI ne saurait être tenue responsable des conséquences directes ou indirectes résultant de l'utilisation de ces résultats.</p>
          <p>La responsabilité d'AutoCore AI est expressément limitée au montant de l'abonnement payé par l'utilisateur pour le mois en cours.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Modification des CGU</h2>
          <p>AutoCore AI se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par email et/ou par notification sur la Plateforme. Les modifications prendront effet dès leur publication.</p>
          <p>En cas de désaccord avec les nouvelles CGU, l'utilisateur est invité à cesser toute utilisation de la Plateforme et à résilier son abonnement.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Loi applicable et juridiction compétente</h2>
          <p>Les présentes CGU sont soumises au droit français. Tout litige relatif à l'interprétation, l'exécution ou la résiliation des présentes sera soumis à la compétence exclusive du Tribunal de Commerce de Marseille, sauf disposition légale contraire.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
          <p>Pour toute question relative aux présentes CGU, vous pouvez contacter AutoCore AI à l'adresse suivante :</p>
          <address className="not-italic">
            AutoCore AI<br />
            130 Avenue du Prado<br />
            13008 Marseille, France<br />
            Email : legal@autocore-ai.com
          </address>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;