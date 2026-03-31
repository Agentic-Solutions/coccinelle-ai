// Source unique des voix ElevenLabs disponibles
// UNIQUEMENT des voix françaises de France (accent parisien/standard)
// Filtre : conversational + customer_support + standard accent + fr
// Vérifié le 31/03/2026 via TTS endpoint ElevenLabs (20/20 OK)
// Utilisé dans : app/dashboard/voixia/page.tsx

export interface VoiceOption {
  id: string;
  label: string;
  gender: 'Féminin' | 'Masculin';
  style: string;
  preview_text: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // ── Voix féminines (10) ────────────────────────────────
  {
    id: 'txtf1EDouKke753vN8SL',
    label: 'Jeanne',
    gender: 'Féminin',
    style: 'Professionnelle',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: '3C1zYzXNXNzrB66ON8rj',
    label: 'Jade',
    gender: 'Féminin',
    style: 'Support client',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'lvQdCgwZfBuOzxyV5pxu',
    label: 'Audia',
    gender: 'Féminin',
    style: 'Amicale et pro',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'nVPCtAFzgyMX3FZKNzH0',
    label: 'Anna',
    gender: 'Féminin',
    style: 'Douce et naturelle',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'MmafIMKg28Wr0yMh8CEB',
    label: 'Laura',
    gender: 'Féminin',
    style: 'Conversationnelle',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'YxrwjAKoUKULGd0g8K9Y',
    label: 'Lucie',
    gender: 'Féminin',
    style: 'Service client',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: '8h85Kr2hDfqe0CKeh7Bq',
    label: 'Isabelle',
    gender: 'Féminin',
    style: 'Mature et chaleureuse',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 't8BrjWUT5Z23DLLBzbuY',
    label: 'Sarah',
    gender: 'Féminin',
    style: 'Conversationnelle',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'O31r762Gb3WFygrEOGh0',
    label: 'Victoria',
    gender: 'Féminin',
    style: 'Jeune et fluide',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'ICk609TItINMseDpChFt',
    label: 'Léa',
    gender: 'Féminin',
    style: 'Éducative et calme',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  // ── Voix masculines (10) ───────────────────────────────
  {
    id: 'aQROLel5sQbj1vuIVi6B',
    label: 'Nicolas',
    gender: 'Masculin',
    style: 'Professionnel',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'zAr1POVZUrr1zkX0T94t',
    label: 'Benjamin',
    gender: 'Masculin',
    style: 'Chaleureux',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'necQJzI1X0vLpdnJteap',
    label: 'Laurent',
    gender: 'Masculin',
    style: 'Rassurant',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'CYR0HqHoZAUmoZsLWPob',
    label: 'Marco',
    gender: 'Masculin',
    style: 'Agent IA',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'VqRZ6BFefek5cPzVm5MN',
    label: 'Vincent',
    gender: 'Masculin',
    style: 'Décontracté',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'fnoOtHjtLbYs6mOpUSdr',
    label: 'Julien',
    gender: 'Masculin',
    style: 'Réaliste',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: '1a3lMdKLUcfcMtvN772u',
    label: 'Antoine',
    gender: 'Masculin',
    style: 'Expressif',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'jUHQdLfy668sllNiNTSW',
    label: 'Clément',
    gender: 'Masculin',
    style: 'Calme',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'OOiDJrD1goukqfTpiySr',
    label: 'Greg',
    gender: 'Masculin',
    style: 'Parisien naturel',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
  {
    id: 'jfEwztGDkpbpy89xeku6',
    label: 'Steve',
    gender: 'Masculin',
    style: 'Doux et posé',
    preview_text: 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
  },
];
