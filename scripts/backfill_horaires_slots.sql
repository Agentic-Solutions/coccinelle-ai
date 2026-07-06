-- ============================================================================
-- BACKFILL — Chantier Horaires SSOT (6 juillet 2026)
-- À exécuter APRÈS migration 0071 (agents.is_default) sur coccinelle-db-eu.
-- APPLIQUÉ MANUELLEMENT PAR YOUSSEF après revue AVANT/APRÈS.
--
-- Objectif : rendre availability_slots (maître) cohérent avec tenants.horaires
--   pour les tenants existants, et normaliser les day_of_week en 1-7 (Lun=1).
--
-- EXCLUSIONS ABSOLUES : compte démo Maze (tenant_ZGVtby5tYXpl...) et Agentic
--   NE SONT PAS touchés (Maze a déjà des slots 1-5 corrects).
--
-- Idempotent : les slots des 3 agents provisionnés sont purgés avant réinsertion ;
--   la normalisation cible une liste explicite de 2 tenants (pas de détection large).
-- ============================================================================

-- ─── VÉRIF AVANT (lecture seule, à lancer d'abord pour revue) ───────────────
-- SELECT tenant_id, COUNT(*) slots, GROUP_CONCAT(DISTINCT day_of_week) dows
--   FROM availability_slots
--   WHERE tenant_id IN (
--     'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
--     'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp',
--     'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk',
--     'tenant_dGVzdDEzQHRlc3QxMy5jb20',
--     'tenant_salon_elegance')
--   GROUP BY tenant_id;

-- ============================================================================
-- PARTIE A — PROVISIONING (3 tenants onboardés avec horaires mais 0 slot)
-- ============================================================================

-- A1. Agent société par défaut (is_default=1), dérivé de l'admin du tenant.
INSERT OR IGNORE INTO agents (id, tenant_id, first_name, last_name, email, is_default)
SELECT u.id, u.tenant_id, COALESCE(NULLIF(u.name, ''), 'Accueil'), '',
       COALESCE(u.email, u.id || '@coccinelle.ai'), 1
FROM users u
WHERE u.id IN (
  'user_mr91yrooafz67ht1ays',  -- Coccinelle.ai (y.amrouche@)
  'user_mr546gbcc3ak7j0snbr',  -- Youssef Amrouche (youssef.amrouche@)
  'user_mr4ud5dm0gqv4kqek99g'  -- test.fix1
);
-- Force is_default même si la row agents existait déjà
UPDATE agents SET is_default = 1
WHERE id IN ('user_mr91yrooafz67ht1ays', 'user_mr546gbcc3ak7j0snbr', 'user_mr4ud5dm0gqv4kqek99g');

-- A2. Purge idempotente des créneaux de ces agents société, puis réinsertion.
DELETE FROM availability_slots WHERE agent_id IN (
  'user_mr91yrooafz67ht1ays', 'user_mr546gbcc3ak7j0snbr', 'user_mr4ud5dm0gqv4kqek99g'
);

-- A3. Créneaux (day_of_week 1-7 Lun=1 ; jours fermés conservés en is_available=0).
--     Coccinelle.ai (y.amrouche@) — Lun-Ven 9-18, Sam 10-12 ouvert, Dim fermé.
INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, slot_duration, is_available) VALUES
 ('avail_bf70_ya_1','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',1,'09:00','18:00',30,1),
 ('avail_bf70_ya_2','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',2,'09:00','18:00',30,1),
 ('avail_bf70_ya_3','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',3,'09:00','18:00',30,1),
 ('avail_bf70_ya_4','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',4,'09:00','18:00',30,1),
 ('avail_bf70_ya_5','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',5,'09:00','18:00',30,1),
 ('avail_bf70_ya_6','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',6,'10:00','12:00',30,1),
 ('avail_bf70_ya_7','tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr91yrooafz67ht1ays',7,'09:00','18:00',30,0);

--     Youssef Amrouche (youssef.amrouche@) — mêmes horaires.
INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, slot_duration, is_available) VALUES
 ('avail_bf70_yo_1','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',1,'09:00','18:00',30,1),
 ('avail_bf70_yo_2','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',2,'09:00','18:00',30,1),
 ('avail_bf70_yo_3','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',3,'09:00','18:00',30,1),
 ('avail_bf70_yo_4','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',4,'09:00','18:00',30,1),
 ('avail_bf70_yo_5','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',5,'09:00','18:00',30,1),
 ('avail_bf70_yo_6','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',6,'10:00','12:00',30,1),
 ('avail_bf70_yo_7','tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp','user_mr546gbcc3ak7j0snbr',7,'09:00','18:00',30,0);

--     test.fix1 — horaires legacy texte ("Lun-Ven 9h-18h") → défauts (Sam/Dim fermés).
INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, slot_duration, is_available) VALUES
 ('avail_bf70_tf_1','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',1,'09:00','18:00',30,1),
 ('avail_bf70_tf_2','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',2,'09:00','18:00',30,1),
 ('avail_bf70_tf_3','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',3,'09:00','18:00',30,1),
 ('avail_bf70_tf_4','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',4,'09:00','18:00',30,1),
 ('avail_bf70_tf_5','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',5,'09:00','18:00',30,1),
 ('avail_bf70_tf_6','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',6,'10:00','12:00',30,0),
 ('avail_bf70_tf_7','tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk','user_mr4ud5dm0gqv4kqek99g',7,'09:00','18:00',30,0);

-- ============================================================================
-- PARTIE B — NORMALISATION day_of_week 0-based → 1-7 (2 comptes de test)
--   test13   : 0-4 → 1-5 (Lun-Ven)
--   salon    : 0-5 → 1-6 (Lun-Sam)
--   (+1 sûr : max actuel = 5 → 6, jamais > 7)
-- ============================================================================
UPDATE availability_slots SET day_of_week = day_of_week + 1
WHERE tenant_id IN ('tenant_dGVzdDEzQHRlc3QxMy5jb20', 'tenant_salon_elegance');

-- ─── VÉRIF APRÈS (relancer la requête AVANT ci-dessus) ──────────────────────
-- Attendu : 5 tenants, chacun day_of_week uniquement dans 1..7, 7 slots pour les 3 provisionnés.
