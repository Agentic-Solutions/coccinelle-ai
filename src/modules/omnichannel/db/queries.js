/**
 * Requêtes SQL réutilisables pour le module Omnichannel
 */

export const queries = {
  // ============================================
  // AGENT CONFIGS
  // ============================================

  getAgentConfig: `
    SELECT * FROM omni_agent_configs
    WHERE tenant_id = ?
    LIMIT 1
  `,

  createAgentConfig: `
    INSERT INTO omni_agent_configs (
      id, tenant_id, agent_name, agent_type, agent_personality,
      voice_provider, voice_id, voice_settings, voice_language,
      system_prompt, greeting_message, fallback_message, transfer_message,
      channels_config, max_conversation_duration,
      interruption_enabled, auto_noise_detection, sentiment_analysis_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  updateAgentConfig: `
    UPDATE omni_agent_configs
    SET agent_name = ?, agent_type = ?, agent_personality = ?,
        voice_provider = ?, voice_id = ?, voice_settings = ?, voice_language = ?,
        system_prompt = ?, greeting_message = ?, fallback_message = ?, transfer_message = ?,
        channels_config = ?, max_conversation_duration = ?,
        interruption_enabled = ?, auto_noise_detection = ?, sentiment_analysis_enabled = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = ?
  `,

  deleteAgentConfig: `
    DELETE FROM omni_agent_configs WHERE tenant_id = ?
  `,

  // ============================================
  // CONVERSATIONS
  // ============================================

  createConversation: `
    INSERT INTO omni_conversations (
      id, conversation_sid, tenant_id,
      customer_phone, customer_email, customer_name,
      active_channels, current_channel, conversation_context,
      call_sid, first_message_at, last_message_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  getConversation: `
    SELECT * FROM omni_conversations
    WHERE id = ?
    LIMIT 1
  `,

  getConversationByCallSid: `
    SELECT * FROM omni_conversations
    WHERE call_sid = ?
    LIMIT 1
  `,

  getConversationsByTenant: `
    SELECT * FROM omni_conversations
    WHERE tenant_id = ? AND status = 'active'
    ORDER BY created_at DESC
    LIMIT ?
  `,

  updateConversationChannel: `
    UPDATE omni_conversations
    SET current_channel = ?,
        channel_switches = ?,
        last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  closeConversation: `
    UPDATE omni_conversations
    SET status = 'closed',
        closed_reason = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // ============================================
  // MESSAGES
  // ============================================

  createMessage: `
    INSERT INTO omni_messages (
      id, conversation_id, channel, direction,
      content, content_type, sender_role,
      message_sid, duration, transcript, sentiment, intent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  getMessagesByConversation: `
    SELECT * FROM omni_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `,

  getLastMessage: `
    SELECT * FROM omni_messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `
};

export default queries;
