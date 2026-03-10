import Link from 'next/link';

export const metadata = {
  title: 'Conditions Generales d\'Utilisation - Coccinelle.ai',
  description: 'Conditions Generales d\'Utilisation de la plateforme Coccinelle.ai'
};

export default function CGUPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Generales d&apos;Utilisation</h1>
        <p className="text-sm text-gray-500 mb-8">Derniere mise a jour : 10 mars 2026</p>

        <div className="prose prose-gray max-w-none">
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 1 - Objet</h2>
          <p className="text-gray-700 mb-4">
            Les presentes Conditions Generales d&apos;Utilisation (ci-apres &quot;CGU&quot;) ont pour objet de definir les conditions
            d&apos;acces et d&apos;utilisation de la plateforme Coccinelle.ai (ci-apres &quot;la Plateforme&quot;), editee par
            Agentic Solutions SASU (ci-apres &quot;l&apos;Editeur&quot;).
          </p>
          <p className="text-gray-700 mb-4">
            La Plateforme propose un service de centre d&apos;appels et de relation client base sur l&apos;intelligence artificielle,
            incluant un assistant vocal IA, la gestion de rendez-vous, la communication omnicanale (SMS, WhatsApp, email),
            un CRM intelligent et des outils d&apos;analyse.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 2 - Acceptation des CGU</h2>
          <p className="text-gray-700 mb-4">
            L&apos;inscription et l&apos;utilisation de la Plateforme impliquent l&apos;acceptation pleine et entiere des presentes CGU.
            L&apos;utilisateur reconnait en avoir pris connaissance et s&apos;engage a les respecter.
            En cas de desaccord avec l&apos;une quelconque de ces conditions, l&apos;utilisateur est invite a ne pas utiliser la Plateforme.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 3 - Inscription et compte utilisateur</h2>
          <p className="text-gray-700 mb-4">
            Pour acceder aux services, l&apos;utilisateur doit creer un compte en fournissant des informations exactes,
            completes et a jour. L&apos;utilisateur est responsable de la confidentialite de ses identifiants
            de connexion et de toute activite realisee depuis son compte.
          </p>
          <p className="text-gray-700 mb-4">
            L&apos;utilisateur s&apos;engage a :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Fournir des informations veridiques lors de l&apos;inscription</li>
            <li>Ne pas creer de compte pour un tiers sans son autorisation</li>
            <li>Ne pas usurper l&apos;identite d&apos;autrui</li>
            <li>Informer immediatement l&apos;Editeur en cas d&apos;utilisation non autorisee de son compte</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 4 - Description des services</h2>
          <p className="text-gray-700 mb-4">
            La Plateforme met a disposition les services suivants :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li><strong>Assistant vocal IA</strong> : agent virtuel repondant aux appels telephoniques 24/7</li>
            <li><strong>Communication omnicanale</strong> : gestion centralisee des SMS, WhatsApp, emails et appels</li>
            <li><strong>Gestion de rendez-vous</strong> : prise de RDV automatique avec synchronisation calendrier</li>
            <li><strong>CRM intelligent</strong> : gestion des prospects et clients avec scoring automatique</li>
            <li><strong>Base de connaissances</strong> : import automatique de contenu (site web, documents)</li>
            <li><strong>Analytics</strong> : tableaux de bord et rapports de performance</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 5 - Periode d&apos;essai et abonnement</h2>
          <p className="text-gray-700 mb-4">
            L&apos;inscription donne droit a une periode d&apos;essai gratuite de 14 jours, sans engagement et sans carte bancaire.
            A l&apos;issue de cette periode, l&apos;utilisateur peut souscrire a l&apos;un des plans d&apos;abonnement proposes.
          </p>
          <p className="text-gray-700 mb-4">
            Les tarifs applicables sont ceux affiches sur la Plateforme au moment de la souscription.
            L&apos;Editeur se reserve le droit de modifier ses tarifs, sous reserve d&apos;en informer les utilisateurs
            avec un preavis de 30 jours.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 6 - Obligations de l&apos;utilisateur</h2>
          <p className="text-gray-700 mb-4">
            L&apos;utilisateur s&apos;engage a :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Utiliser la Plateforme conformement a sa destination et aux lois en vigueur</li>
            <li>Ne pas utiliser la Plateforme a des fins illicites, frauduleuses ou malveillantes</li>
            <li>Ne pas porter atteinte au fonctionnement de la Plateforme</li>
            <li>Ne pas tenter d&apos;acceder aux systemes informatiques de l&apos;Editeur de maniere non autorisee</li>
            <li>Respecter les droits de propriete intellectuelle de l&apos;Editeur et des tiers</li>
            <li>Ne pas utiliser l&apos;assistant vocal pour du demarchage telephonique abusif ou du spam</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 7 - Propriete intellectuelle</h2>
          <p className="text-gray-700 mb-4">
            La Plateforme, son contenu, ses fonctionnalites, son design et sa technologie sont la propriete
            exclusive de l&apos;Editeur et sont proteges par le droit de la propriete intellectuelle.
            Toute reproduction, representation ou exploitation non autorisee est interdite.
          </p>
          <p className="text-gray-700 mb-4">
            L&apos;utilisateur conserve la propriete de l&apos;ensemble des donnees qu&apos;il importe sur la Plateforme
            (base de connaissances, contacts, documents). L&apos;Editeur ne revendique aucun droit sur ces donnees.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 8 - Responsabilite</h2>
          <p className="text-gray-700 mb-4">
            L&apos;Editeur s&apos;engage a fournir un service de qualite et a assurer la disponibilite de la Plateforme.
            Toutefois, l&apos;Editeur ne saurait etre tenu responsable :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Des interruptions temporaires pour maintenance ou mise a jour</li>
            <li>Des reponses fournies par l&apos;assistant IA, qui sont generees automatiquement</li>
            <li>Des dommages indirects resultant de l&apos;utilisation de la Plateforme</li>
            <li>De l&apos;utilisation faite par l&apos;utilisateur des informations fournies par la Plateforme</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 9 - Resiliation</h2>
          <p className="text-gray-700 mb-4">
            L&apos;utilisateur peut resilier son abonnement a tout moment depuis les parametres de son compte.
            La resiliation prend effet a la fin de la periode de facturation en cours.
          </p>
          <p className="text-gray-700 mb-4">
            L&apos;Editeur se reserve le droit de suspendre ou de resilier un compte en cas de violation
            des presentes CGU, apres notification a l&apos;utilisateur.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 10 - Droit de retractation</h2>
          <p className="text-gray-700 mb-4">
            Conformement a l&apos;article L221-28 du Code de la consommation, le droit de retractation ne peut
            etre exerce pour les contrats de fourniture de contenu numerique non fourni sur un support materiel
            dont l&apos;execution a commence apres accord prealable du consommateur.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 11 - Protection des donnees personnelles</h2>
          <p className="text-gray-700 mb-4">
            Le traitement des donnees personnelles est regi par notre
            {' '}<Link href="/confidentialite" className="text-gray-900 underline hover:text-gray-700">Politique de Confidentialite</Link>.
            L&apos;utilisateur est invite a en prendre connaissance.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 12 - Modification des CGU</h2>
          <p className="text-gray-700 mb-4">
            L&apos;Editeur se reserve le droit de modifier les presentes CGU a tout moment.
            Les utilisateurs seront informes de toute modification par notification sur la Plateforme
            ou par email. La poursuite de l&apos;utilisation de la Plateforme apres notification
            vaut acceptation des CGU modifiees.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 13 - Droit applicable et juridiction</h2>
          <p className="text-gray-700 mb-4">
            Les presentes CGU sont soumises au droit francais.
            Tout litige relatif a leur interpretation ou a leur execution sera soumis aux tribunaux
            competents du ressort du siege social de l&apos;Editeur, sauf disposition legale contraire.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Article 14 - Contact</h2>
          <p className="text-gray-700 mb-4">
            Pour toute question relative aux presentes CGU, vous pouvez contacter l&apos;Editeur :
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Par email : contact@coccinelle.ai</li>
            <li>Par courrier : Agentic Solutions SASU, [A COMPLETER - Adresse]</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>&copy; 2026 coccinelle.ai - Agentic Solutions SASU</p>
          <div className="flex gap-6">
            <Link href="/cgu" className="hover:text-gray-900 font-medium">CGU</Link>
            <Link href="/confidentialite" className="hover:text-gray-900">Confidentialite</Link>
            <Link href="/mentions-legales" className="hover:text-gray-900">Mentions legales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
