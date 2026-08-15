-- Migration 0086 — gabarits de SMS par tenant (chantier CX-3, lot 2, 15/08/2026)
--
-- POURQUOI
-- « Un modele modifie dans la page doit etre celui qui part vraiment. » Le texte
-- de la confirmation de rendez-vous etait EN DUR dans `public/booking.js` : un
-- garagiste ne pouvait pas le formuler autrement, et l'editeur de la maquette
-- n'aurait eu rien a ecrire.
--
-- UNE SEULE LIGNE PAR (tenant, type). L'INDEX UNIQUE n'est pas un ornement : la
-- page enregistre par un PUT, et deux clics rapproches produiraient deux lignes
-- dont la lecture prendrait l'une au hasard — le genre de defaut qui se
-- manifeste six mois plus tard comme « le message a change tout seul ».
--
-- LE DEFAUT N'EST PAS EN BASE. Il vit dans `shared/sms-modeles.js` (MODELES) :
--   1. un tenant sans ligne recoit le defaut, donc aucun backfill n'est requis
--      et aucun tenant ne voit son message changer aujourd'hui ;
--   2. faire evoluer le texte par defaut se fait dans le code, revu et versionne,
--      pas par un UPDATE de masse sur 7 lignes puis 700 ;
--   3. une ligne absente et une ligne vide se comportent pareil — c'est le meme
--      repli, il n'y a pas deux chemins a tester.
--
-- `type` porte les valeurs de TYPES_SMS (`shared/sms-booking-link.js`). Pas de
-- contrainte CHECK : la liste des types modifiables vit dans MODELES, et la
-- dupliquer en SQL creerait deux verites a maintenir. Un type inconnu est refuse
-- par la route AVANT l'ecriture.
CREATE TABLE IF NOT EXISTS message_modeles (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  type        TEXT NOT NULL,
  corps       TEXT NOT NULL,
  -- Qui a modifie, et quand : un message client qui change sans trace est
  -- impossible a expliquer au support.
  modifie_par TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_modeles_tenant_type
  ON message_modeles (tenant_id, type);
