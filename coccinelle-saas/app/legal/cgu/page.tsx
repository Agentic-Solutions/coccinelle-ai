import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Conditions Generales d\'Utilisation - Coccinelle.ai',
  description: 'CGU de la plateforme Coccinelle.ai. Obligations, IA vocale, SLA, propriete intellectuelle, RGPD.',
};

const tocItems = [
  { id: 'objet', label: '1. Objet' },
  { id: 'acces', label: '2. Acces au service' },
  { id: 'description', label: '3. Description du service' },
  { id: 'obligations', label: '4. Obligations de l\'utilisateur' },
  { id: 'agent-vocal', label: '5. Agent vocal IA' },
  { id: 'usages-interdits', label: '6. Usages interdits' },
  { id: 'sla', label: '7. Disponibilite et SLA' },
  { id: 'responsabilite', label: '8. Responsabilite' },
  { id: 'pi', label: '9. Propriete intellectuelle' },
  { id: 'donnees-client', label: '10. Propriete des donnees' },
  { id: 'confidentialite', label: '11. Confidentialite' },
  { id: 'donnees-perso', label: '12. Donnees personnelles' },
  { id: 'suspension', label: '13. Suspension et resiliation' },
  { id: 'force-majeure', label: '14. Force majeure' },
  { id: 'modifications', label: '15. Modifications' },
  { id: 'divisibilite', label: '16. Divisibilite' },
  { id: 'droit', label: '17. Droit applicable et litiges' },
  { id: 'contact', label: '18. Contact' },
];

