import Link from 'next/link';

export const metadata = {
  title: 'Mentions Legales - Coccinelle.ai',
  description: 'Mentions legales de la plateforme Coccinelle.ai'
};

export default function MentionsLegalesPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentions Legales</h1>
        <p className="text-sm text-gray-500 mb-8">Derniere mise a jour : 10 mars 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Editeur du site</h2>
          <ul className="list-none pl-0 text-gray-700 mb-4 space-y-2">
            <li><strong>Denomination sociale :</strong> Agentic Solutions SASU</li>
            <li><strong>Forme juridique :</strong> Societe par Actions Simplifiee Unipersonnelle (SASU)</li>
            <li><strong>Capital social :</strong> [A COMPLETER] euros</li>
            <li><strong>Siege social :</strong> [A COMPLETER - Adresse complete]</li>
            <li><strong>SIREN :</strong> [A COMPLETER]</li>
            <li><strong>RCS :</strong> [A COMPLETER - Ville d&apos;immatriculation]</li>
            <li><strong>Numero de TVA intracommunautaire :</strong> [A COMPLETER]</li>
            <li><strong>Directeur de la publication :</strong> Youssef Amrouche, President</li>
            <li><strong>Email :</strong> contact@coccinelle.ai</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Hebergement</h2>
          <ul className="list-none pl-0 text-gray-700 mb-4 space-y-2">
            <li><strong>Hebergeur du site web :</strong> Cloudflare Pages</li>
            <li><strong>Hebergeur de l&apos;API :</strong> Cloudflare Workers</li>
            <li><strong>Hebergeur de la base de donnees :</strong> Cloudflare D1</li>
            <li><strong>Raison sociale :</strong> Cloudflare, Inc.</li>
            <li><strong>Adresse :</strong> 101 Townsend Street, San Francisco, CA 94107, USA</li>
            <li><strong>Site web :</strong> <a href="https://www.cloudflare.com" className="text-gray-900 underline" target="_blank" rel="noopener noreferrer">www.cloudflare.com</a></li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Activite</h2>
          <p className="text-gray-700 mb-4">
            La societe Agentic Solutions SASU edite et exploite la plateforme Coccinelle.ai,
            une solution SaaS de centre d&apos;appels et de relation client basee sur l&apos;intelligence artificielle.
            La plateforme propose des services de telephonie IA, de communication omnicanale,
            de gestion de rendez-vous et de CRM intelligent a destination des professionnels.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Propriete intellectuelle</h2>
          <p className="text-gray-700 mb-4">
            L&apos;ensemble du contenu du site Coccinelle.ai (textes, graphismes, images, videos, logos,
            icones, sons, logiciels, etc.) est la propriete exclusive d&apos;Agentic Solutions SASU
            ou de ses partenaires et est protege par les lois francaises et internationales relatives
            a la propriete intellectuelle.
          </p>
          <p className="text-gray-700 mb-4">
            Toute reproduction, representation, modification, publication, adaptation de tout ou partie
            des elements du site, quel que soit le moyen ou le procede utilise, est interdite,
            sauf autorisation ecrite prealable d&apos;Agentic Solutions SASU.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Donnees personnelles</h2>
          <p className="text-gray-700 mb-4">
            Conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi
            Informatique et Libertes, vous disposez de droits sur vos donnees personnelles.
            Pour en savoir plus, consultez notre{' '}
            <Link href="/confidentialite" className="text-gray-900 underline hover:text-gray-700">Politique de Confidentialite</Link>.
          </p>
          <p className="text-gray-700 mb-4">
            Pour exercer vos droits ou pour toute question relative a vos donnees personnelles,
            contactez-nous a : <strong>contact@coccinelle.ai</strong>
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Cookies</h2>
          <p className="text-gray-700 mb-4">
            Le site Coccinelle.ai utilise uniquement des cookies techniques strictement necessaires
            au fonctionnement du service (gestion de session, authentification).
            Aucun cookie publicitaire, de suivi ou analytique n&apos;est depose sans votre consentement.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Liens hypertextes</h2>
          <p className="text-gray-700 mb-4">
            Le site peut contenir des liens hypertextes vers d&apos;autres sites internet.
            Agentic Solutions SASU n&apos;exerce aucun controle sur ces sites et decline toute
            responsabilite quant a leur contenu ou aux traitements de donnees qu&apos;ils operent.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation de responsabilite</h2>
          <p className="text-gray-700 mb-4">
            Agentic Solutions SASU s&apos;efforce d&apos;assurer l&apos;exactitude et la mise a jour des informations
            diffusees sur le site. Toutefois, elle ne saurait etre tenue responsable d&apos;erreurs,
            d&apos;omissions ou de resultats qui pourraient etre obtenus par un mauvais usage de ces informations.
          </p>
          <p className="text-gray-700 mb-4">
            Les reponses generees par l&apos;assistant vocal IA sont produites automatiquement et ne constituent
            pas des conseils professionnels. L&apos;utilisateur reste seul responsable de l&apos;utilisation
            qu&apos;il fait de ces informations.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Droit applicable</h2>
          <p className="text-gray-700 mb-4">
            Les presentes mentions legales sont soumises au droit francais. Tout litige sera porte
            devant les tribunaux competents du ressort du siege social d&apos;Agentic Solutions SASU.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Credits</h2>
          <p className="text-gray-700 mb-4">
            Conception et developpement : Agentic Solutions SASU
          </p>
          <p className="text-gray-700 mb-4">
            Technologies utilisees : Next.js, Cloudflare Workers, Tailwind CSS, IA conversationnelle
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; 2026 coccinelle.ai - Agentic Solutions SASU</p>
          <div className="flex gap-6">
            <Link href="/cgu" className="hover:text-gray-900">CGU</Link>
            <Link href="/confidentialite" className="hover:text-gray-900">Confidentialite</Link>
            <Link href="/mentions-legales" className="hover:text-gray-900 font-medium">Mentions legales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
