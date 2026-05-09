# SCRIPT DEMO NUBBO — 20 AVRIL 2026, TOULOUSE

**Presentateur** : Youssef Amrouche, Fondateur Agentic Solutions SASU
**Duree** : 15 minutes exactement
**Audience** : Investisseurs Nubbo (Toulouse)
**Produit** : VoixIA — Agent vocal IA souverain omnicanal pour PME francaises

---

## CHECKLIST AVANT LA DEMO (J-1 et J-0)

### La veille (19 avril)
- [ ] Charger telephone a 100%
- [ ] Verifier que VoixIA tourne : `ssh root@51.15.130.204 "systemctl status voixia"`
- [ ] Faire 1 appel test au +33939035760 — verifier que Fati repond
- [ ] Verifier le dashboard : https://coccinelle-saas.pages.dev (login, metriques visibles)
- [ ] Preparer le WiFi de secours (partage de connexion 4G/5G)
- [ ] Enregistrer la video de backup (voir section "Si ca plante")

### Le matin (20 avril)
- [ ] Restart VoixIA : `ssh root@51.15.130.204 "systemctl restart voixia"`
- [ ] 1 appel test rapide (10 secondes) pour "chauffer" le pipeline
- [ ] Ouvrir le dashboard dans Chrome, deja connecte
- [ ] Preparer 2 onglets : Dashboard principal + Contacts
- [ ] Mettre le telephone en mode avion SAUF appels (desactiver notifs)
- [ ] Verifier le son de la salle (le haut-parleur du telephone doit s'entendre)

---

## [0:00 — 1:30] ACCROCHE — Le probleme

### Ce que vous dites :

> Bonjour a tous. Youssef Amrouche, fondateur d'Agentic Solutions.
>
> J'ai passe 25 ans dans la relation client et les centres d'appels. Et pendant ces 25 ans, j'ai vu le meme probleme se repeter chaque jour.
>
> **Une PME francaise perd en moyenne 7 appels par jour en dehors des heures d'ouverture.** Ca represente 30% de ses appels entrants. Chaque appel perdu, c'est un client qui part chez le concurrent.
>
> Les grandes entreprises ont des call centers, des SVI, des equipes de nuit. Les **3,5 millions de TPE/PME francaises** n'ont rien. Un telephone qui sonne dans le vide.
>
> Aujourd'hui, en moins de 15 minutes, je vais vous montrer comment **VoixIA** repond a la place de votre equipe, **24 heures sur 24, en moins de 2 secondes**, dans un francais parfait.
>
> Et je ne vais pas vous montrer une video. Je vais appeler. En direct. Maintenant.

**Mots-cles investisseurs** : **3,5M de TPE/PME**, **30% d'appels perdus**, **marche sous-equippe**, **24/7**

---

## [1:30 — 4:00] DEMO LIVE — Appel vocal (le moment WOW)

### Mise en scene :

*Sortir le telephone de la poche. Le montrer au public.*

> Mon numero personnel. Je vais appeler le numero de notre agent vocal VoixIA. Fati — c'est son prenom — est configuree pour Agentic Solutions. Elle connait nos tarifs, nos services, nos horaires. Je la mets sur haut-parleur.

*Activer le haut-parleur. Composer le +33 9 39 03 57 60. Attendre la sonnerie.*

### Script de l'appel — mot pour mot :

**[Sonnerie — 1 a 2 secondes]**

**FATI** : Bonjour, Agentic Solutions, Fati a votre service. Comment puis-je vous aider ?

**YOUSSEF** : Bonjour Fati. Je suis directeur d'une PME et je voudrais connaitre vos tarifs pour l'agent vocal.

> *[Fati appelle search_knowledge en interne — repond en 1-2 secondes]*

**FATI** : *(repond avec les infos de la base de connaissances : formules a partir de 49 euros par mois, formule pro, formule enterprise, fonctionnalites incluses)*

**YOUSSEF** : C'est interessant. Et est-ce que je pourrais avoir une demonstration la semaine prochaine ?

> *[Fati appelle check_availability puis book_appointment]*

**FATI** : *(propose un creneau disponible et confirme le rendez-vous)*

**YOUSSEF** : Parfait. Mon nom est Dubois, Marc Dubois, et mon numero c'est le 06 12 34 56 78. Merci Fati.

**FATI** : *(confirme le nom et le rendez-vous, salue)*

*Raccrocher. Laisser 2 secondes de silence.*

### Apres l'appel :

> Voila. 45 secondes. Fati a fait trois choses :
> 1. Elle a **repondu en moins de 2 secondes** — pas de musique d'attente
> 2. Elle a **consulte la base de connaissances** pour donner les bons tarifs
> 3. Elle a **pris un rendez-vous** automatiquement dans l'agenda
>
> Et tout ca, **un dimanche a 23h**, si je veux. 24/7, 365 jours par an.

**Mots-cles investisseurs** : **temps de reponse < 2s**, **zero intervention humaine**, **disponibilite 24/7**, **IA conversationnelle naturelle**

---

## [4:00 — 7:00] DASHBOARD — Resultats en temps reel

### Ce que vous montrez :

*Pivoter vers l'ecran. Ouvrir le dashboard deja connecte.*

> Maintenant, regardons ce qui se passe cote entreprise. Voici le tableau de bord Coccinelle.ai.

#### Ecran 1 — Dashboard principal (30 secondes)

*Montrer https://coccinelle-saas.pages.dev/dashboard*

> L'appel qu'on vient de passer apparait ici, dans les **appels recents**. En temps reel.
>
> Vous voyez les metriques : **26 appels traites** ce mois-ci, dont 20 entrants et 5 sortants. **Taux de reponse : 80%** — les 20% restants sont des appels manques en dehors des heures de l'agent.
>
> Duree moyenne : **2 minutes 40**. C'est le temps necessaire pour qualifier un prospect et prendre un rendez-vous.

*Pointer les KPIs en haut du dashboard.*

#### Ecran 2 — Contacts CRM (30 secondes)

*Cliquer sur "Contacts" dans la sidebar*

> Chaque appel genere automatiquement une **fiche contact** dans le CRM. Vous voyez ici **19 contacts** crees par l'agent. Dirigeants PME, agents immobiliers, responsables RH, medecins, restaurateurs.
>
> L'agent a detecte leur nom, leur numero, leur besoin, et les a classes automatiquement : nouveau, contacte, qualifie, converti.

*Scroller la liste des contacts — montrer les differents statuts.*

#### Ecran 3 — Configuration agent (30 secondes)

*Cliquer sur "Agents IA" dans la sidebar*

> Ici, le dirigeant configure son agent en **5 minutes** : le prenom, la voix — on a **20 voix francaises** — le secteur d'activite, et le prompt.
>
> Pas besoin de coder. C'est du no-code complet. Un restaurateur configure son agent pour prendre des reservations. Un medecin pour gerer ses rendez-vous. Un agent immobilier pour qualifier des demandes de visite.

*Montrer rapidement les onglets : Identite, Voix, Comportement.*

#### Ecran 4 — Base de connaissances (30 secondes)

*Cliquer sur "Base de connaissances" dans la sidebar*

> Et voici la **base de connaissances**. Le dirigeant importe ses informations — tarifs, horaires, FAQ — et l'agent les utilise pour repondre aux questions.
>
> C'est ce qui s'est passe il y a 2 minutes : quand j'ai demande les tarifs, Fati a cherche dans cette base et m'a donne la bonne reponse. Pas d'hallucination, pas d'invention. **Des donnees reelles.**

*Montrer les 4 documents de la KB.*

#### Ecran 5 — Sequences omnicanal (30 secondes)

*Cliquer sur "Sequences" dans la sidebar*

> Et le plus puissant : les **sequences automatiques**. Apres un appel, l'agent peut declencher un SMS de confirmation, un email recapitulatif, ou creer un prospect dans le CRM.
>
> Appel → SMS en 30 secondes → email en 1 minute. **Tout est automatise.**

*Montrer l'editeur visuel avec les nodes.*

**Mots-cles investisseurs** : **temps reel**, **CRM integre**, **no-code**, **base de connaissances**, **omnicanal automatise**, **zero hallucination**

---

## [7:00 — 9:30] DIFFERENCIATION — Pourquoi VoixIA gagne

### Ce que vous dites :

> Pourquoi VoixIA et pas les solutions americaines ? Trois raisons.

#### Raison 1 — Souverainete (45 secondes)

> **Premiere raison : la souverainete.** L'agent vocal tourne sur un **serveur francais, chez Scaleway, a Paris**. Les donnees restent en **Europe**. La base de donnees est sur **Cloudflare**, avec des datacenters europeens. Pas d'envoi de donnees client chez Amazon, Google ou Microsoft.
>
> Pour un medecin, un notaire, un cabinet comptable, c'est **non negociable**. Le RGPD n'est pas une option, c'est la loi.

#### Raison 2 — Architecture multi-tenant (45 secondes)

> **Deuxieme raison : l'architecture.** Un seul agent, des centaines de PME. Chaque entreprise a sa voix, son prompt, sa base de connaissances, ses outils. Mais l'infrastructure est **mutualisee**.
>
> Ca veut dire quoi ? Ca veut dire que notre **cout marginal par client est quasi nul**. On deploie un nouveau client en 5 minutes, pas en 5 jours. C'est un **vrai SaaS multi-tenant**, pas du service sur mesure.

#### Raison 3 — Cout (45 secondes)

> **Troisieme raison : le prix.** Notre principal concurrent americain, Retell.ai, facture **0,115 dollar la minute**. C'est 11,5 centimes d'euro.
>
> VoixIA revient a **0,02 euro la minute**. C'est **83% moins cher**. Pourquoi ? Parce qu'on a remplace leur stack proprietaire par du **100% open source** : LiveKit pour la telephonie, ElevenLabs pour la voix, Mistral pour le LLM.
>
> Pour une PME qui recoit 50 appels par jour de 3 minutes, ca passe de **520 euros par mois** chez Retell a **90 euros chez nous**. La difference paie l'abonnement.

*Afficher le slide "Cout par minute" si disponible.*

**Mots-cles investisseurs** : **souverainete**, **RGPD**, **multi-tenant**, **cout marginal nul**, **83% moins cher**, **stack open source**, **scalabilite**

---

## [9:30 — 12:00] TRACTION ET MARCHE

### Ce que vous dites :

#### Marche (45 secondes)

> Le marche. **3,5 millions de TPE/PME en France** qui n'ont aucune solution pour gerer leurs appels. Le marche europeen, c'est **23 millions de PME**.
>
> Le **marche adressable en France** — les PME qui recoivent plus de 10 appels par jour et qui perdent du chiffre d'affaires — c'est environ **800 000 entreprises**. A **150 euros par mois** de panier moyen, c'est un **marche de 1,4 milliard d'euros par an** rien qu'en France.
>
> Et ce marche est **vierge**. Aujourd'hui, la seule alternative c'est le repondeur ou la secretaire externalisee a 300 euros par mois qui ne connait pas l'entreprise.

#### Modele economique (45 secondes)

> Notre modele SaaS en 3 formules :
>
> - **Starter a 49 euros par mois** : 1 agent vocal, 500 minutes, CRM basique. Pour l'artisan ou le commerce de proximite.
> - **Pro a 149 euros par mois** : agent vocal illimite, CRM complet, SMS, email, base de connaissances. Pour la PME de 5 a 50 salaries.
> - **Enterprise a 399 euros par mois** : multi-agents, API, integrations ERP, SLA. Pour les ETI et reseaux de franchises.
>
> Le **LTV/CAC** vise est de **8 pour 1** avec un **churn mensuel inferieur a 5%**, grace a l'integration profonde dans les processus metier.

#### Traction actuelle (45 secondes)

> Ou en est-on ? Le produit est **en production**. Vous venez de le voir fonctionner en direct. Ce n'est pas un prototype. Ce n'est pas un MVP. C'est un **produit deploye**, avec de vraies donnees, de vrais appels, de vrais rendez-vous.
>
> On a :
> - **Un agent vocal operationnel** qui repond en 2 secondes
> - **7 outils metier connectes** : prise de RDV, CRM, base de connaissances, SMS, email, transfert humain, catalogue produits
> - **Un dashboard complet** avec analytics temps reel
> - **5 sequences omnicanal** pre-configurees
> - **13 secteurs** pre-parametres avec des prompts metier
>
> Le pipeline commercial : on a identifie **50 PME cibles** sur Toulouse et la region Occitanie pour le lancement. **8 demos** sont deja planifiees pour mai.

**Mots-cles investisseurs** : **3,5M de PME**, **1,4Md de marche**, **marche vierge**, **SaaS**, **LTV/CAC 8:1**, **churn < 5%**, **produit en production**, **pipeline commercial**

---

## [12:00 — 14:00] ASK — La levee

### Ce que vous dites :

#### Le montant (30 secondes)

> On leve **250 000 euros en pre-seed** pour financer les 18 prochains mois.

#### Utilisation des fonds (45 secondes)

> Repartition des fonds :
>
> - **40% — Produit et technique** (100K) : appels sortants, integrations CRM tierces (HubSpot, Salesforce), amelioration de la reconnaissance vocale, certificaton HDS pour le medical
> - **35% — Commercial et growth** (87K) : 1 commercial terrain Occitanie, acquisition en ligne, partenariats revendeurs (operateurs telecom, integrateurs)
> - **25% — Operations** (63K) : infrastructure, juridique, certifications, tresorerie

#### Jalons 18 mois (45 secondes)

> Les jalons concrets :
>
> **Mois 1-6** : 50 clients payants, MRR de 7 500 euros, certification RGPD formalisee
>
> **Mois 7-12** : 200 clients, MRR de 30 000 euros, lancement WhatsApp et appels sortants, premier partenariat operateur
>
> **Mois 13-18** : 500 clients, MRR de 75 000 euros, ARR de 900 000 euros. Preparation de la **Serie A a 2 millions** pour l'expansion europeenne (Espagne, Italie, Allemagne).

*Afficher le slide "Roadmap et jalons".*

**Mots-cles investisseurs** : **250K pre-seed**, **18 mois de runway**, **MRR 75K a M18**, **ARR 900K**, **Serie A a 2M**, **expansion europeenne**

---

## [14:00 — 15:00] CALL TO ACTION

### Ce que vous dites :

> Pour conclure. VoixIA, c'est **l'assistant vocal IA que 3,5 millions de PME francaises attendent**. On a le produit, on a la technologie, on a 25 ans d'expertise relation client.
>
> Ce qu'il nous faut maintenant, c'est **l'acceleration**. Et c'est pour ca qu'on est devant vous aujourd'hui.
>
> Avant de partir, j'ai une proposition. Chacun d'entre vous a un telephone. **Appelez le 09 39 03 57 60.** Posez une question a Fati. Testez par vous-meme.
>
> Et si vous voulez aller plus loin, scannez ce QR code — il mene directement a notre plateforme. Creez un compte en 2 minutes et configurez votre propre agent vocal.

*Afficher le slide final avec le numero et le QR code.*

> Merci.

*Silence. Sourire. Attendre les questions.*

---

## SLIDES NECESSAIRES

### Slide 1 — Titre
- **VoixIA** — L'agent vocal IA souverain pour les PME francaises
- Agentic Solutions SASU
- Youssef Amrouche, Fondateur
- Nubbo — 20 avril 2026

### Slide 2 — Le probleme
- Visuel : telephone qui sonne dans le vide
- 3,5M de TPE/PME en France
- 7 appels perdus par jour en moyenne hors horaires
- 30% des appels entrants non traites
- Perte estimee : 15 000 euros/an/PME en CA manque

### Slide 3 — La solution
- Visuel : schema simplifie du pipeline
- Appel entrant → Agent vocal IA (2s) → Reponse + RDV + CRM
- 24/7, 365 jours, francais natif
- 7 outils metier integres

### Slide 4 — Demo live
- Slide minimaliste : juste le numero en grand
- **09 39 03 57 60**
- "Appelons Fati."

### Slide 5 — Dashboard
- Capture d'ecran du dashboard (prise le 19 avril)
- Fleche vers les metriques cles
- Fleche vers les appels recents

### Slide 6 — Differenciation
- Tableau comparatif :

| | VoixIA | Retell.ai | Secretariat tel. |
|---|---|---|---|
| Cout/min | 0,02 EUR | 0,115 USD | 0,50 EUR |
| Disponibilite | 24/7 | 24/7 | 9h-18h |
| Donnees | France/EU | USA | N/A |
| Integration CRM | Native | API seule | Non |
| Deploiement | 5 min | 2h+ | 1 semaine |
| Multi-tenant | Oui | Non | Non |

### Slide 7 — Marche
- TAM : 23M PME Europe = 41Md EUR
- SAM : 3,5M PME France = 6,3Md EUR
- SOM : 800K PME FR >10 appels/jour = 1,4Md EUR
- Visuel : carte de France avec les secteurs cibles

### Slide 8 — Modele economique
- 3 formules : Starter 49 EUR / Pro 149 EUR / Enterprise 399 EUR
- Panier moyen vise : 150 EUR/mois
- LTV/CAC cible : 8:1
- Churn cible : <5%/mois

### Slide 9 — Traction
- Produit en production (pas un prototype)
- 7 outils metier connectes
- 13 secteurs pre-parametres
- 26 appels traites (donnees reelles)
- 19 prospects generes automatiquement
- 10 rendez-vous pris
- Pipeline : 50 PME cibles, 8 demos planifiees

### Slide 10 — Ask
- 250K EUR en pre-seed
- 40% Produit | 35% Commercial | 25% Operations
- Runway : 18 mois

### Slide 11 — Roadmap
- M1-6 : 50 clients, MRR 7,5K
- M7-12 : 200 clients, MRR 30K, WhatsApp + appels sortants
- M13-18 : 500 clients, MRR 75K, ARR 900K
- M18 : Serie A 2M pour expansion EU

### Slide 12 — CTA
- Numero en grand : **09 39 03 57 60**
- QR code vers https://coccinelle-saas.pages.dev/signup
- "Testez par vous-meme."
- Contact : youssef@agentic-solutions.fr

---

## SI CA PLANTE — Plans B

### Scenario 1 : VoixIA ne repond pas (serveur down)

**Detection** : le telephone sonne plus de 5 secondes sans reponse.

**Plan B** :
> Ah, on dirait que notre serveur nous joue des tours — les aleas du direct ! Pas de souci, j'ai enregistre une demo complete ce matin.

*Lancer la video de backup (enregistree la veille) depuis le telephone ou l'ordinateur.*

**Preparation** : la veille, enregistrer un screencast de 90 secondes :
- Appel au +33939035760 avec conversation complete
- Filmer l'ecran du telephone + le son de Fati
- Stocker sur le telephone ET sur l'ordinateur (2 copies)

### Scenario 2 : Fati repond mais mal (hallucination, reponse hors sujet)

**Detection** : Fati donne une info incorrecte ou ne comprend pas la question.

**Plan B** :
> C'est interessant — vous voyez que l'IA est honnete, elle ne sait pas tout ! En production, le dirigeant configure sa base de connaissances pour que les reponses soient 100% fiables. Laissez-moi vous montrer comment sur le dashboard.

*Pivoter immediatement vers le dashboard. Montrer la base de connaissances et expliquer le systeme de verification.*

### Scenario 3 : Pas de WiFi / Internet coupe

**Detection** : le dashboard ne se charge pas.

**Plan B** :
- Le telephone fonctionne en 4G/5G pour l'appel vocal (independant du WiFi)
- Avoir des **captures d'ecran du dashboard** pretes dans un PDF local
- Alternative : partage de connexion depuis le telephone

**Preparation** :
- Exporter 5 captures d'ecran du dashboard (Dashboard, Contacts, Config agent, KB, Sequences)
- Les mettre dans un PDF ou un dossier sur le bureau

### Scenario 4 : L'appel fonctionne mais le dashboard n'affiche pas le nouvel appel

**Detection** : l'appel n'apparait pas dans "Appels recents" du dashboard.

**Plan B** :
> Le log de l'appel prend quelques secondes a se synchroniser. En attendant, regardons les 26 appels deja traites par Fati ce mois-ci.

*Montrer les metriques existantes. Rafraichir discretement la page dans 30 secondes.*

### Scenario 5 : Le telephone de Youssef n'a plus de batterie

**Preparation** : amener un **chargeur** et une **batterie externe**. Verifier la charge a 100% avant de monter sur scene.

**Plan B** : utiliser le telephone d'un membre de l'audience.
> Quelqu'un dans la salle a un telephone ? Appelez le 09 39 03 57 60 et mettez sur haut-parleur. Fati repond a tout le monde.

---

## TIMING DETAILLE

| Temps | Section | Duree | Action cle |
|-------|---------|-------|------------|
| 0:00 | Accroche | 1:30 | Chiffre choc + promesse |
| 1:30 | Sortir telephone | 0:15 | Mise en scene |
| 1:45 | Appel en direct | 1:15 | Conversation Fati |
| 3:00 | Debrief appel | 1:00 | 3 points cles |
| 4:00 | Dashboard home | 0:30 | KPIs + appel recent |
| 4:30 | Contacts CRM | 0:30 | 19 prospects auto |
| 5:00 | Config agent | 0:30 | No-code, 20 voix |
| 5:30 | Base connaissances | 0:30 | Zero hallucination |
| 6:00 | Sequences | 0:30 | Omnicanal automatise |
| 6:30 | Transition diff. | 0:30 | "Pourquoi VoixIA" |
| 7:00 | Souverainete | 0:45 | France, RGPD |
| 7:45 | Multi-tenant | 0:45 | Cout marginal nul |
| 8:30 | Cout 83% | 1:00 | Retell vs VoixIA |
| 9:30 | Marche | 0:45 | 3,5M PME, 1,4Md |
| 10:15 | Business model | 0:45 | 49/149/399 |
| 11:00 | Traction | 1:00 | Produit en prod, pipeline |
| 12:00 | Ask montant | 0:30 | 250K pre-seed |
| 12:30 | Utilisation fonds | 0:45 | 40/35/25 |
| 13:15 | Jalons 18 mois | 0:45 | MRR 75K, ARR 900K |
| 14:00 | CTA | 1:00 | Testez + QR code |

---

## QUESTIONS ANTICIPEES (Q&A apres le pitch)

### "Comment vous differencier de Google Dialogflow ou Amazon Connect ?"
> Ce sont des outils pour developpeurs. Il faut des semaines de configuration et une equipe technique. VoixIA est un **produit fini, no-code**, qu'un dirigeant de PME configure en 5 minutes sans aucune competence technique.

### "Quel est votre avantage concurrentiel defensible ?"
> Trois barrieres : 1) **La base de connaissances metier** — chaque client enrichit son agent avec ses propres donnees, ce qui cree un **lock-in naturel**. 2) **Les integrations sectorielles** — nos prompts pour 13 secteurs sont des mois de travail que les concurrents devront reproduire. 3) **La souverainete** — c'est une exigence legale croissante que les acteurs US ne peuvent pas satisfaire facilement.

