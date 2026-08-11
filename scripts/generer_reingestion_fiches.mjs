// Genere le SQL de re-ingestion des fiches pour les documents DEJA en base.
//
//   npx wrangler d1 execute coccinelle-db-eu --remote --json \
//     --command "SELECT id, tenant_id, title, content FROM knowledge_documents WHERE is_active=1;" \
//     > /tmp/docs.json
//   node scripts/generer_reingestion_fiches.mjs /tmp/docs.json > scripts/reingestion_fiches.sql
//
// Le SQL est produit par le MEME module que le code deploye (kb-fiches.js) : un
// script retape a la main avait deja produit, le 08/08, deux structures
// divergentes entre la base et le generateur. Ici la divergence est impossible.

import { readFileSync } from 'fs';
import { construireFiches, detecterStructure } from '../src/modules/shared/kb-fiches.js';

const chemin = process.argv[2];
if (!chemin) {
  console.error('Usage : node scripts/generer_reingestion_fiches.mjs <export.json>');
  process.exit(1);
}

const brut = JSON.parse(readFileSync(chemin, 'utf8'));
const documents = Array.isArray(brut) ? (brut[0]?.results || []) : (brut.results || []);

const q = (s) => String(s).replace(/'/g, "''");
const lignes = [];
let totalFiches = 0;
let docsTabulaires = 0;
const resume = [];

lignes.push('-- ============================================================================');
lignes.push('-- Re-ingestion des fiches — documents deja en base');
lignes.push('-- Genere par scripts/generer_reingestion_fiches.mjs depuis shared/kb-fiches.js');
lignes.push('--');
lignes.push('-- Un document tabulaire engendre une fiche par ligne dans knowledge_chunks.');
lignes.push('-- Les documents rediges ne produisent rien : ils restent servis par la');
lignes.push('-- recherche prose, inchangee. Aucun knowledge_documents n\'est modifie,');
lignes.push('-- hormis son compteur chunk_count.');
lignes.push('-- ============================================================================');
lignes.push('');
lignes.push('-- ── CONTROLE AVANT ──');
lignes.push("SELECT COUNT(*) AS fiches_avant FROM knowledge_chunks;");
lignes.push('');

for (const doc of documents) {
  const contenu = doc.content || '';
  const structure = detecterStructure(contenu);
  const fiches = construireFiches(contenu);

  resume.push({
    titre: doc.title,
    structure: structure.type,
    fiches: fiches.length,
    tenant: doc.tenant_id,
  });

  // Purge systematique : un document devenu prose ne doit pas garder d'anciennes fiches.
  lignes.push(`-- ── ${doc.title} (${structure.type}, ${fiches.length} fiche(s))`);
  lignes.push(`DELETE FROM knowledge_chunks WHERE document_id = '${q(doc.id)}';`);

  if (fiches.length === 0) {
    lignes.push(`UPDATE knowledge_documents SET chunk_count = 0 WHERE id = '${q(doc.id)}';`);
    lignes.push('');
    continue;
  }

  docsTabulaires++;
  totalFiches += fiches.length;

  for (let i = 0; i < fiches.length; i++) {
    const f = fiches[i];
    const meta = JSON.stringify({
      type: 'fiche',
      libelle: f.libelle,
      prix: f.prix,
      details: f.details,
      categorie: f.categorie,
    });
    lignes.push(
      `INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)\n`
      + `VALUES ('fiche_${q(doc.id)}_${i}', '${q(doc.id)}', '${q(doc.tenant_id)}', ${i}, `
      + `'${q(f.texte)}', ${Math.ceil(f.texte.length / 4)}, '${q(meta)}', datetime('now'));`,
    );
  }
  lignes.push(`UPDATE knowledge_documents SET chunk_count = ${fiches.length} WHERE id = '${q(doc.id)}';`);
  lignes.push('');
}

lignes.push('-- ── CONTROLE APRES ──');
lignes.push(`SELECT COUNT(*) AS fiches_apres FROM knowledge_chunks;`);
lignes.push('SELECT t.name AS societe, COUNT(*) AS fiches FROM knowledge_chunks kc');
lignes.push('  LEFT JOIN tenants t ON t.id = kc.tenant_id GROUP BY kc.tenant_id ORDER BY fiches DESC;');
lignes.push('-- Garde-fou : aucune fiche sans libelle exploitable (attendu : 0 ligne)');
lignes.push("SELECT id, content FROM knowledge_chunks WHERE content IS NULL OR TRIM(content) = '';");

console.log(lignes.join('\n'));

console.error(`\n── Resume (stderr, non inclus dans le SQL) ──`);
console.error(`${documents.length} documents lus, ${docsTabulaires} tabulaires, ${totalFiches} fiches generees.`);
for (const r of resume.filter(r => r.fiches > 0)) {
  console.error(`  ${String(r.fiches).padStart(3)} fiches  ${r.titre}`);
}
const prose = resume.filter(r => r.fiches === 0);
console.error(`  ${prose.length} document(s) rediges laisses au chemin prose.`);
