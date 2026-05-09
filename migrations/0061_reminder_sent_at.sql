-- Migration 0061 : Ajout reminder_sent_at + index pour cron rappel SMS J-1
ALTER TABLE appointments ADD COLUMN reminder_sent_at TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(reminder_sent, status);
