# Chantier CX-2 — plan d'exécution (FINAL, avant code)

> Branche `chantier-cx-2`. R4 : ce plan précède le code. Mis à jour le 12/08/2026
> après lecture intégrale des 2 maquettes et arbitrages de Youssef.
> Baseline `tsc --noEmit` = **142** erreurs (mesurée, conforme à CLAUDE.md).

Les maquettes sont des pages « bundled » : le contenu réel n'est pas dans le HTML
lisible mais dans le `<script type="__bundler/template">`. Extraction :
`design/cx2/extraire-maquette.cjs` (versionné avec le chantier), qui régénère
`mon-assistant.tpl.html` et `ce-que-sait.tpl.html`. **C'est ce template qui fait foi**,
pas le rendu approximatif du fichier brut.

---

## 0. Arbitrages validés (12/08/2026)

1. **Appel test = mécanisme entrant existant.** La maquette 1 montre bien un appel
   *sortant* (« Votre assistant vous appelle en moins de 10 secondes », bouton
   « Recevoir un appel test » avec état « Appel en cours… »). **Écart assumé** : le
   bandeau garde sa forme et son titre, le sous-titre et le bouton changent (§ 3.9).
2. **PATCH réécrit la ligne du document parent**, jamais le chunk seul. Index de ligne
   source obligatoire dans la fiche.
3. **Migration 0084 additive**, aucun `DROP`. Appliquée par Youssef après revue
   AVANT/APRÈS.
4. **Prénom assistant** = `buildSectorPrompt()` + nouvelle version + activation.
   Jamais de `REPLACE`.
5. **Ordre** : backend lot A (recette curl Garage Toulouse) → page 2 → page 1 →
   bascule `SIMPLE_NAV`.

---

## 1. Périmètre

| | Mode Simple | Mode Avancé |
|---|---|---|
| Mon Assistant | **nouvelle** `/dashboard/assistant` | inchangé : `agents/configuration`, `channels/*`, `settings/*` |
| Ce que sait votre assistant | **nouvelle** `/dashboard/savoir` | inchangé : `knowledge`, `knowledge/faq`, `knowledge/products` |

Le mode Simple **masque**, il ne **bloque** pas (règle posée par CX-1). « Tout voir »
renvoie explicitement vers les pages avancées.

---

## 2. Le système visuel des 2 maquettes (commun, à extraire une fois)

Les deux pages partagent exactement la même charte. À poser dans
`components/cx2/theme.ts` plutôt qu'à recopier 40 fois :

| Rôle | Valeur |
|---|---|
| Fond de page | `#f6f6f5` |
| Texte principal / noir de marque | `#1a1a19` (hover `#3a3a37`) |
| Texte secondaire | `#6b6b66` · tertiaire `#8a8a83` · discret `#a3a39c` |
| Surface carte | `#ffffff`, bordure `#e2e2de`, radius `14px` |
| Bordure fine / séparateur | `#ebebe7`, `#f2f2ee` |
| Champ de saisie | fond `#fafaf9`, bordure `#e2e2de`/`#ebebe7`, radius `9–10px` |
| Bulle assistant | fond `#f2f2ee`, radius 14 + **bottom-left 4** |
| Bulle client | fond `#ffffff` + bordure `#e2e2de`, radius 14 + **bottom-right 4**, texte `#3a3a37` |
| Avatar | rond 30px, fond `#1a1a19`, texte blanc 12px/600 = **initiale du prénom** |
| **Chip (valeur cliquable)** | fond `#f7f2dd`, `border-bottom: 1px dashed #a3a39c`, radius `3px`, `font-weight: 500`, curseur pointeur |
| Chip page 1 uniquement | + `box-shadow: 0 0 0 2px #f7f2dd` (surlignage débordant) |
| Champ d'édition en ligne | fond `#f7f2dd`, `border-bottom: 1px solid #1a1a19`, `font: inherit`, `min-width: 40px`, `size` = longueur de la valeur |
| Police | `Schibsted Grotesk` (texte) + `JetBrains Mono` (heures, prix, sources, compteurs) |
| Pastille canal | 7px ronde — vert `oklch(0.62 0.13 150)`, orange `oklch(0.72 0.13 65)` |
| Bandeau import | fond `#fbf3cf`, bordure `#f0e39d` |
| Bouton principal | `#1a1a19` / blanc, radius 10–11px, 11px 24px |

⚠️ Les maquettes sont en **styles inline**, le dashboard est en **Tailwind**. Je
transpose en Tailwind avec les couleurs exactes en valeurs arbitraires
(`bg-[#f2f2ee]`), sans réinterpréter : mêmes hex, mêmes rayons, mêmes tailles. Les
deux polices sont chargées via `next/font/google` (elles ne sont pas dans le projet
aujourd'hui — c'est un ajout, pas une substitution).

---

## 3. Page 1 — « Mon Assistant » (`/dashboard/assistant`)

