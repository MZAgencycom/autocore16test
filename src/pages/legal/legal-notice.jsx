import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Building, Server } from 'lucide-react';

const LegalNoticePage = () => {
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
            <Building className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Mentions Légales</h1>
        </div>
        <p className="text-muted-foreground">Dernière mise à jour : 27 Mai 2025</p>
      </div>

      {/* Contenu */}
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Éditeur du site</h2>
          <p><strong>Raison sociale</strong> : AutoCore AI</p>
          <p><strong>Forme juridique</strong> : Société par Actions Simplifiée (SAS)</p>
          <p><strong>Capital social</strong> : 1000 €</p>
          <p><strong>Siège social</strong> : 180 Avenue du Prado, 13008 Marseille, France</p>
          <p><strong>SIREN</strong> : 518 377 072</p>
          <p><strong>SIRET</strong> : 518 377 072 00013</p>
          <p><strong>N° TVA Intracommunautaire</strong> : FR68518377072</p>
          <p><strong>Directeur de la publication</strong> : Yacine Mazouz, Président</p>
          <p><strong>Email de contact</strong> : contact@autocoreai.fr</p>
          <p><strong>Téléphone</strong> : +33 (0)624534781</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Hébergement</h2>
          <div className="flex items-center mb-4">
            <Server className="h-5 w-5 text-primary mr-2" />
            <p className="text-lg font-medium">Informations sur l'hébergeur</p>
          </div>
          <p><strong>Société</strong> : Supabase, Inc.</p>
          <p><strong>Adresse</strong> : 222 Kearny St Suite 600, San Francisco, CA 94108, United States</p>
          <p>Les données sont hébergées dans des centres de données situés dans l'Union Européenne (Francfort, Allemagne) en conformité avec le RGPD.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Propriété intellectuelle</h2>
          <p>L'ensemble des éléments composant le site AutoCore AI et la plateforme SaaS (textes, images, logos, base de données, programmes, etc.) sont protégés par le droit de la propriété intellectuelle et demeurent la propriété exclusive d'AutoCore AI ou de ses partenaires.</p>
          <p>Toute reproduction, représentation, modification, publication, adaptation totale ou partielle des éléments du site, par quelque procédé que ce soit, sans autorisation préalable écrite d'AutoCore AI, est strictement interdite et constituerait une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.</p>
          <p>Les marques et logos présents sur le site sont des marques déposées par AutoCore AI ou ses partenaires. Toute reproduction, imitation ou utilisation, totale ou partielle, de ces marques sans autorisation préalable écrite d'AutoCore AI est prohibée.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Données personnelles</h2>
          <p>AutoCore AI collecte et traite des données à caractère personnel conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.</p>
          <p>Pour plus d'informations sur le traitement de vos données personnelles, veuillez consulter notre <Link to="/legal/privacy" className="text-primary hover:underline">Politique de Confidentialité</Link>.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Cookies</h2>
          <p>Le site AutoCore AI utilise des cookies pour améliorer l'expérience utilisateur et analyser le trafic. Pour plus d'informations sur l'utilisation des cookies et les moyens de les contrôler, veuillez consulter notre <Link to="/legal/cookies" className="text-primary hover:underline">Politique de Cookies</Link>.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Liens hypertextes</h2>
          <p>Le site AutoCore AI peut contenir des liens hypertextes vers d'autres sites internet. AutoCore AI n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou aux pratiques de protection des données qu'ils mettent en œuvre.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Limitation de responsabilité</h2>
          <p>AutoCore AI s'efforce d'assurer au mieux de ses possibilités l'exactitude et la mise à jour des informations diffusées sur son site, dont elle se réserve le droit de corriger, à tout moment et sans préavis, le contenu.</p>
          <p>AutoCore AI ne peut toutefois garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur son site. En conséquence, AutoCore AI décline toute responsabilité :</p>
          <ul className="list-disc pl-6 mb-4">
            <li>pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur le site ;</li>
            <li>pour tous dommages résultant d'une intrusion informatique d'un tiers ayant entraîné une modification des informations mises à disposition sur le site ;</li>
            <li>et plus généralement, pour tous dommages, directs ou indirects, qu'elles qu'en soient les causes, origines, natures ou conséquences, provoqués à raison de l'accès de quiconque au site ou de l'impossibilité d'y accéder, de même que l'utilisation du site et/ou du crédit accordé à une quelconque information provenant directement ou indirectement de ce dernier.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Droit applicable et juridiction compétente</h2>
          <p>Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux français seront seuls compétents.</p>
          <p>Pour toute question relative aux présentes mentions légales ou toute demande concernant le site, vous pouvez nous contacter à l'adresse suivante : contact@autocoreai.fr.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Médiation</h2>
          <p>Conformément aux dispositions du Code de la consommation concernant le règlement amiable des litiges, AutoCore AI adhère au Service du Médiateur du e-commerce de la FEVAD (Fédération du e-commerce et de la vente à distance).</p>
          <p>Après démarche préalable écrite des consommateurs vis-à-vis d'AutoCore AI, le Service du Médiateur peut être saisi pour tout litige de consommation dont le règlement n'aurait pas abouti.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Accessibilité</h2>
          <p>AutoCore AI s'engage à rendre son site accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005 pour l'égalité des droits et des chances, la participation et la citoyenneté des personnes handicapées.</p>
        </section>
      </div>
    </div>
  );
};

export default LegalNoticePage;