-- =====================================================
-- MIGRATION 0043: Activer le canal voix pour le tenant test
-- Date: 2026-03-03
-- Tenant: admin@coccinelle-prod.com
-- Agent Retell: Julien - coccinelle.ai Demo
-- =====================================================

-- Tenant ID calculé: tenant_${btoa('admin@coccinelle-prod.com')} = tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ

-- =====================================================
-- 1. Ajouter la colonne retell_agent_id a omni_agent_configs
--    (requise par src/modules/retell/routes.js pour les web calls)
-- =====================================================
ALTER TABLE omni_agent_configs ADD COLUMN retell_agent_id TEXT;

-- =====================================================
-- 2. Inserer la configuration du canal voix (phone) dans channel_configurations
-- =====================================================
INSERT OR REPLACE INTO channel_configurations (
  id,
  tenant_id,
  channel_type,
  enabled,
  configured,
  config_public,
  config_encrypted,
  templates,
  assistant_id,
  created_at,
  updated_at
) VALUES (
  'cfg_phone_tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ',
  'tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ',
  'phone',
  1,  -- enabled = true
  1,  -- configured = true
  '{"clientPhoneNumber":"+33939035761","twilioSharedNumber":"+33939035760","sara":{"voice":"female","assistantName":"Julien","agentType":"reception","language":"fr-FR","customInstructions":"Agent vocal demo coccinelle.ai"},"transferConfigured":false}',
  '{}',
  '{}',
  'agent_0c566a48e70125020d07aed643',  -- Retell agent ID
  datetime('now'),
  datetime('now')
);

-- =====================================================
-- 3. Inserer/mettre a jour la config agent omnichannel
-- =====================================================
INSERT OR REPLACE INTO omni_agent_configs (
  id,
  tenant_id,
  agent_name,
  agent_type,
  agent_personality,
  voice_provider,
  voice_id,
  voice_language,
  greeting_message,
  fallback_message,
  transfer_message,
  max_conversation_duration,
  interruption_enabled,
  auto_noise_detection,
  sentiment_analysis_enabled,
  retell_agent_id,
  created_at,
  updated_at
) VALUES (
  'omni_cfg_tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ',
  'tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ',
  'Julien',
  'reception',
  'professional',
  'retell',
  'custom_voice_a3a6b6afa440c43a3a0f06fe7b',  -- voix custom Retell (depuis retell/config.js)
  'fr-FR',
  'Bonjour, je suis Julien, votre assistant vocal coccinelle.ai. Comment puis-je vous aider ?',
  'Je n''ai pas bien compris, pouvez-vous reformuler ?',
  'Je vous transfere vers un conseiller.',
  1800,  -- 30 minutes max
  1,     -- interruption enabled
  1,     -- auto noise detection
  0,     -- sentiment analysis disabled
  'agent_0c566a48e70125020d07aed643',  -- Retell Agent ID: Julien - coccinelle.ai Demo
  datetime('now'),
  datetime('now')
);

-- =====================================================
-- 4. Inserer le mapping telephone Twilio
-- =====================================================
INSERT OR IGNORE INTO omni_phone_mappings (
  id,
  phone_number,
  tenant_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  'mapping_voice_coccinelle_prod_761',
  '+33939035761',
  'tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO omni_phone_mappings (
  id,
  phone_number,
  tenant_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  'mapping_voice_coccinelle_prod_760',
  '+33939035760',
  'tenant_YWRtaW5AY29jY2luZWxsZS1wcm9kLmNvbQ',
  1,
  datetime('now'),
  datetime('now')
);

-- =====================================================
-- Fin de la migration 0043
-- =====================================================
