-- Nettoyer toutes les données de test
-- Ordre: du plus dépendant au moins dépendant

-- Appointments
DELETE FROM appointments;

-- Availability slots
DELETE FROM availability_slots;

-- Calls
DELETE FROM calls;

-- Sessions d'onboarding
DELETE FROM onboarding_sessions;

-- Product categories
DELETE FROM product_categories;

-- Prospects
DELETE FROM prospects;

-- Properties
DELETE FROM properties;

-- Agents
DELETE FROM commercial_agents;

-- Tenants (en dernier)
DELETE FROM tenants;

-- Vérification
SELECT 'Cleanup completed' as message;
SELECT 'Tenants: ' || COUNT(*) as result FROM tenants
UNION ALL SELECT 'Agents: ' || COUNT(*) FROM commercial_agents
UNION ALL SELECT 'Categories: ' || COUNT(*) FROM product_categories;
