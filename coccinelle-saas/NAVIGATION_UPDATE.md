# Nouvelle structure de navigation - 6 modules

## Ordre des modules (aligné avec l'animation)
1. Base de connaissance (knowledge) - FileText
2. Multi-canal (channels) - MessageSquare
3. Conversations IA (conversations) - Users/Brain
4. CRM intégré (crm) - Users
5. Gestion de RDV (appointments) - Calendar
6. Analytics (analytics) - BarChart3

## Mapping des anciennes vers nouvelles routes

### Knowledge (inchangé)
- /dashboard/knowledge → /dashboard/knowledge

### Channels (nouveau regroupement)
- /dashboard/settings/channels/phone → /dashboard/channels/phone
- /dashboard/settings/channels/sms → /dashboard/channels/sms
- /dashboard/settings/channels/whatsapp → /dashboard/channels/whatsapp
- /dashboard/settings/channels/email → /dashboard/channels/email
- /dashboard/inbox → /dashboard/channels/inbox

### Conversations (nouveau module)
- /dashboard/sara → /dashboard/conversations/sara
- /dashboard/appels → /dashboard/conversations/appels
- Nouveau: /dashboard/conversations/live
- Nouveau: /dashboard/conversations/history

### CRM (renommé)
- /dashboard/customers → /dashboard/crm/prospects
- /dashboard/customers/[id] → /dashboard/crm/prospects/[id]
- Nouveau: /dashboard/crm/contacts
- Nouveau: /dashboard/crm/segments
- Nouveau: /dashboard/crm/scoring

### Appointments (renommé)
- /dashboard/rdv → /dashboard/appointments/calendar
- /dashboard/rdv/settings → /dashboard/appointments/settings
- Nouveau: /dashboard/appointments/reminders
- Nouveau: /dashboard/appointments/statistics

### Analytics (inchangé)
- /dashboard/analytics → /dashboard/analytics
