-- ============================================================================
-- Regle de composition SMS dans les prompts actifs
-- Genere le 2026-08-11 depuis src/modules/shared/sector-prompts.js
--   npx wrangler d1 execute coccinelle-db-eu --remote --file=scripts/sms_compact_prompts.sql
--
-- POURQUOI : un devis est parti en DEUX SMS. Mesure : 252 unites GSM-7, soit
-- 2 segments. L'essentiel du surplus venait de l'habillage conversationnel
-- (« Bonjour, voici votre devis... Souhaitez-vous prendre rendez-vous ? »),
-- inutile sur un ecran de veille. Le gabarit compact tient en 139 unites,
-- soit UN segment, lien de reservation compris.
--
-- Le serveur garantit deja un segment (troncature sur les separateurs
-- d'enumeration dans shared/sms-booking-link.js) ; cette regle evite d'avoir
-- a tronquer, ce qui est toujours preferable.
--
-- AIGUILLE RELEVEE DANS LA SOURCE UNIQUE, jamais retapee.
-- REPLACE sur chaine exacte : un prompt personnalise n'est pas touche.
-- ============================================================================

-- ── CONTROLE AVANT — attendu : actifs=7, avec_regle_sms=0 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'écran de veille')>0) avec_regle_sms
FROM ai_prompt_versions WHERE is_active=1;

UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '« système », « base de données », « intelligence artificielle », « robot ».

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE', '« système », « base de données », « intelligence artificielle », « robot ».

SMS
Un SMS n''est pas une conversation : c''est une trace que le client relira, sur un
écran de veille. Tu écris donc court et sec — aucune formule d''accueil, aucune
question finale, aucune signature.
Format d''un devis : « Devis {entreprise} - {objet} : {prestation} {prix},
{prestation} {prix}. » Quatre prestations au maximum, les plus chères d''abord.
Tu n''ajoutes JAMAIS de lien toi-même : il est ajouté automatiquement, et un lien
en double coûte un second SMS.

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE')
WHERE is_active = 1
  AND INSTR(system_prompt, '« système », « base de données », « intelligence artificielle », « robot ».

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE') > 0;

-- ── CONTROLE APRES — attendu : actifs=7, avec_regle_sms=7 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'écran de veille')>0) avec_regle_sms,
       SUM(INSTR(system_prompt,'chiffre pour chiffre')>0) avec_ancrage,
       SUM(INSTR(system_prompt,'Deux prestations correspondent')>0) avec_clarification
FROM ai_prompt_versions WHERE is_active=1;

-- ── GARDE-FOU : prompts actifs non traites (attendu : 0 ligne) ──
SELECT v.tenant_id, t.name AS societe FROM ai_prompt_versions v
LEFT JOIN tenants t ON t.id = v.tenant_id
WHERE v.is_active = 1 AND INSTR(v.system_prompt,'écran de veille') = 0;
