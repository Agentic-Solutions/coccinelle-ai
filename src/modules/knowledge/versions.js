// Versionnement des documents de la base de connaissances (chantier CX-2).
//
// ON VERSIONNE LE DOCUMENT, JAMAIS LA FICHE. Une fiche est une projection :
// indexerFiches() les supprime et les reconstruit integralement depuis
// knowledge_documents.content a chaque ecriture. Versionner un chunk, ce serait
// versionner un cache — et la restauration ne survivrait pas a la premiere
// re-ingestion.
//
// Une version est ecrite AVANT chaque modification. L'etat d'origine reste donc
// restaurable, y compris le tout premier, qui n'a par definition jamais ete
// « modifie ».

import { logger } from '../../utils/logger.js';
import { construireFiches } from '../shared/kb-fiches.js';
import { ecrireContenuDocument } from '../shared/kb-ingest.js';

/** Au-dela, la carte « Historique » n'est plus lisible. */
const MAX_HISTORIQUE = 20;

/** Fenetre de restauration d'un document supprime, en jours. */
export const JOURS_CORBEILLE = 30;

/**
 * Fige l'etat courant d'un document avant de le modifier.
 *
 * @returns {Promise<number|null>} le numero de version ecrit, null si le
 *          document n'existe pas (l'appelant a deja verifie le tenant).
 */
export async function enregistrerVersion(env, { documentId, tenantId, auteur, motif }) {
  const doc = await env.DB.prepare(
    'SELECT title, content FROM knowledge_documents WHERE id = ? AND tenant_id = ?',
  ).bind(documentId, tenantId).first();
  if (!doc) return null;

  const dernier = await env.DB.prepare(
    'SELECT MAX(version) AS v FROM knowledge_document_versions WHERE document_id = ?',
  ).bind(documentId).first();
  const version = (dernier?.v || 0) + 1;

  // L'index UNIQUE (document_id, version) fait echouer deux ecritures
  // concurrentes plutot que de creer deux versions 4 inordonnables.
  await env.DB.prepare(`
    INSERT INTO knowledge_document_versions
      (document_id, tenant_id, version, title, content, auteur, motif, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    documentId, tenantId, version,
    doc.title, doc.content, auteur || 'inconnu', motif || 'edition_document',
  ).run();

  return version;
}

/**
 * Remet un document dans l'etat d'une version anterieure.
 *
 * L'etat courant est lui-meme versionne avant d'etre remplace : annuler une
 * restauration reste possible. Une restauration n'est pas une perte.
 */
export async function restaurerVersion(env, { versionId, tenantId, auteur }) {
  const version = await env.DB.prepare(`
    SELECT id, document_id, title, content
      FROM knowledge_document_versions
     WHERE id = ? AND tenant_id = ?
  `).bind(versionId, tenantId).first();
  if (!version) return { error: 'Version introuvable', status: 404 };

  const doc = await env.DB.prepare(
    'SELECT id FROM knowledge_documents WHERE id = ? AND tenant_id = ?',
  ).bind(version.document_id, tenantId).first();
  if (!doc) return { error: 'Document introuvable', status: 404 };

  await enregistrerVersion(env, {
    documentId: version.document_id, tenantId, auteur, motif: 'restauration',
  });

  if (version.title) {
    await env.DB.prepare(
      'UPDATE knowledge_documents SET title = ? WHERE id = ? AND tenant_id = ?',
    ).bind(version.title, version.document_id, tenantId).run();
  }

  const indexation = await ecrireContenuDocument(env, {
    documentId: version.document_id,
    tenantId,
    contenu: version.content || '',
  });

  logger.info('[KB] Version restauree', {
    tenantId, documentId: version.document_id, versionId, fiches: indexation.fiches,
  });

  return { document_id: version.document_id, fiches: indexation.fiches };
}

/**
 * Resume un changement en langage client : « Vidange 79 euros → 85 euros ».
 *
 * On compare les FICHES et non les textes : un diff de caracteres dirait
 * « ligne 12 modifiee », ce qui n'apprend rien a un garagiste. La comparaison
 * se fait par libelle, donc elle survit a un deplacement de ligne.
 */
export function resumerChangement(avant, apres) {
  const fichesAvant = construireFiches(avant || '');
  const fichesApres = construireFiches(apres || '');

  if (fichesAvant.length || fichesApres.length) {
    const parLibelle = new Map(fichesApres.map(f => [f.libelle, f]));

    for (const a of fichesAvant) {
      const b = parLibelle.get(a.libelle);
      if (!b) return { libelle: a.libelle, avant: a.prix || a.details, apres: null, type: 'suppression' };
      if (b.prix !== a.prix) return { libelle: a.libelle, avant: a.prix, apres: b.prix, type: 'prix' };
      if (b.details !== a.details) {
        return { libelle: a.libelle, avant: a.details, apres: b.details, type: 'details' };
      }
    }

    const libellesAvant = new Set(fichesAvant.map(f => f.libelle));
    const ajoutee = fichesApres.find(f => !libellesAvant.has(f.libelle));
    if (ajoutee) {
      return { libelle: ajoutee.libelle, avant: null, apres: ajoutee.prix, type: 'ajout' };
    }
  }

  if ((avant || '') === (apres || '')) return null;
  return { libelle: null, avant: null, apres: null, type: 'document' };
}

/**
 * Les dernieres modifications du tenant, pretes a afficher.
 *
 * L'« apres » d'une version est l'etat de la version SUIVANTE — ou le contenu
 * actuel du document pour la plus recente. C'est ce qui permet d'afficher
 * « 79 → 85 » sans stocker le diff.
 */
export async function listerHistorique(env, tenantId, limite = MAX_HISTORIQUE) {
  const versions = await env.DB.prepare(`
    SELECT v.id, v.document_id, v.version, v.content, v.motif, v.auteur, v.created_at,
           d.title AS titre_actuel, d.content AS contenu_actuel, d.is_active
      FROM knowledge_document_versions v
      JOIN knowledge_documents d ON d.id = v.document_id
     WHERE v.tenant_id = ?
     ORDER BY v.created_at DESC, v.id DESC
     LIMIT ?
  `).bind(tenantId, Math.min(limite, MAX_HISTORIQUE)).all();

  const lignes = versions.results || [];

  // Pour chaque document, la version qui suit immediatement celle-ci.
  const suivantes = new Map();
  for (const l of lignes) {
    const cle = `${l.document_id}:${l.version + 1}`;
    suivantes.set(cle, null);
  }
  if (suivantes.size) {
    const ids = [...new Set(lignes.map(l => l.document_id))];
    const res = await env.DB.prepare(`
      SELECT document_id, version, content
        FROM knowledge_document_versions
       WHERE tenant_id = ? AND document_id IN (${ids.map(() => '?').join(',')})
    `).bind(tenantId, ...ids).all();
    for (const v of res.results || []) {
      suivantes.set(`${v.document_id}:${v.version}`, v.content);
    }
  }

  return lignes.map(l => {
    const cle = `${l.document_id}:${l.version + 1}`;
    const apres = suivantes.has(cle) && suivantes.get(cle) !== null
      ? suivantes.get(cle)
      : l.contenu_actuel;
    const resume = resumerChangement(l.content, apres);
    return {
      version_id: l.id,
      document_id: l.document_id,
      document_titre: l.titre_actuel,
      version: l.version,
      motif: l.motif,
      auteur: l.auteur,
      date: l.created_at,
      document_actif: l.is_active === 1,
      resume,
    };
  });
}
