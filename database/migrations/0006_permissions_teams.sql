-- Migration: Système de Permissions + Équipes Multi-Tenant
-- Date: 10 janvier 2026

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_role_permissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  granted INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, role, permission_code)
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  manager_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  user_id TEXT,
  role_in_team TEXT DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_role_permissions_tenant ON tenant_role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

INSERT OR IGNORE INTO permissions (id, code, name, description, category) VALUES
  ('perm_001', 'view_all_stats', 'Voir toutes les statistiques', 'Accès aux stats globales', 'stats'),
  ('perm_002', 'view_own_stats', 'Voir ses statistiques', 'Accès à ses propres stats', 'stats'),
  ('perm_003', 'manage_employees', 'Gérer les employés', 'Créer, modifier, supprimer des employés', 'employees'),
  ('perm_004', 'view_all_agendas', 'Voir tous les agendas', 'Accès aux agendas de tous', 'agenda'),
  ('perm_005', 'view_own_agenda', 'Voir son agenda', 'Accès à son propre agenda', 'agenda'),
  ('perm_006', 'modify_all_appointments', 'Modifier tous les RDV', 'Modifier les RDV de tous', 'agenda'),
  ('perm_007', 'modify_own_appointments', 'Modifier ses RDV', 'Modifier ses propres RDV', 'agenda'),
  ('perm_008', 'manage_services', 'Gérer les services/produits', 'Créer, modifier les services', 'services'),
  ('perm_009', 'manage_tenant_settings', 'Gérer les paramètres', 'Modifier les paramètres du tenant', 'settings'),
  ('perm_010', 'view_financial_data', 'Voir les données financières', 'Accès aux rapports financiers', 'finance');
