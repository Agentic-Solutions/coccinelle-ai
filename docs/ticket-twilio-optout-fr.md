# Ticket Twilio — relais des mots-clés d'opt-out sur les numéros longs français

> **BROUILLON — à relire par Youssef avant envoi.** Rien n'a été transmis à Twilio.
> Rédigé le 17/08/2026 à partir de mesures faites sur le compte `AC99d4…5561`.
>
> Où l'envoyer : Twilio Console → Help → Create a support ticket.
> Catégorie suggérée : *Programmable Messaging → Deliverability / Inbound*.
> Le corps du ticket commence après la ligne de séparation ; le reste est pour nous.

## Pourquoi ce ticket, et ce qu'il ne réglera pas

Le problème n'est **pas** que nous ne recevons pas les STOP — c'est que quelqu'un
répond à notre place, promet à la personne que son refus est enregistré, **et que ce
refus n'est appliqué par personne**. Nous sommes l'expéditeur affiché : c'est notre
promesse, pas celle de l'opérateur.

Ce que le lot du 17/08 a fermé (`ARRET`, `DESABONNEMENT`, … reçus et appliqués par
notre code, plus le chemin `21610`) ne couvre pas ce cas : le message n'arrive jamais.
La réponse de Twilio sera peut-être « ce n'est pas relayable ». C'est une réponse
exploitable — elle nous dit d'arrêter de chercher côté technique et de traiter le sujet
en conformité, avec le point AF2M du backlog.

---

**Objet : Are opt-out keywords relayed to the inbound webhook on French long codes? (account AC99d4…5561)**

Hello,

We operate French local numbers on this account and we have a compliance problem we
cannot solve from our side. I would like to understand the expected behaviour before we
decide how to handle it.

**What we measured** (17 Aug 2026, all from a real French mobile handset to our own
number `+33939035760`, which is voice+SMS enabled and carried through your French
provider):

1. We sent `STOP`. We received an immediate French-language confirmation, apparently
   from the carrier layer: *"LEGOS: Demande enregistrée. Vous ne recevrez plus de
   message provenant de ce numéro. SMS non surtaxé."* This message **does not appear
   anywhere in our Twilio message logs**, in either direction.
2. One minute later, from the same handset to the same number, we sent `ARRET` (the
   standard French equivalent). It **did** arrive: logged as `inbound`, `received`.
   Twilio sent no automatic reply and took no action on it.
3. We then sent a normal outbound SMS from `+33939035760` to that same handset. The
   API accepted it, the status reached `delivered`, and **the recipient confirmed
   receiving it on the handset** — after having sent `STOP`.

For contrast, we verified Twilio's own opt-out handling works as documented when a
message does reach you: sending `STOP` between two of our own Twilio numbers produced
the reply *"You have successfully been unsubscribed."*, and the next outbound attempt
was correctly rejected with error **21610**. `START` lifted it. So the mechanism is
fine — the French inbound `STOP` simply never reaches it.

**The resulting situation, from the recipient's point of view:** they receive written
confirmation that their opt-out has been registered, and they keep receiving our
messages. As the visible sender, we are the party that appears to be ignoring an
explicit opt-out request, while having no technical way to learn that it happened.

**My questions:**

1. On French long codes, are opt-out keywords (`STOP`, and the French `ARRET`,
   `DESABONNEMENT`, …) intercepted by the upstream carrier before reaching Twilio? Is
   this expected and documented behaviour for this number type?
2. If so, is there any way for us to be notified of these opt-outs — a webhook, an
   event, a status callback, an API we can poll, or a Messaging Service setting that
   changes the routing? We currently have `SmsUrl` set on the number and do receive
   every other inbound message correctly.
3. If there is no such notification: **how is a sender expected to honour an opt-out it
   is never informed of?** We are willing to implement whatever is available. What we
   cannot do is keep messaging someone who has been told, in writing, that they will no
   longer be messaged.
4. Does the answer change if the numbers are moved into a Messaging Service with
   Advanced Opt-Out enabled? Today our numbers send with a direct `From`, and only
   `+33939035761` is attached to a Messaging Service.

We are not asking you to change carrier behaviour — we are asking what the supported
path is, so that we can be compliant rather than merely well-intentioned.

**A second, unrelated question on the same numbers** (happy to split this into its own
ticket if you prefer):

We cannot determine where the inbound SMS webhook URL actually in effect comes from.
`GET /IncomingPhoneNumbers` reports `SmsUrl = https://…/webhooks/omnichannel/sms` for
`+33939035760` (set 17 Aug 19:23:08 UTC via the API, `date_updated` unchanged since),
but your servers actually POST to `https://…/webhooks/twilio/sms` — confirmed live from
our own request logs: `User-Agent: TwilioProxy/1.1`, valid `X-Twilio-Signature`, HTTP
200. The number is not attached to any Messaging Service (only `+33939035761` is), the
single TwiML Application on the account has an empty `SmsUrl`, the number's
`SmsApplicationSid` is empty, and nobody has touched the Console.

Which configuration surface takes precedence here, and how can we read the URL that is
genuinely in effect? Does assignment to an Elastic SIP Trunk (`TKd1b6…f213bf`) change
where messaging configuration is read from? We would like to stop guessing.

Thank you,

Youssef Amrouche — Agentic Solutions SASU (Coccinelle.ai)
Account SID: AC99d4…5561 · Numbers concerned: `+33939035760`, `+33939035761`
Reference inbound message: the `ARRET` received 17 Aug 2026 18:39:50 UTC on
`+33939035760` from a French mobile — the `STOP` sent one minute earlier is absent from
the logs.
