-- 0078_calls_extracted.sql
-- Extraction post-appel (garagiste) : une ligne par appel entrant traité par
-- POST /api/post-call. Le transcript brut est envoyé à Claude Haiku qui renvoie
-- un JSON strict { intent, nom, telephone, date_rdv, heure_rdv, vehicule, resume }.
-- Additif et non destructif. La table est aussi créée en lazy (CREATE TABLE IF
-- NOT EXISTS) au premier appel — cette migration sert de trace versionnée.
CREATE TABLE IF NOT EXISTS calls_extracted (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id      TEXT,                 -- identifiant d'appel fourni par l'appelant
  caller_number TEXT,                -- numéro de l'appelant
  intent       TEXT,                 -- rdv | devis | question | autre
  nom          TEXT,
  telephone    TEXT,
  date_rdv     TEXT,
  heure_rdv    TEXT,
  vehicule     TEXT,
  resume       TEXT,
  transcript   TEXT,                 -- transcript brut conservé pour audit
  raw_json     TEXT,                 -- réponse JSON brute de Claude (debug)
  created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_calls_extracted_call_id ON calls_extracted(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_extracted_created_at ON calls_extracted(created_at);
