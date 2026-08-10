-- ============================================================================
-- Purge des tenants jetables — coccinelle-db-eu
-- Généré le 2026-08-10. À EXÉCUTER PAR YOUSSEF :
--   npx wrangler d1 execute coccinelle-db-eu --remote --file=scripts/purge_tenants.sql
--
-- ⚠️ FAIRE UN EXPORT D1 JUSTE AVANT :
--   npx wrangler d1 export coccinelle-db-eu --remote --output=backup_avant_purge.sql
--
-- ⚠️ PAS DE TRANSACTION EXPLICITE : D1 REFUSE « BEGIN TRANSACTION » (erreur 7500,
-- « please use state.storage.transaction() instead »). Les instructions d'un
-- fichier sont envoyées à D1 en un seul lot, exécuté de façon atomique côté
-- moteur — mais on ne peut pas l'écrire dans le SQL. L'export préalable reste
-- donc le VRAI filet de sécurité.
--
-- PRINCIPE : tout ce qui n'appartient pas aux 7 tenants conservés est supprimé.
-- Écrit en NOT IN plutôt qu'en liste de 150 identifiants : si un tenant jetable
-- a été créé entre la génération de ce script et son exécution, il part aussi,
-- au lieu d'être oublié.
--
-- GARDES :
--   - `tenant_id IS NOT NULL` : on ne touche pas aux lignes non rattachées ;
--   - `tenant_id <> 'global'` : task_types contient des types GLOBAUX partagés
--     (CLAUDE.md § f) — un NOT IN nu les aurait supprimés.
--
-- CONSERVÉS :
--   Garage Toulouse — tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg
--   Coccinelle.ai — tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp
--   AMROUCHE — tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t
--   Syndic Horizon — tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk
--   Léa — tenant_mrci7x0u23wuqu5gf1q
--   Léo — tenant_mrlxfcxtsc6vcmwwmii
--   Agentic solutions — tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy
--
-- ⚠️ « Garage Toulouse » N'EXISTE PAS en base au moment de la génération. Il est
-- laissé dans la liste pour que le script reste correct après sa recréation,
-- mais tant qu'il n'existe pas, PLUS AUCUN tenant n'aura le 0760762153 vérifié
-- après ce script : les appels au +33939035761 tomberont sur la configuration
-- générique de resolve-phone, sans tenant.
-- ============================================================================

-- ══ CONTRÔLE AVANT ══
SELECT
  (SELECT COUNT(*) FROM tenants)                                              AS tenants,
  (SELECT COUNT(*) FROM users)                                                AS utilisateurs,
  (SELECT COUNT(*) FROM calls)                                                AS appels,
  (SELECT COUNT(*) FROM knowledge_documents)                                  AS docs_kb,
  (SELECT COUNT(*) FROM omni_phone_mappings)                                  AS mappings,
  (SELECT COUNT(*) FROM ai_prompt_versions)                                   AS prompts,
  (SELECT COUNT(*) FROM users WHERE phone_verified=1
     AND REPLACE(phone,'+33','0')='0760762153')                               AS verifies_0760762153;

-- Répartition avant purge (attendu : 7 conservés / 150 à supprimer)
SELECT CASE WHEN id IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  ) THEN 'CONSERVE' ELSE 'A SUPPRIMER' END AS sort,
       COUNT(*) AS nb
FROM tenants GROUP BY sort;


