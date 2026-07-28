-- Migration 0083 — Preferences d'interface par utilisateur (Chantier CX 1)
-- Date : 28 juillet 2026
--
-- ui_mode : 'simple' (sidebar reduite, defaut des NOUVEAUX inscrits)
--           | 'advanced' (sidebar complete, 6 groupes accordeon)
-- checklist_dismissed_at : date de masquage de la checklist de demarrage.
--   Ecrit uniquement quand les 5 etapes sont terminees (garde cote API).
--   Remplace le localStorage 'setup_checklist_dismissed' de l'ancien composant.
--
-- Migration ADDITIVE : aucune colonne existante n'est modifiee ou supprimee.

ALTER TABLE users ADD COLUMN ui_mode TEXT DEFAULT 'simple';
ALTER TABLE users ADD COLUMN checklist_dismissed_at TEXT;

-- SQLite applique le DEFAULT a TOUTES les lignes existantes lors du ADD COLUMN.
-- Sans ce backfill, les 145 inscrits actuels basculeraient en mode Simple au
-- prochain login (sidebar amputee sans qu'ils aient rien demande).
-- Seuls les comptes crees APRES cette migration demarrent en Simple.
UPDATE users SET ui_mode = 'advanced' WHERE created_at < '2026-07-28';
