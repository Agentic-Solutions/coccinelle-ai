-- Migration 0070 — Création de la table notification_preferences
-- Date : 6 juillet 2026
-- Contexte : la table est référencée par src/modules/settings/routes.js (GET /settings
--            la lit, PUT /settings/notifications fait un UPSERT dessus) mais n'a JAMAIS
--            été créée par aucune migration. En prod, `SELECT ... FROM notification_preferences`
--            lève `no such table` → GET /settings renvoie 500 → la page Paramètres ne
--            s'hydrate pas (tous les champs Mon compte / Mon entreprise apparaissent vides,
--            seuls les horaires par-jour montrent les DÉFAUTS du frontend).
-- Effet : additive, aucune table/colonne existante modifiée.
-- La PRIMARY KEY (user_id, tenant_id) fournit la contrainte UNIQUE attendue par le
-- `ON CONFLICT (user_id, tenant_id)` de PUT /settings/notifications.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id           TEXT NOT NULL,
  tenant_id         TEXT NOT NULL,
  email_after_call  INTEGER NOT NULL DEFAULT 1,
  sms_reminder_j1   INTEGER NOT NULL DEFAULT 1,
  weekly_summary    INTEGER NOT NULL DEFAULT 1,
  quota_alerts      INTEGER NOT NULL DEFAULT 1,
  updated_at        TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, tenant_id)
);