### 3.1 Structure (fidèle au template)

```
padding 36px 40px 56px · max-width 1280 · grid 65fr / 35fr · gap 20
┌ header ────────────────────────────────────────────────────────────┐
│ h1 30px/600 « Mon Assistant »                        [Enregistrer] │
│ p 14.5px #6b6b66 « Cliquez sur un mot souligné dans la             │
│                    conversation pour le modifier »                 │
└────────────────────────────────────────────────────────────────────┘
┌ GAUCHE — carte « Votre assistant en action » ─┐ ┌ DROITE (sticky 24) ┐
│ p « Trois situations réelles, telles que vos  │ │ Horaires d'ouverture│
│     clients les entendent »                   │ │ Voix de l'assistant │
│ ── UN CLIENT APPELLE ──                       │ │ Transfert vers un…  │
│ ── APPEL EN DEHORS DES HORAIRES ──            │ │ Mes canaux          │
│ ── LE CLIENT DEMANDE UN HUMAIN ──             │ └─────────────────────┘
└───────────────────────────────────────────────┘
┌ bandeau bas (#efeeeb, pleine largeur) ─────────────────────────────┐
```

Séparateurs de scénario : trait `#ebebe7` — texte 11.5px/500, `letter-spacing .08em`,
majuscules, `#a3a39c` — trait.

### 3.2 Les 3 conversations témoins (textes exacts de la maquette)

**Un client appelle**
- Assistant : `«{company}, bonjour ! {prénom} à votre écoute, que puis-je faire pour vous ?»`
  → sous la bulle, lien **Écouter** (icône haut-parleur 13px, 12.5px `#6b6b66`)
- Client : `«Bonjour, vous êtes ouverts jusqu'à quelle heure aujourd'hui ?»`
- Assistant : `«Aujourd'hui nous sommes ouverts {hoursPhrase}. Souhaitez-vous passer à l'atelier ou prendre un rendez-vous ?»`

**Appel en dehors des horaires**
- Client : `«Bonsoir, je voudrais faire remplacer mes plaquettes cette semaine.»`
- Assistant : `«L'atelier est fermé pour le moment, nous ouvrons {hoursPhrase}. {messagePhrase} et l'équipe vous rappelle dès l'ouverture.»`

**Le client demande un humain**
- Client : `«Je préfère parler à quelqu'un de l'atelier, c'est possible ?»`
- Assistant : `«Bien sûr, je vous transfère au {transferNumber}. Ne quittez pas.»`

⚠️ Ces phrases de client sont **écrites pour un garage** (« l'atelier », « plaquettes »).
Sur un syndic ou un cabinet d'avocats elles sonnent faux. → § 8, décision 3.

`hoursPhrase` = `"de " + hhmm(ouverture) + " à " + hhmm(fermeture)` du **premier jour
ouvert**, avec `hhmm("09:00") → "9h"` et `hhmm("17:30") → "17h30"` (fonction reprise
telle quelle de la maquette).

`messagePhrase` suit le réglage hors horaires : « je prends votre message » ou
« je vous rappelle nos horaires ».

### 3.3 Les 5 valeurs cliquables → panneau

| Chip | Valeur | Ouvre |
|---|---|---|
| `{company}` | `tenants.name` | Voix de l'assistant |
| `{prénom}` | regex sur le `system_prompt` actif | Voix de l'assistant |
| `{hoursPhrase}` | `tenants.horaires` (× 2 occurrences) | Horaires d'ouverture |
| `{messagePhrase}` | `voixia_configs.after_hours_behavior` | Transfert vers un humain |
| `{transferNumber}` | `voixia_configs.transfer_number` | Transfert vers un humain |

**Un seul panneau ouvert à la fois** : un état `open` unique (`'hours' | 'voice' |
'transfer' | 'channels' | null`), le re-clic referme. La carte ouverte prend
`border-color: #1a1a19`. Défaut au chargement : `hours`.

### 3.4 Les 4 panneaux

1. **Horaires d'ouverture** — carte à part (padding 22px, pas d'accordéon à chevron) :
   titre + badge mono `exemple` à droite, sous-titre « Modifie la réponse de votre
   assistant en direct ». Grille `1fr auto auto auto` : jour · input ouverture (66px,
   mono, centré) · input fermeture · pilule **Ouvert/Fermé**.
   **6 jours : lundi → samedi.** Le dimanche n'est pas dans la maquette (§ 8, déc. 1).
2. **Voix de l'assistant** — résumé `{prénom} — {style}`. Contenu : *Prénom de
   l'assistant* (input), *Nom annoncé* (input), *Voix* (select).
   → la liste vient de `lib/voices.ts` (20 voix), pas des 4 voix fictives de la
   maquette ; l'option s'affiche `{label} — {gender}, {style}`.
   **Ajout** : un lien **Écouter** à côté du select, même traitement que celui de la
   bulle (§ 8, déc. 2).
