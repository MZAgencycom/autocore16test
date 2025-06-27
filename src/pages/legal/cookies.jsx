import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Cookie } from 'lucide-react';

const CookiesPage = () => {
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
            <Cookie className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Politique de Cookies</h1>
        </div>
        <p className="text-muted-foreground">Dernière mise à jour : 27 Mai 2025</p>
      </div>

      {/* Contenu */}
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Qu'est-ce qu'un cookie ?</h2>
          <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette ou smartphone) lors de votre visite sur un site web. Il permet au site de mémoriser vos actions et préférences (comme votre identifiant de connexion, la langue que vous utilisez, vos préférences d'affichage, etc.) pendant une période déterminée, afin que vous n'ayez pas à ressaisir ces informations à chaque fois que vous consultez le site ou naviguez d'une page à l'autre.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Comment utilisons-nous les cookies ?</h2>
          <p>AutoCore AI utilise différents types de cookies pour les finalités suivantes :</p>
          
          <h3 className="text-xl font-medium my-3">2.1 Cookies essentiels</h3>
          <p>Ces cookies sont nécessaires au fonctionnement de notre plateforme. Ils vous permettent d'utiliser ses fonctionnalités principales, comme l'accès à votre espace personnel ou la mémorisation de vos préférences de connexion. Vous ne pouvez pas les refuser car la plateforme ne pourrait pas fonctionner correctement sans eux.</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>sb_auth</strong> - Gestion de l'authentification et de la session utilisateur - Durée : 1 an</li>
            <li><strong>sb_session</strong> - Maintien de votre session - Durée : 2 heures</li>
            <li><strong>csrf_token</strong> - Protection contre les attaques CSRF - Durée : session</li>
          </ul>
          
          <h3 className="text-xl font-medium my-3">2.2 Cookies de préférences</h3>
          <p>Ces cookies permettent de mémoriser vos choix et préférences d'affichage afin de personnaliser votre expérience sur notre plateforme.</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>ac_theme</strong> - Enregistre votre préférence de thème (clair/sombre) - Durée : 6 mois</li>
            <li><strong>ac_language</strong> - Enregistre votre préférence de langue - Durée : 6 mois</li>
            <li><strong>ac_ui_settings</strong> - Enregistre vos préférences d'interface utilisateur - Durée : 6 mois</li>
          </ul>
          
          <h3 className="text-xl font-medium my-3">2.3 Cookies analytiques</h3>
          <p>Ces cookies nous permettent de comprendre comment les utilisateurs interagissent avec notre plateforme, de mesurer l'audience et d'analyser les performances de nos différentes fonctionnalités. Les informations recueillies sont utilisées pour améliorer le fonctionnement de la plateforme.</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>ac_analytics</strong> - Mesure d'audience et analyse de l'utilisation de la plateforme - Durée : 13 mois</li>
            <li><strong>ac_perf</strong> - Analyse des performances - Durée : 13 mois</li>
          </ul>
          
          <h3 className="text-xl font-medium my-3">2.4 Cookies fonctionnels</h3>
          <p>Ces cookies permettent d'activer certaines fonctionnalités spécifiques de la plateforme, comme le partage de contenu sur les réseaux sociaux ou l'intégration de vidéos.</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>ac_chat</strong> - Fonctionnement de l'assistant virtuel - Durée : session</li>
            <li><strong>ac_dashboard</strong> - Personnalisation de votre tableau de bord - Durée : 3 mois</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Comment gérer les cookies ?</h2>
          <p>Vous pouvez gérer vos préférences en matière de cookies à tout moment :</p>
          
          <h3 className="text-xl font-medium my-3">3.1 Via notre bannière de cookies</h3>
          <p>Lors de votre première visite sur notre plateforme, une bannière vous informe de l'utilisation de cookies et vous permet de personnaliser vos choix. Vous pouvez à tout moment modifier ces préférences en cliquant sur le lien "Gérer les cookies" présent en bas de chaque page.</p>
          
          <h3 className="text-xl font-medium my-3">3.2 Via les paramètres de votre navigateur</h3>
          <p>Vous pouvez également configurer votre navigateur pour qu'il accepte ou refuse les cookies. Chaque navigateur propose des options différentes :</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Google Chrome</strong> : Menu → Paramètres → Confidentialité et sécurité → Cookies et autres données de site</li>
            <li><strong>Mozilla Firefox</strong> : Menu → Options → Vie privée et sécurité → Cookies et données de sites</li>
            <li><strong>Safari</strong> : Préférences → Confidentialité → Cookies et données de sites web</li>
            <li><strong>Microsoft Edge</strong> : Menu → Paramètres → Confidentialité, recherche et services → Cookies</li>
          </ul>
          <p>Veuillez noter que la désactivation de certains cookies peut réduire les fonctionnalités disponibles sur notre plateforme ou en dégrader l'expérience utilisateur.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Cookies tiers</h2>
          <p>Certaines fonctionnalités de notre plateforme peuvent faire appel à des services fournis par des tiers, qui peuvent également déposer des cookies sur votre terminal. Il s'agit notamment de :</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Stripe</strong> - Traitement des paiements sécurisés</li>
            <li><strong>Google Analytics</strong> - Analyse d'audience</li>
            <li><strong>Intercom</strong> - Service de messagerie et support client</li>
          </ul>
          <p>Ces cookies tiers sont soumis aux politiques de confidentialité propres à ces services. Nous vous invitons à consulter leurs politiques de confidentialité respectives pour plus d'informations.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Durée de conservation des cookies</h2>
          <p>La durée de conservation des cookies varie selon leur type et leur finalité, comme indiqué dans la section 2. Cette durée n'excède pas 13 mois conformément aux recommandations de la CNIL.</p>
          <p>À l'issue de cette période, votre consentement sera à nouveau sollicité si nécessaire.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Mise à jour de la politique de cookies</h2>
          <p>AutoCore AI se réserve le droit de modifier la présente politique de cookies à tout moment, notamment pour l'adapter aux évolutions législatives et réglementaires, ou pour prendre en compte de nouveaux cookies utilisés sur la plateforme.</p>
          <p>Toute modification sera portée à votre connaissance par tout moyen approprié, notamment par la publication d'une notification sur notre plateforme.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Consentement</h2>
          <p>En continuant à naviguer sur notre plateforme après avoir lu l'information présentée dans la bannière de cookies, vous consentez à l'utilisation des cookies comme décrit dans la présente politique, à l'exception des cookies pour lesquels un consentement spécifique est requis et que vous auriez refusés.</p>
          <p>Vous pouvez retirer votre consentement à tout moment en modifiant vos préférences comme indiqué dans la section 3.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
          <p>Pour toute question relative à l'utilisation des cookies sur notre plateforme, vous pouvez nous contacter :</p>
          <address className="not-italic">
            Par email : privacy@autocore-ai.com<br />
            Par courrier :<br />
            AutoCore AI<br />
            Service Confidentialité<br />
            130 Avenue du Prado<br />
            13008 Marseille, France
          </address>
        </section>
      </div>
    </div>
  );
};

export default CookiesPage;