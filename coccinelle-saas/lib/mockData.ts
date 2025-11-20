// Données de démo pour développement local

export const mockTenant = {
  id: 'tenant_demo_001',
  name: 'Salon Marie Paris',
  industry: 'beauty',
  phone: '+33 1 42 00 00 00',
  address: '12 rue de Charonne',
  city: 'Paris',
  country: 'France',
  website: 'https://salon-marie.example.com',
  logo: null,
  color: '#ff6b6b',
  saraPhone: '+33939035761'
};

export const mockServices = [
  {
    id: 'service_001',
    name: 'Coupe + Brushing',
    description: 'Coupe de cheveux avec brushing professionnel',
    duration_minutes: 60,
    price: 45.00,
    currency: 'EUR'
  },
  {
    id: 'service_002',
    name: 'Coloration',
    description: 'Coloration complète avec soin',
    duration_minutes: 120,
    price: 85.00,
    currency: 'EUR'
  },
  {
    id: 'service_003',
    name: 'Mèches',
    description: 'Mèches + brushing',
    duration_minutes: 90,
    price: 65.00,
    currency: 'EUR'
  }
];

export const mockSlots = [
  {
    agentId: 'agent_001',
    agentName: 'Sophie Martin',
    datetime: '2025-11-15T09:00:00',
    available: true
  },
  {
    agentId: 'agent_001',
    agentName: 'Sophie Martin',
    datetime: '2025-11-15T09:30:00',
    available: true
  },
  {
    agentId: 'agent_001',
    agentName: 'Sophie Martin',
    datetime: '2025-11-15T10:00:00',
    available: true
  },
  {
    agentId: 'agent_002',
    agentName: 'Julie Dupont',
    datetime: '2025-11-15T10:30:00',
    available: true
  },
  {
    agentId: 'agent_002',
    agentName: 'Julie Dupont',
    datetime: '2025-11-15T11:00:00',
    available: true
  },
  {
    agentId: 'agent_001',
    agentName: 'Sophie Martin',
    datetime: '2025-11-15T14:00:00',
    available: true
  },
  {
    agentId: 'agent_002',
    agentName: 'Julie Dupont',
    datetime: '2025-11-15T14:30:00',
    available: true
  },
  {
    agentId: 'agent_001',
    agentName: 'Sophie Martin',
    datetime: '2025-11-15T15:00:00',
    available: true
  }
];

export const mockDocuments = [
  { id: 'doc_001', title: 'Guide des services', created_at: '2025-10-24T10:00:00Z' },
  { id: 'doc_002', title: 'Horaires et tarifs', created_at: '2025-10-26T10:00:00Z' },
  { id: 'doc_003', title: 'Politique d\'annulation', created_at: '2025-10-29T10:00:00Z' }
];

export const mockCalls = Array.from({ length: 40 }, (_, i) => ({
  id: `call_${String(i + 1).padStart(3, '0')}`,
  call_id: `vapi_${String(i + 1).padStart(3, '0')}`,
  status: i < 30 ? 'completed' : 'failed',
  duration_seconds: 60 + Math.floor(Math.random() * 300),
  cost_usd: (0.15 + Math.random() * 0.6).toFixed(2),
  prospect_name: i % 2 === 0 ? `Client ${i + 1}` : null,
  phone_number: i % 2 === 0 ? `+33 6 ${String(i).padStart(2, '0')} ${String(i).padStart(2, '0')} ${String(i).padStart(2, '0')} ${String(i).padStart(2, '0')}` : null,
  appointment_created: i < 15 ? 1 : 0,
  created_at: new Date(Date.now() - (40 - i) * 24 * 60 * 60 * 1000).toISOString()
}));

