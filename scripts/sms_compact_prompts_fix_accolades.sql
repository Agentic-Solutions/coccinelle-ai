-- ============================================================================
-- CORRECTIF IMMEDIAT — retrait des accolades du bloc SMS
-- Genere le 2026-08-11 depuis src/modules/shared/sector-prompts.js
--
-- Le bloc SMS pose quelques minutes plus tot illustrait le format d'un devis
-- avec des accolades ({entreprise}, {objet}...). Deux fautes en une :
--   1. la regle § f interdit toute variable {} dans un system_prompt stocke —
--      applyPromptVariables() ne les connait pas et les laisserait partir
--      telles quelles au LLM ;
--   2. la regle i.6ter rappelle qu'un exemple verbatim est un script rejoue :
--      l'agent pouvait dicter « Devis accolade entreprise ».
-- La structure est desormais decrite en toutes lettres, sans accolade et sans
-- exemple sectoriel (un exemple de garage n'a rien a faire chez un syndic).
-- ============================================================================

-- ── CONTROLE AVANT — attendu : avec_accolades = 7 ──
SELECT COUNT(*) actifs, SUM(INSTR(system_prompt,'{entreprise}')>0) avec_accolades
FROM ai_prompt_versions WHERE is_active=1;

UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, 'Format d''un devis : « Devis {entreprise} - {objet} : {prestation} {prix},
{prestation} {prix}. » Quatre prestations au maximum, les plus chères d''abord.', 'Structure d''un devis : le mot Devis, le nom de l''entreprise, un tiret, l''objet
concerné, deux points, puis chaque prestation suivie de son prix, séparées par
des virgules. Quatre prestations au maximum, les plus chères d''abord.')
WHERE is_active = 1 AND INSTR(system_prompt, 'Format d''un devis : « Devis {entreprise} - {objet} : {prestation} {prix},
{prestation} {prix}. » Quatre prestations au maximum, les plus chères d''abord.') > 0;

-- ── CONTROLE APRES — attendu : accolades = 0, regle SMS toujours a 7 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'{')>0) avec_variables,
       SUM(INSTR(system_prompt,'écran de veille')>0) avec_regle_sms
FROM ai_prompt_versions WHERE is_active=1;
