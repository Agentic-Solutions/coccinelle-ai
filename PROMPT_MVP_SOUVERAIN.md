# 🐞 PROMPT - Développement MVP Coccinelle.ai Stack Souveraine

## CONTEXTE DU PROJET

Je suis Youssef Amrouche, fondateur d'Agentic Solutions (SASU créée en mai 2025).

Je développe **Coccinelle.ai**, le premier CRM français avec IA vocale native pour les TPE (4,6 millions d'établissements en France : salons de coiffure, restaurants, agences immobilières, cabinets médicaux...).

## Problème que je résous
- 95% des TPE françaises n'ont pas de CRM
- 30% des appels clients sont manqués
- Les solutions existantes sont américaines et coûteuses

## Ma solution actuelle
Un agent vocal IA nommé "Sara" qui :
- Répond au téléphone 24/7
- Qualifie les prospects
- Prend des rendez-vous
- Envoie des confirmations par SMS/Email/WhatsApp

## Stack technique ACTUELLE (dépendance US)
| Composant | Service | Pays |
|-----------|---------|------|
| Téléphonie SIP | Twilio | USA |
| Agent vocal IA | Retell.ai | USA |
| LLM | OpenAI GPT-4 | USA |
| Synthèse vocale | ElevenLabs | USA |
| Backend | Cloudflare Workers | EU ✅ |
| Base de données | Cloudflare D1 | EU ✅ |
| Frontend | Cloudflare Pages | EU ✅ |

## Objectif : Stack SOUVERAINE (100% française/européenne)
| Composant | Service cible | Pays |
|-----------|---------------|------|
| Téléphonie SIP | OVH Telecom / Scaleway | France |
| Agent vocal IA | Jambonz (open-source auto-hébergé) | France |
| LLM | Mistral AI / Cloudflare Workers AI | France/EU |
| Synthèse vocale | Moshi (Kyutai) / alternatives FR | France |
| Reconnaissance vocale | Whisper (auto-hébergé) | EU |

## MON NIVEAU TECHNIQUE

⚠️ **Je suis DÉBUTANT en développement.**
- J'ai besoin d'instructions pas à pas, très détaillées
- Quand tu me donnes du code, explique-moi ce qu'il fait
- Quand tu me donnes des commandes terminal, dis-moi où les exécuter

## CE QUI EXISTE DÉJÀ

### Backend Coccinelle (Cloudflare Workers)
- **Chemin** : `/Users/amrouche.7/match-immo-mcp/coccinelle-ai/`
- **URL production** : `https://coccinelle-api.youssef-amrouche.workers.dev`
- **18 modules** : auth, products, appointments, knowledge, prospects, omnichannel, retell, twilio, etc.
- **Status** : MVP 98% complet

### Frontend Coccinelle (Next.js sur Cloudflare Pages)
- **Chemin** : `/Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/`
- **URL production** : `https://coccinelle-saas.pages.dev`

### POC Jambonz existant (juillet 2025)
Un webhook basique existe déjà dans :
`/Users/amrouche.7/Documents/Entreprise/Agentic_Solutions_SASU/05 - Projets & Prestations/Projets en cours/coccinelle_Retell/coccinelle-ai/src/app/api/voice/jambonz-webhook/route.ts`

## MISSION : DÉVELOPPER LE MVP SOUVERAIN

### Phase A : Jambonz auto-hébergé (remplace Retell)
1. Installer Jambonz sur infrastructure française (Scaleway ou OVH)
2. Configurer Jambonz pour recevoir les appels via Twilio (temporairement)
3. Intégrer le backend Coccinelle avec Jambonz (webhooks)
4. Tester que Sara répond correctement via Jambonz

### Phase B : LLM français (remplace OpenAI)
1. Configurer Cloudflare Workers AI avec Mistral
2. Créer un endpoint /api/v1/ai/chat-mistral
3. Comparer qualité Mistral vs GPT-4

### Phase C : STT/TTS français (remplace Google)
1. Intégrer Whisper pour la reconnaissance vocale
2. Tester alternatives TTS françaises

### Phase D : Opérateur SIP français (remplace Twilio)
1. Créer compte OVH Telecom ou Scaleway
2. Obtenir un numéro SIP français
3. Configurer Jambonz pour cet opérateur

## COMMANDES DE DÉPLOIEMENT

### Backend
```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai
npx wrangler deploy
```

### Frontend
```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas
npm run pages:build && npx wrangler pages deploy .vercel/output/static --project-name=coccinelle-saas
```

## RÈGLES POUR CLAUDE

1. Toujours expliquer ce que tu fais et pourquoi
2. Donner les commandes complètes avec le chemin
3. Valider chaque étape avant de passer à la suivante
4. Ne jamais casser ce qui fonctionne déjà

## PREMIÈRE TÂCHE

Commence par analyser le backend existant :
1. Lis src/index.js
2. Analyse le module Retell existant
3. Fais-moi un résumé de l'architecture
4. Propose un plan pour créer le module Jambonz

Prêt ? Commence par l'analyse ! 🐞
