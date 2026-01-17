-- =====================================================
-- MIGRATION: Voice Providers (Amazon Polly + ElevenLabs)
-- Date: 2025-12-01
-- Description: Ajout du choix de provider TTS et voix
-- =====================================================

-- Cette migration ne modifie pas la structure,
-- mais enrichit le champ config_public existant
-- avec les nouvelles propriétés de configuration vocale

-- Structure attendue dans config_public (JSON):
-- {
--   "clientPhoneNumber": "+33987654321",
--   "twilioSharedNumber": "+33939035761",
--   "sara": {
--     "voice": "female",
--     "assistantName": "Sara",
--     "agentType": "reception",
--     "language": "fr-FR",
--     "ttsProvider": "amazon",           -- NOUVEAU: "amazon" | "elevenlabs"
--     "ttsVoice": "Lea-Neural",          -- NOUVEAU: Nom de la voix
--     "ttsVoiceId": null,                -- NOUVEAU: Voice ID pour ElevenLabs
--     "transcriptionProvider": "deepgram", -- STT provider
--     "transcriptionLanguage": "fr-FR"   -- Langue de transcription
--   }
-- }

-- Voix disponibles par provider:
--
-- AMAZON POLLY (ttsProvider: "amazon"):
--   - "Lea-Neural" (féminin, français européen) - Par défaut
--   - "Remi-Neural" (masculin, français européen)
--   - "Lea-Generative" (féminin, version avancée)
--   - "Remi-Generative" (masculin, version avancée)
--
-- ELEVENLABS (ttsProvider: "elevenlabs"):
--   - Voice ID pour fr-FR: "a5n9pJUnAhX4fn7lx3uo" (français européen)
--   - Voice ID pour fr-CA: "IPgYtHTNLjC7Bq7IPHrm" (français canadien)
--   - Autres voix françaises: Adina (féminin), Abdel (masculin)
--   - Note: Les voice IDs spécifiques sont disponibles via l'API ElevenLabs

-- Exemple de mise à jour pour un tenant existant (à exécuter manuellement):
/*
UPDATE channel_configurations
SET config_public = json_set(
  config_public,
  '$.sara.ttsProvider', 'amazon',
  '$.sara.ttsVoice', 'Lea-Neural',
  '$.sara.ttsVoiceId', NULL,
  '$.sara.transcriptionProvider', 'deepgram',
  '$.sara.transcriptionLanguage', 'fr-FR'
)
WHERE channel_type = 'phone';
*/

-- =====================================================
-- Fin de la migration
-- =====================================================
