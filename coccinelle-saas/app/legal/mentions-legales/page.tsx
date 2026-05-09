import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions legales - Coccinelle.ai',
  description: 'Mentions legales de la plateforme Coccinelle.ai, editee par Agentic Solutions SASU. LCEN, RGPD, hebergement.',
};

const tocItems = [
  { id: 'editeur', label: '1. Identification de l\'editeur' },
  { id: 'activite', label: '2. Activite et objet social' },
  { id: 'hebergement', label: '3. Hebergement et infrastructure' },
  { id: 'pi', label: '4. Propriete intellectuelle' },
  { id: 'responsabilite', label: '5. Limitation de responsabilite' },
  { id: 'donnees', label: '6. Protection des donnees' },
  { id: 'conformite', label: '7. Conformite reglementaire' },
  { id: 'partenaires', label: '8. Partenaires technologiques' },
  { id: 'mediation', label: '9. Mediation et litiges' },
  { id: 'tarifs', label: '10. Informations economiques' },
  { id: 'environnement', label: '11. Engagement environnemental' },
  { id: 'accessibilite', label: '12. Accessibilite numerique' },
  { id: 'evolution', label: '13. Evolution et mise a jour' },
];

export default function MentionsLegalesPage() {
  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Mentions legales</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            v2.0
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Conformement a la loi n&deg;2004-575 du 21 juin 2004 pour la Confiance dans l&apos;Economie Numerique (LCEN).
          <br />Entree en vigueur : 25 avril 2026
        </p>
      </div>

      {/* Table of contents */}
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
        {/* 1. Identification */}
        <section id="editeur">
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Identification de l&apos;editeur</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Denomination</td><td className="py-2.5">Agentic Solutions SASU</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Forme juridique</td><td className="py-2.5">Societe par Actions Simplifiee Unipersonnelle</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Capital social</td><td className="py-2.5">1 000 euros</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">SIREN</td><td className="py-2.5">944 504 679</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">SIRET</td><td className="py-2.5">944 504 679 00019</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">N&deg; TVA intracommunautaire</td><td className="py-2.5">FR04 944 504 679</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Code NAF/APE</td><td className="py-2.5">58.29C &mdash; Edition de logiciels applicatifs</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">RCS</td><td className="py-2.5">Toulouse</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Immatriculation</td><td className="py-2.5">28 fevrier 2023</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Siege social</td><td className="py-2.5">57B Chemin des Etroits, 31400 Toulouse, France</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">President</td><td className="py-2.5">Youssef Amrouche</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Directeur de la publication</td><td className="py-2.5">Youssef Amrouche</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">DPO</td><td className="py-2.5">Youssef Amrouche &mdash; <a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a></td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Email</td><td className="py-2.5"><a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a></td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Telephone</td><td className="py-2.5">+33 7 60 76 21 53</td></tr>
                <tr className="bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">Site web</td><td className="py-2.5"><a href="https://coccinelle.ai" className="text-gray-900 underline">https://coccinelle.ai</a></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Activité */}
        <section id="activite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Activite et objet social</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Agentic Solutions edite <strong className="text-gray-900">Coccinelle.ai</strong>, une plateforme SaaS
            d&apos;agent vocal IA destinee aux TPE et PME francaises.
          </p>
          <p className="text-gray-600 leading-relaxed mb-3">Services proposes :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Agent vocal IA repondant 24h/24, 7j/7 avec voix naturelle</li>
            <li>Base de connaissances avec recherche intelligente</li>
            <li>Prise de rendez-vous automatique et gestion d&apos;agenda</li>
            <li>CRM integre avec gestion des contacts</li>
            <li>Communication multicanal : telephone, SMS, WhatsApp, email</li>
            <li>Catalogue produits et services consultable par l&apos;agent</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Secteurs cibles :</strong> immobilier, sante, restauration,
            automobile, beaute, notariat, expertise-comptable, veterinaire, et tout secteur de services.
          </p>
        </section>

        {/* 3. Hébergement */}
        <section id="hebergement">
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. Hebergement et infrastructure</h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
            <p className="text-sm text-green-800">
              Toutes les donnees utilisateur sont traitees et stockees au sein de l&apos;Union europeenne,
              conformement au RGPD.
            </p>
          </div>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <div>
              <p className="font-semibold text-gray-900">Frontend et CDN :</p>
              <p>Cloudflare, Inc. &mdash; 101 Townsend St, San Francisco, CA 94107, USA</p>
              <p className="text-sm text-gray-500">Infrastructure edge EU &mdash; donnees servies depuis les noeuds europeens</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Backend et agent vocal :</p>
              <p>Scaleway SAS &mdash; 8 rue de la Ville l&apos;Eveque, 75008 Paris, France</p>
              <p className="text-sm text-gray-500">Datacenter Paris &mdash; serveur dedie en France</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Base de donnees :</p>
              <p>Cloudflare D1 &mdash; region Union Europeenne</p>
            </div>
          </div>
        </section>

        {/* 4. Propriété intellectuelle */}
        <section id="pi">
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Propriete intellectuelle</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            L&apos;ensemble des elements constituant la plateforme Coccinelle.ai (code source, algorithmes,
            interfaces, design, textes, logos, marques) est la propriete exclusive d&apos;Agentic Solutions SASU
            et est protege par les lois francaises et internationales relatives a la propriete intellectuelle.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Toute reproduction, representation, modification ou exploitation non autorisee est strictement
            interdite, sauf autorisation ecrite prealable.
          </p>
          <p className="text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Marque :</strong> &laquo;&nbsp;Coccinelle.ai&nbsp;&raquo; est une marque
            d&apos;Agentic Solutions SASU (depot INPI en cours).
          </p>
        </section>

        {/* 5. Limitation de responsabilité */}
        <section id="responsabilite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Limitation de responsabilite</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            Agentic Solutions s&apos;efforce d&apos;assurer l&apos;exactitude et la disponibilite des informations
            sur ce site. Notre responsabilite ne saurait etre engagee en cas de :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Dommages indirects, pertes de chiffre d&apos;affaires ou manques a gagner</li>
            <li>Erreurs ou approximations des reponses generees par l&apos;agent vocal IA</li>
            <li>Interruptions de service liees a des tiers ou sous-traitants</li>
            <li>Evenements de force majeure (catastrophe naturelle, cyberattaque d&apos;ampleur,
              decision gouvernementale, pandemie)</li>
          </ul>
          <p className="text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Plafond :</strong> en tout etat de cause, la responsabilite totale
            d&apos;Agentic Solutions est plafonnee au montant des sommes effectivement payees par le client
            au cours des 12 derniers mois precedant le fait generateur.
          </p>
        </section>

        {/* 6. Protection des données */}
        <section id="donnees">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Protection des donnees personnelles</h2>
          <p className="text-gray-600 leading-relaxed">
            Conformement au RGPD et a la loi Informatique et Libertes, vous disposez de droits sur vos
            donnees personnelles (acces, rectification, effacement, portabilite, opposition, limitation).
            Le detail complet du traitement est decrit dans notre{' '}
            <Link href="/legal/politique-confidentialite" className="text-gray-900 underline">
              Politique de confidentialite
            </Link>.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Pour exercer vos droits : <a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a>
          </p>
        </section>

        {/* 7. Conformité réglementaire */}
        <section id="conformite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Conformite reglementaire</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            La plateforme Coccinelle.ai est concue dans le respect des textes suivants :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Reglement General sur la Protection des Donnees (RGPD &mdash; UE 2016/679)</li>
            <li>Loi n&deg;2004-575 du 21 juin 2004 pour la Confiance dans l&apos;Economie Numerique (LCEN)</li>
            <li>Loi n&deg;78-17 du 6 janvier 1978 relative a l&apos;informatique, aux fichiers et aux libertes</li>
            <li>Directive ePrivacy (2002/58/CE) pour les cookies et traceurs</li>
            <li>Code de la consommation (droit de retractation, information precontractuelle)</li>
          </ul>
        </section>

        {/* 8. Partenaires technologiques */}
        <section id="partenaires">
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Partenaires technologiques</h2>
          <p className="text-gray-600 leading-relaxed">
            La liste complete de nos partenaires et sous-traitants technologiques est disponible
            sur demande a : <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a>
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Le detail des sous-traitants ayant acces aux donnees personnelles est decrit dans
            notre{' '}
            <Link href="/legal/politique-confidentialite" className="text-gray-900 underline">
              Politique de confidentialite
            </Link>{' '}
            (obligation RGPD art. 28).
          </p>
        </section>

        {/* 9. Médiation et litiges */}
        <section id="mediation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Mediation et litiges</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            En cas de differend relatif aux presentes mentions ou a l&apos;utilisation du site,
            les parties s&apos;engagent a rechercher une resolution amiable en contactant :{' '}
            <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a>
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            <strong className="text-gray-900">Mediation :</strong> conformement aux articles L.616-1 et R.616-1
            du Code de la consommation, en cas de litige non resolu, le consommateur peut recourir
            gratuitement au service de mediation :
          </p>
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 mb-4">
            <p className="font-medium text-gray-900">Association des Mediateurs Europeens (AME)</p>
            <p>
              <a href="https://www.mediateurs-europeens.org" className="text-gray-900 underline" target="_blank" rel="noopener noreferrer">
                www.mediateurs-europeens.org
              </a>
            </p>
          </div>
          <p className="text-gray-600 leading-relaxed">
            <strong className="text-gray-900">Droit applicable :</strong> droit francais.
            <br />
            <strong className="text-gray-900">Juridiction :</strong> a defaut de resolution amiable ou de mediation,
            les tribunaux competents de <strong>Toulouse</strong> seront seuls competents.
          </p>
        </section>

        {/* 10. Informations économiques */}
        <section id="tarifs">
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Informations economiques</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Les tarifs des abonnements Coccinelle.ai sont les suivants :
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Formule</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Prix HT/mois</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Prix TTC/mois</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">Essentiel</td>
                  <td className="py-3 px-4">79,00 euros</td>
                  <td className="py-3 px-4">94,80 euros</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-3 px-4">Pro</td>
                  <td className="py-3 px-4">199,00 euros</td>
                  <td className="py-3 px-4">238,80 euros</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Business</td>
                  <td className="py-3 px-4" colSpan={2}>Sur devis</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            TVA francaise a 20%. Tarifs susceptibles d&apos;evoluer avec un preavis de 30 jours.
            Consultez nos <Link href="/legal/cgv" className="text-gray-900 underline">CGV</Link> pour
            le detail des conditions commerciales.
          </p>
        </section>

        {/* 11. Engagement environnemental */}
        <section id="environnement">
          <h2 className="text-xl font-bold text-gray-900 mb-4">11. Engagement environnemental</h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
            <p className="text-sm text-green-800">
              Agentic Solutions s&apos;engage a minimiser son empreinte environnementale.
            </p>
          </div>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li><strong className="text-gray-900">Cloudflare :</strong> engage a 100% d&apos;energie renouvelable</li>
            <li><strong className="text-gray-900">Scaleway :</strong> datacenter parisien a faible empreinte carbone, refroidissement adiabatique</li>
            <li><strong className="text-gray-900">Teletravail :</strong> mode de travail privilegie, reduisant les deplacements</li>
            <li><strong className="text-gray-900">Dematerialisation :</strong> 100% des processus internes numerises, zero papier</li>
          </ul>
        </section>

        {/* 12. Accessibilité numérique */}
        <section id="accessibilite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">12. Accessibilite numerique</h2>
          <p className="text-gray-600 leading-relaxed">
            Agentic Solutions s&apos;engage a rendre la plateforme Coccinelle.ai accessible au plus grand
            nombre, conformement au Referentiel General d&apos;Amelioration de l&apos;Accessibilite (RGAA) et
            aux standards WCAG 2.1 niveau AA. L&apos;amelioration de l&apos;accessibilite est un processus
            continu base sur les retours utilisateurs.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            Pour signaler un probleme d&apos;accessibilite : <a href="mailto:contact@coccinelle.ai" className="text-gray-900 underline">contact@coccinelle.ai</a>
          </p>
        </section>

        {/* 13. Évolution */}
        <section id="evolution">
          <h2 className="text-xl font-bold text-gray-900 mb-4">13. Evolution et mise a jour</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900">Version actuelle</td><td className="py-2.5">2.0</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900">Date d&apos;entree en vigueur</td><td className="py-2.5">25 avril 2026</td></tr>
                <tr><td className="py-2.5 pr-4 font-medium text-gray-900">Preavis de modification</td><td className="py-2.5">30 jours pour toute modification substantielle, notification par email</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </article>
  );
}
