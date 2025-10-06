-- Migration v1.6.4 : Ajout colonne sent_at pour notifications

-- Ajouter la colonne sans valeur par défaut
ALTER TABLE appointment_notifications ADD COLUMN sent_at TEXT;

-- Mettre à jour les notifications existantes avec la date de création
UPDATE appointment_notifications SET sent_at = created_at WHERE sent_at IS NULL;
