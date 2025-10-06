# MANIFESTE COCCINELLE.AI v1.11.3 - FINAL

**Dernière mise à jour** : 6 octobre 2025  
**Version** : 1.11.3  
**Statut** : Production - Code versionné sur GitHub

## CONTEXTE DU PROJET

**Coccinelle.ai** : Plateforme SaaS multi-tenant pour gestion d'appels et RDV avec agents vocaux IA (Sara via Vapi.ai).

### Architecture
Dashboard Next.js → API Cloudflare Workers → D1 Database → Vapi.ai (Sara)

## CE QUI FONCTIONNE v1.11.3

### API REST Production
- URL : https://coccinelle-api.youssef-amrouche.workers.dev
- Version Backend : 1.11.2 (1279 lignes)
- API Key Test : sk_test_demo123456789

### Base D1
- Database ID : f4d7ff42-fc12-4c16-9c19-ada63c023827
- Tables : 12 tables
- Données test : 35 appels créés

### Dashboard Analytics
- URL Local : http://localhost:3001
- Version : 1.9.0
- Stack : Next.js 15 + TypeScript + Tailwind + Recharts + XLSX
- Fonctionnalités :
  - Dashboard avec 3 graphiques
  - Pagination (20 appels/page)
  - Page détails appel avec transcription
  - Export Excel fonctionnel

### Sara (Vapi.ai)
- Numéro : +33939035761
- Transcriber : Deepgram Nova 3 General
- Language : fr
- Custom Tools : searchKnowledge, checkAvailability, createAppointment

### Fonctionnalités opérationnelles
- Logging Vapi avec call_id réel
- Notifications SMS (Twilio) + Email (Resend)
- Lien RDV public via token unique
- Fuseau horaire Paris Time
- Multi-tenant avec authentification API Key

## NOUVEAUTÉ v1.11.3 - CODE VERSIONNÉ

### GitHub Repository
- URL : https://github.com/Agentic-Solutions/coccinelle-ai
- Visibilité : Private
- Organisation : Agentic-Solutions
- Premier commit : 6 octobre 2025
- Fichiers : 44 fichiers versionnés

### Git Configuration
- User : YAMROUCHE
- Email : youssef.amrouche@outlook.fr
- Branch : main

## ENDPOINTS API

### Prospects
- GET/POST /api/v1/prospects

### Agents
- GET /api/v1/agents
- GET /api/v1/agents/:id/availability
- GET/POST/DELETE /api/v1/agents/:id/calendar-blocks

### Rendez-vous
- GET/POST /api/v1/appointments
- GET/POST /rdv/:token
- GET /rdv/:token/availability

### Vapi Logs
- GET /api/v1/vapi/calls
- GET /api/v1/vapi/calls/:callId
- GET /api/v1/vapi/stats

### Webhooks
- POST /webhooks/vapi/function-call

## BASE DE DONNÉES (12 TABLES)

1. tenants
2. agents
3. prospects
4. services
5. properties
6. appointments
7. availability_slots
8. calendar_blocks
9. appointment_notifications
10. appointment_types
11. knowledge_base
12. vapi_call_logs

## STRUCTURE PROJET

coccinelle-ai/
├── src/index.js (1279 lignes)
├── database/
├── coccinelle-dashboard-new/
├── .gitignore
├── README.md
├── wrangler.toml
└── MANIFESTE_v1.11.3.md

## WORKFLOW GIT

git status
git add .
git commit -m "Description"
git push

## CHANGELOG

### v1.11.3 (6 octobre 2025) - CURRENT
- Code versionné sur GitHub
- .gitignore configuré
- README.md créé
- 44 fichiers commités

### v1.11.2 (6 octobre 2025)
- Logging Vapi validé
- SMS/Email fonctionnels
- Fuseau horaire Paris Time

## PROCHAINES ÉTAPES

1. Affichage transcriptions réelles
2. Tester appel réel Sara
3. Filtres dashboard étendus
4. Migration SIP OVH

## POUR CONTINUER

GitHub: https://github.com/Agentic-Solutions/coccinelle-ai
URL API: https://coccinelle-api.youssef-amrouche.workers.dev
Dashboard: http://localhost:3001

FIN DU MANIFESTE v1.11.3
