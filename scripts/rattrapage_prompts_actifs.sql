-- Rattrapage : 6 tenants sans prompt actif (is_active=0 sur leur unique version).
-- Généré le 2026-08-05. À EXÉCUTER PAR YOUSSEF, une seule fois.
--
-- Cause : l'INSERT de ai_prompt_versions échouait à l'étape « assistant » de
-- l'onboarding (colonne updated_at inexistante + id TEXT sur INTEGER AUTOINCREMENT)
-- APRÈS que le UPDATE ... is_active = 0 ait réussi. Corrigé dans le code par
-- l'inversion de l'ordre (commit 8548d4a) : ce SQL ne répare que l'existant.
--
-- Pourquoi ne PAS réactiver simplement la version existante : aucune des 6 n'est
-- exploitable. Elles ne contiennent ni l'instruction search_knowledge (règle i.5)
-- ni la liste de MOTS INTERDITS (règle i.6), et nomment toutes l'assistant
-- « Coccinelle » au lieu du prénom choisi par le client.
-- Pourquoi ne PAS régénérer depuis ai_sector_templates : cette table est dégradée
-- pour TOUS les secteurs (aucun template n'a search_knowledge — voir récap).
-- Source retenue : buildStarterPrompt() de voixia-portal/lib/sectors.ts, seul
-- générateur du dépôt conforme aux règles vocales. Texte extrait, pas retapé.
--
-- Sûreté : les 6 tenant_id sont en dur. Chaque bloc INSÈRE d'abord et ne
-- désactive qu'ensuite — un échec laisse le tenant dans son état actuel.
-- Aucune variable {} dans le texte inséré (règle prompt actif).

-- ── AVANT : état attendu = 6 lignes, actif = 0 ──────────────────────────────
SELECT t.name AS societe, MAX(v.is_active) AS actif, COUNT(*) AS versions
FROM ai_prompt_versions v JOIN tenants t ON t.id = v.tenant_id
WHERE v.tenant_id IN ('tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk', 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ', 'tenant_dGVzdHFAdGVzdC5mcg', 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp', 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t', 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp')
GROUP BY v.tenant_id;

-- ── test.fix1 — assistant « Julien » (juridique) ──
INSERT INTO ai_prompt_versions
  (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
VALUES (
  'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk', 'voice', 'juridique',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk'),
  'Tu es Julien, l''assistant vocal de test.fix1.

MISSION
Ta mission est d''accueillir les clients, expliquer le déroulement des démarches et planifier les rendez-vous.
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l''outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de test.fix1.
Ne réponds jamais de mémoire sur ces sujets : utilise l''outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N''emploie jamais : « sur devis », « je ne sais pas », « je n''ai pas l''information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l''appelant.',
  1, datetime('now'), datetime('now')
);

UPDATE ai_prompt_versions SET is_active = 0
WHERE tenant_id = 'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk'
  AND id <> (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk');

UPDATE voixia_configs
SET active_prompt_id = (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk'),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk';

-- ── test.qw2 — assistant « Julien » (generaliste) ──
INSERT INTO ai_prompt_versions
  (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
VALUES (
  'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ', 'voice', 'generaliste',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ'),
  'Tu es Julien, l''assistant vocal de test.qw2.

MISSION
Ta mission est d''accueillir les appelants, répondre à leurs questions et prendre les messages ou rendez-vous.
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l''outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de test.qw2.
Ne réponds jamais de mémoire sur ces sujets : utilise l''outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N''emploie jamais : « sur devis », « je ne sais pas », « je n''ai pas l''information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l''appelant.',
  1, datetime('now'), datetime('now')
);

UPDATE ai_prompt_versions SET is_active = 0
WHERE tenant_id = 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ'
  AND id <> (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ');

UPDATE voixia_configs
SET active_prompt_id = (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ'),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ';

-- ── testq — assistant « Assistant » (generaliste) ──
INSERT INTO ai_prompt_versions
  (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
VALUES (
  'tenant_dGVzdHFAdGVzdC5mcg', 'voice', 'generaliste',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdHFAdGVzdC5mcg'),
  'Tu es Assistant, l''assistant vocal de testq.

MISSION
Ta mission est d''accueillir les appelants, répondre à leurs questions et prendre les messages ou rendez-vous.
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l''outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de testq.
Ne réponds jamais de mémoire sur ces sujets : utilise l''outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N''emploie jamais : « sur devis », « je ne sais pas », « je n''ai pas l''information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l''appelant.',
  1, datetime('now'), datetime('now')
);

UPDATE ai_prompt_versions SET is_active = 0
WHERE tenant_id = 'tenant_dGVzdHFAdGVzdC5mcg'
  AND id <> (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdHFAdGVzdC5mcg');

UPDATE voixia_configs
SET active_prompt_id = (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_dGVzdHFAdGVzdC5mcg'),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_dGVzdHFAdGVzdC5mcg';

-- ── Coccinelle.ai — assistant « Marc » (juridique) ──
INSERT INTO ai_prompt_versions
  (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
VALUES (
  'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp', 'voice', 'juridique',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'),
  'Tu es Marc, l''assistant vocal de Coccinelle.ai.

MISSION
Ta mission est d''accueillir les clients, expliquer le déroulement des démarches et planifier les rendez-vous.
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l''outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de Coccinelle.ai.
Ne réponds jamais de mémoire sur ces sujets : utilise l''outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N''emploie jamais : « sur devis », « je ne sais pas », « je n''ai pas l''information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l''appelant.',
  1, datetime('now'), datetime('now')
);

UPDATE ai_prompt_versions SET is_active = 0
WHERE tenant_id = 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'
  AND id <> (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp');

UPDATE voixia_configs
SET active_prompt_id = (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp';

-- ── AMROUCHE — assistant « Leyn » (generaliste) ──
INSERT INTO ai_prompt_versions
  (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
VALUES (
  'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t', 'voice', 'generaliste',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t'),
  'Tu es Leyn, l''assistant vocal de AMROUCHE.

MISSION
Ta mission est d''accueillir les appelants, répondre à leurs questions et prendre les messages ou rendez-vous.
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l''outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de AMROUCHE.
Ne réponds jamais de mémoire sur ces sujets : utilise l''outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N''emploie jamais : « sur devis », « je ne sais pas », « je n''ai pas l''information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l''appelant.',
  1, datetime('now'), datetime('now')
);

UPDATE ai_prompt_versions SET is_active = 0
WHERE tenant_id = 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t'
  AND id <> (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t');

UPDATE voixia_configs
SET active_prompt_id = (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t'),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t';

-- ── Youssef Amrouche — assistant « Claude » (juridique) ──
INSERT INTO ai_prompt_versions
  (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
VALUES (
  'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp', 'voice', 'juridique',
  (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'),
  'Tu es Claude, l''assistant vocal de Youssef Amrouche.

MISSION
Ta mission est d''accueillir les clients, expliquer le déroulement des démarches et planifier les rendez-vous.
Tu réponds au téléphone de façon naturelle, chaleureuse et professionnelle.

STYLE
Phrases courtes et claires, ton posé et souriant. Une seule question à la fois.
Tu parles français. Tu ne lis jamais de listes à puces ni de symboles à voix haute.

CONNAISSANCES
Appelle TOUJOURS l''outil search_knowledge AVANT de répondre à toute question sur
les services, les prestations, les tarifs, les horaires ou le fonctionnement de Youssef Amrouche.
Ne réponds jamais de mémoire sur ces sujets : utilise l''outil.

OUTIL SILENCIEUX
Tu utilises tes outils en silence. Ne dis JAMAIS « je consulte », « je vérifie »,
« un instant », « je recherche », « laissez-moi regarder ». Enchaîne directement
avec la réponse comme si tu la connaissais.

MOTS INTERDITS
N''emploie jamais : « sur devis », « je ne sais pas », « je n''ai pas l''information »,
« système », « base de données », « intelligence artificielle », « robot ».
Si une information manque, propose de transmettre la demande ou de fixer un rappel.

CLÔTURE
Termine chaque appel en récapitulant ce qui a été convenu et en remerciant l''appelant.',
  1, datetime('now'), datetime('now')
);

UPDATE ai_prompt_versions SET is_active = 0
WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'
  AND id <> (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp');

UPDATE voixia_configs
SET active_prompt_id = (SELECT MAX(id) FROM ai_prompt_versions WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp'),
    updated_at = datetime('now')
WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp';

-- ── APRÈS : attendu = 6 lignes, actifs = 1, regle_kb = 1, prenom_ok = 1 ─────
SELECT t.name AS societe,
       SUM(v.is_active) AS actifs,
       MAX(CASE WHEN v.is_active = 1 THEN v.system_prompt LIKE '%search_knowledge%' END) AS regle_kb,
       MAX(CASE WHEN v.is_active = 1 THEN v.system_prompt NOT LIKE '%Coccinelle,%' END) AS prenom_ok
FROM ai_prompt_versions v JOIN tenants t ON t.id = v.tenant_id
WHERE v.tenant_id IN ('tenant_dGVzdC5maXgxQGNvY2NpbmVsbGUuYWk', 'tenant_dGVzdC5xdzJAY29jY2luZWxsZS5haQ', 'tenant_dGVzdHFAdGVzdC5mcg', 'tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp', 'tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t', 'tenant_eW91c3NlZi5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp')
GROUP BY v.tenant_id;
