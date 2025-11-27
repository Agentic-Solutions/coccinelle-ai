-- Script de données de test pour Coccinelle.AI
-- À exécuter avec: npx wrangler d1 execute coccinelle-db --remote --file=test-data.sql

-- 1. TENANT DE DÉMO
INSERT OR REPLACE INTO tenants (
  id, company_name, industry, phone, address, city, country,
  website, logo_url, primary_color, vapi_phone_number,
  subscription_plan, subscription_status, is_active, created_at
) VALUES (
  'tenant_demo_001',
  'Salon Marie Paris',
  'beauty',
  '+33 1 42 00 00 00',
  '12 rue de Charonne',
  'Paris',
  'France',
  'https://salon-marie.example.com',
  NULL,
  '#ff6b6b',
  '+33939035761',
  'pro',
  'active',
  1,
  datetime('now', '-30 days')
);

-- 2. AGENTS
INSERT OR REPLACE INTO agents (
  id, tenant_id, first_name, last_name, email, phone,
  role, is_active, created_at
) VALUES
  ('agent_001', 'tenant_demo_001', 'Sophie', 'Martin', 'sophie@salon-marie.fr', '+33 6 12 34 56 78', 'stylist', 1, datetime('now', '-25 days')),
  ('agent_002', 'tenant_demo_001', 'Julie', 'Dupont', 'julie@salon-marie.fr', '+33 6 98 76 54 32', 'stylist', 1, datetime('now', '-20 days'));

-- 3. DISPONIBILITÉS DES AGENTS (Lun-Ven 9h-18h)
INSERT OR REPLACE INTO availability_slots (
  id, agent_id, day_of_week, start_time, end_time, is_active, created_at
) VALUES
  -- Sophie (agent_001) - Lundi à Vendredi
  ('avail_001', 'agent_001', 1, '09:00', '18:00', 1, datetime('now')),
  ('avail_002', 'agent_001', 2, '09:00', '18:00', 1, datetime('now')),
  ('avail_003', 'agent_001', 3, '09:00', '18:00', 1, datetime('now')),
  ('avail_004', 'agent_001', 4, '09:00', '18:00', 1, datetime('now')),
  ('avail_005', 'agent_001', 5, '09:00', '18:00', 1, datetime('now')),
  -- Julie (agent_002) - Mardi à Samedi
  ('avail_006', 'agent_002', 2, '10:00', '19:00', 1, datetime('now')),
  ('avail_007', 'agent_002', 3, '10:00', '19:00', 1, datetime('now')),
  ('avail_008', 'agent_002', 4, '10:00', '19:00', 1, datetime('now')),
  ('avail_009', 'agent_002', 5, '10:00', '19:00', 1, datetime('now')),
  ('avail_010', 'agent_002', 6, '10:00', '17:00', 1, datetime('now'));

-- 4. SERVICES
INSERT OR REPLACE INTO services (
  id, tenant_id, name, description, duration_minutes, price, currency,
  is_active, display_order, created_at
) VALUES
  ('service_001', 'tenant_demo_001', 'Coupe + Brushing', 'Coupe de cheveux avec brushing professionnel', 60, 45.00, 'EUR', 1, 1, datetime('now')),
  ('service_002', 'tenant_demo_001', 'Coloration', 'Coloration complète avec soin', 120, 85.00, 'EUR', 1, 2, datetime('now')),
  ('service_003', 'tenant_demo_001', 'Mèches', 'Mèches + brushing', 90, 65.00, 'EUR', 1, 3, datetime('now'));

