import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Lock } from 'lucide-react';

const PrivacyPage = () => {
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
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Politique de Confidentialité</h1>
        </div>
        <p className="text-muted-foreground">Dernière mise à jour : 27 Mai 2025</p>
      </div>

      {/* Contenu */}
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>La présente Politique de Confidentialité a pour objet d'informer les utilisateurs de la plateforme AutoCore AI (ci-après "la Plateforme") sur la manière dont AutoCore AI, Société par Actions Simplifiée (SAS), immatriculée au Registre du Commerce et des Sociétés de Marseille sous le numéro 518 377 072, dont le siège social est situé au 180 Avenue du Prado, 13008 Marseille, France, collecte, utilise et protège les données à caractère personnel.</p>
          <p>AutoCore AI accorde une importance particulière à la protection de vos données personnelles et s'engage à respecter les dispositions du Règlement Général sur la Protection des Données (RGPD) et de la loi Informatique et Libertés, dans leur version en vigueur en 2025.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Données collectées</h2>
          <p>Dans le cadre de l'utilisation de la Plateforme, nous sommes amenés à collecter les catégories de données suivantes :</p>
          
          <h3 className="text-xl font-medium my-3">2.1 Données d'identification</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Nom, prénom</li>
            <li>Adresse email professionnelle</li>
            <li>Numéro de téléphone professionnel</li>
            <li>Nom de l'entreprise</li>
            <li>Fonction au sein de l'entreprise</li>
          </ul>
          
          <h3 className="text-xl font-medium my-3">2.2 Données de facturation</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Adresse professionnelle</li>
            <li>Informations de paiement (traitées et stockées par notre prestataire de paiement sécurisé)</li>
            <li>Numéro SIRET</li>
            <li>Numéro de TVA intracommunautaire</li>
          </ul>
          
          <h3 className="text-xl font-medium my-3">2.3 Données d'utilisation</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Adresse IP</li>
            <li>Données de connexion et de navigation</li>
            <li>Historique des actions effectuées sur la Plateforme</li>
          </ul>
          
          <h3 className="text-xl font-medium my-3">2.4 Données importées et générées</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Rapports d'expertise automobile importés</li>
            <li>Données clients (nom, coordonnées, véhicules)</li>
            <li>Factures et devis générés</li>
            <li>Communications avec les clients</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Finalités du traitement</h2>
          <p>Les données collectées sont traitées pour les finalités suivantes :</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Fourniture et gestion des services de la Plateforme</li>
            <li>Analyse des rapports d'expertise et génération de factures</li>
            <li>Gestion de votre compte et de votre abonnement</li>
            <li>Communication avec vous concernant nos services</li>
            <li>Assistance technique et support client</li>
            <li>Amélioration de nos services et de notre Plateforme</li>
            <li>Établissement de statistiques d'utilisation anonymisées</li>
            <li>Respect de nos obligations légales et réglementaires</li>
            <li>Prévention et détection des fraudes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Base légale du traitement</h2>
          <p>Selon les cas, le traitement de vos données repose sur l'une des bases légales suivantes :</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Exécution d'un contrat</strong> : traitement nécessaire à l'exécution du contrat d'utilisation de la Plateforme</li>
            <li><strong>Consentement</strong> : lorsque vous avez expressément consenti au traitement de vos données</li>
            <li><strong>Intérêt légitime</strong> : notamment pour améliorer nos services et assurer la sécurité de la Plateforme</li>
            <li><strong>Obligation légale</strong> : lorsque le traitement est nécessaire au respect d'une obligation légale</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Durée de conservation</h2>
          <p>Les données sont conservées pour les durées suivantes :</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Données de compte et d'utilisation : pendant la durée de votre relation contractuelle avec AutoCore AI, puis archivées selon les délais de prescription légale (généralement 5 ans)</li>
            <li>Données de facturation : 10 ans conformément aux obligations comptables et fiscales</li>
            <li>Données importées et générées : pendant toute la durée de votre abonnement, puis 3 mois après la fin de votre abonnement pour vous permettre de les récupérer</li>
            <li>Cookies et données de navigation : 13 mois maximum</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Destinataires des données</h2>
          <p>Vos données peuvent être transmises aux catégories de destinataires suivantes :</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Les équipes internes d'AutoCore AI (support, développement, administration)</li>
            <li>Nos sous-traitants techniques et prestataires de service (hébergement, maintenance, paiement)</li>
            <li>Les autorités administratives ou judiciaires lorsque la loi l'exige</li>
          </ul>
          <p>AutoCore AI ne vend pas vos données personnelles à des tiers et ne les partage qu'avec des partenaires de confiance respectant les mêmes exigences de sécurité et de confidentialité.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Transfert de données hors Union Européenne</h2>
          <p>Les données sont principalement hébergées et traitées au sein de l'Union Européenne. Dans le cas exceptionnel où certaines données seraient transférées vers des pays situés en dehors de l'Union Européenne, nous nous assurons que ces transferts sont encadrés par des garanties appropriées conformément au RGPD (clauses contractuelles types, décisions d'adéquation, etc.).</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Sécurité des données</h2>
          <p>AutoCore AI met en œuvre des mesures techniques et organisationnelles appropriées pour assurer la sécurité de vos données, notamment :</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Chiffrement des données sensibles</li>
            <li>Authentification à deux facteurs</li>
            <li>Contrôle d'accès stricte aux données</li>
            <li>Surveillance continue des systèmes</li>
            <li>Audits réguliers de sécurité</li>
            <li>Formation de notre personnel aux bonnes pratiques de sécurité</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Vos droits</h2>
          <p>Conformément à la réglementation applicable, vous disposez des droits suivants concernant vos données personnelles :</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Droit d'accès</strong> : obtenir la confirmation que des données vous concernant sont traitées et en obtenir une copie</li>
            <li><strong>Droit de rectification</strong> : faire corriger des données inexactes ou les compléter</li>
            <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données dans les cas prévus par la loi</li>
            <li><strong>Droit à la limitation du traitement</strong> : demander la suspension temporaire du traitement de certaines de vos données</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré pour les transmettre à un autre responsable de traitement</li>
            <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données pour des raisons tenant à votre situation particulière</li>
            <li><strong>Droit de retirer votre consentement</strong> à tout moment lorsque le traitement est fondé sur votre consentement</li>
            <li><strong>Droit de définir des directives</strong> relatives au sort de vos données après votre décès</li>
          </ul>
          <p>Pour exercer ces droits, vous pouvez nous contacter par email à contact@autocoreai.fr ou par courrier à l'adresse suivante : AutoCore AI - Délégué à la Protection des Données - 130 Avenue du Prado, 13008 Marseille, France.</p>
          <p>Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Cookies et technologies similaires</h2>
          <p>AutoCore AI utilise des cookies et technologies similaires pour améliorer votre expérience utilisateur, analyser l'utilisation de la Plateforme et personnaliser nos services. Pour plus d'informations sur l'utilisation des cookies et les moyens de les contrôler, veuillez consulter notre <Link to="/legal/cookies" className="text-primary hover:underline">Politique de Cookies</Link>.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Modifications de la politique de confidentialité</h2>
          <p>AutoCore AI se réserve le droit de modifier la présente politique de confidentialité à tout moment. Les utilisateurs seront informés des modifications par email et/ou par notification sur la Plateforme. Les modifications prendront effet dès leur publication.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
          <p>Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données :</p>
          <address className="not-italic">
            Délégué à la Protection des Données<br />
            AutoCore AI<br />
            130 Avenue du Prado<br />
            13008 Marseille, France<br />
            Email : contact@autocoreai.fr
          </address>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;