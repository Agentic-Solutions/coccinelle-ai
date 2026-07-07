-- ============================================================================
-- BACKFILL — Chantier Prestations (fusion services → products)
-- À exécuter APRÈS migration 0072 (products.duration_minutes) sur coccinelle-db-eu.
-- APPLIQUÉ MANUELLEMENT PAR YOUSSEF après revue AVANT/APRÈS.
--
-- Objectif : migrer les prestations de la table `services` (dépréciée) vers
--   `products` avec type='service'. L'ID est PRÉSERVÉ (services.id → products.id)
--   pour que les liaisons existantes (commercial_agent_services.service_id,
--   member_skills.service_id) restent valides.
--
-- PÉRIMÈTRE : test.syndic (1) + Salon Élégance (8) = 9 prestations.
--   Agentic (tenant youssef.amrouche@outlook.fr) et Maze : EXCLUS.
--
-- Réversible : additif (products gagnent 9 rows type='service', identifiables par
--   id svc_*). Les rows `services` d'origine sont LAISSÉES INTACTES (is_active=1)
--   pour rollback ; aucune UI ne les lit plus (Prestations lit products type=service,
--   VoixIA/booking résolvent products d'abord via le helper). INSERT OR IGNORE = idempotent.
-- ============================================================================

-- ─── VÉRIF AVANT (lecture seule) ────────────────────────────────────────────
-- SELECT 'services' t, tenant_id, COUNT(*) n FROM services
--   WHERE tenant_id IN ('tenant_dGVzdC5zeW5kaWNAY29jY2luZWxsZS10ZXN0LmZy','tenant_salon_elegance')
--   GROUP BY tenant_id
-- UNION ALL
-- SELECT 'products type=service', tenant_id, COUNT(*) FROM products
--   WHERE type='service' AND tenant_id IN ('tenant_dGVzdC5zeW5kaWNAY29jY2luZWxsZS10ZXN0LmZy','tenant_salon_elegance')
--   GROUP BY tenant_id;

-- test.syndic
INSERT OR IGNORE INTO products
  (id, tenant_id, category, type, title, description, price, price_currency, available, status, duration_minutes, attributes, created_by, created_at, updated_at)
VALUES
 ('svc_mp6v771uu40sbzqke1j','tenant_dGVzdC5zeW5kaWNAY29jY2luZWxsZS10ZXN0LmZy','services','service','Reunion coproprietaires','Reunion avec gestionnaire',NULL,'EUR',1,'active',30,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now'));

-- Salon Élégance
INSERT OR IGNORE INTO products
  (id, tenant_id, category, type, title, description, price, price_currency, available, status, duration_minutes, attributes, created_by, created_at, updated_at)
VALUES
 ('svc_elegance_brushing','tenant_salon_elegance','services','service','Brushing','Brushing simple ou sophistiqué',25,'EUR',1,'active',30,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_coloration','tenant_salon_elegance','services','service','Coloration','Coloration complète',65,'EUR',1,'active',90,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_coupe_enf','tenant_salon_elegance','services','service','Coupe Enfant','Coupe enfant moins de 12 ans',18,'EUR',1,'active',20,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_coupe_f','tenant_salon_elegance','services','service','Coupe Femme','Coupe femme avec shampoing et brushing',45,'EUR',1,'active',45,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_coupe_h','tenant_salon_elegance','services','service','Coupe Homme','Coupe classique homme avec shampoing',25,'EUR',1,'active',30,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_meches','tenant_salon_elegance','services','service','Mèches/Balayage','Mèches ou balayage naturel',85,'EUR',1,'active',120,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_soin','tenant_salon_elegance','services','service','Soin Capillaire','Soin profond nourrissant',35,'EUR',1,'active',30,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now')),
 ('svc_elegance_barbe','tenant_salon_elegance','services','service','Taille Barbe','Taille et entretien de barbe',15,'EUR',1,'active',20,'{"color":"#6366f1"}','backfill_0072',datetime('now'),datetime('now'));

-- ─── VÉRIF APRÈS ────────────────────────────────────────────────────────────
-- Attendu : products type='service' = 1 (test.syndic) + 8 (salon) ; ids svc_* présents.
-- SELECT id, title, duration_minutes, price FROM products
--   WHERE type='service' AND tenant_id IN ('tenant_dGVzdC5zeW5kaWNAY29jY2luZWxsZS10ZXN0LmZy','tenant_salon_elegance')
--   ORDER BY tenant_id, title;