export const mockAppointments = [
  {
    id: 'appt_001',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_001',
    agent_id: 'agent_001',
    scheduled_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'confirmed',
    notes: 'Première visite',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    prospect_name: 'Emma Bernard',
    prospect_phone: '+33 6 11 11 11 11',
    agent_name: 'Sophie Martin'
  },
  {
    id: 'appt_002',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_002',
    agent_id: 'agent_002',
    scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 120,
    status: 'confirmed',
    notes: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    prospect_name: 'Lucas Petit',
    prospect_phone: '+33 6 22 22 22 22',
    agent_name: 'Julie Dupont'
  },
  {
    id: 'appt_003',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_003',
    agent_id: 'agent_001',
    scheduled_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'completed',
    notes: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    prospect_name: 'Léa Roux',
    prospect_phone: '+33 6 33 33 33 33',
    agent_name: 'Sophie Martin'
  },
  {
    id: 'appt_004',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_004',
    agent_id: 'agent_002',
    scheduled_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 90,
    status: 'completed',
    notes: 'Cliente régulière',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    prospect_name: 'Manon Lefebvre',
    prospect_phone: '+33 6 77 77 77 77',
    agent_name: 'Julie Dupont'
  },
  {
    id: 'appt_005',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_005',
    agent_id: 'agent_001',
    scheduled_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'cancelled',
    notes: 'Annulé par le client',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    prospect_name: 'Jade Girard',
    prospect_phone: '+33 6 99 99 99 99',
    agent_name: 'Sophie Martin'
  },
  {
    id: 'appt_006',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_006',
    agent_id: 'agent_002',
    scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'no_show',
    notes: 'Client absent',
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    prospect_name: 'Tom Rousseau',
    prospect_phone: '+33 6 11 33 55 77',
    agent_name: 'Julie Dupont'
  },
  {
    id: 'appt_007',
    tenant_id: 'tenant_demo_001',
    prospect_id: 'prospect_007',
    agent_id: 'agent_001',
    scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 120,
    status: 'scheduled',
    notes: null,
    created_at: new Date(Date.now()).toISOString(),
    prospect_name: 'Alice Dupuis',
    prospect_phone: '+33 6 11 22 33 44',
    agent_name: 'Sophie Martin'
  }
];

export const mockStats = {
  total_calls: 40,
  completed_calls: 30,
  appointments_created: 15,
  conversion_rate: '37.5%',
  avg_duration_seconds: 165,
  total_cost_usd: '12.45'
};

export const mockProspects = [
  { id: 'prospect_001', first_name: 'Emma', last_name: 'Bernard', phone: '+33 6 11 11 11 11', email: 'emma.bernard@example.com', status: 'qualified' },
  { id: 'prospect_002', first_name: 'Lucas', last_name: 'Petit', phone: '+33 6 22 22 22 22', email: 'lucas.petit@example.com', status: 'new' },
  { id: 'prospect_003', first_name: 'Léa', last_name: 'Roux', phone: '+33 6 33 33 33 33', email: 'lea.roux@example.com', status: 'qualified' },
  { id: 'prospect_004', first_name: 'Noah', last_name: 'Moreau', phone: '+33 6 44 44 44 44', email: 'noah.moreau@example.com', status: 'contacted' },
  { id: 'prospect_005', first_name: 'Chloé', last_name: 'Simon', phone: '+33 6 55 55 55 55', email: 'chloe.simon@example.com', status: 'qualified' }
];

export const mockAgents = [
  { id: 'agent_001', first_name: 'Sophie', last_name: 'Martin', email: 'sophie@salon-marie.fr' },
  { id: 'agent_002', first_name: 'Julie', last_name: 'Dupont', email: 'julie@salon-marie.fr' }
];

// Mode démo activé si l'URL contient ?demo=true ou si on est en localhost ET que NEXT_PUBLIC_USE_REAL_API n'est pas true
export const isDemoMode = () => {
  if (typeof window === 'undefined') return false;

  // Si l'env variable force l'API réelle, désactiver le mode démo
  if (process.env.NEXT_PUBLIC_USE_REAL_API === 'true') {
    return false;
  }

  return window.location.hostname === 'localhost' || window.location.search.includes('demo=true');
};
