-- Migration 0088 — refus de recevoir des SMS (chantier CONSENTEMENT, 17/08/2026)
--
-- POURQUOI
-- Diagnostic du 17/08 : il n'existait AUCUNE trace de consentement dans tout le
-- schema, et surtout AUCUN moyen pour une personne de refuser. Un client qui
-- repondait « STOP » voyait son message enregistre comme un message ordinaire, puis
-- interprete par l'IA comme une question. Le refus disparaissait.
--
-- Ne pas traiter un STOP recu est indefendable quel que soit le type de message : la
-- personne a exprime un refus explicite. C'est le point le plus expose des quatre
-- traites par ce lot.
--
-- ── POURQUOI UNE TABLE, ET NON UNE COLONNE SUR `prospects` ──
-- Le refus doit fonctionner pour un numero INCONNU. Quelqu'un qui n'a jamais ete
-- enregistre comme prospect peut recevoir un SMS (l'agent vocal envoie au numero de
-- l'appelant, qui n'a pas toujours de fiche) et donc vouloir refuser. Une colonne sur
-- `prospects` n'aurait nulle part ou ecrire ce refus-la, et le perdrait — exactement
-- le defaut qu'on corrige.
--
-- La cle est donc (tenant_id, phone) : le refus est PAR ENTREPRISE. Refuser les SMS
-- du Garage Toulouse ne refuse pas ceux du cabinet dentaire d'a cote, et c'est le
-- comportement correct : le consentement se donne a un responsable de traitement,
-- pas a la plateforme.

CREATE TABLE IF NOT EXISTS sms_refus (
  tenant_id  TEXT NOT NULL,
  -- Numero au format E.164 quand on l'a, sinon tel que recu. Le rapprochement passe
  -- par les variantes de `prospects/dedup.js` (30 des 34 contacts sont en E.164, 4 ne
  -- le sont pas) : stocker une seule forme et comparer strictement laisserait passer
  -- des SMS a quelqu'un qui a refuse depuis un numero ecrit autrement.
  phone      TEXT NOT NULL,
  refuse_at  TEXT NOT NULL DEFAULT (datetime('now')),
  -- D'ou vient le refus : 'sms_entrant' aujourd'hui. Prevu pour 'dashboard' ou
  -- 'formulaire' quand le consentement positif arrivera (second lot).
  source     TEXT NOT NULL DEFAULT 'sms_entrant',
  -- Le texte exact recu, tronque. Sert de preuve : si quelqu'un conteste, on peut
  -- montrer ce qui a ete envoye et quand. C'est la piece qui manquait entierement.
  message    TEXT,
  PRIMARY KEY (tenant_id, phone)
);

-- Lecture faite AVANT CHAQUE ENVOI (`shared/sms-envoi.js`) : elle doit etre rapide.
-- La cle primaire couvre le cas nominal ; cet index sert les diagnostics
-- (« qui a refuse cette semaine »).
CREATE INDEX IF NOT EXISTS idx_sms_refus_date ON sms_refus (refuse_at);
