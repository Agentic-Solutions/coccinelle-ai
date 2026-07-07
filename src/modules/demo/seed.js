/**
 * Jeu de données de référence — Syndic Horizon (compte démo Maze)
 * Source unique pour l'endpoint POST /api/v1/demo/reset
 */

// Tenant démo Maze — SEUL tenant autorisé pour le reset
export const DEMO_TENANT_ID = 'tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk';
export const DEMO_USER_NAME = 'Camille Mercier';

// ═══ CONTACTS (10) — copropriétaires & parties prenantes ═══
export const SEED_PROSPECTS = [
  { id: 'prospect_demo_001', first_name: 'Hélène', last_name: 'Berger', phone: '+33611223344', email: 'h.berger@email.fr', status: 'qualified', source: 'assistant' },
  { id: 'prospect_demo_002', first_name: 'Patrick', last_name: 'Lemoine', phone: '+33622334455', email: 'p.lemoine@email.fr', status: 'qualified', source: 'assistant' },
  { id: 'prospect_demo_003', first_name: 'Sylvie', last_name: 'Marchand', phone: '+33633445566', email: 's.marchand@email.fr', status: 'converted', source: 'assistant' },
  { id: 'prospect_demo_004', first_name: 'André', last_name: 'Rousseau', phone: '+33644556677', email: null, status: 'qualified', source: 'assistant' },
  { id: 'prospect_demo_005', first_name: 'Claire', last_name: 'Fontaine', phone: '+33655667788', email: 'c.fontaine@email.fr', status: 'new', source: 'booking_page' },
  { id: 'prospect_demo_006', first_name: 'Daniel', last_name: 'Petit', phone: '+33666778899', email: null, status: 'qualified', source: 'manual' },
  { id: 'prospect_demo_007', first_name: 'Cabinet Maître', last_name: 'Vasseur', phone: '+33144556677', email: 'contact@vasseur-notaire.fr', status: 'converted', source: 'manual' },
  { id: 'prospect_demo_008', first_name: 'Plomberie', last_name: 'Durand', phone: '+33155667788', email: 'contact@plomberie-durand.fr', status: 'qualified', source: 'manual' },
  { id: 'prospect_demo_009', first_name: 'Nathalie', last_name: 'Roux', phone: '+33677889900', email: 'n.roux@email.fr', status: 'new', source: 'assistant' },
  { id: 'prospect_demo_010', first_name: 'Marc', last_name: 'Fontaine', phone: '+33688990011', email: 'm.fontaine@email.fr', status: 'new', source: 'booking_page' },
];

// ═══ APPELS (5) — contexte copropriété ═══
// Les dates sont calculées dynamiquement (J-1 à J-5) dans resetDemo()
export function buildSeedCalls(tenantId, now) {
  const d = (daysAgo) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - daysAgo);
    dt.setHours(9 + daysAgo, 15, 0, 0);
    return dt.toISOString();
  };

  return [
    {
      id: `call_demo_001`,
      tenant_id: tenantId,
      from_number: '+33611223344',
      to_number: '+33180123456',
      direction: 'inbound',
      status: 'completed',
      duration: 180,
      prospect_id: 'prospect_demo_001',
      transcript: 'Client : Bonjour, je vous appelle parce qu il y a une fuite d eau importante dans la colonne montante du batiment A, au niveau du troisieme etage. Assistant : Bonjour Madame Berger. Je prends note de votre signalement. Nous envoyons un technicien dans les plus brefs delais.',
      created_at: d(1),
      started_at: d(1),
      ended_at: d(1),
    },
    {
      id: `call_demo_002`,
      tenant_id: tenantId,
      from_number: '+33622334455',
      to_number: '+33180123456',
      direction: 'inbound',
      status: 'completed',
      duration: 120,
      prospect_id: 'prospect_demo_002',
      transcript: 'Client : Bonjour, je ne comprends pas le montant de mon appel de charges du trimestre, il a augmente de 15 pourcent. Assistant : Bonjour Monsieur Lemoine. Je vais verifier votre dossier. L augmentation correspond aux travaux de ravalement votes en assemblee generale.',
      created_at: d(2),
      started_at: d(2),
      ended_at: d(2),
    },
    {
      id: `call_demo_003`,
      tenant_id: tenantId,
      from_number: '+33633445566',
      to_number: '+33180123456',
      direction: 'inbound',
      status: 'completed',
      duration: 240,
      prospect_id: 'prospect_demo_003',
      transcript: 'Client : Bonjour, c est Sylvie Marchand du conseil syndical. Je souhaite preparer l ordre du jour de la prochaine assemblee generale. Assistant : Bonjour Madame Marchand. Je vous propose de fixer un rendez-vous avec le gestionnaire pour etablir l ordre du jour ensemble.',
      created_at: d(3),
      started_at: d(3),
      ended_at: d(3),
    },
    {
      id: `call_demo_004`,
      tenant_id: tenantId,
      from_number: '+33180123456',
      to_number: '+33144556677',
      direction: 'outbound',
      status: 'completed',
      duration: 130,
      prospect_id: 'prospect_demo_007',
      transcript: 'Assistant : Bonjour Cabinet Vasseur, je vous contacte au sujet de la transmission de l acte de vente pour le lot 12 de la residence Les Tilleuls. Notaire : Oui, l acte est pret, je vous l envoie par courrier recommande cette semaine.',
      created_at: d(4),
      started_at: d(4),
      ended_at: d(4),
    },
    {
      id: `call_demo_005`,
      tenant_id: tenantId,
      from_number: '+33644556677',
      to_number: '+33180123456',
      direction: 'inbound',
      status: 'completed',
      duration: 95,
      prospect_id: 'prospect_demo_004',
      transcript: 'Client : Bonjour, je suis Andre Rousseau, proprietaire du lot 7. J aurais besoin d une attestation d assurance de l immeuble pour mon locataire. Assistant : Bonjour Monsieur Rousseau. Je prepare l attestation et vous l envoie par email dans la journee.',
      created_at: d(5),
      started_at: d(5),
      ended_at: d(5),
    },
  ];
}

