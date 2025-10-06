-- COCCINELLE.AI - Données de test pour module RDV

-- Tenant de test
INSERT INTO tenants (id, name, email, api_key, timezone, created_at) 
VALUES (
  'tenant_demo_001',
  'Agence Immobilière Demo',
  'contact@agence-demo.fr',
  'sk_test_demo123456789',
  'Europe/Paris',
  datetime('now')
);

-- Agents immobiliers avec gestion d'agenda
INSERT INTO agents (id, tenant_id, first_name, last_name, email, phone, default_appointment_duration, buffer_time_minutes, max_appointments_per_day, is_active, created_at)
VALUES 
  ('agent_001', 'tenant_demo_001', 'Sophie', 'Dubois', 'sophie.dubois@agence-demo.fr', '+33601020304', 60, 15, 8, 1, datetime('now')),
  ('agent_002', 'tenant_demo_001', 'Marc', 'Leroy', 'marc.leroy@agence-demo.fr', '+33605060708', 45, 10, 10, 1, datetime('now'));

-- Prospects
INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, created_at)
VALUES 
  ('prospect_001', 'tenant_demo_001', 'Jean', 'Dupont', '+33612345678', 'jean.dupont@email.fr', 'qualified', datetime('now')),
  ('prospect_002', 'tenant_demo_001', 'Marie', 'Martin', '+33698765432', 'marie.martin@email.fr', 'contacted', datetime('now'));

-- Biens immobiliers
INSERT INTO properties (id, tenant_id, type, title, address, city, price, available, created_at)
VALUES 
  ('property_001', 'tenant_demo_001', 'sale', 'Appartement T3 centre-ville', '15 rue de la République', 'Lyon', 350000, 1, datetime('now')),
  ('property_002', 'tenant_demo_001', 'rental', 'Maison 4 pièces avec jardin', '42 avenue des Fleurs', 'Villeurbanne', 1500, 1, datetime('now'));

-- Créneaux de disponibilité (Lundi à Vendredi, 9h-12h et 14h-18h)
INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, is_available, created_at)
VALUES 
  -- Sophie: Lundi à Vendredi
  ('slot_001', 'tenant_demo_001', 'agent_001', 1, '09:00', '12:00', 1, datetime('now')),
  ('slot_002', 'tenant_demo_001', 'agent_001', 1, '14:00', '18:00', 1, datetime('now')),
  ('slot_003', 'tenant_demo_001', 'agent_001', 2, '09:00', '12:00', 1, datetime('now')),
  ('slot_004', 'tenant_demo_001', 'agent_001', 2, '14:00', '18:00', 1, datetime('now')),
  ('slot_005', 'tenant_demo_001', 'agent_001', 3, '09:00', '12:00', 1, datetime('now')),
  ('slot_006', 'tenant_demo_001', 'agent_001', 3, '14:00', '18:00', 1, datetime('now')),
  ('slot_007', 'tenant_demo_001', 'agent_001', 4, '09:00', '12:00', 1, datetime('now')),
  ('slot_008', 'tenant_demo_001', 'agent_001', 4, '14:00', '18:00', 1, datetime('now')),
  ('slot_009', 'tenant_demo_001', 'agent_001', 5, '09:00', '12:00', 1, datetime('now')),
  ('slot_010', 'tenant_demo_001', 'agent_001', 5, '14:00', '18:00', 1, datetime('now')),
  -- Marc: Lundi à Samedi
  ('slot_011', 'tenant_demo_001', 'agent_002', 1, '09:00', '12:00', 1, datetime('now')),
  ('slot_012', 'tenant_demo_001', 'agent_002', 1, '14:00', '18:00', 1, datetime('now')),
  ('slot_013', 'tenant_demo_001', 'agent_002', 6, '09:00', '12:00', 1, datetime('now'));

-- Blocages de calendrier
INSERT INTO calendar_blocks (id, tenant_id, agent_id, start_datetime, end_datetime, reason, title, created_at)
VALUES 
  ('block_001', 'tenant_demo_001', 'agent_001', datetime('now', '+5 days', '10:00'), datetime('now', '+5 days', '11:00'), 'meeting', 'Réunion équipe', datetime('now'));
