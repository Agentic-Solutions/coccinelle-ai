-- Migration 0063: Demo data for task system
-- Task types (syndic, notaire, medecin, avocat) + demo team + rules + tasks

-- ═══ Task Types — Syndic ═══
INSERT OR REPLACE INTO task_types (id, tenant_id, secteur, name, description, keywords, priority, default_assignee_role)
VALUES
('tt_syndic_sinistre', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'syndic', 'Déclaration sinistre', 'Sinistre, dégât des eaux, incendie, dégradation', 'sinistre,fuite,dégât,eau,incendie,dégradation,urgence,plafond,inondation', 'high', 'responsable_sinistres'),
('tt_syndic_charges', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'syndic', 'Contestation charges/facture', 'Contestation de charges, facture incomprise', 'contestation,facture,charge,désaccord,trop cher,erreur,montant', 'normal', 'gestionnaire_comptable'),
('tt_syndic_travaux', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'syndic', 'Demande travaux', 'Demande de travaux, réparation, entretien', 'travaux,réparation,panne,ascenseur,chauffage,entretien,gardien', 'normal', 'responsable_technique'),
('tt_syndic_ag', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'syndic', 'Question assemblée générale', 'Questions AG, convocation, vote, résolution', 'assemblée,AG,vote,convocation,résolution,procès-verbal,ordre du jour', 'low', 'gestionnaire_copropriete');

-- ═══ Task Types — Notaire ═══
INSERT OR REPLACE INTO task_types (id, tenant_id, secteur, name, description, keywords, priority, default_assignee_role)
VALUES
('tt_notaire_vente', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'notaire', 'Acte de vente', 'Vente immobilière, compromis, acte authentique', 'vente,achat,compromis,acte,immobilier,maison,appartement,terrain', 'normal', 'clerc_vente'),
('tt_notaire_succession', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'notaire', 'Succession et héritage', 'Succession, héritage, testament, donation', 'succession,héritage,décès,testament,donation,héritier,legs', 'high', 'clerc_succession'),
('tt_notaire_rdv', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'notaire', 'Prise de rendez-vous', 'RDV consultation, signature acte', 'rendez-vous,rdv,consultation,signature,rencontre,disponible', 'normal', 'secretaire');

-- ═══ Task Types — Médecin ═══
INSERT OR REPLACE INTO task_types (id, tenant_id, secteur, name, description, keywords, priority, default_assignee_role)
VALUES
('tt_medecin_urgence', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'medecin', 'Urgence médicale', 'Urgence, douleur aiguë, symptômes graves', 'urgent,urgence,douleur,grave,fièvre,malaise,thorax,respiration,sang', 'high', 'medecin_garde'),
('tt_medecin_rdv', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'medecin', 'Prise de rendez-vous', 'RDV consultation, renouvellement ordonnance', 'rendez-vous,rdv,consultation,ordonnance,renouvellement,visite', 'normal', 'secretaire_medicale');

-- ═══ Task Types — Avocat ═══
INSERT OR REPLACE INTO task_types (id, tenant_id, secteur, name, description, keywords, priority, default_assignee_role)
VALUES
('tt_avocat_dossier', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'avocat', 'Suivi dossier', 'Avancement dossier, audience, jugement', 'dossier,audience,jugement,tribunal,procédure,avancement,délai', 'normal', 'clerc_avocat'),
('tt_avocat_urgence', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'avocat', 'Urgence juridique', 'Convocation, garde à vue, urgence juridique', 'convocation,garde à vue,urgent,urgence,police,gendarmerie,comparution', 'high', 'avocat_de_garde');

-- ═══ Demo team members ═══
INSERT OR REPLACE INTO commercial_agents (id, tenant_id, first_name, last_name, email, phone, specialties, is_active)
VALUES
('agent_marie', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Marie', 'Dupont', 'marie@syndic-horizon.fr', '+33601020304', 'sinistres', 1),
('agent_pierre', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Pierre', 'Martin', 'pierre@syndic-horizon.fr', '+33602030405', 'comptabilite', 1),
('agent_sophie', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Sophie', 'Bernard', 'sophie@syndic-horizon.fr', '+33603040506', 'copropriete', 1);

-- ═══ Assignment rules ═══
INSERT OR REPLACE INTO assignment_rules (id, tenant_id, task_type_id, assignee_id, assignee_name, priority)
VALUES
('rule_sinistre', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'tt_syndic_sinistre', 'agent_marie', 'Marie Dupont', 1),
('rule_charges', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'tt_syndic_charges', 'agent_pierre', 'Pierre Martin', 1),
('rule_ag', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'tt_syndic_ag', 'agent_sophie', 'Sophie Bernard', 1);

-- ═══ Demo tasks ═══
INSERT OR REPLACE INTO tasks (id, tenant_id, task_type_id, title, description, status, priority, assignee_id, assignee_name, contact_name, contact_phone, source, kb_response, kb_satisfied)
VALUES
('task_demo_001', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'tt_syndic_sinistre', 'Fuite eau — Appt 3B', 'Locataire signale fuite eau salle de bain. Risque dégât des eaux étage inférieur.', 'open', 'high', 'agent_marie', 'Marie Dupont', 'Jean-Pierre Lambert', '+33623456789', 'voixia', 'En cas de fuite, coupez l arrivée d eau sous l évier ou au compteur général.', 0),
('task_demo_002', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'tt_syndic_charges', 'Contestation FAC-2026-0892 (340 euros)', 'Propriétaire conteste facture 340 euros travaux ravalement. KB a expliqué les tantièmes mais client toujours insatisfait.', 'in_progress', 'normal', 'agent_pierre', 'Pierre Martin', 'Robert Martin', '+33634567890', 'voixia', 'La facture FAC-2026-0892 correspond aux travaux de ravalement votés en AG du 15/03/2026. Votre quote-part est calculée selon vos tantièmes (342/10000).', 0),
('task_demo_003', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'tt_syndic_ag', 'Question convocation AG extraordinaire', 'Propriétaire demande si convocation AG extraordinaire reçue. KB a confirmé envoi le 08/05/2026.', 'resolved', 'low', 'agent_sophie', 'Sophie Bernard', 'Martine Lebrun', '+33645678901', 'voixia', 'La convocation a été envoyée le 08/05/2026 par courrier recommandé et email. L AG se tient le 28/05/2026 à 19h.', 1);
