import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de cookies - Coccinelle.ai',
  description: 'Politique de cookies de Coccinelle.ai. Cookies techniques, preferences, tiers, droits et conformite RGPD/ePrivacy.',
};

const tocItems = [
  { id: 'definition', label: '1. Qu\'est-ce qu\'un cookie ?' },
  { id: 'pourquoi', label: '2. Pourquoi utilisons-nous des cookies ?' },
  { id: 'necessaires', label: '3. Cookies strictement necessaires' },
  { id: 'preferences', label: '4. Cookies de preferences' },
  { id: 'tiers', label: '5. Cookies tiers' },
  { id: 'choix', label: '6. Vos choix' },
  { id: 'navigateur', label: '7. Parametrage navigateur' },
  { id: 'securite', label: '8. Securite' },
  { id: 'droits', label: '9. Droits et contact' },
  { id: 'conformite', label: '10. Conformite' },
];

export default function PolitiqueCookiesPage() {
  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Politique de cookies</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            v1.0
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Derniere mise a jour : 25 avril 2026
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
        {/* 1. Définition */}
        <section id="definition">
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
          <p className="text-gray-600 leading-relaxed">
            Un cookie est un petit fichier texte depose sur votre terminal (ordinateur, telephone, tablette)
            par le serveur du site web que vous visitez. Il permet au site de memoriser certaines informations
            relatives a votre navigation (preferences, session, identifiants) afin de faciliter vos visites
            ulterieures et de rendre le service plus performant.
          </p>
        </section>

        {/* 2. Pourquoi */}
        <section id="pourquoi">
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Pourquoi utilisons-nous des cookies ?</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Coccinelle.ai utilise un nombre tres limite de cookies, exclusivement a des fins techniques.
            Nous n&apos;utilisons <strong className="text-gray-900">aucun cookie publicitaire</strong>,
            <strong className="text-gray-900"> aucun cookie de tracking</strong> et
            <strong className="text-gray-900"> aucun outil d&apos;analytics tiers</strong> (pas de Google Analytics, Meta Pixel, etc.).
          </p>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="text-sm text-green-800">
              Coccinelle.ai est 100% sans publicite. Vos donnees de navigation ne sont jamais
              vendues ou partagees a des fins publicitaires.
            </p>
          </div>
        </section>

        {/* 3. Cookies nécessaires */}
        <section id="necessaires">
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. Cookies strictement necessaires</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Ces cookies sont indispensables au fonctionnement du service. Ils sont exemptes de consentement
            conformement aux recommandations de la CNIL.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Cookie</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Finalite</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Duree</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">HttpOnly</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Secure</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">SameSite</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-mono text-xs">auth_token</td>
                  <td className="py-2.5 px-4">Authentification JWT</td>
                  <td className="py-2.5 px-4">7 jours</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4">Lax</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-2.5 px-4 font-mono text-xs">session_id</td>
                  <td className="py-2.5 px-4">Session utilisateur</td>
                  <td className="py-2.5 px-4">Session</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4">Lax</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-mono text-xs">csrf_token</td>
                  <td className="py-2.5 px-4">Protection CSRF</td>
                  <td className="py-2.5 px-4">Session</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4">Strict</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-mono text-xs">cookie_consent</td>
                  <td className="py-2.5 px-4">Memorisation de votre choix cookies</td>
                  <td className="py-2.5 px-4">13 mois</td>
                  <td className="py-2.5 px-4 text-gray-400">Non</td>
                  <td className="py-2.5 px-4 text-green-700">Oui</td>
                  <td className="py-2.5 px-4">Lax</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Préférences */}
        <section id="preferences">
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Cookies de preferences</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Ces cookies memorisent vos preferences d&apos;interface. Ils ne sont pas indispensables
            mais ameliorent votre experience.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Cookie</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Finalite</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Duree</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-2.5 px-4 font-mono text-xs">sidebar_state</td>
                  <td className="py-2.5 px-4">Etat de la barre laterale (ouverte/fermee)</td>
                  <td className="py-2.5 px-4">1 an</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-mono text-xs">theme</td>
                  <td className="py-2.5 px-4">Theme d&apos;interface (clair/sombre)</td>
                  <td className="py-2.5 px-4">1 an</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Cookies tiers */}
        <section id="tiers">
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Cookies tiers</h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
            <p className="text-sm font-semibold text-green-900 mb-2">Engagement de Coccinelle.ai :</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-green-800">
              <li>AUCUN cookie publicitaire</li>
              <li>AUCUN Google Analytics, Meta Pixel ou tracking cross-site</li>
              <li>Coccinelle.ai est 100% sans publicite</li>
            </ul>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Le seul cookie tiers susceptible d&apos;etre depose est celui de <strong className="text-gray-900">Stripe</strong>,
            notre prestataire de paiement, uniquement lors de la page de paiement, dans un but strict de
            prevention de la fraude. Ce cookie est soumis a la politique de confidentialite de Stripe.
          </p>
        </section>

        {/* 6. Vos choix */}
        <section id="choix">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Vos choix</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li><strong className="text-gray-900">Consentement libre :</strong> aucun cookie wall &mdash; le refus des cookies
              de preferences n&apos;empeche pas l&apos;utilisation du service</li>
            <li><strong className="text-gray-900">Choix granulaire :</strong> possibilite d&apos;accepter ou refuser chaque
              categorie de cookies independamment</li>
            <li><strong className="text-gray-900">Modification a tout moment :</strong> depuis les parametres de votre compte</li>
            <li><strong className="text-gray-900">Retrait du consentement :</strong> sans consequence sur l&apos;acces au service
              pour les cookies non essentiels</li>
          </ul>
        </section>

        {/* 7. Navigateur */}
        <section id="navigateur">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Parametrage navigateur</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Vous pouvez egalement gerer les cookies directement dans les parametres de votre navigateur :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong className="text-gray-900">Chrome :</strong> Parametres &gt; Confidentialite et securite &gt; Cookies et autres donnees des sites</li>
            <li><strong className="text-gray-900">Firefox :</strong> Parametres &gt; Vie privee et securite &gt; Cookies et donnees de sites</li>
            <li><strong className="text-gray-900">Safari :</strong> Preferences &gt; Confidentialite &gt; Gerer les donnees de sites web</li>
            <li><strong className="text-gray-900">Edge :</strong> Parametres &gt; Cookies et autorisations de site &gt; Gerer et supprimer les cookies</li>
          </ul>
          <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-sm text-amber-800">
              La suppression des cookies techniques (auth_token, session_id) entrainera une deconnexion
              de votre compte et vous devrez vous reconnecter.
            </p>
          </div>
        </section>

        {/* 8. Sécurité */}
        <section id="securite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Securite des cookies</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Tous nos cookies techniques sont proteges par les mesures suivantes :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong className="text-gray-900">HttpOnly :</strong> protection contre le vol par injection XSS &mdash;
              le cookie n&apos;est pas accessible via JavaScript</li>
            <li><strong className="text-gray-900">Secure :</strong> transmission uniquement via HTTPS</li>
            <li><strong className="text-gray-900">SameSite=Lax/Strict :</strong> protection contre les attaques CSRF</li>
            <li><strong className="text-gray-900">Chiffrement :</strong> les donnees sensibles dans les cookies sont chiffrees</li>
          </ul>
        </section>

        {/* 9. Droits */}
        <section id="droits">
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Droits et contact</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Pour toute question relative aux cookies : <a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a>
          </p>
          <p className="text-gray-600 leading-relaxed">
            Le detail complet de vos droits relatifs aux donnees personnelles est disponible dans
            notre{' '}
            <Link href="/legal/politique-confidentialite" className="text-gray-900 underline">
              Politique de confidentialite
            </Link>.
          </p>
        </section>

        {/* 10. Conformité */}
        <section id="conformite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Conformite</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            La presente politique de cookies est conforme aux textes suivants :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Reglement General sur la Protection des Donnees (RGPD &mdash; UE 2016/679)</li>
            <li>Loi n&deg;78-17 du 6 janvier 1978 relative a l&apos;informatique, aux fichiers et aux libertes</li>
            <li>Directive ePrivacy (2002/58/CE)</li>
            <li>Recommandations CNIL sur les cookies et traceurs</li>
          </ul>
        </section>
      </div>
    </article>
  );
}
