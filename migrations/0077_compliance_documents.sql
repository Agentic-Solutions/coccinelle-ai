-- 0077_compliance_documents.sql
-- Chantier Conformité — pièces justificatives uploadées par le client final.
-- Le fichier est stocké en R2 (souverain UE) puis poussé vers Twilio en
-- SupportingDocument. On garde la copie R2 comme source de vérité.
--
-- doc_type : 'kbis' (extrait Kbis / justificatif société),
--            'cin'  (pièce d'identité du dirigeant — KYC),
--            'address_proof' (justificatif d'adresse).
CREATE TABLE IF NOT EXISTS compliance_documents (
  id                   TEXT PRIMARY KEY,
  tenant_id            TEXT NOT NULL,
  doc_type             TEXT NOT NULL,              -- kbis | cin | address_proof
  r2_key               TEXT,                       -- clé objet R2
  filename             TEXT,
  content_type         TEXT,
  twilio_document_sid  TEXT,                       -- SupportingDocument Twilio (RD…)
  status               TEXT DEFAULT 'uploaded',    -- uploaded | attached | rejected
  created_at           TEXT
);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_tenant ON compliance_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_type ON compliance_documents(tenant_id, doc_type);
