-- Migration 0085 — type de message sur omni_messages (chantier CX-3, 15/08/2026)
--
-- POURQUOI
-- La page « Mes communications » raconte le voyage du client : ce qu'il recoit
-- apres son appel, quand il reserve, la veille du rendez-vous. Pour placer un
-- message a la bonne etape, il faut savoir CE QUE C'EST — et `omni_messages`
-- ne le disait pas : elle porte `channel` (sms/email) et `direction`, jamais le
-- role du message.
--
-- Les valeurs sont celles de TYPES_SMS (`src/modules/shared/sms-booking-link.js`),
-- source unique de la regle du lien de reservation. On ne cree pas une seconde
-- nomenclature : la colonne stocke exactement le `type` deja passe a l'envoi.
--
-- POURQUOI PAS `content_type`
-- Elle existe et vaut 'text' partout : c'est la nature du contenu, pas son role.
-- Y ranger « confirmation_rdv » serait un mensonge de schema — le genre qui se
-- paie six mois plus tard.
--
-- NULLABLE, et le restera : un message d'avant ce jour n'a pas de type, et
-- l'inventer serait pire que l'ignorer. La lecture traite NULL comme « autre ».
ALTER TABLE omni_messages ADD COLUMN message_type TEXT;

-- Index sur la lecture reelle de la page : les messages d'une conversation,
-- filtres par type. `conversation_id` seul ne suffit pas — la frise demande
-- « le dernier message de tel type » sur tout le tenant.
CREATE INDEX IF NOT EXISTS idx_omni_messages_type
  ON omni_messages (message_type, created_at DESC);

-- ── Rattrapage des 4 lignes existantes ──
-- Ce n'est PAS une inference sur le contenu : avant aujourd'hui, deux chemins
-- seulement tracaient dans omni_messages (`public/booking.js` et
-- `cron/reminders.js`, tous deux via envoyerSmsTrace). Les 4 lignes de la base
-- viennent donc necessairement de l'un des deux, et leur prefixe les separe
-- sans ambiguite. Toute ligne qui ne matche ni l'un ni l'autre reste NULL.
UPDATE omni_messages
   SET message_type = 'rappel_rdv'
 WHERE message_type IS NULL
   AND direction = 'outbound'
   AND channel = 'sms'
   AND content LIKE 'Rappel :%';

UPDATE omni_messages
   SET message_type = 'confirmation_rdv'
 WHERE message_type IS NULL
   AND direction = 'outbound'
   AND channel = 'sms'
   AND content LIKE 'Votre RDV%';
