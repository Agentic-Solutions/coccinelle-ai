/**
 * Appels serveur des deux pages du chantier CX-2.
 *
 * Rassemblés ici plutôt que dispersés dans les composants : ces pages font une
 * douzaine d'appels et la moitié se REJOUENT (une bulle est rejouée après
 * chaque correction). Un fetch recopié dans trois composants finit toujours par
 * diverger sur un en-tête ou un chemin.
 *
 * Point important : le fil de test tape `/voixia/knowledge`, la VRAIE route de
 * l'agent vocal — qui accepte le JWT du dashboard en plus de la clé serveur.
 * Ce que la page affiche est donc littéralement ce que l'assistant dira au
 * téléphone, pas une simulation.
 */

import { buildApiUrl, getAuthHeaders } from './config';

export interface SourceReponse {
  type?: string;
  document_id?: string | null;
  chunk_id?: string | null;
  titre?: string | null;
  libelle?: string | null;
  prix?: string | null;
  ligne?: number | null;
  modifiable?: boolean;
  label?: string | null;
}

export interface ReponseAssistant {
  answer: string | null;
  found: boolean;
  ambiguous?: boolean;
  source: SourceReponse | null;
}

export interface Suggestion { id: string; label: string; famille?: string }

export interface DocumentKb {
  id: string;
  title: string;
  url?: string | null;
  sourceType?: string | null;
  content?: string;
  category?: string | null;
  /** > 0 = document tabulaire, porteur de fiches. Cible d'un import. */
  chunkCount?: number;
  created_at?: string;
}

export interface Modification {
  version_id: number;
  document_id: string;
  document_titre: string;
  version: number;
  motif: string;
  date: string;
  document_actif: boolean;
  resume: { libelle: string | null; avant: string | null; apres: string | null; type: string } | null;
}

async function lire<T>(chemin: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(chemin), { ...init, headers: getAuthHeaders() });
  const corps = await res.json().catch(() => ({}));
  if (!res.ok || corps?.success === false) {
    throw new Error(corps?.error || `Échec de la requête (${res.status})`);
  }
  return corps as T;
}

