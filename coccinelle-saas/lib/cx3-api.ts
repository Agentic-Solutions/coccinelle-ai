/**
 * Appels serveur de la page « Mes communications » (chantier CX-3).
 *
 * Fichier séparé de `cx2-api.ts` : ce sont deux chantiers, et `cx2-api` porte
 * déjà 250 lignes de fil de test KB dont cette page n'a aucun usage. La seule
 * fonction partagée — `chargerEtatCanaux` — est importée de là plutôt que
 * recopiée : « Mes canaux » doit dire EXACTEMENT la même chose ici et sur
 * « Mon assistant », sinon deux pages du même produit se contredisent.
 */

import { buildApiUrl, getAuthHeaders } from './config';

export { chargerEtatCanaux } from './cx2-api';
export type { Canal } from './cx2-api';

/** Un message réellement parti, ou réellement reçu. */
export interface Message {
  id: string;
  canal: 'sms' | 'email';
  sens: 'envoye' | 'recu';
  contenu: string;
  /** Type au sens de TYPES_SMS (`shared/sms-booking-link.js`). NULL = avant CX-3. */
  type: string | null;
  /** Étape du voyage client, calculée depuis le type. NULL = inclassable. */
  etape: string | null;
  objet?: string | null;
  /** Statut journalisé d'un e-mail : un envoi échoué n'est pas un envoi. */
  statut?: string | null;
  contact: string | null;
  adresse: string | null;
  date: string;
}

export interface EtapeFrise {
  cle: string;
  titre: string;
  quand: string;
  /** `null` = rien n'est encore parti à cette étape. Pas de spécimen. */
  message: {
    contenu: string;
    type: string;
    date: string;
    contact: string | null;
    adresse: string | null;
  } | null;
}

export interface Frise {
  etapes: EtapeFrise[];
  email: {
    contenu: string;
    objet: string | null;
    statut: string | null;
    adresse: string | null;
    date: string;
  } | null;
  types_connus: string[];
}

async function lire<T>(chemin: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(chemin), { ...init, headers: getAuthHeaders() });
  const corps = await res.json().catch(() => ({}));
  if (!res.ok || corps?.success === false) {
    throw new Error(corps?.error || `Échec de la requête (${res.status})`);
  }
  return corps as T;
}

/** La frise : un message réel par étape du voyage client. */
export async function chargerFrise() {
  return lire<Frise>('/api/v1/communications/frise');
}

/** Les messages, du plus récent au plus ancien. */
export async function chargerMessages(options?: { canal?: 'sms' | 'email'; limite?: number }) {
  const p = new URLSearchParams();
  if (options?.canal) p.set('canal', options.canal);
  if (options?.limite) p.set('limite', String(options.limite));
  const suffixe = p.toString() ? `?${p}` : '';
  return lire<{
    messages: Message[];
    total: number;
    par_canal: { sms: number; email: number };
  }>(`/api/v1/communications${suffixe}`);
}