3. **Transfert vers un humain** — résumé = le numéro. Contenu : *Numéro de transfert*
   (input mono), puis *Hors horaires, l'assistant* → segmenté 2 options sur fond
   `#efeeeb` : **Prend un message** / **Annonce les horaires**.
4. **Mes canaux** — résumé « N canaux ». Contenu : pastilles arrondies, point de
   couleur + nom. Source `GET /api/v1/channels`. Vert = actif, orange = à finir de
   configurer. WhatsApp est gelé (Lot 0) → il apparaît, en orange, comme dans la
   maquette.

### 3.5 Bandeau bas — l'écart assumé

Maquette : fond `#efeeeb`, titre « Validez en conditions réelles », sous-titre
« Votre assistant vous appelle en moins de 10 secondes », bouton noir + icône
téléphone « Recevoir un appel test ».

**Remplacé par** (arbitrage 1, aucune brique d'appel sortant) :

- titre inchangé : **« Validez en conditions réelles »**
- sous-titre : **« Depuis votre numéro vérifié, votre assistant décroche. »**
- bouton (mêmes styles, même icône, devient un `<a href="tel:+33939035761">`) :
  **« Appelez le +33 9 39 03 57 61 »**
- si `users.phone_verified = 0` : le bouton renvoie vers la vérification du numéro,
  avec le texte de repli déjà utilisé par l'onboarding (« Vérifiez votre numéro :
  c'est ce qui permet à votre assistant de vous reconnaître quand vous appelez »).

Le numéro vient de `TRIAL_PHONE_NUMBER` (`lib/config.ts`), jamais écrit en dur.

### 3.6 Enregistrer

Les modifications sont **locales et instantanées** dans les bulles (c'est tout
l'intérêt de la page), et persistées au clic sur **Enregistrer**. Un seul appel
serveur (§ 4.2) : quatre écritures séquencées depuis le front pourraient échouer à
moitié et laisser un prénom changé avec un prompt inchangé — exactement le genre de
divergence qui a coûté 3 mois sur les templates sectoriels.

L'audio de la bulle d'accueil n'est **pas** rejoué à chaque frappe : il l'est au clic
sur **Écouter** (`POST /api/v1/ai/voice-preview`), avec le texte de la bulle courante.

---

## 4. Page 2 — « Ce que sait votre assistant » (`/dashboard/savoir`)

### 4.1 Structure

```
max-width 1320 · grid 60fr / 40fr · gap 20
┌ header ────────────────────────────────────────────────────────────┐
│ h1 « Ce que sait votre assistant »   (• N informations actives) [Enregistrer]
│ p « Posez des questions, corrigez les réponses »                   │
└────────────────────────────────────────────────────────────────────┘
┌ GAUCHE « Vérifiez ce que répond votre assistant » ┐ ┌ DROITE (sticky)┐
│ p « Cliquez sur une valeur surlignée pour la      │ │ Ajouter une info│
│     corriger »                                    │ │ Vos informations│
│ [chips]  ──────────────────────────────────────   │ │ Historique      │
│ fil de test                                       │ └─────────────────┘
│ ─────────────────────────────────────────────     │
│ [Posez une question comme le ferait un client…] [Envoyer]
└───────────────────────────────────────────────────┘
```

Le compteur du header est une pilule blanche bordée, point noir 7px, texte 13px/500 :
**« N informations actives »**.

### 4.2 Chips de suggestion

Maquette : 4 chips (`Prix d'une vidange ?`, `Vos horaires ?`, `Montage pneu ?`,
`Moyens de paiement ?`), pilules blanches bordées `#e2e2de`, 13.5px/500 `#3a3a37`,
hover bordure `#1a1a19`. Bloc séparé du fil par une bordure basse `#f2f2ee`.

Règles du brief, absentes de la maquette :
- générées depuis **le secteur du tenant + le contenu réel de sa KB** ;
- **on ne suggère que ce qui a une réponse** ;
- **5 au maximum** ;
- une chip utilisée est **remplacée** par une nouvelle (rotation) ;
- bouton discret **« Autres questions ↻ »**.

Le bouton n'existe pas dans la maquette : je le rends comme une chip **sans bordure**,
texte `#6b6b66`, en fin de rangée — c'est la lecture la plus fidèle de « discret »
(§ 8, déc. 4).

### 4.3 Fil de test

La maquette montre 2 échanges pré-remplis (montage pneu, contrôle technique) : c'est
son état de démonstration. Le brief impose un fil **vide au départ**, qui se remplit
des questions posées. → je reprends **exactement** la structure de bulle de la
maquette, et l'état vide affiche uniquement les chips et le champ de saisie, avec une
ligne d'invite discrète (`#a3a39c`) — la maquette n'a pas d'état vide, c'est le seul
endroit où j'ajoute (§ 8, déc. 5).

Bulle de réponse (structure exacte) : avatar + colonne
`[bulle] [Source : … · Modifier · Supprimer]`.
La ligne de source est en **mono 12.5px `#a3a39c`**, au format
**`Source : {origine} — fiche {libellé}`** (ex. `tarifs.csv — fiche Montage
équilibrage`, `garage-martin.fr — fiche Contrôle technique`, `Google Business — fiche
Ouverture de l'atelier`, `ajouté manuellement — fiche Plaquettes + disques`).
Ce format se reconstruit depuis `knowledge_documents.title` / `source_url` /
`source_type` + `metadata.libelle` de la fiche — d'où le § 5.4.
*Modifier* et *Supprimer* : boutons texte soulignés, 12.5px/500 `#6b6b66`.

Les questions passent par la **vraie** route de l'agent :
`POST /api/v1/voixia/knowledge` avec le JWT du dashboard. Ce que le fil affiche est
littéralement ce que l'agent dira au téléphone.

**Après chaque ajout de KB**, le système rejoue automatiquement 2-3 questions sous le
libellé **« Voici ce que je réponds maintenant »** (brief ; absent de la maquette →
rendu comme un séparateur de scénario de la page 1, même style majuscules/traits, pour
rester dans la charte).

### 4.4 Édition en ligne

Clic sur une valeur surlignée → elle devient un `<input>` `#f7f2dd` souligné noir,
`size` = longueur de la valeur, **autofocus**. `Entrée` ou `Échap` valide (`commit`),
le `blur` aussi. Une valeur vidée n'est pas validée (garde de la maquette, conservée).

Puis : `PATCH` de la fiche → réécriture de la **ligne du document parent** →
réindexation → **la bulle est rejouée** par un nouvel appel à `/voixia/knowledge`
(pas un simple `setState` : on montre la vraie réponse, pas la valeur saisie).

### 4.5 Colonne droite — 3 cartes

**Ajouter une information** — `textarea` 3 lignes,
placeholder `«Collez un texte, glissez un fichier ou tapez une info»`, puis 2 boutons
bordés : **Importer depuis votre site** (icône lien) et **Connecter Google Business**
(carré « G »). Pied de carte : `«Remplissez votre base en 30 secondes»`.
→ « glissez un fichier » implique un drop zone : le textarea accepte le dépôt
(`.txt/.csv/.md`, lecture côté client, pas d'upload multipart — la route
`/knowledge/documents/upload` répond **501** et le multipart est bloqué à l'edge,
mémoire `multipart-post-edge-block`).

**Vos informations** — titre + lien **Tout voir** (→ `/dashboard/knowledge`, page
avancée), sous-titre **« N fiches actives »**, puis filtres-pilules
`{label} {count}` (compteur en mono `#a3a39c`). La maquette montre
`Tarifs 14 · Horaires 6 · FAQ 9` → dérivés des données réelles (§ 5.6).
Puis le bandeau d'import jaune : **« Import détecté : N prix modifiés »** +
**Prévisualiser** (bordé `#d8ca86`) + **Appliquer** (noir).
Le brief demande aussi **Annuler** : ajouté en troisième, style texte souligné
discret (§ 8, déc. 6).

**Historique** — lignes `#fafaf9` bordées : `«{libellé} {avant} → {après} le {JJ/MM}»`
(les montants en mono) + bouton **Restaurer**. Sous la carte, lien souligné
**« Supprimées récemment (30 jours) »**.

### 4.6 Le bouton « Enregistrer » de la page 2

Tout le reste de la page est immédiat (Entrée valide, PATCH part). Le seul contenu en
attente est le brouillon de « Ajouter une information » : **Enregistrer** l'enregistre
(et reste désactivé tant que le brouillon est vide). C'est la seule lecture cohérente
du bouton (§ 8, déc. 7).

---

## 5. Backend — lot A

### 5.1 Ce qui se réutilise tel quel (vérifié dans le code)

| Besoin | Brique | Où |
|---|---|---|
| Fil de test | `POST /api/v1/voixia/knowledge` — `requireVoixIAAuth` accepte **déjà le JWT Bearer** | `voixia/auth.js:63` |
| Écouter | `POST /api/v1/ai/voice-preview` | `voixia/ai-prompts.js:60` |
| Nom, secteur, horaires | `GET`/`PATCH /api/v1/settings` + `syncHorairesToSlots()` | `settings/routes.js` |
| Voix, transfert | `POST /api/v1/voixia/agents` | `voixia/routes.js:1890` |
| Canaux | `GET /api/v1/channels` | `channels/routes.js:18` |
| Documents | `GET`/`POST /api/v1/knowledge/documents` | `knowledge/routes.js` |
| Import site | `POST /api/v1/knowledge/crawl` (appelle déjà `indexerFiches`) | `knowledge/routes.js:44` |
| Google Business | `lib/google-business-extractor.ts` + UI existante | `knowledge/page.tsx:483` |
| Normalisateur | `construireFiches()` **pur** + `indexerFiches()` | `shared/kb-fiches.js`, `kb-ingest.js` |
| Magic moment | `TRIAL_PHONE_NUMBER` + `users.phone_verified` | `lib/config.ts` |
| Prompt | `buildSectorPrompt()` / `isPromptCompliant()` | `shared/sector-prompts.js:607` |

### 5.2 `GET`/`PUT /api/v1/assistant/config` — **nouveau**

Un aller-retour unique pour la page 1. `GET` renvoie tout ce qu'elle affiche :
`{ company, agent_name, voice_id, transfer_number, transfer_enabled,
after_hours_behavior, horaires, sector, phone_verified, trial_phone, channels[] }`.

`PUT` écrit **dans le bon ordre et sous une seule responsabilité** :
`tenants.name` + `tenants.horaires` (+ `syncHorairesToSlots`), `voixia_configs`
(voix, transfert, `agent_name`, `after_hours_*`), puis — si le prénom, la société,
les horaires ou le comportement hors horaires ont changé — **régénération par
`buildSectorPrompt()`**, `INSERT ai_prompt_versions`, activation (un seul
`is_active=1`). Jamais de `REPLACE` sur la chaîne (arbitrage 4, règle 6bis).

Nouveau module `src/modules/assistant/routes.js`.

### 5.3 Routes KB — **nouvelles**

```
PATCH  /api/v1/knowledge/documents/:id        titre, contenu, catégorie
DELETE /api/v1/knowledge/documents/:id        suppression douce
POST   /api/v1/knowledge/documents/:id/restore
GET    /api/v1/knowledge/deleted              corbeille 30 j
GET    /api/v1/knowledge/history              dernières modifs
POST   /api/v1/knowledge/versions/:id/restore
PATCH  /api/v1/knowledge/fiches/:chunkId      { libelle?, prix?, details? }
DELETE /api/v1/knowledge/fiches/:chunkId      retire la ligne du document
POST   /api/v1/knowledge/preview              dry-run, aucune écriture
GET    /api/v1/knowledge/suggestions?exclure= chips, 5 max
```

`knowledge/routes.js` n'expose aujourd'hui **ni PATCH ni DELETE** sur les documents
(9 routes, vérifié) : *Modifier* / *Supprimer* de la maquette n'ont rien derrière eux.

### 5.4 `source` dans la réponse de `/voixia/knowledge`

Elle renvoie `{results, count, answer, found, search_type}` — jamais l'identifiant du
document ni de la fiche qui porte `answer`. Sans ça, **trois exigences de la page 2
tombent** : la ligne « Source : … », les boutons, et l'édition en ligne.

Ajout **additif** (aucun appelant existant ne casse — l'agent Python ignore les clés
qu'il ne lit pas) :
```js
source: { document_id, title, source_type, source_url, chunk_id, libelle, prix }
```
`_repondreDepuisFiches()` ne sélectionne aujourd'hui que `kc.content` et `kc.metadata`
(ligne 986) : il faut y ajouter `kc.id`, `kc.document_id`, et joindre le titre. Le
chemin prose remonte le document du passage retenu.

### 5.5 Le piège de l'édition d'une fiche (arbitrage 2)

`indexerFiches()` fait `DELETE FROM knowledge_chunks WHERE document_id = ?` puis
**reconstruit tout depuis `knowledge_documents.content`** (`kb-ingest.js:30`). Une
correction écrite dans un chunk est donc **effacée à la prochaine ré-ingestion** : le
18 € redeviendrait 15 € au premier ré-import, sans que personne ne comprenne pourquoi.

⇒ `PATCH /knowledge/fiches/:chunkId` : version du document → réécriture de **la
ligne** → `indexerFiches()` → bulle rejouée.

Pour retrouver la ligne, il faut la tracer : `chunk_index` est le rang parmi les
lignes **retenues comme tabulaires**, pas le rang dans le texte source (les lignes
hors format dominant sont écartées, `kb-fiches.js:161`). → `construireFiches()`
retourne désormais `ligne` (index dans le contenu brut), reporté dans le `metadata`
de la fiche. C'est **la** condition de l'édition en ligne.

### 5.6 Chips — `knowledge/suggestions.js` (nouveau)

« On ne suggère que ce qui a une réponse » impose de lire la KB : ça se décide côté
backend. Candidats, dans cet ordre :
1. **libellés des fiches réelles** du tenant (une fiche = une réponse garantie) →
   « Prix d'une vidange ? », « Montage pneu ? » (le gabarit de question vient du
   secteur normalisé) ;
2. **coordonnées** couvertes par `_answerFromTenantContact()` (horaires, adresse,
   téléphone) → « Vos horaires ? » ;
3. **titres des documents prose**.

Rotation par `?exclure=` : le front accumule ce qu'il a servi, « Autres questions ↻ »
redemande. Les mêmes catégories alimentent les filtres de *Vos informations*
(`metadata.categorie` des fiches, `source_type` des documents) — pas de compteur
inventé.

### 5.7 Hors horaires

N'existe nulle part (seule trace : un commentaire dans le module Retell, mort).
→ colonnes `after_hours_behavior` (`'message' | 'horaires'`) + `after_hours_message`,
et **injection dans `buildSectorPrompt()`** — jamais un texte écrit à la main.

### 5.8 Purge physique des 30 jours

`GET /knowledge/deleted` filtre sur la fenêtre : l'UI est juste sans cron. La purge
physique demande une tâche planifiée — **non incluse**, signalée (§ 8, déc. 8).

---

## 6. Migration `0084_cx2_knowledge_versions.sql` (additive, aucun DROP)

```sql
ALTER TABLE knowledge_documents ADD COLUMN deleted_at TEXT;

CREATE TABLE knowledge_document_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL,
  tenant_id   TEXT NOT NULL,
  version     INTEGER NOT NULL,
  title       TEXT,
  content     TEXT,
  auteur      TEXT,
  motif       TEXT,   -- edition_document | edition_fiche | import | suppression | restauration
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);
CREATE INDEX idx_kdv_document ON knowledge_document_versions(document_id, version DESC);
CREATE INDEX idx_kdv_tenant   ON knowledge_document_versions(tenant_id, created_at DESC);

ALTER TABLE voixia_configs ADD COLUMN after_hours_behavior TEXT DEFAULT 'message';
ALTER TABLE voixia_configs ADD COLUMN after_hours_message  TEXT;
```

Une version est écrite **avant** chaque modification : l'état d'origine reste
restaurable, y compris le tout premier. Revue AVANT/APRÈS fournie au moment de
l'appliquer (`PRAGMA table_info` + comptages).

---

## 7. Fichiers

### Backend
| Fichier | Nature |
|---|---|
| `migrations/0084_cx2_knowledge_versions.sql` | nouveau |
| `src/modules/assistant/routes.js` | nouveau — `GET`/`PUT /assistant/config` |
| `src/modules/knowledge/routes.js` | +10 routes |
| `src/modules/knowledge/versions.js` | nouveau — versionner, restaurer |
| `src/modules/knowledge/suggestions.js` | nouveau — chips |
| `src/modules/shared/kb-fiches.js` | +`ligne` dans chaque fiche |
| `src/modules/shared/kb-ingest.js` | `ligne` dans le metadata + réécriture d'une ligne |
| `src/modules/voixia/routes.js` | `source` dans `handleSearchKnowledge` |
| `src/modules/shared/sector-prompts.js` | bloc « hors horaires » paramétré |
| `src/index.js` | montage du module `assistant` |

### Frontend
| Fichier | Nature |
|---|---|
| `app/dashboard/assistant/page.tsx` | page 1 |
| `app/dashboard/savoir/page.tsx` | page 2 |
| `components/cx2/theme.ts` | jetons de la charte (§ 2) |
| `components/cx2/Bulle.tsx` | bulle assistant / client + avatar |
| `components/cx2/ValeurChip.tsx` | surlignée + pointillés, cliquable |
| `components/cx2/EditionEnLigne.tsx` | input `#f7f2dd`, Entrée/Échap |
| `components/cx2/SeparateurScenario.tsx` | trait — MAJUSCULES — trait |
| `components/cx2/PanneauAccordeon.tsx` | carte + chevron, un seul ouvert |
| `components/cx2/panneaux/{Horaires,Voix,Transfert,Canaux}.tsx` | 4 panneaux |
| `components/cx2/BandeauAppelTest.tsx` | § 3.5 |
| `components/cx2/ChipsSuggestions.tsx` | 5 max + rotation + « Autres questions ↻ » |
| `components/cx2/FilTest.tsx` | fil + rejeu après ajout |
| `components/cx2/cartes/{Ajouter,Informations,Historique}.tsx` | colonne droite p. 2 |
| `hooks/useAssistantConfig.ts`, `hooks/useSavoir.ts` | chargement + écriture |
| `lib/navigation.ts` | `SIMPLE_NAV` recâblé (lot D) |
| `design/cx2/extraire-maquette.cjs` | outil d'extraction des templates |

---

## 8. Décisions — écarts assumés par rapport aux maquettes

Chacun est un endroit où maquette, brief et réalité ne coïncident pas. Je propose,
tu tranches ; sans retour je fais ce qui est écrit ici.

1. **Dimanche.** La maquette n'affiche que lundi→samedi ; `lib/horaires.ts` gère 7
   jours. → j'affiche les 6 jours de la maquette et je **préserve la valeur du
   dimanche** telle quelle en base. Un tenant ouvert le dimanche ne le verra pas ici
   (il reste modifiable en mode Avancé). Alternative : ajouter la 7ᵉ ligne.
2. **Écouter dans le panneau Voix.** Le brief demande « Voix avec écoute », la
   maquette ne met le lien *Écouter* que sous la bulle d'accueil. → j'ajoute le même
   lien à côté du select.
3. **Textes des scénarios écrits pour un garage** (« l'atelier », « plaquettes »). →
   je garde les phrases exactes pour le secteur automobile et je décline les 3
   questions clientes par secteur (une phrase par secteur dans
   `shared/sector-prompts.js`, qui connaît déjà les 14 secteurs). Sinon un syndic lit
   « je voudrais faire remplacer mes plaquettes ».
4. **« Autres questions ↻ »** absent de la maquette → chip sans bordure, `#6b6b66`.
5. **État vide du fil** absent de la maquette → chips + champ + une ligne d'invite
   discrète. C'est le seul ajout structurel de la page 2.
6. **« Annuler »** sur le bandeau d'import : demandé par le brief, absent de la
   maquette → troisième action, texte souligné discret.
7. **« Enregistrer » de la page 2** : rien d'autre n'est en attente que le brouillon
   d'ajout → il enregistre le brouillon, désactivé s'il est vide.
8. **Purge physique à 30 jours** : non incluse (pas de cron). L'UI est correcte, la
   donnée reste en base au-delà.
9. **Polices** `Schibsted Grotesk` + `JetBrains Mono` : absentes du projet, ajoutées
   via `next/font/google`. Les 2 pages CX-2 seules les utilisent.

---

## 8bis. État du lot A (12/08/2026)

**Livré et mesuré**

| Élément | Vérification |
|---|---|
| `ligne` dans les fiches + `reecrireLigneFiche()` / `supprimerLigneFiche()` | `scripts/test_kb_fiches.mjs` : **54/54** (40 avant) |
| `source` dans `/voixia/knowledge` | Testé sur Garage Toulouse, Worker en `--remote` : `ligne 12 · modifiable true` sur « montage pneu » |
| 12 routes (10 KB + `GET`/`PUT /assistant/config`) | Toutes en 401 sans jeton, aucune 404 |
| Aucune route perdue | Diff d'inventaire **265 → 273**, 0 disparue |
| Bloc HORS HORAIRES + répliques sectorielles | `sector-prompts.js`, absent par défaut donc 0 prompt existant modifié |
| Build du Worker | `wrangler deploy --dry-run` vert |

**Découverte : la migration ne suffisait pas.**
Les fiches déjà en base ont été indexées avant l'ajout de `ligne` ; leur métadonnée
ne le porte pas, et la migration ne réécrit aucune donnée (c'est même son critère
de réussite). Sans ré-ingestion, `PATCH /knowledge/fiches/:id` répond **409** sur
tout l'existant — la correction en ligne serait morte au premier clic.

⇒ `scripts/generer_reingestion_fiches.mjs` émet désormais `ligne`, et
`design/cx2/reingestion-fiches-ligne.sql` (37 requêtes, 29 fiches reconstruites à
l'identique) a été appliqué sur Garage Toulouse. Comme la revue AVANT l'avait
montré (`fiches_total = gt_fiches = 29`), **ce backfill couvre 100 % des fiches de
la base** : les 6 autres tenants n'ont que de la prose, servie par un chemin
inchangé.

**Recette écriture — passée en prod le 12/08** (version `3f059cfb`) :

| Étape | Résultat |
|---|---|
| `PATCH /knowledge/fiches/…_11` | ligne du document `15 EUR` → `18 EUR`, 29 fiches reconstruites |
| re-question `/voixia/knowledge` | « Montage equilibrage : 18 euros » |
| **ré-ingestion du document** | **reste 18 €** — l'invariant du § 5.5 tient |
| `GET /knowledge/history` | `v1 edition_fiche — Montage equilibrage 15 EUR → 18 EUR [prix]` |
| `POST /versions/1/restore` | retour à 15 €, 29 fiches |
| corbeille | suppression douce → 1 en corbeille (fenêtre 30 j) → restauration → 2 actifs, 0 en corbeille |
| `PUT /assistant/config` | prénom relu, prompt régénéré et conforme, **dimanche préservé** malgré 6 jours envoyés |
| `resolve-phone` | prompt servi à l'agent : bon prénom, bloc HORS HORAIRES, ordre `HORS < TOOL < CLÔTURE`, 0 variable `{}` |
| invariant prompt | 4 versions, **1 seule active** |
| chips en prod | 5/29, 24 en réserve — identiques au harnais hors ligne |

**Deux défauts trouvés PAR la recette, corrigés, à redéployer :**

1. **Le dimanche était immodifiable.** `dim` était reporté systématiquement depuis
   l'ancienne valeur — y compris quand l'appelant l'envoyait explicitement, sans
   erreur ni trace. Désormais reporté seulement s'il est **absent** du corps :
   la page (6 jours) le préserve, un appelant complet peut le changer.
2. **Une version de prompt était créée à chaque sauvegarde**, même quand le texte
   généré était identique — le gabarit sectoriel ne porte pas `{HORAIRES}`
   (l'agent les obtient par `search_knowledge`), donc modifier les horaires
   produisait un prompt au mot près identique. On régénère toujours (règle 6bis)
   mais on ne versionne que si le texte diffère.

**À vérifier au prochain déploiement** : PUT à 6 jours → dimanche préservé ; PUT à
7 jours → dimanche modifié ; PUT sans changement → `prompt_regenere: false`.

---

## 8ter. État des lots B, C, D (13/08/2026)

**Lot B — page « Ce que sait votre assistant »** ✅ recettée en conditions réelles :
correction 18 € confirmée à l'oral par appel au numéro d'essai, remise à 15 € faite.

**Lot C — page « Mon Assistant »** ✅ recettée : prénom modifié dans la page → bulle
rejouée (texte, initiale de l'avatar, résumé du panneau) → enregistrement →
**appel réel : « Garage Toulouse, Margaux à votre écoute »**, sans double présentation.

Cette recette a révélé un écart que seul l'appel pouvait montrer : **le greeting ne
disait pas le prénom**. `voixia/agent/prompts.py` retournait
`« {société}, bonjour ! Comment puis-je vous aider ? »` — alors que `main.py`
extrayait déjà le prénom et le passait à `get_greeting(assistant_name=…)`, paramètre
documenté mais jamais utilisé dans la phrase. La page montrait donc un accueil que
l'assistant ne prononçait pas.

Corrigé le 13/08 (option validée par Youssef) : la phrase utilise le paramètre déjà
transmis, avec **repli sur la formulation historique** si le prénom est vide. Accents
obligatoires — la chaîne part au TTS. Vérifié : 80 caractères, 14 mots, 0 variable `{}`,
littéral, préfixes métier intacts (`Garage AMROUCHE`, `Cabinet médical Vallon`,
`Entreprise AMROUCHE`, `Cabinet Durand` inchangé).

⚠️ **Le prompt sectoriel garde « 1. ACCUEIL — Accueille au nom de {société} »**. Le
risque de double présentation existe sur le papier ; l'appel réel du 13/08 ne l'a pas
produit (le LLM ne parle qu'après le client, `session.say()` ouvrant l'appel). Décision :
**ne rien changer au prompt** — une retouche avait fait disparaître tout appel d'outil le
08/08. Si le doublon apparaît un jour, corriger l'étape 1 dans `sector-prompts.js` et
revalider par appel réel sur un seul tenant (règle 6ter).

**Lot D — bascule `SIMPLE_NAV`** : appliqué en local, **en attente de validation**.
`Mon assistant` → `/dashboard/assistant`, ajout de `Ce qu'il sait` → `/dashboard/savoir`.
Aucune entrée retirée (6 → 7). Aucune redirection : les anciennes URL répondent 200 et
restent atteignables (le mode Simple masque, il ne bloque pas ; et `redirect()` est
interdit en export statique). `ADVANCED_NAV` strictement inchangé.

Garde-fous à jour : `tsc` = **142** (baseline), build vert, **0 `__next_error__`** sur
les deux nouvelles pages.

---

## 9. Ordre d'exécution

1. **Lot A — backend** : migration 0084 (à appliquer par Youssef), `ligne` dans les
   fiches, `source` dans `/voixia/knowledge`, routes KB, `/assistant/config`,
   suggestions, hors-horaires dans le prompt. **Recette curl sur Garage Toulouse avant
   toute UI.**
2. **Lot B — page 2**, qui porte la vérification principale.
3. **Lot C — page 1**.
4. **Lot D — bascule `SIMPLE_NAV`** (mode Avancé intact).

Déploiement (par Youssef) : Backend → VoixIA (rien à redémarrer ici) → Frontend.

---

## 10. Recette — Garage Toulouse (`tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t`) et lui seul

1. **Prénom** : le modifier page 1 → bulle rejouée (texte + audio via *Écouter*) →
   Enregistrer → appel réel au `+33939035761` : l'assistant dit le nouveau prénom.
2. **Tarif** : « montage pneu » → **15 €** → corriger **18 €** en ligne (Entrée) →
   re-poser → **18 €** → appel réel : 18 € → **remettre 15 €**, puis re-déclencher une
   ré-ingestion du document pour vérifier que 15 € tient (c'est le piège du § 5.5).
3. **Chips** : reflètent le secteur `automobile` **et** les 29 prestations réellement
   en base ; 5 au maximum ; rotation après usage ; « Autres questions ↻ » renouvelle.
4. **Parcours** : aucun jargon (règle 15 — ni RAG, ni chunk, ni embedding). Le mot
   « fiche » est acceptable : il est déjà dans la maquette (« 29 fiches actives »).
5. **Garde-fous** : `tsc --noEmit` ≤ **142** ; `grep __next_error__ out/**/index.html`
   = 0 ; aucune route perdue (diff d'inventaire avant/après, leçon du Lot 1 WhatsApp).
