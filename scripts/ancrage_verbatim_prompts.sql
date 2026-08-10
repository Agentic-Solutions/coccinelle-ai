-- ============================================================================
-- Ancrage verbatim des montants dans les prompts actifs
-- Généré le 2026-08-10 depuis src/modules/shared/sector-prompts.js (TOOL_ORDER_BLOCK).
-- À EXÉCUTER PAR YOUSSEF :
--   npx wrangler d1 execute coccinelle-db-eu --remote --file=scripts/ancrage_verbatim_prompts.sql
--
-- POURQUOI : le point 2 disait « tu la donnes telle quelle, chiffres compris »,
-- sans interdire de recomposer. En recette, « recharge clim R1234yf » a reçu
-- « 89 euros » — le tarif de la vidange. Le nouveau point 2 impose de recopier
-- les montants chiffre pour chiffre, de ne pas arrondir, de ne pas transformer
-- en fourchette, de préciser à quoi chaque montant correspond, et de basculer
-- sur la porte de sortie si le passage ne contient pas le montant demandé.
--
-- AIGUILLE RELEVÉE EN BASE, jamais retapée — c'est un retapage manuel qui avait
-- produit deux structures divergentes le 08/08. Le texte de remplacement vient
-- de la source unique.
--
-- GARDE-FOU : REPLACE sur une chaîne EXACTE. Un prompt personnalisé, ou déjà à
-- jour, ne correspond pas et n'est pas touché. Aucun INSERT, aucun DELETE : le
-- reste de chaque prompt est préservé caractère pour caractère.
--
-- 17 prompts actifs portent l'ancien point 2 (sur 20 actifs).
-- ============================================================================

-- ── CONTRÔLE AVANT — attendu : avec_bloc_outil = 17, avec_ancrage_verbatim = 0 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'ORDRE OBLIGATOIRE')>0)      avec_bloc_outil,
       SUM(INSTR(system_prompt,'chiffre pour chiffre')>0)   avec_ancrage_verbatim
FROM ai_prompt_versions WHERE is_active=1;

UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Exemple : « La recharge de climatisation est à 79 euros. »', '2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Tu recopies les montants, les durées et les délais EXACTEMENT comme l''outil les
   écrit — chiffre pour chiffre. Tu ne les arrondis pas, tu ne les convertis pas en
   fourchette, tu ne les mélanges pas entre deux prestations. Si l''outil donne
   plusieurs montants, tu précises à quoi chacun correspond.
   Exemple : « La recharge de climatisation est à 79 euros en gaz R134a, et 129 euros
   en R1234yf pour les véhicules d''après 2017. »
   Si le passage renvoyé ne contient pas le montant demandé, tu es au point 3 :
   ce montant n''existe pas pour toi.')
WHERE is_active = 1
  AND INSTR(system_prompt, '2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Exemple : « La recharge de climatisation est à 79 euros. »') > 0;

-- ── CONTRÔLE APRÈS — attendu : avec_ancrage_verbatim = 17 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'ORDRE OBLIGATOIRE')>0)      avec_bloc_outil,
       SUM(INSTR(system_prompt,'chiffre pour chiffre')>0)   avec_ancrage_verbatim
FROM ai_prompt_versions WHERE is_active=1;

-- ── GARDE-FOU : prompts actifs NON traités (personnalisés ou d'une autre époque) ──
SELECT v.tenant_id, t.name AS societe, LENGTH(v.system_prompt) AS taille
FROM ai_prompt_versions v LEFT JOIN tenants t ON t.id = v.tenant_id
WHERE v.is_active = 1 AND INSTR(v.system_prompt,'chiffre pour chiffre') = 0;
