-- Revue de la migration 0084 — A EXECUTER DEUX FOIS : avant, puis apres.
-- Lecture seule, aucune ecriture.
--
--   ./node_modules/.bin/wrangler d1 execute coccinelle-db-eu --remote \
--     --file=design/cx2/revue-0084.sql
--
-- Critere de reussite :
--   - bloc STRUCTURE : les 5 valeurs passent de 0 a 1 ;
--   - bloc VOLUMES   : toutes les valeurs sont RIGOUREUSEMENT IDENTIQUES avant
--                      et apres. Toute variation signifie que la migration a
--                      touche des donnees : elle ne le doit pas.
--
-- APRES la migration uniquement, un dernier controle — le DEFAUT applique par
-- SQLite doit avoir renseigne TOUTES les configs (valeur attendue = cfg_total) :
--
--   ./node_modules/.bin/wrangler d1 execute coccinelle-db-eu --remote --command \
--     "SELECT COUNT(*) AS avec_defaut FROM voixia_configs WHERE after_hours_behavior = 'message';"
--
-- Il ne peut pas figurer dans ce fichier : SQLite resout les colonnes a la
-- preparation de la requete, donc une reference a after_hours_behavior ferait
-- echouer le passage AVANT, meme protegee par un CASE.
--
-- Note : une seule ligne a N colonnes, et non N lignes en UNION ALL — D1 limite
-- le nombre de termes d'un SELECT compose (« too many terms in compound SELECT »).

-- ── STRUCTURE (0 = absent, 1 = present) ──────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM pragma_table_info('knowledge_documents')
    WHERE name = 'deleted_at')                     AS col_documents_deleted_at,
  (SELECT COUNT(*) FROM pragma_table_info('voixia_configs')
    WHERE name = 'after_hours_behavior')           AS col_cfg_after_hours_behavior,
  (SELECT COUNT(*) FROM pragma_table_info('voixia_configs')
    WHERE name = 'after_hours_message')            AS col_cfg_after_hours_message,
  (SELECT COUNT(*) FROM sqlite_master
    WHERE type = 'table' AND name = 'knowledge_document_versions')
                                                   AS table_versions,
  (SELECT COUNT(*) FROM sqlite_master
    WHERE type = 'index' AND name = 'idx_kdv_document_version')
                                                   AS index_unique_version;

-- ── VOLUMES (doivent etre inchanges) ─────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM knowledge_documents)                      AS doc_total,
  (SELECT COUNT(*) FROM knowledge_documents WHERE is_active = 1)  AS doc_actifs,
  (SELECT COUNT(*) FROM knowledge_documents WHERE is_active = 0)  AS doc_inactifs,
  (SELECT COUNT(*) FROM knowledge_chunks)                         AS fiches_total,
  (SELECT COUNT(*) FROM tenants)                                  AS tenants,
  (SELECT COUNT(*) FROM voixia_configs)                           AS cfg_total,
  (SELECT COUNT(*) FROM ai_prompt_versions WHERE is_active = 1)   AS prompts_actifs,
  -- Garage Toulouse — seul tenant de recette de ce chantier.
  (SELECT COUNT(*) FROM knowledge_documents
    WHERE tenant_id = 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t'
      AND is_active = 1)                                          AS gt_documents,
  (SELECT COUNT(*) FROM knowledge_chunks
    WHERE tenant_id = 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t')  AS gt_fiches;
