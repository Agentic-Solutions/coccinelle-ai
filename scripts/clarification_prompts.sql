-- ============================================================================
-- Clarification des prestations proches + un montant par phrase
-- Genere le 2026-08-11 depuis src/modules/shared/sector-prompts.js
--   npx wrangler d1 execute coccinelle-db-eu --remote --file=scripts/clarification_prompts.sql
--
-- POURQUOI : la recherche sait desormais qu'elle hesite entre deux prestations
-- proches a prix differents (« Forfait plaquettes avant » 149 EUR et
-- « Plaquettes + disques avant » 289 EUR) et le dit. Sans regle, l'agent
-- choisirait quand meme — et se tromperait une fois sur deux. La regle 2bis lui
-- impose de demander. S'y ajoute l'articulation : un seul montant par phrase,
-- deux montants d'affilee se confondent a l'oreille au telephone.
--
-- AIGUILLE RELEVEE DANS LA SOURCE UNIQUE, jamais retapee (lecon du 08/08).
-- REPLACE sur chaine exacte : un prompt personnalise ou deja a jour n'est pas
-- touche. Aucun INSERT, aucun DELETE.
-- ============================================================================

-- ── CONTROLE AVANT — attendu : actifs=7, avec_clarification=0 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'chiffre pour chiffre')>0) avec_ancrage,
       SUM(INSTR(system_prompt,'Deux prestations correspondent')>0) avec_clarification
FROM ai_prompt_versions WHERE is_active=1;

UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '   Si le passage renvoyé ne contient pas le montant demandé, tu es au point 3 :
   ce montant n''existe pas pour toi.
3. L''outil ne renvoie rien sur ce point', '   Si le passage renvoyé ne contient pas le montant demandé, tu es au point 3 :
   ce montant n''existe pas pour toi.
   Tu annonces UN SEUL montant par phrase : deux montants dans la même phrase se
   confondent à l''oreille au téléphone.
2bis. L''outil commence sa réponse par « Deux prestations correspondent » : c''est
   qu''il n''a pas pu trancher entre deux prestations proches, à des prix différents.
   Tu ne choisis pas à sa place et tu n''annonces aucun montant tout de suite. Tu
   demandes laquelle des deux l''appelant souhaite, en reprenant les deux libellés
   exactement comme l''outil les écrit, puis tu donnes le montant de celle qu''il
   désigne.
3. L''outil ne renvoie rien sur ce point')
WHERE is_active = 1
  AND INSTR(system_prompt, '   Si le passage renvoyé ne contient pas le montant demandé, tu es au point 3 :
   ce montant n''existe pas pour toi.
3. L''outil ne renvoie rien sur ce point') > 0;

-- ── CONTROLE APRES — attendu : actifs=7, avec_ancrage=7, avec_clarification=7 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'chiffre pour chiffre')>0) avec_ancrage,
       SUM(INSTR(system_prompt,'Deux prestations correspondent')>0) avec_clarification,
       SUM(INSTR(system_prompt,'{')>0) avec_variables_non_substituees
FROM ai_prompt_versions WHERE is_active=1;

-- ── GARDE-FOU : prompts actifs non traites (attendu : 0 ligne) ──
SELECT v.tenant_id, t.name AS societe, LENGTH(v.system_prompt) AS taille
FROM ai_prompt_versions v LEFT JOIN tenants t ON t.id = v.tenant_id
WHERE v.is_active = 1 AND INSTR(v.system_prompt,'Deux prestations correspondent') = 0;
