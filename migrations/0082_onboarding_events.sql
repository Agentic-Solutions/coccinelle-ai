-- Migration 0082 — Instrumentation de l'onboarding par étape (QW3)
-- Additive uniquement : aucune table/colonne existante touchée.
--
-- Pourquoi une nouvelle table plutôt que `onboarding_analytics` (déjà présente) :
-- cette dernière est morte (jamais écrite, seulement purgée par admin/cleanup.js) et son
-- schéma fige les étapes en colonnes step_1_duration..step_6_duration — un parcours à 6
-- étapes qui n'existe plus. Modèle événementiel append-only ici : le parcours peut changer
-- sans migration. `onboarding_analytics` est laissée intacte (41 lignes historiques).
--
-- Un couple (tenant, étape) peut avoir plusieurs lignes (retours en arrière) : c'est voulu,
-- l'agrégation se fait à la lecture.

CREATE TABLE IF NOT EXISTS onboarding_events (
  id TEXT PRIMARY KEY,                  -- Format: onbe_<timestamp>_<random>
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  step TEXT NOT NULL,                   -- 'business' | 'assistant' | 'knowledge' | 'complete'
  step_index INTEGER,                   -- Index UI (0-based) au moment de l'événement
  event TEXT NOT NULL,                  -- 'entered' | 'saved' | 'skipped' | 'error'
  error_message TEXT,                   -- Renseigné si event = 'error'
  created_at TEXT NOT NULL
);

-- Entonnoir par étape : WHERE step = ? GROUP BY event
CREATE INDEX IF NOT EXISTS idx_onboarding_events_step
  ON onboarding_events (step, event);

-- Parcours d'un tenant dans l'ordre chronologique
CREATE INDEX IF NOT EXISTS idx_onboarding_events_tenant
  ON onboarding_events (tenant_id, created_at);
