-- Migration 0087 — plafond de SMS par tenant et par jour (chantier ANTI-ROBOT, 15/08/2026)
--
-- POURQUOI
-- Le formulaire de reservation publique est sans authentification par nature, et
-- chaque reservation envoie un VRAI SMS. Mesure du 15/08 : 10 000 reservations
-- = 10 000 SMS = ~800 EUR, et le rate limiter en place est une `Map` en memoire
-- du Worker — donc un compteur par isolate, remis a zero a chaque eviction. Il
-- arrete une boucle accidentelle, pas un balayage.
--
-- Turnstile et les validations rendent l'attaque difficile. CE PLAFOND rend la
-- facture impossible a depasser, meme si tout le reste tombe. C'est ce qui rend
-- acceptable l'echec OUVERT de Turnstile (un client ne doit jamais perdre une
-- reservation parce qu'un script tiers n'a pas charge).
--
-- ── DEUX BUDGETS ETANCHES, par ORIGINE et non par type ──
-- Au niveau d'un message, une attaque est INDISTINGUABLE d'une vraie
-- reservation : meme type (`confirmation_rdv`), meme code, meme gabarit. Ce qui
-- les separe, c'est l'origine — l'attaque ne peut venir que du chemin public.
--
--   `public`       /public/booking/*/book uniquement          defaut  20/jour
--   `authentifie`  cron J-1, devis de l'agent, SMS du dashboard defaut 100/jour
--
-- Consequence decisive : saturer le budget public ne fait JAMAIS taire un rappel
-- J-1 ni un devis. Un robot consomme son propre seau, jamais celui des vrais
-- clients.
--
-- Base du chiffre 20 : l'offre commerciale, faute de donnees d'usage (maximum
-- observe sur tout l'historique : 4 SMS/jour/tenant). Essentiel annonce 50
-- SMS/mois, soit ~1,7/jour ; Pro 250/mois, soit ~8/jour. 20/jour est donc 12x le
-- rythme d'Essentiel et 2,5x celui de Pro — une pointe reelle (saison des pneus)
-- passe, un balayage non. Cout borne : 1,60 EUR/jour/tenant.

-- ── Le compteur ──
-- Une ligne par (tenant, jour, origine). L'agregat est borne : la table ne
-- grossit pas avec le nombre de tentatives, seulement avec les jours. Un
-- attaquant nous fait ecrire, mais pas gonfler.
CREATE TABLE IF NOT EXISTS sms_compteurs_jour (
  tenant_id  TEXT NOT NULL,
  -- 'YYYY-MM-DD' en UTC, comme `datetime('now')` partout ailleurs dans ce code.
  jour       TEXT NOT NULL,
  origine    TEXT NOT NULL CHECK (origine IN ('public', 'authentifie')),
  envoyes    INTEGER NOT NULL DEFAULT 0,
  -- Trace du dernier depassement : sert a n'alerter QU'UNE FOIS par tenant et par
  -- jour. Sans elle, 10 000 tentatives au-dela du plafond declencheraient 10 000
  -- SMS d'alerte — l'alerte deviendrait l'attaque.
  alerte_envoyee_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (tenant_id, jour, origine)
);

-- Lecture du cron et des diagnostics : « qu'est-il parti aujourd'hui ».
CREATE INDEX IF NOT EXISTS idx_sms_compteurs_jour
  ON sms_compteurs_jour (jour, origine);

-- ── Le plafond, reglable par tenant ──
-- NULL = le defaut du code (`shared/sms-plafond.js`). Une pointe saisonniere se
-- traite en changeant une valeur, pas en deployant.
--
-- ⚠️ CES DEUX LIGNES NE SE REJOUENT PAS. SQLite n'a pas d'`ADD COLUMN IF NOT
-- EXISTS` : un second passage repond « duplicate column name » — verifie le
-- 16/08 sur une base locale. Ce n'est pas un echec de la migration, c'est le
-- signe qu'elle est deja passee. Les deux CREATE TABLE et l'index, eux, sont
-- idempotents. Controle avant application :
--   SELECT COUNT(*) FROM pragma_table_info('tenants') WHERE name LIKE 'sms_plafond%';
-- 0 = a appliquer, 2 = deja fait.
ALTER TABLE tenants ADD COLUMN sms_plafond_public TEXT;
ALTER TABLE tenants ADD COLUMN sms_plafond_authentifie TEXT;

-- ── Compteur de cles VoixIA refusees (lot D) ──
-- Le 401 tombe AVANT tout rate limit (`voixia/auth.js`), et les logs du Worker
-- ne sont pas conserves : un balayage de cles est aujourd'hui gratuit ET
-- invisible. Meme forme agregee que ci-dessus, pour la meme raison.
CREATE TABLE IF NOT EXISTS voixia_401_jour (
  jour       TEXT NOT NULL PRIMARY KEY,
  tentatives INTEGER NOT NULL DEFAULT 0,
  -- ⚠️ On ne compte QUE les tentatives, pas les IP. Compter des IP distinctes
  -- exigerait de les stocker — une donnee personnelle sans finalite de
  -- conservation ici. L'alerte ne saura donc pas distinguer une IP a 10 000 coups
  -- de 10 000 IP a un coup ; elle dit « on frappe », et c'est ce qui declenche le
  -- regard. Les logs du Worker (actives au lot D) portent l'IP a la demande.
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
