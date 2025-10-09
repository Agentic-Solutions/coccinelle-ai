-- ============================================
-- COCCINELLE.AI - SEED KNOWLEDGE BASE v2.0
-- Date: 08/10/2025
-- Description: Données de test pour salon de coiffure
-- ============================================

-- ============================================
-- 1. SERVICES (Salon de coiffure Marie)
-- ============================================

INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, currency, category, preparation_time, cleanup_time, display_order) VALUES
  ('service_001', 'tenant_001', 'Coupe Homme', 'Coupe classique avec shampooing et coiffage', 30, 25.00, 'EUR', 'coiffure', 0, 5, 1),
  ('service_002', 'tenant_001', 'Coupe Femme', 'Coupe avec shampooing, soin et brushing', 60, 45.00, 'EUR', 'coiffure', 0, 10, 2),
  ('service_003', 'tenant_001', 'Coloration Complète', 'Coloration racines + longueurs avec soin', 120, 85.00, 'EUR', 'coloration', 10, 15, 3),
  ('service_004', 'tenant_001', 'Mèches', 'Mèches ou balayage avec soin et brushing', 150, 95.00, 'EUR', 'coloration', 10, 15, 4),
  ('service_005', 'tenant_001', 'Brushing', 'Brushing simple après shampooing', 30, 20.00, 'EUR', 'coiffure', 0, 5, 5),
  ('service_006', 'tenant_001', 'Soin Profond', 'Soin capillaire intensif avec massage', 45, 35.00, 'EUR', 'soin', 5, 5, 6),
  ('service_007', 'tenant_001', 'Barbe', 'Taille et entretien de la barbe', 20, 15.00, 'EUR', 'barbier', 0, 5, 7),
  ('service_008', 'tenant_001', 'Forfait Mariée', 'Coiffure de mariage avec essai', 180, 150.00, 'EUR', 'evenement', 15, 10, 8);

-- ============================================
-- 2. AGENT_SERVICES (Compétences Sara)
-- ============================================

-- Sara fait tout sauf le barbier
INSERT INTO agent_services (id, agent_id, service_id, proficiency_level, is_active) VALUES
  ('as_001', 'agent_001', 'service_001', 'expert', 1),
  ('as_002', 'agent_001', 'service_002', 'expert', 1),
  ('as_003', 'agent_001', 'service_003', 'expert', 1),
  ('as_004', 'agent_001', 'service_004', 'expert', 1),
  ('as_005', 'agent_001', 'service_005', 'expert', 1),
  ('as_006', 'agent_001', 'service_006', 'expert', 1),
  ('as_008', 'agent_001', 'service_008', 'expert', 1);

-- ============================================
-- 3. KNOWLEDGE_FAQ (Questions fréquentes)
-- ============================================

INSERT INTO knowledge_faq (id, tenant_id, question, answer, category, keywords, priority, is_active) VALUES
  (
    'faq_001',
    'tenant_001',
    'Utilisez-vous des produits bio ?',
    'Oui ! Nous utilisons exclusivement des produits professionnels bio de la marque Kerastase et L''Oréal Professionnel. Tous nos colorants sont sans ammoniaque et respectueux de votre cuir chevelu.',
    'product',
    '["bio", "produits", "naturel", "kerastase", "professionnel"]',
    10,
    1
  ),
  (
    'faq_002',
    'tenant_001',
    'Quelle est votre politique d''annulation ?',
    'Vous pouvez annuler ou modifier votre rendez-vous jusqu''à 24h avant sans frais. En cas d''annulation tardive (moins de 24h), des frais de 50% du service réservé pourront être appliqués.',
    'policy',
    '["annulation", "modifier", "frais", "politique"]',
    9,
    1
  ),
  (
    'faq_003',
    'tenant_001',
    'Acceptez-vous les paiements par carte ?',
    'Oui, nous acceptons tous les moyens de paiement : carte bancaire, espèces, chèques et paiement mobile (Apple Pay, Google Pay).',
    'payment',
    '["paiement", "carte", "espèces", "cheque"]',
    5,
    1
  ),
  (
    'faq_004',
    'tenant_001',
    'Faites-vous les permanentes ?',
    'Non, nous ne proposons pas de permanentes. Nous sommes spécialisés dans les coupes modernes, les colorations et les soins capillaires naturels.',
    'service',
    '["permanente", "boucles", "frisage"]',
    3,
    1
  ),
  (
    'faq_005',
    'tenant_001',
    'Combien de temps dure une coloration ?',
    'Une coloration complète dure environ 2 heures, incluant la préparation, la pose du produit (30-40 min), le rinçage, le soin et le brushing final.',
    'service',
    '["coloration", "durée", "temps", "combien"]',
    7,
    1
  ),
  (
    'faq_006',
    'tenant_001',
    'Puis-je venir avec mes enfants ?',
    'Oui, les enfants sont les bienvenus ! Nous avons un espace lecture pour les enfants qui accompagnent leurs parents. Pour les coupes enfants, nous proposons un service rapide de 20 minutes.',
    'general',
    '["enfants", "famille", "bébé"]',
    4,
    1
  ),
  (
    'faq_007',
    'tenant_001',
    'Où êtes-vous situés ?',
    'Nous sommes situés au 45 Avenue Victor Hugo, 75016 Paris. Métro ligne 2 station Victor Hugo, ou RER C Pont de Levallois. Un parking public est disponible à 100m.',
    'location',
    '["adresse", "où", "situé", "parking", "métro"]',
    8,
    1
  ),
  (
    'faq_008',
    'tenant_001',
    'Avez-vous des promotions ?',
    'Oui ! Nous proposons 20% de réduction sur la première visite pour les nouveaux clients. Également, le mercredi est notre journée étudiante avec -15% sur toutes les prestations sur présentation d''une carte étudiante.',
    'pricing',
    '["promotion", "réduction", "prix", "offre", "étudiant"]',
    6,
    1
  );