/** Pose une question à l'assistant, exactement comme le ferait un client. */
export async function demander(question: string): Promise<ReponseAssistant> {
  const r = await lire<any>('/api/v1/voixia/knowledge', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  return {
    answer: r.answer ?? null,
    found: !!r.found,
    ambiguous: !!r.ambiguous,
    source: r.source ?? null,
  };
}

export async function chargerSuggestions(exclure: string[] = []) {
  const q = exclure.length ? `?exclure=${encodeURIComponent(exclure.join(','))}` : '';
  return lire<{
    suggestions: Suggestion[];
    restantes: number;
    total: number;
    fiches: number;
    categories: { label: string; count: number }[];
  }>(`/api/v1/knowledge/suggestions${q}`);
}

/**
 * Corrige une valeur. Le serveur réécrit LA LIGNE du document puis reconstruit
 * les fiches : la correction survit à une ré-ingestion, ce qu'une écriture dans
 * le chunk ne ferait pas.
 */
export async function corrigerFiche(chunkId: string, champs: { prix?: string; libelle?: string; details?: string }) {
  return lire<{ ligne_avant: string; ligne_apres: string; fiches: number }>(
    `/api/v1/knowledge/fiches/${encodeURIComponent(chunkId)}`,
    { method: 'PATCH', body: JSON.stringify(champs) },
  );
}

export async function supprimerFiche(chunkId: string) {
  return lire<{ document_id: string; fiches: number }>(
    `/api/v1/knowledge/fiches/${encodeURIComponent(chunkId)}`,
    { method: 'DELETE' },
  );
}

export async function listerDocuments() {
  return lire<{ documents: DocumentKb[]; count: number }>('/api/v1/knowledge/documents');
}

export async function remplacerDocument(id: string, content: string) {
  return lire<{ fiches: number | null }>(`/api/v1/knowledge/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export async function ajouterDocument(title: string, content: string) {
  return lire<{ document: DocumentKb }>('/api/v1/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify({ title, content, sourceType: 'text' }),
  });
}

export async function supprimerDocument(id: string) {
  return lire<{ message: string }>(`/api/v1/knowledge/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function restaurerDocument(id: string) {
  return lire<{ restaure: boolean }>(`/api/v1/knowledge/documents/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  });
}

export async function listerSupprimees() {
  return lire<{ documents: (DocumentKb & { deleted_at: string })[]; count: number; fenetre_jours: number }>(
    '/api/v1/knowledge/deleted',
  );
}

export async function listerHistorique(limite = 5) {
  return lire<{ modifications: Modification[]; count: number }>(
    `/api/v1/knowledge/history?limite=${limite}`,
  );
}

export async function restaurerVersion(versionId: number) {
  return lire<{ document_id: string; fiches: number }>(
    `/api/v1/knowledge/versions/${versionId}/restore`, { method: 'POST' },
  );
}

/** Aperçu d'un import — AUCUNE écriture, c'est tout l'intérêt du bandeau diff. */
export async function previsualiser(content: string, documentId?: string) {
  return lire<{
    structure: string;
    fiches: { libelle: string; prix: string; details: string }[];
    count: number;
    modifications: { libelle: string; avant: string | null; apres: string | null; type: string }[];
    prix_modifies: number;
  }>('/api/v1/knowledge/preview', {
    method: 'POST',
    body: JSON.stringify({ content, document_id: documentId }),
  });
}

export async function importerDepuisSite(startUrl: string, maxPages = 5) {
  return lire<{ pages: { url: string; title: string }[] }>('/api/v1/knowledge/crawl', {
    method: 'POST',
    body: JSON.stringify({ startUrl, maxPages }),
  });
}

export interface ConfigAssistant {
  company: string;
  sector: string;
  /** Secteur ramene aux 14 cles canoniques — c'est LUI qui choisit le prefixe metier
   *  du greeting (« Garage … », « Cabinet … »). `sector` peut porter un alias. */
  sector_normalise: string;
  agent_name: string;
  /** La phrase EXACTE que l'agent prononcera, construite par le backend.
   *  La page garde un apercu vivant local (`lib/greeting.ts`) pour la mettre a jour
   *  pendant la frappe ; les deux sont verrouillees par `scripts/test_greeting.mjs`. */
  greeting: string;
  voice_id: string | null;
  transfer_number: string;
  transfer_enabled: boolean;
  after_hours_behavior: 'message' | 'horaires';
  horaires: Record<string, { ouvert: boolean; debut: string; fin: string }>;
  phone_verified: boolean;
  trial_phone: string;
  scenarios: { lieu: string; demande: string };
  prompt: { id: number; version: number } | null;
  prompt_regenere?: boolean;
}

export interface Canal {
  type: 'phone' | 'sms' | 'email' | 'whatsapp' | string;
  /** Le canal FONCTIONNE — constaté, jamais déclaré. */
  actif: boolean;
  /** Gelé et annoncé comme tel : ni actif, ni en panne. */
  bientot?: boolean;
  /** `numero_dedie` · `numero_essai` · `plateforme` · `boite_reliee` · … */
  pourquoi?: string;
}

/**
 * État réel des canaux.
 *
 * L'ancienne route `/api/v1/channels` lit `channel_configurations.enabled` —
 * une table à deux lignes dans toute la base, les deux à zéro, que rien dans le
 * chemin fonctionnel n'écrit ni ne relit. Elle affichait « 0 canal actif » à un
 * garage qui avait reçu dix appels. `/etat` constate au lieu de déclarer.
 *
 * `/api/v1/channels` reste utilisée par les pages `channels/*`, qui éditent une
 * configuration : ce n'est pas la même question.
 */
export async function chargerEtatCanaux() {
  return lire<{ canaux: Canal[]; actifs: number }>('/api/v1/channels/etat');
}

/**
 * Fait entendre une voix. Retourne une URL d'objet à révoquer après lecture —
 * la réponse est un flux audio/mpeg, pas du JSON, d'où l'appel direct.
 */
export async function ecouterVoix(voiceId: string, texte: string): Promise<string> {
  const res = await fetch(buildApiUrl('/api/v1/ai/voice-preview'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ voice_id: voiceId, text: texte.slice(0, 300) }),
  });
  if (!res.ok) throw new Error("Impossible de faire entendre cette voix pour l'instant");
  return URL.createObjectURL(await res.blob());
}

export async function chargerConfigAssistant() {
  return lire<ConfigAssistant>('/api/v1/assistant/config');
}

export async function enregistrerConfigAssistant(champs: Partial<ConfigAssistant> & {
  agent_name?: string; company?: string; voice_id?: string; transfer_number?: string;
  transfer_enabled?: boolean; after_hours_behavior?: string; horaires?: unknown;
}) {
  return lire<ConfigAssistant>('/api/v1/assistant/config', {
    method: 'PUT',
    body: JSON.stringify(champs),
  });
}
