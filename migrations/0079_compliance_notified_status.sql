-- 0079_compliance_notified_status.sql
-- Chantier Conformité — notification email au changement de statut bundle.
-- Anti-doublon : mémorise le dernier statut pour lequel un email a été envoyé.
-- On ne notifie (approved/rejected) que si le nouveau statut diffère de celui-ci.
-- Additif et non destructif.
ALTER TABLE client_compliance ADD COLUMN notified_bundle_status TEXT;
