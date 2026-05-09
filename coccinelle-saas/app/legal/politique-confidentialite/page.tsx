import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialite - Coccinelle.ai',
  description: 'Politique de confidentialite RGPD de Coccinelle.ai. Donnees collectees, sous-traitants, droits, securite.',
};

const tocItems = [
  { id: 'responsable', label: '1. Responsable de traitement' },
  { id: 'engagement', label: '2. Introduction et engagement' },
  { id: 'donnees', label: '3. Donnees collectees' },
  { id: 'finalites', label: '4. Finalites et bases legales' },
  { id: 'agent-vocal', label: '5. Agent vocal IA' },
  { id: 'donnees-vocales', label: '6. Donnees vocales' },
  { id: 'localisation', label: '7. Localisation et hebergement' },
  { id: 'sous-traitants', label: '8. Sous-traitants (RGPD art. 28)' },
  { id: 'conservation', label: '9. Durees de conservation' },
  { id: 'droits', label: '10. Vos droits RGPD' },
  { id: 'securite', label: '11. Securite des donnees' },
  { id: 'mineurs', label: '12. Mineurs' },
  { id: 'ia', label: '13. IA et decisions automatisees' },
  { id: 'cookies', label: '14. Cookies' },
  { id: 'modifications', label: '15. Modifications' },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <article>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Politique de confidentialite</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            v2.0
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Derniere mise a jour : 25 avril 2026<br />
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
        {/* 1. Responsable */}
        <section id="responsable">
          <h2 className="text-xl font-bold text-gray-900 mb-4">1. Responsable de traitement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900">Societe</td><td className="py-2.5">Agentic Solutions SASU</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900">Representant legal</td><td className="py-2.5">Youssef Amrouche, President</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900">DPO</td><td className="py-2.5">Youssef Amrouche</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900">Email DPO</td><td className="py-2.5"><a href="mailto:privacy@coccinelle.ai" className="text-gray-900 underline">privacy@coccinelle.ai</a></td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900">Telephone</td><td className="py-2.5">+33 7 60 76 21 53</td></tr>
                <tr className="bg-gray-50"><td className="py-2.5 pr-4 font-medium text-gray-900">Adresse</td><td className="py-2.5">57B Chemin des Etroits, 31400 Toulouse, France</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Introduction */}
        <section id="engagement">
          <h2 className="text-xl font-bold text-gray-900 mb-4">2. Introduction et engagement</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Agentic Solutions s&apos;engage a proteger la vie privee de toutes les personnes dont les donnees
            sont traitees dans le cadre de la plateforme Coccinelle.ai.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm font-semibold text-blue-900 mb-2">Deux categories de personnes concernees :</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
              <li><strong>Clients directs</strong> : entreprises abonnees a Coccinelle.ai et leurs utilisateurs</li>
              <li><strong>Tiers appelants</strong> : clients finaux des entreprises abonnees qui interagissent avec l&apos;agent vocal</li>
            </ul>
          </div>
        </section>

        {/* 3. Données collectées */}
        <section id="donnees">
          <h2 className="text-xl font-bold text-gray-900 mb-4">3. Donnees collectees</h2>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">3.1 Donnees des clients directs</h3>
          <p className="text-gray-600 leading-relaxed mb-2 font-medium">Inscription :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Nom, prenom, adresse email professionnelle</li>
            <li>Nom de l&apos;entreprise, secteur d&apos;activite</li>
            <li>Numero de telephone professionnel</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mb-2 font-medium">Utilisation du service :</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Configuration de l&apos;agent vocal (prompt, voix, comportement)</li>
            <li>Base de connaissances (documents, FAQ)</li>
            <li>Agenda et rendez-vous</li>
            <li>Logs d&apos;utilisation et metriques de performance</li>
          </ul>
          <p className="text-gray-600 leading-relaxed mb-2 font-medium">Facturation :</p>
          <p className="text-gray-600 leading-relaxed mb-6">
            Informations de paiement traitees exclusivement par Stripe. Agentic Solutions ne stocke
            jamais les donnees de carte bancaire.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">3.2 Donnees des tiers appelants</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Numero de telephone de l&apos;appelant</li>
            <li>Date, heure et duree de l&apos;appel</li>
            <li>Transcription textuelle de la conversation</li>
            <li>Resume genere par l&apos;IA</li>
            <li>Donnees communiquees volontairement (nom, demande de rendez-vous, etc.)</li>
          </ul>
        </section>

        {/* 4. Finalités */}
        <section id="finalites">
          <h2 className="text-xl font-bold text-gray-900 mb-4">4. Finalites et bases legales</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Traitement</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Finalite</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Base legale RGPD</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Gestion du compte</td><td className="py-2.5 px-4">Administration</td><td className="py-2.5 px-4">Art. 6.1.b &mdash; Contrat</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Fourniture du service</td><td className="py-2.5 px-4">Agent vocal IA</td><td className="py-2.5 px-4">Art. 6.1.b &mdash; Contrat</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Facturation</td><td className="py-2.5 px-4">Paiement</td><td className="py-2.5 px-4">Art. 6.1.b &mdash; Contrat</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Support client</td><td className="py-2.5 px-4">Assistance technique</td><td className="py-2.5 px-4">Art. 6.1.b &mdash; Contrat</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Amelioration du service</td><td className="py-2.5 px-4">Analytics anonymes</td><td className="py-2.5 px-4">Art. 6.1.f &mdash; Interet legitime</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Securite</td><td className="py-2.5 px-4">Prevention fraude</td><td className="py-2.5 px-4">Art. 6.1.f &mdash; Interet legitime</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Conservation legale</td><td className="py-2.5 px-4">Obligation fiscale</td><td className="py-2.5 px-4">Art. 6.1.c &mdash; Obligation legale</td></tr>
                <tr><td className="py-2.5 px-4">Communication commerciale</td><td className="py-2.5 px-4">Newsletter</td><td className="py-2.5 px-4">Art. 6.1.a &mdash; Consentement</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Agent vocal IA */}
        <section id="agent-vocal">
          <h2 className="text-xl font-bold text-gray-900 mb-4">5. Agent vocal IA &mdash; traitement specifique</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            L&apos;agent vocal Coccinelle.ai utilise des technologies de traitement du langage naturel
            pour repondre aux appels telephoniques de maniere automatisee.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Transcription en temps reel par reconnaissance vocale (STT)</li>
            <li>Reponses generees par un modele de langage (LLM)</li>
            <li>Synthese vocale (TTS) pour la reponse orale</li>
          </ul>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Garanties :</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
              <li>Aucune prise de decision automatisee au sens de l&apos;article 22 du RGPD</li>
              <li>Les modeles d&apos;IA ne sont <strong>jamais entraines</strong> sur les donnees de nos clients</li>
              <li>Conservation des transcriptions limitee a 12 mois maximum</li>
            </ul>
          </div>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-sm font-semibold text-amber-900 mb-2">Obligation du Client :</p>
            <p className="text-sm text-amber-800">
              Le Client est tenu d&apos;informer ses appelants qu&apos;ils interagissent avec un agent vocal IA
              (et non un humain) et que la conversation est transcrite, conformement a l&apos;article L.226-1
              du Code penal et aux articles 13 et 14 du RGPD.
            </p>
          </div>
        </section>

        {/* 6. Données vocales */}
        <section id="donnees-vocales">
          <h2 className="text-xl font-bold text-gray-900 mb-4">6. Donnees vocales &mdash; protections renforcees</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Les transcriptions de conversations vocales sont des donnees potentiellement sensibles.
            Des mesures de protection renforcees sont appliquees :
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Chiffrement renforce au repos et en transit</li>
            <li>Acces strictement compartimente par tenant (isolation multi-tenant)</li>
            <li>Audit trail complet de chaque acces aux transcriptions</li>
            <li>Suppression definitive et securisee a l&apos;expiration du delai de conservation</li>
            <li>Aucun acces humain aux transcriptions sauf obligation legale</li>
          </ul>
        </section>

        {/* 7. Localisation */}
        <section id="localisation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7. Localisation et hebergement</h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
            <p className="text-sm text-green-800">
              Toutes les donnees personnelles sont hebergees au sein de l&apos;Union europeenne.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Composant</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Hebergeur</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Localisation</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Base de donnees</td><td className="py-2.5 px-4">Cloudflare D1</td><td className="py-2.5 px-4">Union Europeenne</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Agent vocal</td><td className="py-2.5 px-4">Scaleway</td><td className="py-2.5 px-4">Paris, France</td></tr>
                <tr><td className="py-2.5 px-4">Fichiers et sauvegardes</td><td className="py-2.5 px-4">Cloudflare R2</td><td className="py-2.5 px-4">Union Europeenne</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 8. Sous-traitants */}
        <section id="sous-traitants">
          <h2 className="text-xl font-bold text-gray-900 mb-4">8. Sous-traitants (RGPD art. 28)</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Conformement a l&apos;article 28 du RGPD, voici la liste complete de nos sous-traitants
            ayant acces aux donnees personnelles :
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Sous-traitant</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Role</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Pays</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Garantie RGPD</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Scaleway SAS</td><td className="py-2.5 px-4">Hebergement agent vocal</td><td className="py-2.5 px-4">France</td><td className="py-2.5 px-4">DPA signe</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Cloudflare Inc.</td><td className="py-2.5 px-4">BDD, CDN, Pages</td><td className="py-2.5 px-4">USA / EU</td><td className="py-2.5 px-4">CCT Commission EU</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Mistral AI</td><td className="py-2.5 px-4">Modele de langage (LLM)</td><td className="py-2.5 px-4">France</td><td className="py-2.5 px-4">DPA signe</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Twilio Inc.</td><td className="py-2.5 px-4">Telephonie voix et SMS</td><td className="py-2.5 px-4">USA</td><td className="py-2.5 px-4">CCT Commission EU</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">ElevenLabs Inc.</td><td className="py-2.5 px-4">Synthese vocale (TTS)</td><td className="py-2.5 px-4">USA</td><td className="py-2.5 px-4">CCT Commission EU</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Deepgram Inc.</td><td className="py-2.5 px-4">Transcription vocale (STT)</td><td className="py-2.5 px-4">USA</td><td className="py-2.5 px-4">CCT Commission EU</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Resend Inc.</td><td className="py-2.5 px-4">Envoi d&apos;emails</td><td className="py-2.5 px-4">USA</td><td className="py-2.5 px-4">CCT Commission EU</td></tr>
                <tr><td className="py-2.5 px-4">Stripe Inc.</td><td className="py-2.5 px-4">Paiement en ligne</td><td className="py-2.5 px-4">USA</td><td className="py-2.5 px-4">CCT Commission EU</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            CCT = Clauses Contractuelles Types adoptees par la Commission europeenne.
            DPA = Data Processing Agreement.
          </p>
        </section>

        {/* 9. Durées de conservation */}
        <section id="conservation">
          <h2 className="text-xl font-bold text-gray-900 mb-4">9. Durees de conservation</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Donnees</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Duree</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Justification</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Compte actif</td><td className="py-2.5 px-4">Duree de l&apos;abonnement</td><td className="py-2.5 px-4">Contrat</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Compte resilie</td><td className="py-2.5 px-4">3 ans</td><td className="py-2.5 px-4">Interet legitime</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Transcriptions d&apos;appels</td><td className="py-2.5 px-4">12 mois glissants</td><td className="py-2.5 px-4">Politique interne</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Donnees des appelants</td><td className="py-2.5 px-4">12 mois maximum</td><td className="py-2.5 px-4">Minimisation RGPD</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Logs techniques</td><td className="py-2.5 px-4">90 jours</td><td className="py-2.5 px-4">Securite</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Donnees de facturation</td><td className="py-2.5 px-4">10 ans</td><td className="py-2.5 px-4">Code de commerce</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Emails support</td><td className="py-2.5 px-4">3 ans</td><td className="py-2.5 px-4">Service client</td></tr>
                <tr><td className="py-2.5 px-4">Cookies analytics</td><td className="py-2.5 px-4">25 mois</td><td className="py-2.5 px-4">Recommandation CNIL</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Droits RGPD */}
        <section id="droits">
          <h2 className="text-xl font-bold text-gray-900 mb-4">10. Vos droits RGPD (articles 15 a 22)</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-900">Droit</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Article</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Delai</th>
                  <th className="py-3 px-4 font-semibold text-gray-900">Comment l&apos;exercer</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Acces</td><td className="py-2.5 px-4">Art. 15</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">privacy@coccinelle.ai</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Rectification</td><td className="py-2.5 px-4">Art. 16</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">Dashboard ou email</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Effacement</td><td className="py-2.5 px-4">Art. 17</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">privacy@coccinelle.ai</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Portabilite</td><td className="py-2.5 px-4">Art. 20</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">Export depuis le dashboard</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2.5 px-4">Opposition</td><td className="py-2.5 px-4">Art. 21</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">privacy@coccinelle.ai</td></tr>
                <tr className="border-b border-gray-100 bg-gray-50"><td className="py-2.5 px-4">Limitation</td><td className="py-2.5 px-4">Art. 18</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">privacy@coccinelle.ai</td></tr>
                <tr><td className="py-2.5 px-4">Decision automatisee</td><td className="py-2.5 px-4">Art. 22</td><td className="py-2.5 px-4">1 mois</td><td className="py-2.5 px-4">privacy@coccinelle.ai</td></tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="mb-2">Une piece d&apos;identite pourra etre demandee pour verifier votre identite.</p>
            <p className="mb-2">Le delai de reponse est extensible a 3 mois en cas de demande complexe ou de volume important.</p>
            <p>
              <strong className="text-gray-900">Reclamation CNIL :</strong>{' '}
              <a href="https://www.cnil.fr" className="text-gray-900 underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
              {' '}&mdash; 3 Place de Fontenoy, 75007 Paris &mdash; 01 53 73 22 22
            </p>
          </div>
        </section>

        {/* 11. Sécurité */}
        <section id="securite">
          <h2 className="text-xl font-bold text-gray-900 mb-4">11. Securite des donnees</h2>
          <h3 className="text-base font-semibold text-gray-900 mt-4 mb-3">Mesures techniques :</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Chiffrement en transit : TLS 1.3</li>
            <li>Chiffrement au repos : AES-256</li>
            <li>Authentification : JWT avec expiration courte</li>
            <li>Isolation stricte des donnees par tenant (architecture multi-tenant)</li>
            <li>Principe du moindre privilege pour tous les acces</li>
          </ul>
          <h3 className="text-base font-semibold text-gray-900 mt-4 mb-3">Mesures organisationnelles :</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
            <li>Acces aux donnees de production limite au personnel strictement autorise</li>
            <li>Journalisation de tous les acces aux donnees sensibles</li>
            <li>Notification a la CNIL sous 72h en cas de violation de donnees (art. 33 RGPD)</li>
            <li>Notification aux personnes concernees en cas de risque eleve (art. 34 RGPD)</li>
          </ul>
        </section>

        {/* 12. Mineurs */}
        <section id="mineurs">
          <h2 className="text-xl font-bold text-gray-900 mb-4">12. Mineurs</h2>
          <p className="text-gray-600 leading-relaxed">
            Coccinelle.ai est un service destine exclusivement aux professionnels. L&apos;age minimum
            d&apos;utilisation est de 16 ans. Si nous constatons qu&apos;un mineur a cree un compte,
            les donnees seront supprimees immediatement.
          </p>
        </section>

        {/* 13. IA */}
        <section id="ia">
          <h2 className="text-xl font-bold text-gray-900 mb-4">13. IA et decisions automatisees</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>L&apos;IA <strong className="text-gray-900">assiste</strong>, elle ne decide pas : aucune decision
              a effets juridiques significatifs n&apos;est prise de maniere automatisee</li>
            <li>Une validation humaine est toujours possible (transfert vers un humain)</li>
            <li>Aucun profilage a effets juridiques significatifs au sens de l&apos;art. 22 RGPD</li>
            <li>Les modeles d&apos;IA ne sont <strong className="text-gray-900">jamais entraines</strong> sur les
              donnees de nos clients</li>
          </ul>
        </section>

        {/* 14. Cookies */}
        <section id="cookies">
          <h2 className="text-xl font-bold text-gray-900 mb-4">14. Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            L&apos;utilisation des cookies est detaillee dans notre{' '}
            <Link href="/legal/politique-cookies" className="text-gray-900 underline">
              Politique de cookies
            </Link>.
          </p>
        </section>

        {/* 15. Modifications */}
        <section id="modifications">
          <h2 className="text-xl font-bold text-gray-900 mb-4">15. Modifications de cette politique</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Notification par email 30 jours avant toute modification substantielle</li>
            <li>Historique des versions conserve pendant 5 ans</li>
            <li>Possibilite de resilier votre abonnement en cas de desaccord avec les nouvelles conditions</li>
          </ul>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody className="text-gray-600">
                <tr className="border-b border-gray-100"><td className="py-2.5 pr-4 font-medium text-gray-900">Version</td><td className="py-2.5">2.0</td></tr>
                <tr><td className="py-2.5 pr-4 font-medium text-gray-900">Date d&apos;entree en vigueur</td><td className="py-2.5">25 avril 2026</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </article>
  );
}
