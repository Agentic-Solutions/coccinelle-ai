// Indexation des fiches — le pont entre le normaliseur (kb-fiches.js, pur) et D1.
//
// Un document tabulaire engendre UNE FICHE PAR LIGNE dans knowledge_chunks.
// Le document d'origine n'est jamais modifie : il reste consultable tel que le
// client l'a importe, et sert toujours de repli quand aucune fiche ne repond.
//
// A appeler apres CHAQUE ecriture de knowledge_documents. Ne leve jamais : une
// indexation ratee ne doit pas empecher la creation du document (le tunnel
// d'onboarding est le chemin P0 du produit).

import { logger } from '../../utils/logger.js';
import { construireFiches } from './kb-fiches.js';

/** Au-dela, le document n'est plus un catalogue mais un export brut. */
const MAX_FICHES = 300;

/**
 * (Re)construit les fiches d'un document.
 * @returns {Promise<{fiches: number, structure: string}>}
 */
export async function indexerFiches(env, { documentId, tenantId, contenu }) {
  try {
    if (!env?.DB || !documentId || !tenantId) return { fiches: 0, structure: 'ignore' };

    const fiches = construireFiches(contenu).slice(0, MAX_FICHES);

    // Purge systematique, meme quand il n'y a plus de fiche : un document
    // tabulaire remplace par du texte redige laisserait sinon ses anciennes
    // fiches en base, et l'agent repondrait avec des tarifs supprimes.
    await env.DB.prepare('DELETE FROM knowledge_chunks WHERE document_id = ?')
      .bind(documentId).run();

    if (fiches.length === 0) {
      await env.DB.prepare(
        'UPDATE knowledge_documents SET chunk_count = 0 WHERE id = ?',
      ).bind(documentId).run();
      return { fiches: 0, structure: 'prose' };
    }

    const instructions = fiches.map((fiche, i) => env.DB.prepare(`
      INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      `fiche_${documentId}_${i}`,
      documentId,
      tenantId,
      i,
      fiche.texte,
      Math.ceil(fiche.texte.length / 4),
      JSON.stringify({
        type: 'fiche',
        libelle: fiche.libelle,
        prix: fiche.prix,
        details: fiche.details,
        categorie: fiche.categorie,
      }),
    ));

    await env.DB.batch(instructions);
    await env.DB.prepare(
      'UPDATE knowledge_documents SET chunk_count = ? WHERE id = ?',
    ).bind(fiches.length, documentId).run();

    logger.info('[KB] Fiches indexees', { tenantId, documentId, fiches: fiches.length });
    return { fiches: fiches.length, structure: 'tableau' };
  } catch (error) {
    // Non bloquant, par choix : le document existe, la recherche prose le
    // couvre, et l'echec est visible dans les logs.
    logger.warn('[KB] Indexation des fiches echouee', {
      documentId, erreur: error?.message,
    });
    return { fiches: 0, structure: 'erreur' };
  }
}