// ═══ CALL SUMMARIES (5) ═══
export function buildSeedCallSummaries(tenantId, now) {
  const d = (daysAgo) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString();
  };

  return [
    { id: 'cs_demo_001', call_id: 'call_demo_001', tenant_id: tenantId, message_count: 4, duration: 180, summary: 'Signalement fuite d eau colonne montante batiment A, 3e etage. Technicien envoye.', sentiment: 'neutral', intent: 'signalement_urgence', appointment_booked: 0, transfer_requested: 0, created_at: d(1) },
    { id: 'cs_demo_002', call_id: 'call_demo_002', tenant_id: tenantId, message_count: 3, duration: 120, summary: 'Question sur augmentation appel de charges. Explication travaux ravalement AG.', sentiment: 'neutral', intent: 'question_charges', appointment_booked: 0, transfer_requested: 0, created_at: d(2) },
    { id: 'cs_demo_003', call_id: 'call_demo_003', tenant_id: tenantId, message_count: 5, duration: 240, summary: 'Preparation ordre du jour assemblee generale avec presidente conseil syndical. RDV fixe.', sentiment: 'positive', intent: 'preparation_ag', appointment_booked: 1, transfer_requested: 0, created_at: d(3) },
    { id: 'cs_demo_004', call_id: 'call_demo_004', tenant_id: tenantId, message_count: 3, duration: 130, summary: 'Appel sortant cabinet notaire pour transmission acte de vente lot 12. Envoi en cours.', sentiment: 'positive', intent: 'suivi_vente', appointment_booked: 0, transfer_requested: 0, created_at: d(4) },
    { id: 'cs_demo_005', call_id: 'call_demo_005', tenant_id: tenantId, message_count: 3, duration: 95, summary: 'Demande attestation assurance immeuble pour locataire lot 7. Envoi par email.', sentiment: 'positive', intent: 'demande_document', appointment_booked: 0, transfer_requested: 0, created_at: d(5) },
  ];
}

// ═══ RENDEZ-VOUS (3) — créneaux futurs ═══
// Calculés dynamiquement pour être dans les 7 prochains jours (sans chevauchement)
export function buildSeedAppointments(tenantId, now) {
  // Trouver le prochain lundi (ou aujourd'hui si on est lundi)
  const base = new Date(now);
  const dayOfWeek = base.getDay();
  const daysToMon = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
  const monday = new Date(base);
  monday.setDate(base.getDate() + daysToMon);

  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);

  const fmt = (d, h, m) => {
    d.setHours(h, m, 0, 0);
    return d.toISOString().replace(/\.\d{3}Z$/, '');
  };

  return [
    {
      id: 'appt_demo_001',
      tenant_id: tenantId,
      prospect_id: 'prospect_demo_003',
      agent_id: 'agent_maze_001',
      type: 'assemblee_generale',
      scheduled_at: fmt(monday, 18, 0),
      duration_minutes: 90,
      management_token: 'tok_demo_ag_001',
      status: 'scheduled',
      notes: 'Assemblee generale annuelle de copropriete — residence Les Tilleuls',
    },
    {
      id: 'appt_demo_002',
      tenant_id: tenantId,
      prospect_id: 'prospect_demo_008',
      agent_id: 'agent_maze_002',
      type: 'visite_technique',
      scheduled_at: fmt(tuesday, 10, 0),
      duration_minutes: 60,
      management_token: 'tok_demo_vt_002',
      status: 'scheduled',
      notes: 'Visite technique toiture batiment C avec entreprise Durand',
    },
    {
      id: 'appt_demo_003',
      tenant_id: tenantId,
      prospect_id: 'prospect_demo_003',
      agent_id: 'agent_maze_001',
      type: 'reunion_conseil',
      scheduled_at: fmt(thursday, 14, 0),
      duration_minutes: 45,
      management_token: 'tok_demo_cs_003',
      status: 'scheduled',
      notes: 'Reunion conseil syndical — point travaux et budget previsionnel',
    },
  ];
}