export default function CguPage() {
  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Conditions Generales d&apos;Utilisation</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            v2.0
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Derniere mise a jour : 25 avril 2026<br />
          Editeur : Agentic Solutions SASU &mdash; RCS Toulouse
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
            Les presentes Conditions Generales d&apos;Utilisation (CGU) regissent l&apos;acces et l&apos;utilisation
            de la plateforme Coccinelle.ai, editee par <strong>Agentic Solutions SASU</strong>, au capital de
            1 000 euros, immatriculee au RCS de Toulouse sous le numero 944 504 679, dont le siege
            social est situe 57B Chemin des Etroits, 31400 Toulouse (ci-apres &laquo;&nbsp;Agentic Solutions&nbsp;&raquo;).
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            En accedant a la plateforme ou en utilisant nos services, vous acceptez sans reserve les presentes CGU.
          </p>
        </section>

        {/* 2. Accès */}
        <section id="acces">
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Acces au service</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            L&apos;acces a Coccinelle.ai necessite la creation d&apos;un compte. L&apos;utilisateur garantit l&apos;exactitude
            des informations fournies et s&apos;engage a les maintenir a jour.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Chaque compte est strictement personnel et non cessible</li>
            <li>L&apos;acces est reserve aux professionnels et aux entreprises</li>
            <li>L&apos;utilisateur est seul responsable de la confidentialite de ses identifiants</li>
            <li>Toute activite effectuee depuis un compte est presumee etre le fait de son titulaire</li>
          </ul>
        </section>

        {/* 3. Description */}
        <section id="description">
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. Description du service</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Coccinelle.ai est une plateforme SaaS d&apos;agent vocal IA permettant :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>La reception et le traitement d&apos;appels telephoniques par un agent vocal IA</li>
            <li>La gestion de rendez-vous et d&apos;agenda en temps reel</li>
            <li>L&apos;envoi automatique de SMS, emails et messages WhatsApp</li>
            <li>La gestion d&apos;une base de connaissances consultable par l&apos;agent</li>
            <li>Un CRM integre pour la gestion des contacts et prospects</li>
            <li>Un catalogue produits et services presentable par l&apos;agent</li>
          </ul>
        </section>

        {/* 4. Obligations */}
        <section id="obligations">
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Obligations de l&apos;utilisateur</h2>
          <p className="text-gray-600 leading-relaxed mb-3">L&apos;utilisateur s&apos;engage a :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Utiliser le service conformement a la legislation francaise et europeenne</li>
            <li>Ne pas utiliser le service a des fins frauduleuses ou illegales</li>
            <li>Respecter la vie privee des tiers, notamment les appelants</li>
            <li>Obtenir les consentements necessaires pour l&apos;enregistrement des appels</li>
            <li>Ne pas tenter de contourner les mesures de securite</li>
            <li>Ne pas surcharger intentionnellement l&apos;infrastructure</li>
          </ul>
        </section>

        {/* 5. Agent vocal IA */}
        <section id="agent-vocal">
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Agent vocal IA &mdash; obligations specifiques</h2>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Obligation legale du Client :</p>
            <p className="text-sm text-amber-800 mb-2">
              Le Client DOIT obligatoirement informer ses appelants :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-800">
              <li>Qu&apos;ils interagissent avec un agent vocal IA (et non un humain)</li>
              <li>Que la conversation est transcrite et enregistree</li>
              <li>De leurs droits RGPD relatifs a leurs donnees personnelles</li>
            </ul>
            <p className="text-sm text-amber-800 mt-2">
              Fondements : article L.226-1 du Code penal, articles 13 et 14 du RGPD.
              Le non-respect de cette obligation engage la seule responsabilite du Client.
            </p>
          </div>
          <p className="text-gray-600 leading-relaxed">
            L&apos;assistant IA est un outil automatise. Le Client reste seul responsable de sa
            configuration, des informations fournies a ses appelants via l&apos;agent, et de la
            conformite de son utilisation avec la reglementation applicable a son secteur.
          </p>
        </section>

        {/* 6. Usages interdits */}
        <section id="usages-interdits">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Usages interdits de l&apos;agent vocal</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Sont strictement interdits les usages suivants :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Collecte de donnees bancaires, de sante ou de mots de passe par l&apos;agent</li>
            <li>Demarchage telephonique non consenti (loi Bloctel, art. L.223-1 du Code de la consommation)</li>
            <li>Usurpation d&apos;identite d&apos;une personne physique ou morale</li>
            <li>Manipulation psychologique ou pratiques commerciales trompeuses</li>
            <li>Tout usage contraire a la legislation francaise ou europeenne en vigueur</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mt-3">
            Tout manquement constate peut entrainer la suspension immediate du compte sans preavis.
          </p>
        </section>

        {/* 7. SLA */}
        <section id="sla">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Disponibilite et niveaux de service (SLA)</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4 font-medium text-gray-900">Disponibilite garantie</td><td className="py-2.5 px-4">99,5% par mois calendaire</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4 font-medium text-gray-900">Maintenances planifiees</td><td className="py-2.5 px-4">Hors calcul, preavis 48h par email</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4 font-medium text-gray-900">Indisponibilite &gt; 4h consecutives</td><td className="py-2.5 px-4">Avoir proportionnel sur demande</td></tr>
                <tr><td className="py-2.5 px-4 font-medium text-gray-900">Incidents critiques</td><td className="py-2.5 px-4">Traites 7j/7</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">
            La disponibilite est mesuree sur le service principal (agent vocal et API).
            Les maintenances planifiees sont realisees de preference entre 2h et 6h (heure de Paris).
          </p>
        </section>

        {/* 8. Responsabilité */}
        <section id="responsabilite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Responsabilite d&apos;Agentic Solutions</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Agentic Solutions s&apos;engage a fournir le service avec le soin raisonnablement attendu.
            Notre responsabilite ne saurait etre engagee en cas de :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Interruptions de service liees a des tiers ou sous-traitants</li>
            <li>Erreurs ou approximations des reponses generees par l&apos;agent IA</li>
            <li>Dommages indirects, pertes de chiffre d&apos;affaires ou manques a gagner</li>
            <li>Utilisation du service en violation des presentes CGU</li>
            <li>Evenements de force majeure (cf. article 14)</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Plafond :</strong> la responsabilite totale d&apos;Agentic Solutions est plafonnee
            au montant des abonnements effectivement payes par le Client au cours des 12 derniers mois.
          </p>
        </section>

        {/* 9. PI */}
        <section id="pi">
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Propriete intellectuelle</h2>
          <p className="text-gray-600 leading-relaxed">
            La plateforme Coccinelle.ai, son code source, ses algorithmes, son design et ses interfaces
            sont la propriete exclusive d&apos;Agentic Solutions SASU. Toute reproduction, modification ou
            exploitation non autorisee est strictement interdite.
          </p>
        </section>

        {/* 10. Propriété des données */}
        <section id="donnees-client">
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Propriete des donnees du Client</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
            <p className="text-sm text-blue-800">
              Les donnees saisies par le Client sur la plateforme (contacts, base de connaissances,
              configurations, transcriptions) restent la <strong>propriete exclusive du Client</strong>.
            </p>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Agentic Solutions agit en qualite de sous-traitant RGPD (art. 28)</li>
            <li>Licence limitee accordee a Agentic Solutions pour le seul but de fournir le service</li>
            <li>Export des donnees possible a tout moment depuis le dashboard</li>
            <li>En cas de resiliation : export disponible pendant 30 jours</li>
            <li>Suppression definitive et securisee 30 jours apres la resiliation</li>
          </ul>
        </section>

        {/* 11. Confidentialité */}
        <section id="confidentialite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">11. Confidentialite</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Les parties s&apos;engagent reciproquement a maintenir confidentielles toutes les informations
            echangees dans le cadre de l&apos;utilisation du service.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Cette obligation de confidentialite survit 3 ans a la resiliation du contrat</li>
            <li>Le secret des affaires est protege conformement a la directive (UE) 2016/943</li>
            <li>Exception : obligations legales, decisions de justice, autorites de regulation</li>
          </ul>
        </section>

        {/* 12. Données personnelles */}
        <section id="donnees-perso">
          <h2 className="text-xl font-bold text-gray-900 mb-4">12. Donnees personnelles</h2>
          <p className="text-gray-600 leading-relaxed">
            Le traitement des donnees personnelles est decrit dans notre{' '}
            <Link href="/legal/politique-confidentialite" className="text-gray-900 underline">
              Politique de confidentialite
            </Link>{' '}
            et notre{' '}
            <Link href="/legal/politique-cookies" className="text-gray-900 underline">
              Politique de cookies
            </Link>.
          </p>
        </section>

        {/* 13. Suspension */}
        <section id="suspension">
          <h2 className="text-xl font-bold text-gray-900 mb-4">13. Suspension et resiliation</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Agentic Solutions se reserve le droit de suspendre ou resilier un compte en cas de :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Violation des presentes CGU</li>
            <li>Non-paiement de l&apos;abonnement (cf. <Link href="/legal/cgv" className="text-gray-900 underline">CGV</Link>)</li>
            <li>Utilisation frauduleuse ou illegale du service</li>
            <li>Usage portant atteinte a la securite ou a la reputation du service</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            En cas de violation grave (fraude, usage illegal), la suspension peut etre immediate
            et sans preavis. Dans les autres cas, un preavis de 15 jours est accorde.
          </p>
        </section>

        {/* 14. Force majeure */}
        <section id="force-majeure">
          <h2 className="text-xl font-bold text-gray-900 mb-4">14. Force majeure</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Aucune des parties ne peut etre tenue responsable d&apos;un manquement a ses obligations
            contractuelles du fait d&apos;un evenement de force majeure au sens de l&apos;article 1218 du Code civil :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Catastrophe naturelle</li>
            <li>Cyberattaque d&apos;ampleur nationale ou internationale</li>
            <li>Decision gouvernementale ou reglementaire</li>
            <li>Pandemie</li>
            <li>Panne massive d&apos;un fournisseur d&apos;infrastructure</li>
          </ul>
        </section>

        {/* 15. Modifications */}
        <section id="modifications">
          <h2 className="text-xl font-bold text-gray-900 mb-4">15. Modifications des CGU</h2>
          <p className="text-gray-600 leading-relaxed">
            Les presentes CGU peuvent etre modifiees a tout moment. L&apos;utilisateur sera notifie par
            email 30 jours avant toute modification substantielle. La poursuite de l&apos;utilisation du
            service apres ce delai vaut acceptation des nouvelles conditions. En cas de desaccord,
            l&apos;utilisateur peut resilier son abonnement sans frais avant l&apos;entree en vigueur des
            nouvelles conditions.
          </p>
        </section>

        {/* 16. Divisibilité */}
        <section id="divisibilite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">16. Divisibilite</h2>
          <p className="text-gray-600 leading-relaxed">
            Si l&apos;une des clauses des presentes CGU venait a etre declaree nulle ou inapplicable
            par une decision de justice, les autres clauses resteraient en vigueur et pleinement
            applicables. La clause invalide serait remplacee par une clause valide se rapprochant
            le plus possible de l&apos;intention originale.
          </p>
        </section>

        {/* 17. Droit applicable */}
        <section id="droit">
          <h2 className="text-xl font-bold text-gray-900 mb-4">17. Droit applicable et litiges</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Les presentes CGU sont soumises au droit francais. En cas de litige :
          </p>
          <ol className="list-decimal pl-6 space-y-1 text-gray-600">
            <li>Resolution amiable par contact a <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a></li>
            <li>Mediation aupres de l&apos;Association des Mediateurs Europeens (AME) &mdash;{' '}
              <a href="https://www.mediateurs-europeens.org" className="text-gray-900 underline" target="_blank" rel="noopener noreferrer">www.mediateurs-europeens.org</a></li>
            <li>A defaut, competence exclusive des tribunaux de <strong>Toulouse</strong></li>
          </ol>
        </section>

        {/* 18. Contact */}
        <section id="contact">
          <h2 className="text-xl font-bold text-gray-900 mb-4">18. Contact</h2>
          <div className="text-gray-600 leading-relaxed space-y-1">
            <p><strong className="text-gray-900">Agentic Solutions SASU</strong></p>
            <p>57B Chemin des Etroits, 31400 Toulouse, France</p>
            <p>SIREN : 944 504 679 &mdash; RCS Toulouse</p>
            <p>Email : <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a></p>
            <p>Telephone : +33 7 60 76 21 53</p>
          </div>
        </section>
      </div>
    </article>
  );
}
