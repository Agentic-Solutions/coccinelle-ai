CREATE INDEX IF NOT EXISTS idx_phone_mappings_active ON omni_phone_mappings(phone_number, is_active);
CREATE INDEX IF NOT EXISTS idx_sector_templates_secteur ON ai_sector_templates(secteur);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_tenant_active ON knowledge_documents(tenant_id, is_active, source_type);
CREATE INDEX IF NOT EXISTS idx_faq_tenant_id ON knowledge_faq(tenant_id);
