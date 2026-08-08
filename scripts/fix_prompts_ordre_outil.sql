-- ============================================================================
-- Réparation de l'ordre d'appel des outils dans les prompts actifs
-- Généré le 2026-08-08 depuis src/modules/shared/sector-prompts.js (TOOL_ORDER_BLOCK).
--
-- RÉGRESSION RÉPARÉE : le bloc « QUAND TU N'AS PAS L'INFORMATION » se terminait
-- par le seul exemple prêt à prononcer du prompt (« Je vous fais rappeler par un
-- conseiller… ») et occupait la dernière place avant CLÔTURE. Résultat mesuré le
-- 08/08 sur Garage Toulouse : l'agent n'appelait PLUS search_knowledge du tout et
-- partait directement sur le rappel, même pour une question dont la réponse était
-- dans la base (recharge climatisation, 79 euros).
--
-- LE NOUVEAU BLOC impose :
--   1. search_knowledge appelé AVANT toute réponse métier, sans exception ;
--   2. l'information de l'outil restituée telle quelle, chiffres compris
--      (exemple du chemin NOMINAL placé avant celui de l'échec) ;
--   3. la porte de sortie UNIQUEMENT si l'outil a été appelé ET n'a rien renvoyé,
--      avec appel obligatoire de create_task — un rappel promis sans create_task
--      n'existe pas ;
--   + section ZÉRO INVENTION : aucun tarif, délai, téléphone, adresse, email ou
--     horaire inventé NI approximé (ni fourchette, ni « environ »).
--
-- GARDE-FOU ANTI-ÉCRASEMENT : ce script ne fait que des REPLACE sur des chaînes
-- EXACTES relevées en base. Un prompt personnalisé par un client, ou déjà à jour,
-- ne correspond à aucune aiguille et n'est pas touché. Aucune régénération par
-- tenant, aucun INSERT, aucun DELETE : le reste de chaque prompt est préservé
-- caractère pour caractère.
--
-- 18 prompts actifs portent le bloc fautif, en 2 variantes de formatage
-- (7 + 11) — l'une d'elles collait le titre à la ligne
-- précédente, séquelle du premier script.
-- ============================================================================

-- ── CONTRÔLE AVANT — attendu : reste_ancien_bloc = 18, avec_nouveau_bloc = 0 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'QUAND TU')>0)          reste_ancien_bloc,
       SUM(INSTR(system_prompt,'ORDRE OBLIGATOIRE')>0) avec_nouveau_bloc,
       SUM(INSTR(system_prompt,'ZÉRO INVENTION')>0)    avec_zero_invention,
       SUM(INSTR(system_prompt,'create_task')>0)       avec_rappel_reel
FROM ai_prompt_versions WHERE is_active=1;


-- ============================================================================
-- ÉTAPE 1 — Garage Toulouse UNIQUEMENT (tenant de recette)
-- ----------------------------------------------------------------------------
-- Exécute cette étape, passe ton appel de recette (« combien coûte une recharge
-- de climatisation » → attendu : search_knowledge dans les logs, puis « 79 euros »),
-- et n'exécute l'étape 2 qu'ensuite. C'est exactement le contrôle qui a manqué
-- ce matin : 18 prompts ont été modifiés sur une hypothèse non validée.
-- ============================================================================

-- variante 1/2 (7 prompt(s) en base)
UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '

QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »', '

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE
1. Toute question sur les services, les prestations, les tarifs, les délais, les
   horaires, l''adresse, le téléphone ou le fonctionnement de l''entreprise : tu appelles
   search_knowledge AVANT de répondre. Sans exception, même si tu crois connaître la
   réponse, même si la question ressemble à une question déjà posée.
2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Exemple : « La recharge de climatisation est à 79 euros. »
3. L''outil ne renvoie rien sur ce point : SEULEMENT dans ce cas, et seulement APRÈS
   l''avoir appelé, tu proposes de faire rappeler par un conseiller. Tu n''annonces pas
   que tu n''as pas trouvé, tu enchaînes naturellement.
   Tu appelles ALORS create_task avec la demande et les coordonnées de l''appelant.
   Sans cet appel d''outil, le rappel n''existe pas : ce serait une promesse en l''air.
   Exemple : « Je vous fais rappeler par un conseiller qui vous donnera le montant
   exact. À quel numéro peut-on vous joindre ? » — puis create_task.

