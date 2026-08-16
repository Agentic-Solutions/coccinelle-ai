'use client';

/**
 * « Garder mon numéro et renvoyer ma ligne » — section d'aide (16/08/2026).
 *
 * POURQUOI UNE SECTION VERSIONNÉE ET NON UNE ENTRÉE DE FAQ
 * La FAQ de cette page vient de la base (`/api/v1/faq`) et ne porte que des réponses
 * d'une ligne. Ceci est une marche à suivre, avec deux tableaux de codes et un cas
 * particulier — ça ne tient pas dans un champ texte, et surtout ça ne doit pas
 * dépendre d'une table qui compte 0 ligne aujourd'hui.
 *
 * ⚠️ CE QUI EST VRAI, ET CE QUI NE L'EST PAS (vérifié en base le 16/08/2026)
 * Aucun tenant Coccinelle n'a de numéro dédié aujourd'hui : `number_pool` est vide,
 * l'inscription ne provisionne rien (l'achat de numéro n'existe que dans le portail
 * revendeur), et le seul dossier réglementaire en base est en `draft`. D'où la
 * séparation en DEUX MOMENTS, qui n'est pas un effet de style :
 *   — pendant l'essai, le client n'a AUCUN renvoi à faire (il appelle le numéro
 *     d'essai partagé depuis son mobile vérifié, § e de CLAUDE.md) ;
 *   — le renvoi appartient à la mise en service, après attribution.
 * Fusionner les deux moments ferait de cette page une promesse creuse.
 *
 * ⚠️ LES CODES NE SONT PAS ÉCRITS DE MÉMOIRE. Ils viennent de la documentation des
 * opérateurs, et la sous-section « Vérifié auprès de qui » nomme les deux que nous
 * n'avons pas pu lire. Un code affirmé au hasard envoie un client composer une
 * séquence sans effet, puis conclure que le produit ne marche pas.
 */

import { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

export default function GarderSonNumero() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={ouvert}
      >
        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-[15px] font-semibold text-gray-900">
          Garder mon numéro et renvoyer ma ligne
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${ouvert ? 'rotate-180' : ''}`}
        />
      </button>

      {ouvert && (
        <div className="px-5 pb-6 pt-1 border-t border-gray-100 space-y-5 text-sm text-gray-600 leading-relaxed">
          <p>
            Votre numéro ne change pas. Nous vous attribuons une ligne française, et vous
            demandez à votre opérateur de renvoyer vos appels vers elle. Vos clients continuent
            d&apos;appeler le numéro qu&apos;ils connaissent.
          </p>

          <div>
            <p className="font-medium text-gray-900 mb-1">Quand ?</p>
            <p>
              Pas pendant l&apos;essai — vous n&apos;avez rien à renvoyer. Pendant l&apos;essai,
              vous appelez votre assistant depuis votre mobile vérifié pour l&apos;entendre.
              Le renvoi est l&apos;étape de la mise en service.
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900 mb-1">Ce qu&apos;il vous faut d&apos;abord</p>
            <p>
              La ligne française est attribuée après une validation réglementaire de
              l&apos;opérateur : <strong className="text-gray-800">Kbis</strong>,{' '}
              <strong className="text-gray-800">pièce d&apos;identité du représentant légal</strong>,{' '}
              <strong className="text-gray-800">justificatif d&apos;adresse</strong> et{' '}
              <strong className="text-gray-800">SIRET</strong>. Comptez{' '}
              <strong className="text-gray-800">2 à 3 jours ouvrés</strong> après réception de
              vos documents.
            </p>
          </div>

          <p className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <strong className="text-gray-800">Le renvoi se fait chez votre opérateur, pas chez
            nous.</strong> Nous ne pouvons pas l&apos;activer à votre place.
          </p>

          <div>
            <p className="font-medium text-gray-900 mb-2">Depuis un mobile</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">Activer</td>
                    <td className="py-2 font-mono text-gray-900">**21* + le numéro + #</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">Vérifier</td>
                    <td className="py-2 font-mono text-gray-900">*#21#</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">Annuler</td>
                    <td className="py-2 font-mono text-gray-900">##21#</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Orange documente la variante <span className="font-mono">**21*</span> + numéro +{' '}
              <span className="font-mono">*11#</span>, qui limite le renvoi aux appels vocaux.
              Les deux formes fonctionnent.
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-900 mb-2">Depuis une ligne fixe</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">Activer</td>
                    <td className="py-2 font-mono text-gray-900">*21* + le numéro + #</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">Annuler</td>
                    <td className="py-2 font-mono text-gray-900">#21#</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Le cas le plus utile de la page : un artisan dont le numero de devanture
              est une ligne fixe passe presque toujours par une box. Sans cet
              avertissement, il compose un code sans effet et conclut que ca ne marche pas. */}
          <div className="border-l-2 border-gray-300 pl-4">
            <p className="font-medium text-gray-900 mb-1">Si votre ligne fixe passe par une box</p>
            <p>
              Livebox, Freebox, box SFR ou Bouygues : le renvoi se règle en général{' '}
              <strong className="text-gray-800">dans l&apos;espace client de votre opérateur</strong>,
              et les codes ci-dessus peuvent rester sans effet. Cherchez « renvoi d&apos;appel »
              dans votre espace client, ou demandez-le au service client.
            </p>
          </div>

          <div className="text-xs text-gray-500 border-t border-gray-100 pt-4">
            <p className="font-medium text-gray-700 mb-1">Vérifié auprès de qui</p>
            <p>
              Les codes ci-dessus sont la norme GSM, commune aux quatre opérateurs français.
              Nous les avons lus dans la documentation d&apos;<strong>Orange</strong> (mobile et
              fixe) et de <strong>Free</strong> (mobile). Pour <strong>SFR</strong> et{' '}
              <strong>Bouygues Telecom</strong>, nous n&apos;avons pas pu consulter la
              documentation officielle : si un code ne fonctionne pas, demandez le code de
              renvoi immédiat à votre service client.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
