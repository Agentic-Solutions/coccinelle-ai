export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Politique de confidentialité</h1>
        <p className="text-sm text-gray-500 mb-12">Dernière mise à jour : mars 2026</p>

        <div className="prose prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Responsable du traitement</h2>
            <p className="text-gray-600 leading-relaxed">
              Le responsable du traitement des données personnelles collectées via coccinelle.ai est :<br /><br />
              <strong>Agentic Solutions SASU</strong><br />
              Siège social : Toulouse, France<br />
              Email : <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Données collectées</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Dans le cadre de l&apos;utilisation de coccinelle.ai, nous collectons les catégories de données suivantes :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Données d&apos;identification</strong> : nom, prénom, adresse email, numéro de téléphone</li>
              <li><strong>Données professionnelles</strong> : nom de l&apos;entreprise, secteur d&apos;activité, numéro SIRET</li>
              <li><strong>Données de connexion</strong> : adresse IP, type de navigateur, pages consultées, horodatages</li>
              <li><strong>Données de communication</strong> : enregistrements d&apos;appels, transcriptions, échanges SMS et WhatsApp traités via l&apos;assistant IA</li>
              <li><strong>Données clients</strong> : informations sur les clients finaux de nos utilisateurs (contacts CRM, historiques de rendez-vous)</li>
              <li><strong>Données de paiement</strong> : informations de facturation (traitées par notre prestataire de paiement sécurisé)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Finalités du traitement</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Vos données sont traitées pour les finalités suivantes, sur la base légale indiquée :
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-900">Finalité</th>
                    <th className="text-left p-3 font-semibold text-gray-900">Base légale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="p-3">Fourniture du service et gestion de votre compte</td><td className="p-3">Exécution du contrat (Art. 6.1.b RGPD)</td></tr>
                  <tr><td className="p-3">Traitement des appels et messages via l&apos;assistant IA</td><td className="p-3">Exécution du contrat (Art. 6.1.b RGPD)</td></tr>
                  <tr><td className="p-3">Facturation et gestion des paiements</td><td className="p-3">Obligation légale (Art. 6.1.c RGPD)</td></tr>
                  <tr><td className="p-3">Amélioration du produit et analyses statistiques</td><td className="p-3">Intérêt légitime (Art. 6.1.f RGPD)</td></tr>
                  <tr><td className="p-3">Communication marketing et nouveautés</td><td className="p-3">Consentement (Art. 6.1.a RGPD)</td></tr>
                  <tr><td className="p-3">Prévention des fraudes et sécurité</td><td className="p-3">Intérêt légitime (Art. 6.1.f RGPD)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Hébergement et transferts de données</h2>
            <p className="text-gray-600 leading-relaxed">
              Toutes les données sont hébergées au sein de l&apos;Union européenne. Notre infrastructure principale repose
              sur <strong>Cloudflare</strong> (centres de données en Europe) et <strong>Supabase</strong> (région EU-West).
              Aucun transfert de données vers des pays tiers sans garanties appropriées n&apos;est effectué.
            </p>
            <p className="text-gray-600 leading-relaxed mt-4">
              Les modèles de langage (IA) utilisés pour le traitement vocal sont fournis par des prestataires tiers.
              Lorsque des données vocales transitent via ces modèles, nous veillons à ce que les contrats de traitement
              de données (DPA) soient en place et conformes au RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Durées de conservation</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Données de compte</strong> : conservées pendant toute la durée du contrat, puis 3 ans après résiliation</li>
              <li><strong>Enregistrements d&apos;appels et transcriptions</strong> : 12 mois, sauf demande de suppression anticipée</li>
              <li><strong>Données de facturation</strong> : 10 ans (obligation comptable légale)</li>
              <li><strong>Logs de connexion</strong> : 12 mois</li>
              <li><strong>Données marketing</strong> : jusqu&apos;à retrait du consentement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Vos droits</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer à certains traitements</li>
              <li><strong>Droit à la limitation</strong> : limiter le traitement de vos données</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a>.
              Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> (www.cnil.fr).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Coccinelle.ai utilise des cookies techniques nécessaires au fonctionnement du service (session, authentification)
              et des cookies analytiques pour améliorer l&apos;expérience utilisateur. Vous pouvez gérer vos préférences
              de cookies via le bandeau de consentement affiché lors de votre première visite.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Sécurité</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
              chiffrement SSL/TLS en transit, chiffrement au repos, accès restreint aux données par le personnel,
              audits de sécurité réguliers et journalisation des accès.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Modifications</h2>
            <p className="text-gray-600 leading-relaxed">
              Nous nous réservons le droit de modifier cette politique à tout moment. En cas de modification substantielle,
              vous serez informé par email ou via une notification dans l&apos;application au moins 30 jours avant l&apos;entrée
              en vigueur des nouvelles dispositions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Pour toute question relative à cette politique ou au traitement de vos données personnelles :<br /><br />
              <strong>Agentic Solutions SASU</strong><br />
              Email : <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
