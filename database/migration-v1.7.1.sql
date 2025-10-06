-- Migration v1.7.1 : Ajout colonne tenant_id à appointment_notifications
ALTER TABLE appointment_notifications ADD COLUMN tenant_id TEXT;
