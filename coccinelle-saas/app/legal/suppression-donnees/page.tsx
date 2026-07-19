import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Suppression des donnees - Coccinelle.ai',
  description: 'Comment demander la suppression de vos donnees personnelles traitees par Coccinelle.ai. Procedure, delais et recours (RGPD art. 17).',
};

const tocItems = [
  { id: 'objet', label: '1. Objet de cette page' },
  { id: 'client', label: '2. Vous etes client Coccinelle.ai' },
  { id: 'client-final', label: '3. Vous avez contacte une entreprise' },
  { id: 'delais', label: '4. Delais de traitement' },
  { id: 'identite', label: '5. Verification d’identite' },
  { id: 'conservation', label: '6. Donnees conservees' },
  { id: 'recours', label: '7. Recours' },
];

export default function SuppressionDonneesPage() {
  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Suppression des donnees
        </h1>
        <p className="text-sm text-gray-500">
          Derniere mise a jour : 19 juillet 2026<br />
          Responsable du traitement : Agentic Solutions SASU &mdash; Youssef Amrouche
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Objet de cette page</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Cette page explique comment demander la suppression des donnees personnelles vous
            concernant, en application du droit a l&apos;effacement prevu par l&apos;article 17 du RGPD.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Coccinelle.ai est un logiciel de relation client utilise par des entreprises pour repondre
            a leurs appels, SMS, messages WhatsApp et emails. Selon votre situation, la procedure
            n&apos;est pas la meme, car notre role juridique differe :
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-900">Votre situation</th>
                  <th className="py-3 pr-4 font-semibold text-gray-900">Notre role</th>
                  <th className="py-3 font-semibold text-gray-900">A qui vous adresser</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">Vous avez un compte Coccinelle.ai</td>
                  <td className="py-2.5 pr-4">Responsable de traitement</td>
                  <td className="py-2.5"><a href="#client" className="text-gray-900 underline">A nous &mdash; section 2</a></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2.5 pr-4">Vous avez appele ou ecrit a une entreprise qui utilise Coccinelle.ai</td>
                  <td className="py-2.5 pr-4">Sous-traitant (RGPD art. 28)</td>
                  <td className="py-2.5"><a href="#client-final" className="text-gray-900 underline">A cette entreprise &mdash; section 3</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Client Coccinelle */}
        <section id="client">
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Vous etes client Coccinelle.ai</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Vous avez souscrit un abonnement Coccinelle.ai pour votre entreprise. Nous sommes
            responsable de traitement pour les donnees de votre compte.
          </p>

          <h3 className="font-semibold text-gray-900 mb-2">Comment demander la suppression</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Envoyez un email a{' '}
            <a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a>{' '}
            depuis l&apos;adresse email associee a votre compte, avec pour objet
            &laquo; Suppression de mes donnees &raquo;. Precisez le nom de votre entreprise afin que
            nous puissions identifier votre espace.
          </p>

          <h3 className="font-semibold text-gray-900 mb-2">Ce qui est supprime</h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
            <li>Votre compte utilisateur et vos identifiants de connexion</li>
            <li>La configuration de votre assistant vocal (prompt, voix, horaires)</li>
            <li>Votre base de connaissances et vos documents importes</li>
            <li>Vos contacts, prospects, rendez-vous et taches</li>
            <li>
              L&apos;historique de vos conversations, tous canaux confondus : appels, transcriptions,
              SMS, messages WhatsApp et emails
            </li>
            <li>Vos parametres d&apos;equipe et de permissions</li>
          </ul>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-sm text-gray-700">
              <strong>Important :</strong> la suppression est definitive et irreversible. Nous vous
              recommandons d&apos;exporter vos donnees depuis votre tableau de bord avant d&apos;en
              faire la demande. Certaines donnees sont conservees malgre votre demande en vertu
              d&apos;obligations legales &mdash; voir la{' '}
              <a href="#conservation" className="text-gray-900 underline">section 6</a>.
            </p>
          </div>
        </section>

        {/* 3. Client final */}
        <section id="client-final">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            3. Vous avez contacte une entreprise qui utilise Coccinelle.ai
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Vous avez appele, envoye un SMS, un message WhatsApp ou un email a une entreprise
            (garage, cabinet, syndic, commerce...) qui utilise notre logiciel pour gerer sa relation
            client. Vos donnees ont pu etre enregistrees a cette occasion.
          </p>

          <div className="bg-gray-50 border-l-4 border-gray-300 p-4 rounded mb-4">
            <p className="text-sm text-gray-700">
              Dans ce cas, <strong>l&apos;entreprise que vous avez contactee est responsable de ces
              donnees</strong>, et nous agissons uniquement comme sous-traitant technique pour son
              compte (article 28 du RGPD). Nous ne pouvons donc pas decider seuls de supprimer ces
              donnees : la decision lui appartient.
            </p>
          </div>

          <h3 className="font-semibold text-gray-900 mb-2">La demarche directe</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Adressez votre demande directement a l&apos;entreprise concernee. C&apos;est la voie la
            plus rapide, car elle seule peut valider la suppression.
          </p>

          <h3 className="font-semibold text-gray-900 mb-2">Si vous ne parvenez pas a la joindre</h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            Ecrivez-nous a{' '}
            <a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a>{' '}
            en indiquant le nom de l&apos;entreprise et le numero de telephone ou l&apos;adresse email
            que vous avez utilise pour la contacter.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Nous transmettrons votre demande a l&apos;entreprise concernee{' '}
            <strong>sous 72 heures ouvrees</strong> et nous vous confirmerons cette transmission.
            Nous ne pouvons pas nous substituer a sa decision, mais nous nous assurons que votre
            demande lui parvient et qu&apos;elle est informee de ses obligations.
          </p>
        </section>

        {/* 4. Délais */}
        <section id="delais">
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Delais de traitement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-900">Etape</th>
                  <th className="py-3 font-semibold text-gray-900">Delai</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">Accuse de reception de votre demande</td>
                  <td className="py-2.5">72 heures ouvrees</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 pr-4">Transmission a l&apos;entreprise responsable (section 3)</td>
                  <td className="py-2.5">72 heures ouvrees</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">Traitement de la demande (RGPD art. 12)</td>
                  <td className="py-2.5">1 mois</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2.5 pr-4">Demande complexe ou volume important</td>
                  <td className="py-2.5">Extensible a 3 mois, avec information prealable</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Identité */}
        <section id="identite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Verification d&apos;identite</h2>
          <p className="text-gray-600 leading-relaxed">
            Afin de proteger vos donnees contre les demandes frauduleuses, une piece
            d&apos;identite pourra vous etre demandee avant tout traitement. Elle est utilisee
            uniquement pour verifier votre identite, puis supprimee immediatement apres.
          </p>
        </section>

        {/* 6. Données conservées */}
        <section id="conservation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Donnees conservees malgre votre demande</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Le droit a l&apos;effacement n&apos;est pas absolu. Certaines donnees sont conservees
            lorsque la loi nous l&apos;impose ou pour la constatation et la defense de droits en
            justice (RGPD art. 17.3) :
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="py-3 pr-4 font-semibold text-gray-900">Donnees</th>
                  <th className="py-3 pr-4 font-semibold text-gray-900">Duree</th>
                  <th className="py-3 font-semibold text-gray-900">Justification</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">Donnees de facturation</td>
                  <td className="py-2.5 pr-4">10 ans</td>
                  <td className="py-2.5">Code de commerce</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 pr-4">Logs techniques</td>
                  <td className="py-2.5 pr-4">90 jours</td>
                  <td className="py-2.5">Securite</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2.5 pr-4">Emails de support</td>
                  <td className="py-2.5 pr-4">3 ans</td>
                  <td className="py-2.5">Service client</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-600 leading-relaxed mt-4">
            Le detail complet de nos durees de conservation figure dans la{' '}
            <Link href="/legal/politique-confidentialite#conservation" className="text-gray-900 underline">
              politique de confidentialite
            </Link>.
          </p>
        </section>

        {/* 7. Recours */}
        <section id="recours">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Recours</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Si vous estimez que votre demande n&apos;a pas ete traitee correctement, vous pouvez
            introduire une reclamation aupres de l&apos;autorite de controle competente.
          </p>
          <div className="bg-gray-50 border-l-4 border-gray-300 p-4 rounded">
            <p className="text-sm text-gray-700">
              <strong>CNIL</strong> &mdash;{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline">
                www.cnil.fr
              </a>
              <br />
              3 Place de Fontenoy, 75007 Paris &mdash; 01 53 73 22 22
            </p>
          </div>
          <p className="text-gray-600 leading-relaxed mt-4">
            Pour toute question sur le traitement de vos donnees, vous pouvez egalement contacter
            notre delegue a la protection des donnees a{' '}
            <a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a>.
          </p>
        </section>

      </div>
    </article>
  );
}
