-- Migration 0054 : Ajout du champ prompt_type pour le routing VoixIA par tenant
-- Permet d'associer un type de prompt (immobilier, automobile, generaliste...)
-- à chaque numéro de téléphone mappé à un tenant

ALTER TABLE omni_phone_mappings ADD COLUMN prompt_type TEXT DEFAULT 'generaliste';
