-- 0075_number_pool_purchase.sql
-- Sprint VoixIA.io — achat self-service de numéros Twilio.
-- Additif : colonnes de prix/traçabilité pour les numéros achetés via l'API.
-- status accepte désormais aussi 'provisioning' et 'error' (colonne TEXT, pas de contrainte).
ALTER TABLE number_pool ADD COLUMN monthly_price REAL;
ALTER TABLE number_pool ADD COLUMN currency TEXT DEFAULT 'EUR';
ALTER TABLE number_pool ADD COLUMN purchased_at TEXT;
ALTER TABLE number_pool ADD COLUMN purchased_by TEXT;   -- tenant_id de l'admin acheteur
