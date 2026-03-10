import Link from 'next/link';

export const metadata = {
  title: 'Politique de Confidentialite - Coccinelle.ai',
  description: 'Politique de confidentialite et protection des donnees personnelles RGPD de Coccinelle.ai'
};

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-gray-900">coccinelle.ai</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Retour a l&apos;accueil</Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de Confidentialite</h1>
        <p className="text-sm text-gray-500 mb-8">Derniere mise a jour : 10 mars 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Responsable du traitement</h2>
          <p className="text-gray-700 mb-4">
            Le responsable du traitement des donnees personnelles est :
          </p>
          <ul className="list-none pl-0 text-gray-700 mb-4 space-y-1">
            <li><strong>Raison sociale :</strong> Agentic Solutions SASU</li>
            <li><strong>Adresse :</strong> [A COMPLETER]</li>
            <li><strong>Email :</strong> contact@coccinelle.ai</li>
            <li><strong>SIREN :</strong> [A COMPLETER]</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Donnees collectees</h2>
          <p className="text-gray-700 mb-4">
            Dans le cadre de l&apos;utilisation de la Plateforme Coccinelle.ai, nous collectons les categories
            de donnees personnelles suivantes :
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.1 Donnees d&apos;inscription</h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
            <li>Nom et prenom</li>
            <li>Adresse email</li>
            <li>Mot de passe (stocke sous forme hashee)</li>
            <li>Nom de l&apos;entreprise</li>
            <li>Secteur d&apos;activite</li>
            <li>Numero de telephone (optionnel)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.2 Donnees des prospects et clients</h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
            <li>Nom, prenom, email, telephone des prospects/clients importes par l&apos;utilisateur</li>
            <li>Historique des interactions (appels, SMS, emails, WhatsApp)</li>
            <li>Enregistrements et transcriptions d&apos;appels</li>
            <li>Rendez-vous et historique de reservation</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.3 Donnees techniques</h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
            <li>Adresse IP</li>
            <li>Agent utilisateur (navigateur, systeme d&apos;exploitation)</li>
            <li>Journaux de connexion et d&apos;audit</li>
            <li>Donnees de performance et d&apos;utilisation de la Plateforme</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Finalites du traitement</h2>
          <p className="text-gray-700 mb-4">
            Vos donnees personnelles sont traitees pour les finalites suivantes :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li><strong>Fourniture du service :</strong> creation et gestion de votre compte, acces aux fonctionnalites de la Plateforme</li>
            <li><strong>Assistant vocal IA :</strong> traitement des appels, transcription, qualification des demandes</li>
            <li><strong>Communication :</strong> envoi de SMS, emails et messages WhatsApp au nom de l&apos;utilisateur</li>
            <li><strong>Amelioration du service :</strong> analyse de l&apos;utilisation, correction de bugs, amelioration des fonctionnalites</li>
            <li><strong>Securite :</strong> detection de fraude, protection contre les abus, journalisation des acces</li>
            <li><strong>Facturation :</strong> gestion des abonnements et paiements</li>
            <li><strong>Communication commerciale :</strong> informations sur les nouveautes et mises a jour (avec consentement)</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Bases legales</h2>
          <p className="text-gray-700 mb-4">
            Le traitement de vos donnees repose sur les bases legales suivantes :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li><strong>Execution du contrat :</strong> fourniture des services souscrits</li>
            <li><strong>Consentement :</strong> communications commerciales, cookies non essentiels</li>
            <li><strong>Interet legitime :</strong> amelioration du service, securite, prevention de la fraude</li>
            <li><strong>Obligation legale :</strong> conservation des donnees de facturation, respect des obligations fiscales</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Duree de conservation</h2>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li><strong>Donnees de compte :</strong> conservees pendant la duree de l&apos;abonnement + 3 ans apres suppression du compte</li>
            <li><strong>Donnees de prospects/clients :</strong> conservees pendant la duree de l&apos;abonnement, supprimees sous 30 jours apres suppression du compte</li>
            <li><strong>Enregistrements d&apos;appels :</strong> conserves 12 mois maximum</li>
            <li><strong>Journaux de connexion :</strong> conserves 12 mois conformement a la loi</li>
            <li><strong>Donnees de facturation :</strong> conservees 10 ans conformement aux obligations comptables</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Destinataires des donnees</h2>
          <p className="text-gray-700 mb-4">
            Vos donnees personnelles sont accessibles aux personnes et entites suivantes :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li><strong>Equipe Coccinelle.ai :</strong> personnel autorise pour le support et la maintenance</li>
            <li><strong>Sous-traitants techniques :</strong> Cloudflare (hebergement), Twilio (telephonie/SMS), Meta (WhatsApp), Resend (email), Retell/Vapi (IA vocale), Stripe (paiement)</li>
            <li><strong>Autorites competentes :</strong> sur demande legale uniquement</li>
          </ul>
          <p className="text-gray-700 mb-4">
            Nous ne vendons jamais vos donnees personnelles a des tiers.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Transferts hors UE</h2>
          <p className="text-gray-700 mb-4">
            Certains de nos sous-traitants (Twilio, Meta, Retell) peuvent traiter des donnees en dehors de
            l&apos;Union europeenne. Ces transferts sont encadres par des clauses contractuelles types
            approuvees par la Commission europeenne ou par des decisions d&apos;adequation.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Vos droits (RGPD)</h2>
          <p className="text-gray-700 mb-4">
            Conformement au Reglement General sur la Protection des Donnees (RGPD), vous disposez des droits suivants :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li><strong>Droit d&apos;acces :</strong> obtenir une copie de vos donnees personnelles</li>
            <li><strong>Droit de rectification :</strong> corriger des donnees inexactes ou incompletes</li>
            <li><strong>Droit a l&apos;effacement :</strong> demander la suppression de vos donnees (droit a l&apos;oubli)</li>
            <li><strong>Droit a la portabilite :</strong> recevoir vos donnees dans un format structure et lisible</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement de vos donnees</li>
            <li><strong>Droit a la limitation :</strong> demander la limitation du traitement</li>
            <li><strong>Droit de retirer votre consentement :</strong> a tout moment, sans affecter la licéite du traitement antérieur</li>
          </ul>
          <p className="text-gray-700 mb-4">
            Pour exercer ces droits, contactez-nous a : <strong>contact@coccinelle.ai</strong>
          </p>
          <p className="text-gray-700 mb-4">
            La suppression de votre compte et de toutes vos donnees est egalement accessible depuis
            les parametres de votre compte (Parametres &gt; Supprimer mon compte).
          </p>
          <p className="text-gray-700 mb-4">
            Vous disposez egalement du droit d&apos;introduire une reclamation aupres de la CNIL
            (Commission Nationale de l&apos;Informatique et des Libertes) : <a href="https://www.cnil.fr" className="text-gray-900 underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Securite des donnees</h2>
          <p className="text-gray-700 mb-4">
            Nous mettons en oeuvre les mesures techniques et organisationnelles appropriees pour proteger
            vos donnees personnelles :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Chiffrement SSL/TLS pour toutes les communications</li>
            <li>Hashage des mots de passe (bcrypt)</li>
            <li>Isolation des donnees par tenant (multi-tenant securise)</li>
            <li>Journalisation des acces et audit trail</li>
            <li>Limitation des taux de requetes (rate limiting)</li>
            <li>Authentification par JWT avec sessions securisees</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Cookies</h2>
          <p className="text-gray-700 mb-4">
            La Plateforme utilise uniquement des cookies techniques strictement necessaires
            au fonctionnement du service (session, authentification). Aucun cookie publicitaire
            ou de suivi n&apos;est utilise.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Modification de la politique</h2>
          <p className="text-gray-700 mb-4">
            Nous nous reservons le droit de modifier cette politique de confidentialite.
            Toute modification sera communiquee aux utilisateurs par notification sur la Plateforme
            ou par email. La date de mise a jour sera actualisee en haut de cette page.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Contact</h2>
          <p className="text-gray-700 mb-4">
            Pour toute question relative a la protection de vos donnees personnelles :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
            <li>Email : contact@coccinelle.ai</li>
            <li>Courrier : Agentic Solutions SASU, [A COMPLETER - Adresse]</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; 2026 coccinelle.ai - Agentic Solutions SASU</p>
          <div className="flex gap-6">
            <Link href="/cgu" className="hover:text-gray-900">CGU</Link>
            <Link href="/confidentialite" className="hover:text-gray-900 font-medium">Confidentialite</Link>
            <Link href="/mentions-legales" className="hover:text-gray-900">Mentions legales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
