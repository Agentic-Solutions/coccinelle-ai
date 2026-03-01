-- Migration: Add missing indexes for performance optimization
-- Date: 2026-03-01

-- Prospects: tenant_id is used in every query
CREATE INDEX IF NOT EXISTS idx_prospects_tenant ON prospects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_prospects_created ON prospects(tenant_id, created_at DESC);

-- Appointments: frequently filtered by tenant, agent, date
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(tenant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(tenant_id, status);

-- Calls: queried by tenant
CREATE INDEX IF NOT EXISTS idx_calls_tenant ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(tenant_id, created_at DESC);

-- Sessions: token lookup is critical for auth
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Users: email lookup for login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Tenants: slug lookup
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Audit logs: tenant + date for filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);

-- Channel configurations: tenant + type
CREATE INDEX IF NOT EXISTS idx_channel_configs_tenant ON channel_configurations(tenant_id, channel_type);

-- Availability slots: agent + day
CREATE INDEX IF NOT EXISTS idx_availability_agent_day ON availability_slots(tenant_id, day_of_week);

-- Tenant role permissions: composite lookup
CREATE INDEX IF NOT EXISTS idx_trp_lookup ON tenant_role_permissions(tenant_id, role, permission_code);