ZÉRO INVENTION
Tout tarif, délai, numéro de téléphone, adresse, email, horaire ou donnée factuelle
que tu prononces provient de l''outil. Tu n''en inventes aucun et tu n''en approximes
aucun : ni fourchette, ni « environ », ni « en général », ni ordre de grandeur.
Si l''information n''est pas revenue de l''outil, la seule réponse autorisée est celle
du point 3 ci-dessus. Aucune autre.')
WHERE is_active = 1
  AND INSTR(system_prompt, '

QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »') > 0
  AND tenant_id = 'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg';

-- variante 2/2 (11 prompt(s) en base)
UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '
QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »', '

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE
1. Toute question sur les services, les prestations, les tarifs, les délais, les
   horaires, l''adresse, le téléphone ou le fonctionnement de l''entreprise : tu appelles
   search_knowledge AVANT de répondre. Sans exception, même si tu crois connaître la
   réponse, même si la question ressemble à une question déjà posée.
2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Exemple : « La recharge de climatisation est à 79 euros. »
3. L''outil ne renvoie rien sur ce point : SEULEMENT dans ce cas, et seulement APRÈS
   l''avoir appelé, tu proposes de faire rappeler par un conseiller. Tu n''annonces pas
   que tu n''as pas trouvé, tu enchaînes naturellement.
   Tu appelles ALORS create_task avec la demande et les coordonnées de l''appelant.
   Sans cet appel d''outil, le rappel n''existe pas : ce serait une promesse en l''air.
   Exemple : « Je vous fais rappeler par un conseiller qui vous donnera le montant
   exact. À quel numéro peut-on vous joindre ? » — puis create_task.

ZÉRO INVENTION
Tout tarif, délai, numéro de téléphone, adresse, email, horaire ou donnée factuelle
que tu prononces provient de l''outil. Tu n''en inventes aucun et tu n''en approximes
aucun : ni fourchette, ni « environ », ni « en général », ni ordre de grandeur.
Si l''information n''est pas revenue de l''outil, la seule réponse autorisée est celle
du point 3 ci-dessus. Aucune autre.')
WHERE is_active = 1
  AND INSTR(system_prompt, '
QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »') > 0
  AND tenant_id = 'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg';

-- Vérification ciblée du tenant de recette (attendu : 1 ligne, ancien=0, nouveau=1)
SELECT tenant_id,
       INSTR(system_prompt,'QUAND TU')>0          AS reste_ancien_bloc,
       INSTR(system_prompt,'ORDRE OBLIGATOIRE')>0 AS avec_nouveau_bloc
FROM ai_prompt_versions WHERE is_active=1 AND tenant_id = 'tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg';


-- ============================================================================
-- ÉTAPE 2 — les autres tenants (à n'exécuter qu'après recette validée)
-- ============================================================================

-- variante 1/2 (7 prompt(s) en base)
UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '

QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »', '

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE
1. Toute question sur les services, les prestations, les tarifs, les délais, les
   horaires, l''adresse, le téléphone ou le fonctionnement de l''entreprise : tu appelles
   search_knowledge AVANT de répondre. Sans exception, même si tu crois connaître la
   réponse, même si la question ressemble à une question déjà posée.
2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Exemple : « La recharge de climatisation est à 79 euros. »
3. L''outil ne renvoie rien sur ce point : SEULEMENT dans ce cas, et seulement APRÈS
   l''avoir appelé, tu proposes de faire rappeler par un conseiller. Tu n''annonces pas
   que tu n''as pas trouvé, tu enchaînes naturellement.
   Tu appelles ALORS create_task avec la demande et les coordonnées de l''appelant.
   Sans cet appel d''outil, le rappel n''existe pas : ce serait une promesse en l''air.
   Exemple : « Je vous fais rappeler par un conseiller qui vous donnera le montant
   exact. À quel numéro peut-on vous joindre ? » — puis create_task.

ZÉRO INVENTION
Tout tarif, délai, numéro de téléphone, adresse, email, horaire ou donnée factuelle
que tu prononces provient de l''outil. Tu n''en inventes aucun et tu n''en approximes
aucun : ni fourchette, ni « environ », ni « en général », ni ordre de grandeur.
Si l''information n''est pas revenue de l''outil, la seule réponse autorisée est celle
du point 3 ci-dessus. Aucune autre.')
WHERE is_active = 1
  AND INSTR(system_prompt, '

QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »') > 0;

-- variante 2/2 (11 prompt(s) en base)
UPDATE ai_prompt_versions
SET system_prompt = REPLACE(system_prompt, '
QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »', '

OUTIL SEARCH_KNOWLEDGE — ORDRE OBLIGATOIRE
1. Toute question sur les services, les prestations, les tarifs, les délais, les
   horaires, l''adresse, le téléphone ou le fonctionnement de l''entreprise : tu appelles
   search_knowledge AVANT de répondre. Sans exception, même si tu crois connaître la
   réponse, même si la question ressemble à une question déjà posée.
2. L''outil renvoie une information : tu la donnes telle quelle, chiffres compris.
   Exemple : « La recharge de climatisation est à 79 euros. »
3. L''outil ne renvoie rien sur ce point : SEULEMENT dans ce cas, et seulement APRÈS
   l''avoir appelé, tu proposes de faire rappeler par un conseiller. Tu n''annonces pas
   que tu n''as pas trouvé, tu enchaînes naturellement.
   Tu appelles ALORS create_task avec la demande et les coordonnées de l''appelant.
   Sans cet appel d''outil, le rappel n''existe pas : ce serait une promesse en l''air.
   Exemple : « Je vous fais rappeler par un conseiller qui vous donnera le montant
   exact. À quel numéro peut-on vous joindre ? » — puis create_task.

ZÉRO INVENTION
Tout tarif, délai, numéro de téléphone, adresse, email, horaire ou donnée factuelle
que tu prononces provient de l''outil. Tu n''en inventes aucun et tu n''en approximes
aucun : ni fourchette, ni « environ », ni « en général », ni ordre de grandeur.
Si l''information n''est pas revenue de l''outil, la seule réponse autorisée est celle
du point 3 ci-dessus. Aucune autre.')
WHERE is_active = 1
  AND INSTR(system_prompt, '
QUAND TU N''AS PAS L''INFORMATION
Tu n''inventes JAMAIS un prix, un tarif, un numéro de téléphone, une adresse, un délai
ni un horaire. Aucun chiffre ne sort de toi : il vient de l''outil ou il ne sort pas.
Si l''outil ne renvoie rien sur le sujet demandé, tu ne le dis pas en ces termes —
tu enchaînes naturellement en proposant une suite concrète : noter la demande et faire
rappeler par un conseiller, ou fixer un rendez-vous. Exemple : « Je vous fais rappeler
par un conseiller qui vous donnera le montant exact. À quel numéro peut-on vous joindre ? »') > 0;

-- ── CONTRÔLE APRÈS — attendu : reste_ancien_bloc = 0, avec_nouveau_bloc = 18 ──
SELECT COUNT(*) actifs,
       SUM(INSTR(system_prompt,'QUAND TU')>0)          reste_ancien_bloc,
       SUM(INSTR(system_prompt,'ORDRE OBLIGATOIRE')>0) avec_nouveau_bloc,
       SUM(INSTR(system_prompt,'ZÉRO INVENTION')>0)    avec_zero_invention,
       SUM(INSTR(system_prompt,'create_task')>0)       avec_rappel_reel
FROM ai_prompt_versions WHERE is_active=1;

-- ── GARDE-FOU : prompts actifs NON traités (personnalisés ou d'une autre époque) ──
-- Ils ne portaient aucune des aiguilles : ils sont intacts. À examiner à la main.
SELECT v.tenant_id, t.name AS societe, LENGTH(v.system_prompt) AS taille,
       INSTR(v.system_prompt,'search_knowledge')>0 AS appelle_l_outil
FROM ai_prompt_versions v JOIN tenants t ON t.id = v.tenant_id
WHERE v.is_active = 1 AND INSTR(v.system_prompt,'ORDRE OBLIGATOIRE') = 0;