-- 5. PROSPECTS (30 prospects)
INSERT OR REPLACE INTO prospects (
  id, tenant_id, first_name, last_name, email, phone,
  source, status, created_at
) VALUES
  ('prospect_001', 'tenant_demo_001', 'Emma', 'Bernard', 'emma.bernard@example.com', '+33 6 11 11 11 11', 'widget', 'qualified', datetime('now', '-15 days')),
  ('prospect_002', 'tenant_demo_001', 'Lucas', 'Petit', 'lucas.petit@example.com', '+33 6 22 22 22 22', 'vapi', 'new', datetime('now', '-14 days')),
  ('prospect_003', 'tenant_demo_001', 'Léa', 'Roux', 'lea.roux@example.com', '+33 6 33 33 33 33', 'widget', 'qualified', datetime('now', '-13 days')),
  ('prospect_004', 'tenant_demo_001', 'Noah', 'Moreau', 'noah.moreau@example.com', '+33 6 44 44 44 44', 'vapi', 'contacted', datetime('now', '-12 days')),
  ('prospect_005', 'tenant_demo_001', 'Chloé', 'Simon', 'chloe.simon@example.com', '+33 6 55 55 55 55', 'widget', 'qualified', datetime('now', '-11 days')),
  ('prospect_006', 'tenant_demo_001', 'Louis', 'Laurent', 'louis.laurent@example.com', '+33 6 66 66 66 66', 'vapi', 'new', datetime('now', '-10 days')),
  ('prospect_007', 'tenant_demo_001', 'Manon', 'Lefebvre', 'manon.lefebvre@example.com', '+33 6 77 77 77 77', 'widget', 'converted', datetime('now', '-9 days')),
  ('prospect_008', 'tenant_demo_001', 'Arthur', 'Leroy', 'arthur.leroy@example.com', '+33 6 88 88 88 88', 'vapi', 'qualified', datetime('now', '-8 days')),
  ('prospect_009', 'tenant_demo_001', 'Jade', 'Girard', 'jade.girard@example.com', '+33 6 99 99 99 99', 'widget', 'new', datetime('now', '-7 days')),
  ('prospect_010', 'tenant_demo_001', 'Gabriel', 'Bonnet', 'gabriel.bonnet@example.com', '+33 6 10 10 10 10', 'vapi', 'converted', datetime('now', '-6 days')),
  ('prospect_011', 'tenant_demo_001', 'Alice', 'Dupuis', 'alice.dupuis@example.com', '+33 6 11 22 33 44', 'widget', 'qualified', datetime('now', '-5 days')),
  ('prospect_012', 'tenant_demo_001', 'Hugo', 'Lambert', 'hugo.lambert@example.com', '+33 6 55 66 77 88', 'vapi', 'new', datetime('now', '-4 days')),
  ('prospect_013', 'tenant_demo_001', 'Zoé', 'Fontaine', 'zoe.fontaine@example.com', '+33 6 99 88 77 66', 'widget', 'contacted', datetime('now', '-3 days')),
  ('prospect_014', 'tenant_demo_001', 'Tom', 'Rousseau', 'tom.rousseau@example.com', '+33 6 11 33 55 77', 'vapi', 'qualified', datetime('now', '-2 days')),
  ('prospect_015', 'tenant_demo_001', 'Sarah', 'Vincent', 'sarah.vincent@example.com', '+33 6 22 44 66 88', 'widget', 'converted', datetime('now', '-1 day'));

