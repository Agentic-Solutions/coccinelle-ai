-- Migration 0084 — Chantier CX-2 : versions, corbeille, comportement hors horaires
-- Date : 12 aout 2026
--
-- ADDITIVE UNIQUEMENT. Aucun DROP, aucune colonne existante modifiee, aucune
-- ligne de donnee reecrite. Les compteurs de knowledge_documents et de
-- knowledge_chunks doivent etre RIGOUREUSEMENT IDENTIQUES avant et apres
-- (requetes de controle : design/cx2/revue-0084.sql).
--
-- Trois besoins de la page « Ce que sait votre assistant » et de « Mon Assistant » :
--   1. pouvoir corriger une information et revenir en arriere  -> versions
--   2. supprimer sans perdre, et restaurer pendant 30 jours    -> deleted_at
--   3. choisir ce que fait l'assistant hors horaires           -> voixia_configs

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Corbeille
-- ─────────────────────────────────────────────────────────────────────────────
-- `is_active` existe deja (DEFAUT 1) et TOUTES les lectures le filtrent : la
-- suppression douce etait donc a moitie en place, sans la date qui permet de
-- calculer la fenetre de 30 jours ni d'afficher « supprimee le … ».
--
-- Convention : supprimer = is_active 0 + deleted_at = maintenant.
--              restaurer = is_active 1 + deleted_at = NULL.
--
-- Les lignes deja a is_active = 0 AVANT cette migration gardent deleted_at NULL :
-- elles n'apparaitront pas dans la corbeille (on ignore quand elles ont ete
-- supprimees, et les dater d'aujourd'hui les ferait remonter comme recentes).
-- C'est voulu : on ne fabrique pas une date qu'on n'a pas.
ALTER TABLE knowledge_documents ADD COLUMN deleted_at TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Versions
-- ─────────────────────────────────────────────────────────────────────────────
-- On versionne le DOCUMENT, jamais la fiche. Une fiche (une ligne de tableau
-- dans knowledge_chunks) est une PROJECTION : indexerFiches() les supprime et
-- les reconstruit integralement depuis knowledge_documents.content a chaque
-- ecriture. Versionner un chunk reviendrait a versionner un cache.
--
-- Une version est ecrite AVANT chaque modification, ce qui rend l'etat d'origine
-- restaurable — y compris le tout premier, qui n'a par definition jamais ete
-- « modifie ».
CREATE TABLE IF NOT EXISTS knowledge_document_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL,
  tenant_id   TEXT NOT NULL,
  version     INTEGER NOT NULL,   -- 1, 2, 3… par document (max + 1 a l'ecriture)
  title       TEXT,
  content     TEXT,               -- l'etat AVANT la modification
  auteur      TEXT,               -- users.id, ou 'systeme' pour un import
  motif       TEXT,               -- edition_document | edition_fiche | suppression_fiche
                                  -- | import | suppression | restauration
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);

-- Historique d'un document, du plus recent au plus ancien.
CREATE INDEX IF NOT EXISTS idx_kdv_document
  ON knowledge_document_versions (document_id, version DESC);

-- Carte « Historique » : les dernieres modifications d'un tenant.
CREATE INDEX IF NOT EXISTS idx_kdv_tenant
  ON knowledge_document_versions (tenant_id, created_at DESC);

-- Deux ecritures concurrentes sur le meme document calculeraient le meme
-- « max + 1 » : cet index fait echouer la seconde au lieu de creer deux
-- versions 4 dont l'ordre serait indeterminable.
CREATE UNIQUE INDEX IF NOT EXISTS idx_kdv_document_version
  ON knowledge_document_versions (document_id, version);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Comportement hors horaires
-- ─────────────────────────────────────────────────────────────────────────────
-- N'existait nulle part : ni colonne, ni bloc de prompt (seule trace, un
-- commentaire dans le module Retell, mort). C'est pourtant une des cinq valeurs
-- cliquables de « Mon Assistant ».
--
-- 'message'  = « je prends votre message »      (defaut, etat initial de la maquette)
-- 'horaires' = « je vous rappelle nos horaires »
--
-- SQLite applique ce DEFAUT a toutes les lignes existantes (leçon de la 0083).
-- C'est SANS EFFET sur la production : aucun prompt n'est reecrit par cette
-- migration. Le system_prompt d'un tenant n'est regenere que lorsqu'il
-- enregistre depuis la page « Mon Assistant » (buildSectorPrompt, regle 6bis).
-- La colonne ne fait donc que decrire l'etat affiche par defaut dans l'UI.
ALTER TABLE voixia_configs ADD COLUMN after_hours_behavior TEXT DEFAULT 'message';

-- Message libre, pour le jour ou l'on proposera autre chose que les deux choix
-- ci-dessus. CX-2 NE L'ECRIT PAS : il reste NULL partout apres ce chantier.
ALTER TABLE voixia_configs ADD COLUMN after_hours_message TEXT;
