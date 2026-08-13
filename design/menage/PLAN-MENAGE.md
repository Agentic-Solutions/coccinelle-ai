# Chantier MÉNAGE — plan de mise en œuvre

> Branche `chantier-menage`. R4 : ce plan précède le code.
> Périmètre validé : lots 1, 2 et 3. Le lot doublons (C) est reporté.
> Aucune route backend supprimée. Aucune migration. Déploiement par Youssef.

---

## Ce que le chantier répare vraiment

Le sujet annoncé était « du code mort qui fait perdre confiance ». L'inventaire a
trouvé pire : **un chemin vivant qui mène dans le mur.**

`src/utils/notifications.js` construit l'URL de chaque notification push. Les
**quatre** destinations sont mortes :

| Type | URL envoyée | Ce que le client obtient |
|---|---|---|
| `new_appointment` | `/dashboard/appointments` | page d'erreur (`__next_error__`) |
| `missed_call` | `/dashboard/calls` | **404 — la page n'a jamais existé** |
| `new_prospect` | `/dashboard/prospects` | page d'erreur |
| `new_message` | `/dashboard/inbox` | page d'erreur |

D'où l'ordre : le lot 1 traite ça, seul, et se vérifie seul.

---

## Vérification de la messagerie vocale (demandée avant suppression)

