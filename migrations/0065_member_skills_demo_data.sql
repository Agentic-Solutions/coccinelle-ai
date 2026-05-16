-- Migration 0065: Demo data for member_skills
-- Links existing demo team members to task types

INSERT OR REPLACE INTO member_skills (id, tenant_id, member_id, skill_type, task_type_id, service_id, priority, is_active)
VALUES
('ms_marie_sinistre', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'agent_marie', 'task', 'tt_syndic_sinistre', NULL, 1, 1),
('ms_marie_travaux', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'agent_marie', 'task', 'tt_syndic_travaux', NULL, 1, 1),
('ms_pierre_charges', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'agent_pierre', 'task', 'tt_syndic_charges', NULL, 1, 1),
('ms_sophie_ag', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'agent_sophie', 'task', 'tt_syndic_ag', NULL, 1, 1),
('ms_sophie_charges', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'agent_sophie', 'task', 'tt_syndic_charges', NULL, 2, 1);
