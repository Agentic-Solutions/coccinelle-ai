// ═══════════════════════════════════════════════════════════════
// Templates de flows conversationnels — Coccinelle.ai
// Traduits et adaptés depuis les templates Retell AI
// Utilisé dans : configuration/page.tsx, SequenceFlow.tsx, DB voixia_templates
// ═══════════════════════════════════════════════════════════════

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'facile' | 'intermediaire' | 'avance';
  capabilities: string[];
  greeting: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    type: string;
    label: string;
    content: string;
    condition?: string;
    tool?: string;
    delayDuration?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  sourceHandle?: string;
  label?: string;
  style: { strokeWidth: number; stroke: string };
  markerEnd?: { type: string; color: string };
}

// ─── Styles edges ────────────────────────────────────────────

const STD = { strokeWidth: 2, stroke: '#94a3b8' };
const YES = { strokeWidth: 2, stroke: '#22c55e' };
const NO  = { strokeWidth: 2, stroke: '#ef4444' };
const MK_YES = { type: 'arrowclosed', color: '#22c55e' };
const MK_NO  = { type: 'arrowclosed', color: '#ef4444' };

// ═══════════════════════════════════════════════════════════════

export const FLOW_TEMPLATES: FlowTemplate[] = [

  // ─── 1. Réceptionniste Cabinet Médical ──────────────────────
  {
    id: 'tmpl_medical',
    name: 'Réceptionniste Cabinet Médical',
    description: 'Accueil patient, prise de RDV, FAQ santé, transfert praticien.',
    category: 'receptionniste',
    difficulty: 'intermediaire',
    capabilities: ['Phone', 'Calendar', 'BookOpen', 'MessageSquare', 'PhoneForwarded'],
    greeting: 'Bonjour, cabinet {NOM_ENTREPRISE}, comment puis-je vous aider ?',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez le patient. Identifiez-vous comme réceptionniste de {NOM_ENTREPRISE}. Demandez le motif de l\'appel.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Prise de RDV ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'rdv', position: { x: 80, y: 380 }, data: { type: 'rdv', label: 'Prise de RDV', content: 'Vérifiez les disponibilités et proposez un créneau.', tool: 'check_availability + book_appointment' } },
      { id: '4', type: 'knowledge', position: { x: 420, y: 380 }, data: { type: 'knowledge', label: 'FAQ médicale', content: 'Recherchez la réponse dans la base de connaissances.', tool: 'search_knowledge' } },
      { id: '5', type: 'sms', position: { x: 80, y: 540 }, data: { type: 'sms', label: 'Confirmation SMS', content: 'Envoyez un SMS de confirmation avec date, heure et adresse du cabinet.' } },
      { id: '6', type: 'transfer', position: { x: 420, y: 540 }, data: { type: 'transfer', label: 'Transfert praticien', content: 'Transférez vers un praticien si la question nécessite un avis médical.', tool: 'transfer_to_human' } },
      { id: '7', type: 'end', position: { x: 250, y: 700 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et souhaitez bonne journée.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-5', source: '3', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e4-6', source: '4', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e5-7', source: '5', target: '7', type: 'deletable', animated: true, style: STD },
      { id: 'e6-7', source: '6', target: '7', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 2. Réceptionniste Cabinet Juridique ───────────────────
  {
    id: 'tmpl_juridique',
    name: 'Réceptionniste Cabinet Juridique',
    description: 'Accueil multilingue, qualification du dossier, prise de message après-heures.',
    category: 'qualification',
    difficulty: 'avance',
    capabilities: ['Phone', 'UserPlus', 'MessageSquare'],
    greeting: 'Bonjour, cabinet {NOM_ENTREPRISE}, {NOM_AGENT} à votre service.',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez l\'appelant. Identifiez la langue préférée. Demandez s\'il est client existant ou nouveau.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Heures ouvrées ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'call', position: { x: 80, y: 380 }, data: { type: 'call', label: 'Qualification', content: 'Identifiez le domaine juridique : droit des affaires, famille, immobilier, pénal. Recueillez un résumé du dossier.' } },
      { id: '4', type: 'sms', position: { x: 420, y: 380 }, data: { type: 'sms', label: 'Message après-heures', content: 'Envoyez un SMS avec les horaires d\'ouverture et un lien de prise de RDV en ligne.' } },
      { id: '5', type: 'prospect', position: { x: 80, y: 540 }, data: { type: 'prospect', label: 'Créer contact', content: 'Enregistrez le contact avec le résumé du dossier dans le CRM.', tool: 'create_prospect' } },
      { id: '6', type: 'end', position: { x: 250, y: 700 }, data: { type: 'end', label: 'Fin', content: 'Remerciez. Confirmez qu\'un avocat rappellera sous 24h.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-5', source: '3', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e4-6', source: '4', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 3. Support Après-Heures ───────────────────────────────
  {
    id: 'tmpl_apres_heures',
    name: 'Support Après-Heures',
    description: 'Tri urgences, prise de message, confirmation SMS, transfert si critique.',
    category: 'apres_heures',
    difficulty: 'intermediaire',
    capabilities: ['Phone', 'UserPlus', 'MessageSquare', 'PhoneForwarded'],
    greeting: 'Bonsoir, vous êtes bien chez {NOM_ENTREPRISE}. Nos bureaux sont actuellement fermés.',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Informez que les bureaux sont fermés. Demandez s\'il s\'agit d\'une urgence.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Urgence ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'transfer', position: { x: 80, y: 380 }, data: { type: 'transfer', label: 'Transfert urgent', content: 'Transférez immédiatement vers le numéro d\'astreinte.', tool: 'transfer_to_human' } },
      { id: '4', type: 'prospect', position: { x: 420, y: 380 }, data: { type: 'prospect', label: 'Prendre message', content: 'Recueillez nom, téléphone, motif de l\'appel.', tool: 'create_prospect' } },
      { id: '5', type: 'sms', position: { x: 420, y: 540 }, data: { type: 'sms', label: 'SMS confirmation', content: 'Confirmez par SMS que le message a été transmis et qu\'on rappellera dès l\'ouverture.' } },
      { id: '6', type: 'end', position: { x: 250, y: 700 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et souhaitez bonne soirée.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-6', source: '3', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e4-5', source: '4', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 4. Prise de RDV Garage/Automobile ─────────────────────
  {
    id: 'tmpl_garage_rdv',
    name: 'Prise de RDV Garage',
    description: 'Recueil infos véhicule, vérification disponibilités, confirmation SMS.',
    category: 'rdv',
    difficulty: 'facile',
    capabilities: ['Phone', 'Calendar', 'MessageSquare', 'UserPlus'],
    greeting: 'Bonjour, garage {NOM_ENTREPRISE}, comment puis-je vous aider ?',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez l\'appelant. Demandez le type de prestation : entretien, réparation, contrôle technique.' } },
      { id: '2', type: 'call', position: { x: 250, y: 210 }, data: { type: 'call', label: 'Infos véhicule', content: 'Demandez marque, modèle, année, kilométrage. Notez les symptômes si réparation.' } },
      { id: '3', type: 'prospect', position: { x: 250, y: 370 }, data: { type: 'prospect', label: 'Créer contact', content: 'Enregistrez le client avec les infos du véhicule.', tool: 'create_prospect' } },
      { id: '4', type: 'rdv', position: { x: 250, y: 530 }, data: { type: 'rdv', label: 'Disponibilités', content: 'Vérifiez les créneaux disponibles et proposez un RDV.', tool: 'check_availability + book_appointment' } },
      { id: '5', type: 'sms', position: { x: 250, y: 690 }, data: { type: 'sms', label: 'Confirmation SMS', content: 'Envoyez SMS avec date, heure, adresse du garage et type de prestation.' } },
      { id: '6', type: 'end', position: { x: 250, y: 850 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et rappelez d\'apporter la carte grise.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', animated: true, style: STD },
      { id: 'e3-4', source: '3', target: '4', type: 'deletable', animated: true, style: STD },
      { id: 'e4-5', source: '4', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 5. Prise de RDV Transport/VTC ────────────────────────
  {
    id: 'tmpl_transport_rdv',
    name: 'Prise de RDV Transport',
    description: 'Recueil adresses, choix créneau, confirmation de course.',
    category: 'rdv',
    difficulty: 'facile',
    capabilities: ['Phone', 'Calendar', 'MessageSquare'],
    greeting: 'Bonjour, {NOM_ENTREPRISE}, vous souhaitez réserver une course ?',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et demandez s\'il s\'agit d\'une réservation ou d\'une information.' } },
      { id: '2', type: 'call', position: { x: 250, y: 210 }, data: { type: 'call', label: 'Adresses', content: 'Demandez l\'adresse de départ, l\'adresse d\'arrivée, et le nombre de passagers.' } },
      { id: '3', type: 'rdv', position: { x: 250, y: 370 }, data: { type: 'rdv', label: 'Créneau', content: 'Proposez les créneaux disponibles. Confirmez date et heure.', tool: 'check_availability + book_appointment' } },
      { id: '4', type: 'sms', position: { x: 250, y: 530 }, data: { type: 'sms', label: 'Confirmation SMS', content: 'Envoyez SMS récapitulatif : date, heure, départ, arrivée, chauffeur.' } },
      { id: '5', type: 'end', position: { x: 250, y: 690 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et précisez que le chauffeur appellera 5 min avant.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', animated: true, style: STD },
      { id: 'e3-4', source: '3', target: '4', type: 'deletable', animated: true, style: STD },
      { id: 'e4-5', source: '4', target: '5', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 6. Standard Multi-Services ────────────────────────────
  {
    id: 'tmpl_multi_dept',
    name: 'Standard Multi-Services',
    description: 'Routage vers le bon service : commercial, technique, comptabilité.',
    category: 'multi',
    difficulty: 'intermediaire',
    capabilities: ['Phone', 'PhoneForwarded'],
    greeting: 'Bonjour, {NOM_ENTREPRISE}, que puis-je faire pour vous ?',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et identifiez le besoin : commercial, technique ou administratif.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Service identifié ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'call', position: { x: 80, y: 380 }, data: { type: 'call', label: 'Service commercial', content: 'Qualifiez le besoin commercial : nouveau client, devis, information produit.' } },
      { id: '4', type: 'call', position: { x: 250, y: 380 }, data: { type: 'call', label: 'Service technique', content: 'Identifiez le problème technique. Tentez une résolution de premier niveau.' } },
      { id: '5', type: 'transfer', position: { x: 420, y: 380 }, data: { type: 'transfer', label: 'Autre service', content: 'Transférez vers le service approprié : comptabilité, RH, direction.', tool: 'transfer_to_human' } },
      { id: '6', type: 'end', position: { x: 250, y: 560 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et terminez.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-5', source: '2', target: '5', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-6', source: '3', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e4-6', source: '4', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 7. Assistant Paiement et Facturation ──────────────────
  {
    id: 'tmpl_paiement',
    name: 'Assistant Paiement et Facturation',
    description: 'Consultation facture, suivi paiement, confirmation email.',
    category: 'support',
    difficulty: 'avance',
    capabilities: ['Phone', 'BookOpen', 'Mail'],
    greeting: 'Bonjour, service facturation de {NOM_ENTREPRISE}, comment puis-je vous aider ?',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et demandez le numéro de client ou de facture.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Consultation facture ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'knowledge', position: { x: 80, y: 380 }, data: { type: 'knowledge', label: 'Consulter facture', content: 'Recherchez la facture dans la base de données.', tool: 'search_knowledge' } },
      { id: '4', type: 'call', position: { x: 420, y: 380 }, data: { type: 'call', label: 'Suivi paiement', content: 'Guidez le client pour effectuer un paiement : virement, CB, prélèvement.' } },
      { id: '5', type: 'email', position: { x: 420, y: 540 }, data: { type: 'email', label: 'Confirmation email', content: 'Envoyez un email de confirmation de paiement avec le récapitulatif.' } },
      { id: '6', type: 'end', position: { x: 250, y: 700 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et confirmez le délai de traitement.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-6', source: '3', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e4-5', source: '4', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 8. FAQ Santé et Bien-être ─────────────────────────────
  {
    id: 'tmpl_faq_sante',
    name: 'FAQ Santé et Bien-être',
    description: 'Recherche KB, réponse vocale, escalade si non trouvé.',
    category: 'support',
    difficulty: 'facile',
    capabilities: ['Phone', 'BookOpen', 'PhoneForwarded'],
    greeting: 'Bonjour, {NOM_ENTREPRISE}, je suis votre assistant santé. Quelle est votre question ?',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et demandez la question. Ne donnez jamais de conseil médical direct.' } },
      { id: '2', type: 'knowledge', position: { x: 250, y: 210 }, data: { type: 'knowledge', label: 'Recherche KB', content: 'Recherchez la réponse dans la base de connaissances santé.', tool: 'search_knowledge' } },
      { id: '3', type: 'condition', position: { x: 250, y: 380 }, data: { type: 'condition', label: 'Réponse trouvée ?', content: '', condition: 'said_yes' } },
      { id: '4', type: 'call', position: { x: 80, y: 540 }, data: { type: 'call', label: 'Réponse', content: 'Communiquez la réponse de manière claire et compréhensible. Demandez si d\'autres questions.' } },
      { id: '5', type: 'transfer', position: { x: 420, y: 540 }, data: { type: 'transfer', label: 'Transfert spécialiste', content: 'Transférez vers un professionnel de santé pour une réponse personnalisée.', tool: 'transfer_to_human' } },
      { id: '6', type: 'end', position: { x: 250, y: 700 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et rappelez de consulter un professionnel pour tout avis médical.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', animated: true, style: STD },
      { id: 'e3-4', source: '3', target: '4', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e3-5', source: '3', target: '5', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e4-6', source: '4', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 9. Support Technique PME ──────────────────────────────
  {
    id: 'tmpl_support_tech',
    name: 'Support Technique PME',
    description: 'Diagnostic guidé, recherche KB, escalade niveau 2 si non résolu.',
    category: 'support',
    difficulty: 'intermediaire',
    capabilities: ['Phone', 'BookOpen', 'PhoneForwarded', 'UserPlus'],
    greeting: 'Bonjour, support technique {NOM_ENTREPRISE}, décrivez votre problème.',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et demandez une description du problème technique.' } },
      { id: '2', type: 'knowledge', position: { x: 250, y: 210 }, data: { type: 'knowledge', label: 'Diagnostic KB', content: 'Recherchez une solution dans la base de connaissances technique.', tool: 'search_knowledge' } },
      { id: '3', type: 'condition', position: { x: 250, y: 380 }, data: { type: 'condition', label: 'Résolu ?', content: '', condition: 'said_yes' } },
      { id: '4', type: 'call', position: { x: 80, y: 540 }, data: { type: 'call', label: 'Confirmation', content: 'Confirmez que le problème est résolu. Demandez si d\'autres questions.' } },
      { id: '5', type: 'prospect', position: { x: 420, y: 540 }, data: { type: 'prospect', label: 'Créer ticket', content: 'Créez un ticket avec la description du problème pour escalade niveau 2.', tool: 'create_prospect' } },
      { id: '6', type: 'transfer', position: { x: 420, y: 700 }, data: { type: 'transfer', label: 'Escalade N2', content: 'Transférez vers un technicien spécialisé.', tool: 'transfer_to_human' } },
      { id: '7', type: 'end', position: { x: 250, y: 860 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et communiquez le numéro de ticket.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', animated: true, style: STD },
      { id: 'e3-4', source: '3', target: '4', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e3-5', source: '3', target: '5', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e4-7', source: '4', target: '7', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e6-7', source: '6', target: '7', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 10. Réceptionniste Immobilier ─────────────────────────
  {
    id: 'tmpl_immobilier',
    name: 'Réceptionniste Immobilier',
    description: 'Qualification achat/vente/location, prise de RDV visite, création contact.',
    category: 'qualification',
    difficulty: 'intermediaire',
    capabilities: ['Phone', 'Calendar', 'UserPlus', 'MessageSquare'],
    greeting: 'Bonjour, agence {NOM_ENTREPRISE}, {NOM_AGENT} à votre écoute.',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et demandez le type de projet : achat, vente, location ou estimation.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Achat ou location ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'call', position: { x: 80, y: 380 }, data: { type: 'call', label: 'Qualification', content: 'Budget, localisation, surface, nombre de pièces. Une question à la fois.' } },
      { id: '4', type: 'call', position: { x: 420, y: 380 }, data: { type: 'call', label: 'Estimation', content: 'Adresse du bien, surface, type, état général. Proposez une estimation gratuite.' } },
      { id: '5', type: 'prospect', position: { x: 250, y: 540 }, data: { type: 'prospect', label: 'Créer contact', content: 'Enregistrez le contact avec le résumé du projet.', tool: 'create_prospect' } },
      { id: '6', type: 'rdv', position: { x: 250, y: 700 }, data: { type: 'rdv', label: 'RDV visite', content: 'Proposez un rendez-vous avec un conseiller ou une visite.', tool: 'check_availability + book_appointment' } },
      { id: '7', type: 'sms', position: { x: 250, y: 860 }, data: { type: 'sms', label: 'Confirmation SMS', content: 'Envoyez SMS récapitulatif avec date, heure et adresse.' } },
      { id: '8', type: 'end', position: { x: 250, y: 1020 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et souhaitez bon projet immobilier.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-5', source: '3', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e4-5', source: '4', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e6-7', source: '6', target: '7', type: 'deletable', animated: true, style: STD },
      { id: 'e7-8', source: '7', target: '8', type: 'deletable', animated: true, style: STD },
    ],
  },

  // ─── 11. Réceptionniste Restaurant ─────────────────────────
  {
    id: 'tmpl_restaurant',
    name: 'Réceptionniste Restaurant',
    description: 'Réservation table, infos menu et horaires, confirmation SMS.',
    category: 'receptionniste',
    difficulty: 'facile',
    capabilities: ['Phone', 'Calendar', 'BookOpen', 'MessageSquare'],
    greeting: 'Bonjour, restaurant {NOM_ENTREPRISE}, {NOM_AGENT} à votre service.',
    nodes: [
      { id: '1', type: 'call', position: { x: 250, y: 50 }, data: { type: 'call', label: 'Accueil', content: 'Accueillez et demandez s\'il s\'agit d\'une réservation ou d\'une information.' } },
      { id: '2', type: 'condition', position: { x: 250, y: 210 }, data: { type: 'condition', label: 'Réservation ?', content: '', condition: 'said_yes' } },
      { id: '3', type: 'call', position: { x: 80, y: 380 }, data: { type: 'call', label: 'Détails réservation', content: 'Demandez date, heure, nombre de couverts, allergies ou demandes spéciales.' } },
      { id: '4', type: 'knowledge', position: { x: 420, y: 380 }, data: { type: 'knowledge', label: 'Infos menu/horaires', content: 'Recherchez les informations demandées : carte, horaires, accès.', tool: 'search_knowledge' } },
      { id: '5', type: 'rdv', position: { x: 80, y: 540 }, data: { type: 'rdv', label: 'Réserver table', content: 'Vérifiez la disponibilité et confirmez la réservation.', tool: 'check_availability + book_appointment' } },
      { id: '6', type: 'sms', position: { x: 80, y: 700 }, data: { type: 'sms', label: 'Confirmation SMS', content: 'Envoyez SMS avec date, heure, nombre de couverts et adresse du restaurant.' } },
      { id: '7', type: 'end', position: { x: 250, y: 860 }, data: { type: 'end', label: 'Fin', content: 'Remerciez et souhaitez bon appétit.' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', type: 'deletable', animated: true, style: STD },
      { id: 'e2-3', source: '2', target: '3', type: 'deletable', sourceHandle: 'yes', label: 'OUI', style: YES, markerEnd: MK_YES },
      { id: 'e2-4', source: '2', target: '4', type: 'deletable', sourceHandle: 'no', label: 'NON', style: NO, markerEnd: MK_NO },
      { id: 'e3-5', source: '3', target: '5', type: 'deletable', animated: true, style: STD },
      { id: 'e4-7', source: '4', target: '7', type: 'deletable', animated: true, style: STD },
      { id: 'e5-6', source: '5', target: '6', type: 'deletable', animated: true, style: STD },
      { id: 'e6-7', source: '6', target: '7', type: 'deletable', animated: true, style: STD },
    ],
  },
];

// ─── Helper ─────────────────────────────────────────────────

export function getFlowTemplate(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find(t => t.id === id);
}

export function getFlowTemplatesByCategory(category: string): FlowTemplate[] {
  if (category === 'all') return FLOW_TEMPLATES;
  return FLOW_TEMPLATES.filter(t => t.category === category);
}
