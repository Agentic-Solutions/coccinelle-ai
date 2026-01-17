-- Créer un tenant de test pour validation end-to-end
-- Entreprise: "Plomberie Dupont" (artisan)

-- 1. Créer le tenant
INSERT INTO tenants (
  id, company_name, industry, status,
  created_at, updated_at
) VALUES (
  'tenant_test_plomberie',
  'Plomberie Dupont',
  'plomberie',
  'active',
  datetime('now'),
  datetime('now')
);

-- 2. Créer un utilisateur pour ce tenant
INSERT INTO users (
  id, tenant_id, email, name, role, status,
  created_at, updated_at
) VALUES (
  'user_test_plombier',
  'tenant_test_plomberie',
  'contact@plomberie-dupont.fr',
  'Jean Dupont',
  'admin',
  'active',
  datetime('now'),
  datetime('now')
);