-- ============================================
-- 4. KNOWLEDGE_SNIPPETS (Fragments réutilisables)
-- ============================================

INSERT INTO knowledge_snippets (id, tenant_id, name, content, category, usage_context, variables, is_active) VALUES
  (
    'snippet_001',
    'tenant_001',
    'greeting_standard',
    'Bonjour et bienvenue chez Salon Marie ! Je suis Sara, votre assistante virtuelle. Je suis là pour vous aider à prendre rendez-vous rapidement.',
    'greeting',
    'greeting',
    '[]',
    1
  ),
  (
    'snippet_002',
    'tenant_001',
    'confirmation_rdv',
    'Parfait {{firstName}} ! Votre rendez-vous pour {{serviceName}} est confirmé le {{date}} à {{time}} avec {{agentName}}. Vous recevrez un SMS et un email de confirmation avec tous les détails.',
    'confirmation',
    'booking',
    '["firstName", "serviceName", "date", "time", "agentName"]',
    1
  ),
  (
    'snippet_003',
    'tenant_001',
    'politique_annulation',
    'Notre politique d''annulation est simple : vous pouvez modifier ou annuler gratuitement jusqu''à 24h avant votre rendez-vous. Au-delà, des frais de 50% peuvent s''appliquer.',
    'policy',
    'cancellation',
    '[]',
    1
  ),
  (
    'snippet_004',
    'tenant_001',
    'direction_salon',
    'Nous sommes situés au 45 Avenue Victor Hugo, Paris 16ème. Métro ligne 2 Victor Hugo. Un parking public est disponible rue Copernic à 100m.',
    'location',
    'general',
    '[]',
    1
  ),
  (
    'snippet_005',
    'tenant_001',
    'horaires_ouverture',
    'Nous sommes ouverts du lundi au samedi de 9h à 19h. Fermé le dimanche et jours fériés.',
    'schedule',
    'general',
    '[]',
    1
  );

-- ============================================
-- 5. KNOWLEDGE_DOCUMENTS (Document de test)
-- ============================================

INSERT INTO knowledge_documents (id, tenant_id, source_type, source_url, title, content, content_hash, word_count, chunk_count, metadata, status, is_active) VALUES
  (
    'doc_001',
    'tenant_001',
    'manual',
    NULL,
    'Guide des Services - Salon Marie',
    'Salon Marie est un salon de coiffure haut de gamme situé dans le 16ème arrondissement de Paris. Nous proposons une gamme complète de services capillaires pour hommes et femmes.

NOS SERVICES:

COUPES:
- Coupe Homme (30 min, 25€): Coupe classique ou moderne avec shampooing et coiffage. Notre expertise permet d''adapter la coupe à la forme de votre visage et à votre style de vie.
- Coupe Femme (60 min, 45€): Coupe personnalisée avec shampooing, soin adapté et brushing professionnel.

COLORATIONS:
- Coloration Complète (2h, 85€): Coloration racines et longueurs avec des produits bio sans ammoniaque. Soin post-coloration inclus.
- Mèches et Balayage (2h30, 95€): Technique professionnelle pour un effet naturel et lumineux.

SOINS:
- Brushing Simple (30 min, 20€): Après shampooing, brushing professionnel pour une tenue optimale.
- Soin Profond (45 min, 35€): Soin intensif adapté à votre type de cheveux avec massage du cuir chevelu.

NOS ENGAGEMENTS:
Nous utilisons exclusivement des produits professionnels bio (Kerastase, L''Oréal Professionnel) sans ammoniaque ni parabènes. Tous nos colorants respectent votre cuir chevelu et l''environnement.

POLITIQUE TARIFAIRE:
-20% sur la première visite pour nouveaux clients
-15% le mercredi pour les étudiants (sur présentation carte)
Tous nos tarifs incluent shampooing, soin et coiffage.',
    'hash_doc_001',
    250,
    0,
    '{"type": "guide", "version": "1.0", "author": "Salon Marie"}',
    'completed',
    1
  );

-- ============================================
-- VÉRIFICATION
-- ============================================

SELECT 
  'Seed KB v2.0 créé avec succès!' AS message,
  (SELECT COUNT(*) FROM services) AS services_count,
  (SELECT COUNT(*) FROM agent_services) AS agent_services_count,
  (SELECT COUNT(*) FROM knowledge_faq) AS faq_count,
  (SELECT COUNT(*) FROM knowledge_snippets) AS snippets_count,
  (SELECT COUNT(*) FROM knowledge_documents) AS documents_count;