-- ══ ÉTAPE 1 — tables filles rattachées par leur parent ══
DELETE FROM call_events WHERE call_id IN (
  SELECT id FROM calls WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM call_interactions WHERE call_id IN (
  SELECT id FROM calls WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM call_messages WHERE call_id IN (
  SELECT id FROM calls WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM calls_extracted WHERE call_id IN (
  SELECT id FROM calls WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM omni_messages WHERE conversation_id IN (
  SELECT id FROM omni_conversations WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM team_members WHERE team_id IN (
  SELECT id FROM teams WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM agent_services WHERE agent_id IN (
  SELECT id FROM agents WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM knowledge_crawl_jobs WHERE agent_id IN (
  SELECT id FROM agents WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);
DELETE FROM property_matches WHERE prospect_id IN (
  SELECT id FROM prospects WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  )
);

-- ══ ÉTAPE 2 — 85 tables portant un tenant_id ══
DELETE FROM agent_invitations WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM agents WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM ai_interaction_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM ai_prompt_versions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM appointment_notifications WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM appointment_settings WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM appointment_types WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM appointments WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM assignment_rules WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM audit_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM availability_slots WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM billing_invoices WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM billing_payment_methods WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM billing_subscriptions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM billing_usage WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM business_hours WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM calendar_blocks WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM call_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM call_summaries WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM calls WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM channel_configurations WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM channel_messages_log WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM churn_feedback WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM client_compliance WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM commercial_agent_services WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM commercial_agents WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM compliance_documents WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM crawl_jobs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM customers WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM email_domains WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM email_processed WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM feedback WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM integration_sync_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM integration_sync_queue WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM integration_webhook_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM knowledge_base WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM knowledge_chunks WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM knowledge_documents WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM knowledge_faq WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM knowledge_search_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM knowledge_snippets WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM member_skills WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM notification_preferences WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM notifications WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM oauth_google_tokens WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM oauth_outlook_tokens WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM oauth_yahoo_tokens WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_agent_configs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_cloudflare_auth WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_conversations WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_email_configs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_phone_mappings WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_rule_executions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM omni_rules WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM onboarding_analytics WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM onboarding_events WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM onboarding_sessions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM proactive_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM proactive_settings WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM proactive_templates WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM processed_emails WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM product_categories WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM product_matches WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM product_variants WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM products WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM properties WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM prospects WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM push_subscriptions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM qualified_prospects WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM rendez_vous WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM services WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM sessions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM subscriptions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM support_tickets WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM task_types WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM tasks WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM teams WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM tenant_channels WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM tenant_integrations WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM tenant_role_permissions WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM tickets WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM user_invitations WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM vapi_call_logs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM vapi_calls WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM voixia_configs WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );

-- ══ ÉTAPE 3 — utilisateurs, puis tenants (ordre imposé par les clés étrangères) ══
DELETE FROM users   WHERE tenant_id IS NOT NULL AND tenant_id <> 'global' AND tenant_id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );
DELETE FROM tenants WHERE id NOT IN (
    'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg',
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',
    'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk',
    'tenant_mrci7x0u23wuqu5gf1q',
    'tenant_mrlxfcxtsc6vcmwwmii',
    'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
  );

-- ══ ÉTAPE 4 — dévérification du 0760762153 sur les tenants conservés ══
-- Sans cela, AMROUCHE (créé le 17/07) capterait le numéro d'essai à la place de
-- Garage Toulouse : la branche « appelant » retient le tenant le PLUS RÉCENT
-- parmi les utilisateurs vérifiés portant ce numéro.
UPDATE users SET phone_verified = 0
WHERE REPLACE(phone,'+33','0') = '0760762153'
  AND tenant_id IN (
    'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t',  -- AMROUCHE
    'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'   -- Coccinelle.ai
  );

-- ══ CONTRÔLE APRÈS ══
-- attendu : tenants = 6 (7 après recréation de Garage Toulouse),
--           verifies_0760762153 = 0 (1 une fois Garage Toulouse recréé et vérifié)
SELECT
  (SELECT COUNT(*) FROM tenants)                                              AS tenants,
  (SELECT COUNT(*) FROM users)                                                AS utilisateurs,
  (SELECT COUNT(*) FROM calls)                                                AS appels,
  (SELECT COUNT(*) FROM knowledge_documents)                                  AS docs_kb,
  (SELECT COUNT(*) FROM omni_phone_mappings)                                  AS mappings,
  (SELECT COUNT(*) FROM ai_prompt_versions)                                   AS prompts,
  (SELECT COUNT(*) FROM users WHERE phone_verified=1
     AND REPLACE(phone,'+33','0')='0760762153')                               AS verifies_0760762153;

-- Reste-t-il des lignes orphelines rattachées à un tenant disparu ?
SELECT 'users' AS tbl, COUNT(*) AS orphelins FROM users u
  WHERE u.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id=u.tenant_id)
UNION ALL SELECT 'calls', COUNT(*) FROM calls c
  WHERE c.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id=c.tenant_id)
UNION ALL SELECT 'ai_prompt_versions', COUNT(*) FROM ai_prompt_versions p
  WHERE p.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id=p.tenant_id)
UNION ALL SELECT 'knowledge_documents', COUNT(*) FROM knowledge_documents d
  WHERE d.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id=d.tenant_id)
UNION ALL SELECT 'omni_phone_mappings', COUNT(*) FROM omni_phone_mappings m
  WHERE m.tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id=m.tenant_id);

-- Tenants restants, pour vérification visuelle
SELECT name, email, SUBSTR(created_at,1,10) AS cree FROM tenants ORDER BY created_at;

