# 🐞 Coccinelle.ai

Plateforme SaaS multi-tenant pour la gestion d'appels et de rendez-vous avec agents vocaux IA.

## 🎯 Fonctionnalités

- Assistant vocal **Sara** via Vapi.ai (+33939035761)
- Gestion multi-tenant avec authentification API Key
- Dashboard Analytics avec graphiques temps réel
- Logging automatique des appels Vapi
- Notifications SMS (Twilio) + Email (Resend)
- Page web de gestion RDV avec lien unique
- Export Excel des données d'appels
- Base de données D1 (12 tables)

## 🏗️ Architecture
Dashboard Next.js (localhost:3001)
↓
API Cloudflare Workers
↓
D1 Database (12 tables)
↓
Vapi.ai (Sara)

## 🚀 Stack Technique

**Backend**
- Cloudflare Workers (Edge Computing)
- D1 Database (SQLite distribué)
- Itty Router

**Frontend**
- Next.js 15 + TypeScript
- Tailwind CSS
- Recharts (graphiques)
- XLSX (export Excel)

**Intégrations**
- Vapi.ai (téléphonie IA)
- Twilio (SMS)
- Resend (Email)
- Deepgram Nova 3 (transcription)

## 📊 Structure Projet
coccinelle-ai/
├── src/
│   └── index.js (1279 lignes - API complète)
├── database/
│   ├── schema-v1.sql
│   ├── seed-data.sql
│   └── insert_test_calls.sql
├── coccinelle-dashboard-new/
│   ├── app/
│   │   ├── page.tsx (dashboard)
│   │   └── appels/
│   │       ├── page.tsx (liste + pagination)
│   │       └── [callId]/page.tsx (détails)
│   └── lib/
│       └── api.ts
└── wrangler.toml

## ⚙️ Installation
```bash
# Backend
npm install

# Frontend
cd coccinelle-dashboard-new
npm install
🔧 Configuration
Secrets Cloudflare Workers :
bashnpx wrangler secret put VAPI_API_KEY
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put RESEND_API_KEY
🚀 Déploiement
bash# Backend
npx wrangler deploy

# Frontend
cd coccinelle-dashboard-new
npm run dev -- -p 3001
📝 Version Actuelle
v1.11.2 - 6 octobre 2025

Logging Vapi avec call_id réel
SMS/Email + lien RDV fonctionnels
Fuseau horaire Paris Time
Dashboard Analytics complet

📄 License
Propriétaire - Tous droits réservés
👤 Auteur
Youssef Amrouche (YAMROUCHE)