| Où j'ai cherché | Résultat |
|---|---|
| Routes backend (`src/**`) | aucune occurrence de `voicemail`, `messagerie vocale`, `répondeur` |
| Webhook Twilio d'enregistrement (`RecordingUrl`, `RecordingSid`, `<Record>`) | aucun |
| Tables D1 (`%voice%`, `%record%`, `%ivr%`, `%queue%`) | aucune. Les 2 réponses sont `billing_invoices` (« in**voice**s ») et `integration_sync_queue` (synchronisation d'intégrations), sans rapport |
| Contenu de la page | 16 lignes : une icône et « Cette fonctionnalité arrive prochainement » |

**Aucun flux n'existe. Suppression confirmée.** À noter : la fonction *existe déjà
ailleurs, et mieux*. Hors horaires, l'agent prend le message et l'enregistre par
`create_task` (bloc HORS HORAIRES, chantier CX-2). Transfert impossible, il propose
un rappel via `create_prospect` + SMS (`voixia/agent/tools/transfer.py`). Le
répondeur de Coccinelle, c'est l'assistant — pas une boîte vocale.

Même vérification pour ses deux sœurs : `channels/ivr` et `channels/queues` n'ont ni
route, ni table, ni webhook. Trois fichiers de 16 lignes, même gabarit.

---

## LOT 1 — les notifications (livré et vérifiable en premier)

Deux moitiés indissociables : corriger les URL futures **et** réparer les pages où
atterrissent les notifications **déjà envoyées** (leur URL est figée dans le message
push, on ne peut plus la changer).

### Backend — `src/utils/notifications.js`, 4 chaînes

| Type | Avant | Après |
|---|---|---|
| `new_appointment` | `/dashboard/appointments` | `/dashboard/rdv` |
| `missed_call` | `/dashboard/calls` | `/dashboard/analytics/calls` |
| `new_prospect` | `/dashboard/prospects` | `/dashboard/crm/prospects` |
| `new_message` | `/dashboard/inbox` | `/dashboard/conversations` |

Aucune route supprimée, aucune signature changée : quatre littéraux.

### Frontend — 3 pages réparées

`appointments` → `/dashboard/rdv` · `inbox` → `/dashboard/conversations` ·
`prospects` → `/dashboard/crm/prospects`

### Vérifiable comment

`design/menage/verifier-liens.sh` (livré avec le lot) : il extrait **toute** URL
`/dashboard/...` référencée dans `src/` et `coccinelle-saas/`, et pour chacune
vérifie que `out/<route>/index.html` existe et ne contient pas `__next_error__`.
Un lien mort fait échouer le script. C'est la preuve demandée — « aucun lien mort
dans le produit » — et elle est rejouable.

---

## LOT 2 — les 14 redirections restantes

Patron unique, copié de `settings/channels/whatsapp/page.tsx`, seule redirection qui
fonctionne aujourd'hui : `<meta httpEquiv="refresh">` **plus un lien visible**.
Jamais `redirect()` de `next/navigation` — en export statique il génère une page
d'erreur au lieu de rediriger (règle i.16bis).

| Page | Cible | Texte du lien visible |
|---|---|---|
| `appels` | `/dashboard/analytics/calls` | Voir les appels |
| `products` | `/dashboard/knowledge/products` | Voir les produits et services |
| `sara` | `/dashboard/assistant` | Aller à Mon Assistant |
| `configuration/assistant` | `/dashboard/assistant` | Aller à Mon Assistant |
| `conversations/sara` | `/dashboard/assistant` | Aller à Mon Assistant |
| `voixia` | `/dashboard/assistant` | Aller à Mon Assistant |
| `voixia/sequence` | `/dashboard/agents/nodes` | Ouvrir les séquences |
| `agents/scripts` | `/dashboard/agents/configuration` | Ouvrir la configuration |
| `sara-analytics` | `/dashboard/analytics` | Voir les statistiques |
| `settings/users` | `/dashboard/teams` | Gérer l'équipe |
| `settings/integrations` | `/dashboard/integrations` | Voir les intégrations |
| `configuration/channels` | `/dashboard/channels` | Voir les canaux |
| `appointments/settings` | `/dashboard/availability` | Modifier les disponibilités |
| `appointments/calendar/settings` | `/dashboard/rdv` | Voir les rendez-vous |

⚠️ **Chaîne à casser** : `configuration/assistant` et `conversations/sara`
redirigeaient vers `/dashboard/sara`, elle-même une redirection cassée — double saut
mort. Les trois pointent désormais **directement** sur `/dashboard/assistant`.

Chaque fichier gagne un commentaire disant pourquoi la page existe encore (servir un
favori ancien) et pourquoi `redirect()` est proscrit ici.

---

## LOT 3 — 7 suppressions

| Page | Preuve | Ce qui part avec |
|---|---|---|
| `properties` | 0 lien entrant. « Catalogue de biens » immobilier, données en dur, 0 appel réseau. Vestige match-immo | — |
| `configuration` | 0 lien entrant. Sommaire d'un seul lien | — |
| `test-channels` | 0 lien entrant. Page de recette interne livrée en production | voir § outil de debug |
| `products/agents` | 0 lien entrant | — |
| `channels/ivr` | 1 lien : `ADVANCED_NAV`. 16 lignes, « arrive prochainement » | l'entrée « IVR / SVI » du menu Avancé |
| `channels/queues` | 1 lien : `ADVANCED_NAV`. 16 lignes | l'entrée « Files d'attente » |
| `channels/voicemail` | 1 lien : `ADVANCED_NAV`. 16 lignes. Flux inexistant (vérifié ci-dessus) | l'entrée « Messagerie vocale » |

`lib/navigation.ts` perd 3 entrées dans le groupe COMMUNICATION/CONFIGURATION du mode
Avancé. `SIMPLE_NAV` n'est pas touché — aucune de ces pages n'y figurait.

Le contenu supprimé reste dans l'historique git ; les messages de commit le diront.

---

## Ce qui n'est PAS touché (rappel du D validé)

`channels` et `channels/email` — cibles de retour des OAuth Google, Yahoo et Outlook
(9 renvois depuis `src/modules/oauth/*`). Les supprimer casserait la connexion des
boîtes mail. `channels/whatsapp` — gel volontaire du lot WhatsApp 0.
`settings/channels/whatsapp` — le modèle qu'on copie. `rdv/settings`, `rdv/calendars`,
`crm`, `conversations` — coquilles mais atteignables par un lien réel. Les pages
`[id]` de 9 lignes — délégation volontaire du correctif B15.

---

## Ordre d'exécution et livraison

| Lot | Contenu | Déploiement |
|---|---|---|
| 1 | `notifications.js` (4 chaînes) + 3 pages réparées + `verifier-liens.sh` | **backend puis frontend** |
| 2 | 14 pages réparées | frontend seul |
| 3 | 7 suppressions + 3 entrées de menu | frontend seul |

Le lot 1 est le seul qui touche le backend. Les lots 2 et 3 sont purement frontend :
si tu veux les déployer ensemble, c'est sans risque.

---

## Contrôles de fin

| Contrôle | Attendu |
|---|---|
| `grep -rl __next_error__ out --include=index.html` | **0** (17 aujourd'hui) |
| `design/menage/verifier-liens.sh` | 0 lien mort |
| `tsc --noEmit` | ≤ 142 (baseline) |
| `npm run build` | vert, `fix-spa-404: 6/6` |
| Inventaire avant/après | 84 → 77 pages, liste page par page |

---

## Une question ouverte

**`test-channels`** — « Test des Canaux », 501 lignes, 4 appels réseau réels. C'est un
banc d'essai (envoi SMS/e-mail de test) livré par accident en production, sans lien
entrant. Trois sorties possibles :

1. **Supprimer** — le plus simple, l'historique git le garde.
2. **Déplacer sous `/dashboard/settings/diagnostic`** — accessible à toi seul en
   tapant l'URL, mais toujours dans le bundle client livré à tous.
3. **Sortir du dépôt frontend** vers `scripts/` sous forme de commandes curl.

Je pars sur **1** sauf avis contraire : tout ce qui reste dans `app/` est téléchargé
par chaque client, et un banc d'essai qui envoie de vrais SMS n'a rien à faire dans
un bundle public.