-- 6. RENDEZ-VOUS (20 RDV)
INSERT OR REPLACE INTO appointments (
  id, tenant_id, prospect_id, agent_id, service_id,
  scheduled_at, duration_minutes, status, notes, booking_source, created_at
) VALUES
  -- RDV passés (completed)
  ('appt_001', 'tenant_demo_001', 'prospect_001', 'agent_001', 'service_001', datetime('now', '-10 days', '+10 hours'), 60, 'completed', 'Première visite', 'widget', datetime('now', '-12 days')),
  ('appt_002', 'tenant_demo_001', 'prospect_003', 'agent_002', 'service_002', datetime('now', '-8 days', '+14 hours'), 120, 'completed', NULL, 'widget', datetime('now', '-10 days')),
  ('appt_003', 'tenant_demo_001', 'prospect_005', 'agent_001', 'service_001', datetime('now', '-6 days', '+11 hours'), 60, 'completed', NULL, 'widget', datetime('now', '-8 days')),
  ('appt_004', 'tenant_demo_001', 'prospect_007', 'agent_002', 'service_003', datetime('now', '-4 days', '+15 hours'), 90, 'completed', 'Cliente régulière', 'widget', datetime('now', '-6 days')),
  ('appt_005', 'tenant_demo_001', 'prospect_010', 'agent_001', 'service_001', datetime('now', '-2 days', '+13 hours'), 60, 'completed', NULL, 'vapi', datetime('now', '-4 days')),

  -- RDV confirmés (confirmed)
  ('appt_006', 'tenant_demo_001', 'prospect_011', 'agent_001', 'service_001', datetime('now', '+1 day', '+10 hours'), 60, 'confirmed', NULL, 'widget', datetime('now', '-3 days')),
  ('appt_007', 'tenant_demo_001', 'prospect_014', 'agent_002', 'service_002', datetime('now', '+2 days', '+14 hours'), 120, 'confirmed', 'Première coloration', 'vapi', datetime('now', '-2 days')),
  ('appt_008', 'tenant_demo_001', 'prospect_015', 'agent_001', 'service_003', datetime('now', '+3 days', '+11 hours'), 90, 'confirmed', NULL, 'widget', datetime('now', '-1 day')),

  -- RDV planifiés (scheduled)
  ('appt_009', 'tenant_demo_001', 'prospect_002', 'agent_002', 'service_001', datetime('now', '+4 days', '+15 hours'), 60, 'scheduled', NULL, 'vapi', datetime('now')),
  ('appt_010', 'tenant_demo_001', 'prospect_004', 'agent_001', 'service_002', datetime('now', '+5 days', '+10 hours'), 120, 'scheduled', NULL, 'vapi', datetime('now')),
  ('appt_011', 'tenant_demo_001', 'prospect_006', 'agent_002', 'service_001', datetime('now', '+6 days', '+14 hours'), 60, 'scheduled', NULL, 'vapi', datetime('now')),
  ('appt_012', 'tenant_demo_001', 'prospect_008', 'agent_001', 'service_003', datetime('now', '+7 days', '+11 hours'), 90, 'scheduled', 'Demande de conseils', 'vapi', datetime('now')),

  -- RDV annulés (cancelled)
  ('appt_013', 'tenant_demo_001', 'prospect_009', 'agent_002', 'service_001', datetime('now', '-5 days', '+16 hours'), 60, 'cancelled', 'Annulé par le client', 'widget', datetime('now', '-7 days')),
  ('appt_014', 'tenant_demo_001', 'prospect_012', 'agent_001', 'service_002', datetime('now', '-3 days', '+12 hours'), 120, 'cancelled', NULL, 'widget', datetime('now', '-5 days')),

  -- No-show
  ('appt_015', 'tenant_demo_001', 'prospect_013', 'agent_002', 'service_001', datetime('now', '-7 days', '+10 hours'), 60, 'no_show', 'Client absent', 'widget', datetime('now', '-9 days'));

-- 7. APPELS VAPI (40 appels)
INSERT OR REPLACE INTO vapi_calls (
  id, call_id, tenant_id, prospect_id, agent_id,
  status, duration_seconds, cost_usd, transcript_summary,
  appointment_created, created_at
) VALUES
  -- Appels avec RDV créés
  ('call_001', 'vapi_001', 'tenant_demo_001', 'prospect_002', 'agent_001', 'completed', 180, '0.45', 'Client intéressé, RDV pris', 1, datetime('now', '-14 days')),
  ('call_002', 'vapi_002', 'tenant_demo_001', 'prospect_004', 'agent_002', 'completed', 210, '0.52', 'Demande de coloration, RDV confirmé', 1, datetime('now', '-12 days')),
  ('call_003', 'vapi_003', 'tenant_demo_001', 'prospect_006', 'agent_001', 'completed', 165, '0.41', 'Nouveau client, RDV planifié', 1, datetime('now', '-10 days')),
  ('call_004', 'vapi_004', 'tenant_demo_001', 'prospect_008', 'agent_002', 'completed', 195, '0.48', 'Cliente régulière, RDV pour mèches', 1, datetime('now', '-8 days')),
  ('call_005', 'vapi_005', 'tenant_demo_001', 'prospect_010', 'agent_001', 'completed', 220, '0.55', 'RDV urgent accepté', 1, datetime('now', '-6 days')),

  -- Appels sans RDV
  ('call_006', 'vapi_006', 'tenant_demo_001', NULL, NULL, 'completed', 90, '0.22', 'Demande de renseignements tarifs', 0, datetime('now', '-13 days')),
  ('call_007', 'vapi_007', 'tenant_demo_001', NULL, NULL, 'completed', 120, '0.30', 'Question sur horaires', 0, datetime('now', '-11 days')),
  ('call_008', 'vapi_008', 'tenant_demo_001', 'prospect_009', NULL, 'completed', 75, '0.18', 'Pas disponible pour RDV', 0, datetime('now', '-9 days')),
  ('call_009', 'vapi_009', 'tenant_demo_001', NULL, NULL, 'completed', 105, '0.26', 'Demande adresse salon', 0, datetime('now', '-7 days')),
  ('call_010', 'vapi_010', 'tenant_demo_001', 'prospect_011', NULL, 'completed', 85, '0.21', 'Rappel demandé', 0, datetime('now', '-5 days')),
  ('call_011', 'vapi_011', 'tenant_demo_001', NULL, NULL, 'completed', 95, '0.23', 'Question produits utilisés', 0, datetime('now', '-3 days')),
  ('call_012', 'vapi_012', 'tenant_demo_001', 'prospect_012', 'agent_001', 'completed', 175, '0.43', 'RDV demandé mais créneau indisponible', 0, datetime('now', '-2 days')),
  ('call_013', 'vapi_013', 'tenant_demo_001', NULL, NULL, 'completed', 110, '0.27', 'Demande conseil coiffure', 0, datetime('now', '-1 day')),

  -- Appels échoués
  ('call_014', 'vapi_014', 'tenant_demo_001', NULL, NULL, 'failed', 15, '0.05', 'Appel raccroché', 0, datetime('now', '-15 days')),
  ('call_015', 'vapi_015', 'tenant_demo_001', NULL, NULL, 'failed', 8, '0.03', 'Pas de réponse', 0, datetime('now', '-4 days'));

