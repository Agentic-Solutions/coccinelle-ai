import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Conditions Generales de Vente - Coccinelle.ai',
  description: 'CGV de la plateforme Coccinelle.ai. Tarifs, facturation, SLA, resiliation, mediation.',
};

const tocItems = [
  { id: 'objet', label: '1. Objet' },
  { id: 'tarifs', label: '2. Offres et tarifs' },
  { id: 'essai', label: '3. Essai gratuit' },
  { id: 'facturation', label: '4. Facturation et paiement' },
  { id: 'renouvellement', label: '5. Renouvellement' },
  { id: 'resiliation', label: '6. Resiliation' },
  { id: 'retractation', label: '7. Droit de retractation' },
  { id: 'portabilite', label: '8. Portabilite des donnees' },
  { id: 'sla', label: '9. Niveaux de service' },
  { id: 'incident', label: '10. Incident de paiement' },
  { id: 'mediation', label: '11. Mediation et litiges' },
  { id: 'contact', label: '12. Contact' },
];

export default function CgvPage() {
  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Conditions Generales de Vente</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            v2.0
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Derniere mise a jour : 25 avril 2026<br />
          Vendeur : Agentic Solutions SASU &mdash; RCS Toulouse 944 504 679
        </p>
      </div>

      {/* TOC */}
      <nav className="mb-12 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-semibold text-gray-900 mb-3">Sommaire</p>
        <ol className="grid sm:grid-cols-2 gap-1 text-sm">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="text-gray-600 hover:text-gray-900 transition-colors">
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12">
        {/* 1. Objet */}
        <section id="objet">
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Objet</h2>
          <p className="text-gray-600 leading-relaxed">
            Les presentes Conditions Generales de Vente (CGV) regissent les relations commerciales
            entre Agentic Solutions SASU (SIREN 944 504 679, RCS Toulouse) et tout client professionnel
            souscrivant a un abonnement Coccinelle.ai.
          </p>
        </section>

        {/* 2. Tarifs */}
        <section id="tarifs">
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Offres et tarifs</h2>

          <h3 className="text-base font-semibold text-gray-900 mt-4 mb-3">Abonnements mensuels</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Formule</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">HT/mois</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">TTC/mois</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Inclus</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-medium">Essentiel</td>
                  <td className="py-2.5 px-4">79,00 euros</td>
                  <td className="py-2.5 px-4">94,80 euros</td>
                  <td className="py-2.5 px-4">500 min vocales, 1 agent, CRM, agenda, SMS</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 px-4 font-medium">Pro</td>
                  <td className="py-2.5 px-4">199,00 euros</td>
                  <td className="py-2.5 px-4">238,80 euros</td>
                  <td className="py-2.5 px-4">1 000 min vocales, 250 SMS, multicanal, analytics</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">Business</td>
                  <td className="py-2.5 px-4" colSpan={3}>Sur devis &mdash; nous consulter a <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">Tarifs de depassement</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Formule</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Minute supplementaire</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">SMS supplementaire</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-medium">Essentiel</td>
                  <td className="py-2.5 px-4">0,08 euros HT</td>
                  <td className="py-2.5 px-4">&mdash;</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">Pro</td>
                  <td className="py-2.5 px-4">0,07 euros HT</td>
                  <td className="py-2.5 px-4">0,10 euros HT</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            TVA francaise a 20%. Tarifs susceptibles d&apos;evoluer avec un preavis de 30 jours.
            Le Client est notifie par email a 80% et 100% de son quota de minutes.
          </p>
        </section>

        {/* 3. Essai */}
        <section id="essai">
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. Essai gratuit</h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
            <p className="text-sm text-green-800">
              <strong>14 jours d&apos;essai gratuit</strong> &mdash; sans carte bancaire requise.
              Inclus : 60 minutes vocales et 20 SMS.
            </p>
          </div>
          <p className="text-gray-600 leading-relaxed">
            L&apos;essai donne acces a l&apos;ensemble des fonctionnalites de la plateforme.
            A l&apos;issue de l&apos;essai, un abonnement payant est necessaire pour continuer a utiliser le service.
            Vos donnees sont conservees 30 jours apres l&apos;expiration de l&apos;essai avant suppression definitive,
            vous laissant le temps de souscrire ou d&apos;exporter vos donnees.
          </p>
        </section>

        {/* 4. Facturation */}
        <section id="facturation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Facturation et paiement</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong className="text-gray-900">Periodicite :</strong> mensuelle ou annuelle selon le choix du Client</li>
            <li><strong className="text-gray-900">Moyen de paiement :</strong> carte bancaire via Stripe (paiement securise, certifie PCI DSS)</li>
            <li><strong className="text-gray-900">Facturation :</strong> factures emises le 1er de chaque mois, disponibles depuis le dashboard</li>
            <li><strong className="text-gray-900">Devise :</strong> euros (EUR)</li>
          </ul>
        </section>

        {/* 5. Renouvellement */}
        <section id="renouvellement">
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Renouvellement</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            L&apos;abonnement est renouvele automatiquement a chaque echeance (mensuelle ou annuelle).
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Notification par email 30 jours avant le renouvellement annuel</li>
            <li>Notification par email 7 jours avant le renouvellement mensuel</li>
            <li>Possibilite d&apos;annuler avant le renouvellement sans frais depuis le dashboard</li>
          </ul>
        </section>

        {/* 6. Résiliation */}
        <section id="resiliation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Resiliation</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            L&apos;abonnement peut etre resilie a tout moment depuis le dashboard, sans frais ni penalites.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>La resiliation prend effet a la fin de la periode en cours (mois ou annee)</li>
            <li>Aucun remboursement au prorata pour les periodes entamees</li>
            <li>Acces au service maintenu jusqu&apos;a la fin de la periode payee</li>
            <li>Export des donnees disponible pendant 30 jours apres la resiliation effective</li>
          </ul>
        </section>

        {/* 7. Rétractation */}
        <section id="retractation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Droit de retractation</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Conformement a l&apos;article L.221-18 du Code de la consommation :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong className="text-gray-900">Professionnels :</strong> ne beneficient pas du droit de retractation
              pour les services SaaS dont l&apos;execution a commence avec leur accord</li>
            <li><strong className="text-gray-900">Particuliers :</strong> disposent de 14 jours de retractation a compter
              de la souscription, sous reserve de ne pas avoir commence a utiliser le service</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            L&apos;essai gratuit de 14 jours sans carte bancaire offre une protection equivalente au droit
            de retractation pour les professionnels.
          </p>
        </section>

        {/* 8. Portabilité */}
        <section id="portabilite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Portabilite des donnees</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
            <p className="text-sm text-blue-800">
              Vos donnees vous appartiennent. Vous pouvez les exporter a tout moment.
            </p>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Export disponible depuis le dashboard en formats standards (CSV, JSON)</li>
            <li>En cas de resiliation : export disponible pendant 30 jours</li>
            <li>Suppression definitive et securisee des donnees 30 jours apres la resiliation</li>
            <li>Certificat de suppression disponible sur demande</li>
          </ul>
        </section>

        {/* 9. SLA */}
        <section id="sla">
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Niveaux de service et support</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Formule</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Support</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Delai de reponse</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-medium">Essentiel</td>
                  <td className="py-2.5 px-4">Email</td>
                  <td className="py-2.5 px-4">48h ouvrees</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 px-4 font-medium">Pro</td>
                  <td className="py-2.5 px-4">Email prioritaire</td>
                  <td className="py-2.5 px-4">24h</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium">Business</td>
                  <td className="py-2.5 px-4">Account manager dedie</td>
                  <td className="py-2.5 px-4">4h ouvrees</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Contact support : <a href="mailto:support@coccinelle.ai" className="text-gray-900 underline">support@coccinelle.ai</a>
          </p>
        </section>

        {/* 10. Incident de paiement */}
        <section id="incident">
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Politique d&apos;incident de paiement</h2>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-4">
            <p className="text-sm text-amber-800">
              En cas de defaut de paiement, la procedure suivante s&apos;applique :
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Delai</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4 font-medium">J+1</td><td className="py-2.5 px-4">Notification par email du defaut de paiement</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4 font-medium">J+3</td><td className="py-2.5 px-4">Nouvelle tentative de prelevement automatique</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4 font-medium">J+7</td><td className="py-2.5 px-4">Suspension du service (donnees conservees)</td></tr>
                <tr><td className="py-2.5 px-4 font-medium">J+30</td><td className="py-2.5 px-4">Resiliation definitive et lancement de la procedure de suppression des donnees</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            A tout moment pendant cette periode, la regularisation du paiement entraine
            la reactivation immediate du service.
          </p>
        </section>

        {/* 11. Médiation */}
        <section id="mediation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">11. Mediation et litiges</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            En cas de differend relatif aux presentes CGV :
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-gray-600 mb-4">
            <li>Resolution amiable par contact a <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a></li>
            <li>Mediation aupres de l&apos;Association des Mediateurs Europeens (AME) &mdash;{' '}
              <a href="https://www.mediateurs-europeens.org" className="text-gray-900 underline" target="_blank" rel="noopener noreferrer">www.mediateurs-europeens.org</a></li>
            <li>A defaut, competence exclusive du Tribunal de Commerce de <strong>Toulouse</strong></li>
          </ol>
          <p className="text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Droit applicable :</strong> les presentes CGV sont soumises au droit francais.
          </p>
        </section>

        {/* 12. Contact */}
        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">12. Contact</h2>
          <div className="text-gray-600 leading-relaxed space-y-1">
            <p><strong className="text-gray-900">Agentic Solutions SASU</strong></p>
            <p>57B Chemin des Etroits, 31400 Toulouse, France</p>
            <p>SIREN : 944 504 679 &mdash; RCS Toulouse</p>
            <p>Email : <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a></p>
            <p>Support : <a href="mailto:support@coccinelle.ai" className="text-gray-900 underline">support@coccinelle.ai</a></p>
            <p>Telephone : +33 7 60 76 21 53</p>
          </div>
        </section>
      </div>
    </article>
  );
}
