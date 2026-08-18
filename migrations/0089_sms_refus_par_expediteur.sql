-- Migration 0089 — le refus se cle sur le NUMERO EXPEDITEUR, plus sur le tenant
-- (chantier CONSENTEMENT, suite du 17/08/2026)
--
-- ── CE QUI A ETE MESURE, ET QUI CONDAMNE LA CLE PRECEDENTE ──
-- La 0088 clait le refus sur `(tenant_id, phone)`, au motif que le consentement se
-- donne a un responsable de traitement et non a la plateforme. Le raisonnement est
-- juste, sa PREMISSE ne l'est pas : elle suppose un numero expediteur PAR TENANT.
--
-- Mesure du 17/08/2026 : tous les tenants emettent depuis le MEME numero,
-- `+33939035760`. Le webhook resolvait donc le tenant par `omni_phone_mappings`, qui
-- fait pointer ce numero vers le tenant « Coccinelle.ai ». Verifie en production : un
-- STOP repondu a un devis de GARAGE TOULOUSE s'enregistrait chez COCCINELLE.AI, et
-- Garage Toulouse continuait d'envoyer.
--
-- Un refus enregistre contre le mauvais tenant est PIRE qu'aucun refus : la personne
-- croit avoir refuse, l'expediteur continue, et la trace atteste du contraire de la
-- realite. C'est une preuve a charge, pas une protection.
--
-- ── POURQUOI L'EXPEDITEUR, ET PAS « LA LISTE DES TENANTS QUI ONT ECRIT » ──
-- La correction evidente serait d'enumerer les tenants ayant deja ecrit a ce contact
-- et de poser une ligne par tenant. Elle laisse un trou : un tenant qui ecrit a ce
-- contact POUR LA PREMIERE FOIS APRES le STOP n'est dans aucune ligne, et son SMS
-- part. Le defaut est le meme, simplement decale dans le temps.
--
-- La cle par expediteur ferme le trou au lieu de le rattraper, parce qu'elle epouse
-- ce que la personne a REELLEMENT refuse : elle ne connait pas nos tenants, elle voit
-- un numero et refuse « ce numero ». La portee du refus suit donc l'identite
-- d'expediteur percue.
--
-- Elle se resserre ensuite toute seule : le jour ou Garage Toulouse aura son propre
-- numero, un refus sur ce numero ne concernera que lui, sans changer une ligne de code.
--
-- ── POURQUOI UN DROP EST ACCEPTABLE ICI ──
-- `SELECT COUNT(*) FROM sms_refus` = **0** en production, mesure le 17/08/2026 juste
-- avant d'ecrire ce fichier. Il n'y a aucun refus a preserver : le seul jamais ecrit
-- l'a ete par une sonde de diagnostic, et il a ete supprime. Ecrire une conversion de
-- donnees inexistantes reviendrait a livrer du SQL que rien n'aura jamais execute.
DROP TABLE IF EXISTS sms_refus;

CREATE TABLE sms_refus (
  -- Le numero QUI A RECU le STOP, donc celui que la personne avait sous les yeux.
  -- C'est la cle d'application : `envoyerSmsTrace` la compare a son propre expediteur.
  expediteur        TEXT NOT NULL,
  -- Numero au format E.164 quand on l'a, sinon tel que recu. Le rapprochement passe
  -- par les variantes de `prospects/dedup.js` (4 des 34 contacts ne sont pas en
  -- E.164) : stocker une seule forme et comparer strictement laisserait passer des
  -- SMS a quelqu'un qui a refuse depuis un numero ecrit autrement.
  phone             TEXT NOT NULL,
  refuse_at         TEXT NOT NULL DEFAULT (datetime('now')),
  -- D'ou vient le refus. Deux sources REELLES, et elles sont complementaires :
  --   'sms_entrant'  — la personne nous a ecrit ARRET / DESABONNEMENT / … et le
  --                    webhook l'a recu. C'est le seul chemin qui capte les
  --                    formulations francaises (mesure du 17/08 : Twilio ne connait
  --                    que STOP, et laisse passer ARRET sans rien en faire).
  --   'twilio_21610' — Twilio a REFUSE un envoi en nous annoncant que le destinataire
  --                    s'est desabonne. Ce chemin n'a besoin d'AUCUN message entrant,
  --                    donc il survit a un webhook non configure. Il ne connait en
  --                    revanche que les refus que Twilio connait.
  -- Aucun des deux ne couvre l'autre : c'est pour cela qu'ils coexistent.
  source            TEXT NOT NULL DEFAULT 'sms_entrant',
  -- Le texte exact recu, tronque. Sert de preuve : si quelqu'un conteste, on peut
  -- montrer ce qui a ete demande et quand.
  message           TEXT,
  -- INFORMATIF, jamais lu pour decider d'un envoi. Les tenants qui ecrivaient a ce
  -- contact au moment du refus. Sert a deux choses : repondre a « qui cela
  -- concernait-il ? », et migrer les refus le jour ou les numeros seront provisionnes
  -- par tenant — sans cette colonne, ce jour-la, les refus existants seraient
  -- inattribuables et donc perdus.
  tenants_concernes TEXT,
  PRIMARY KEY (expediteur, phone)
);

-- Lecture faite AVANT CHAQUE ENVOI (`shared/sms-envoi.js`) : la cle primaire couvre le
-- cas nominal. Cet index sert les diagnostics (« qui a refuse cette semaine »).
CREATE INDEX IF NOT EXISTS idx_sms_refus_date ON sms_refus (refuse_at);
