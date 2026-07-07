-- Migration 0066 : INDEX UNIQUE PARTIEL — anti double-booking (BUG #009)
-- Empêche deux RDV actifs sur le même créneau pour un même tenant.
-- L'index partiel (WHERE) ne contraint que les RDV actifs :
-- un créneau annulé/no_show/completed peut être re-réservé.
-- Pré-requis : aucun doublon actif (nettoyage effectué 16/05/2026).

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_appointment_slot
ON appointments (tenant_id, scheduled_at)
WHERE status IN ('scheduled', 'confirmed', 'pending');