-- 8. DOCUMENTS KNOWLEDGE BASE (5 documents)
INSERT OR REPLACE INTO knowledge_documents (
  id, tenant_id, source_type, source_url, title, content,
  content_hash, word_count, chunk_count, status,
  crawled_at, indexed_at, is_active, created_at
) VALUES
  ('doc_001', 'tenant_demo_001', 'manual', NULL, 'Guide des services',
   'Nos services incluent coupe, coloration, mèches, brushing. Nous utilisons des produits professionnels haut de gamme.',
   'hash_001', 15, 1, 'completed', datetime('now', '-20 days'), datetime('now', '-20 days'), 1, datetime('now', '-20 days')),

  ('doc_002', 'tenant_demo_001', 'manual', NULL, 'Horaires et tarifs',
   'Ouvert du lundi au samedi, 9h-19h. Coupe: 45€, Coloration: 85€, Mèches: 65€. Réservation obligatoire.',
   'hash_002', 18, 1, 'completed', datetime('now', '-18 days'), datetime('now', '-18 days'), 1, datetime('now', '-18 days')),

  ('doc_003', 'tenant_demo_001', 'manual', NULL, 'Politique d annulation',
   'Annulation gratuite jusqu à 24h avant le RDV. Au-delà, 50% du montant sera facturé.',
   'hash_003', 16, 1, 'completed', datetime('now', '-15 days'), datetime('now', '-15 days'), 1, datetime('now', '-15 days'));

-- 9. FAQ
INSERT OR REPLACE INTO knowledge_faq (
  id, tenant_id, question, answer, category, keywords, is_active, created_at
) VALUES
  ('faq_001', 'tenant_demo_001', 'Quels sont vos horaires ?',
   'Nous sommes ouverts du lundi au samedi de 9h à 19h.', 'horaires', 'horaires,ouverture', 1, datetime('now', '-10 days')),

  ('faq_002', 'tenant_demo_001', 'Comment prendre rendez-vous ?',
   'Vous pouvez réserver en ligne sur notre site ou en appelant Sara au +33 9 39 03 57 61.', 'reservation', 'rdv,réservation,prendre', 1, datetime('now', '-10 days')),

  ('faq_003', 'tenant_demo_001', 'Quels moyens de paiement acceptez-vous ?',
   'Nous acceptons CB, espèces et chèques.', 'paiement', 'paiement,carte,cb', 1, datetime('now', '-10 days'));

-- 10. SNIPPETS
INSERT OR REPLACE INTO knowledge_snippets (
  id, tenant_id, name, content, category, usage_context, is_active, created_at, updated_at
) VALUES
  ('snippet_001', 'tenant_demo_001', 'Message de bienvenue',
   'Bonjour ! Je suis Sara, l assistant vocal du Salon Marie. Comment puis-je vous aider aujourd hui ?',
   'accueil', 'Début d appel', 1, datetime('now', '-15 days'), datetime('now', '-15 days')),

  ('snippet_002', 'tenant_demo_001', 'Confirmation RDV',
   'Parfait ! Votre rendez-vous est confirmé le {date} à {heure} avec {agent}. Vous recevrez un SMS de confirmation.',
   'confirmation', 'Après prise de RDV', 1, datetime('now', '-15 days'), datetime('now', '-15 days'));

SELECT 'Données de test insérées avec succès !' as message;