### "Pourquoi pas open source / self-hosted ?"
> Les PME ne veulent pas deployer d'infrastructure. Elles veulent un **service qui marche**. Notre valeur, c'est l'integration bout en bout : voix + CRM + SMS + email + RDV en un seul abonnement. Le self-hosted ne remplacera jamais ca.

### "Quel est votre cout d'acquisition client vise ?"
> 150 euros en moyenne. On vise le **bouche-a-oreille sectoriel** — un agent immobilier satisfait en recommande 3 — combine avec du **content marketing** (demos live sur LinkedIn, temoignages video) et des **partenariats revendeurs** avec les operateurs telecom regionaux.

### "Et si les LLM deviennent gratuits demain ?"
> C'est une bonne question. Le LLM ne represente que **20% de notre cout**. Le reste, c'est la telephonie (Twilio), la synthese vocale (ElevenLabs) et l'infrastructure. Et meme si le LLM devient gratuit, notre valeur c'est le **produit fini** — la configuration no-code, les outils metier, le CRM integre — pas le modele de langage.

### "Votre equipe ?"
> Aujourd'hui c'est moi, full-stack fondateur technique, avec 25 ans d'experience en relation client et centres d'appels. C'est un avantage : je connais les besoins du marche de l'interieur. La levee finance le premier recrutement : un commercial terrain et un developpeur senior.

---

## NOTES DE MISE EN SCENE

- **Posture** : debout, pas derriere le pupitre. Se deplacer quand on parle du probleme, revenir vers l'ecran pour la demo.
- **Telephone** : le tenir bien haut pendant l'appel pour que tout le monde voie. Haut-parleur au maximum.
- **Rythme** : lent pendant l'accroche (gravite), rapide pendant la demo (energie), pose pendant le ask (serieux).
- **Silences** : 3 silences strategiques — apres le chiffre choc (0:30), apres que Fati repond (3:00), apres le "250 000 euros" (12:10).
- **Contact visuel** : regarder l'audience pendant l'accroche et le ask. Regarder l'ecran seulement pendant la demo dashboard.
- **Vetement** : chemise (pas de cravate), sobre. Assumer le cote operationnel, pas financier.
