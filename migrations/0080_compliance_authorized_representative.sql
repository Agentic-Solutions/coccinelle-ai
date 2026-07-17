-- 0080_compliance_authorized_representative.sql
-- Chantier Conformité — représentant légal (Authorized Representative).
-- Additif, non destructif.
--
-- CONTEXTE : la Regulation Twilio FR (local/business) exige, en plus de
-- l'End-User `business`, un End-User `authorized_representative_1` (le dirigeant
-- légal : prénom, nom, email, téléphone E.164, fonction). Sans lui, le bundle
-- est rejeté (« Authorized Representative … »). On stocke ici ces champs +
-- le SID de l'End-User représentant créé côté Twilio.
--
-- job_position : mappé sur l'enum Twilio
--   Director | GM | VP | CEO | CFO | General Counsel | Other
ALTER TABLE client_compliance ADD COLUMN rep_first_name         TEXT;
ALTER TABLE client_compliance ADD COLUMN rep_last_name          TEXT;
ALTER TABLE client_compliance ADD COLUMN rep_email              TEXT;
ALTER TABLE client_compliance ADD COLUMN rep_phone              TEXT;  -- E.164 (+33…)
ALTER TABLE client_compliance ADD COLUMN rep_job_position       TEXT;  -- enum Twilio
ALTER TABLE client_compliance ADD COLUMN twilio_rep_enduser_sid TEXT;  -- End-User IT… (authorized_representative_1)
