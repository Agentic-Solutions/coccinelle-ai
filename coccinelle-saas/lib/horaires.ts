// ─────────────────────────────────────────────────────────────
// Source unique des horaires d'ouverture (format PAR JOUR).
// Utilisé par : onboarding (écriture), settings (lecture/écriture),
// et converti en texte lisible pour le prompt VoixIA {HORAIRES}.
// Stocké dans tenants.horaires (colonne TEXT) en JSON (migration 0067).
// ─────────────────────────────────────────────────────────────

export type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim';

export interface DayHoraire {
  ouvert: boolean;
  debut: string; // "HH:MM"
  fin: string;   // "HH:MM"
}

// Un objet par jour : { lun: {ouvert,debut,fin}, ..., dim: {...} }
export type Horaires = Record<DayKey, DayHoraire>;

export const DAY_KEYS: DayKey[] = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export const DAY_LABELS: { key: DayKey; label: string; short: string }[] = [
  { key: 'lun', label: 'Lundi', short: 'Lun' },
  { key: 'mar', label: 'Mardi', short: 'Mar' },
  { key: 'mer', label: 'Mercredi', short: 'Mer' },
  { key: 'jeu', label: 'Jeudi', short: 'Jeu' },
  { key: 'ven', label: 'Vendredi', short: 'Ven' },
  { key: 'sam', label: 'Samedi', short: 'Sam' },
  { key: 'dim', label: 'Dimanche', short: 'Dim' },
];

// Créneaux de 30 min sur 24h ("00:00" … "23:30")
export const HEURES: string[] = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

export const DEFAULT_HORAIRES: Horaires = {
  lun: { ouvert: true, debut: '09:00', fin: '18:00' },
  mar: { ouvert: true, debut: '09:00', fin: '18:00' },
  mer: { ouvert: true, debut: '09:00', fin: '18:00' },
  jeu: { ouvert: true, debut: '09:00', fin: '18:00' },
  ven: { ouvert: true, debut: '09:00', fin: '18:00' },
  sam: { ouvert: false, debut: '10:00', fin: '12:00' },
  dim: { ouvert: false, debut: '09:00', fin: '18:00' },
};

function cloneDefault(): Horaires {
  return JSON.parse(JSON.stringify(DEFAULT_HORAIRES));
}

function formatH(t: string): string {
  const [h, m] = (t || '').split(':');
  if (h === undefined) return t;
  return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`;
}

// Texte lisible groupant les jours consécutifs à horaires identiques.
// Ex : "Lun-Ven 9h-18h, Sam 10h-12h, Dim fermé"
export function horairesToText(h: Horaires): string {
  if (!h) return '';
  const sig = (d: DayHoraire) => `${d.ouvert}|${d.debut}|${d.fin}`;
  const labelFor = (from: number, to: number) =>
    from === to ? DAY_LABELS[from].short : `${DAY_LABELS[from].short}-${DAY_LABELS[to].short}`;

  const parts: string[] = [];
  let i = 0;
  while (i < DAY_KEYS.length) {
    const day = h[DAY_KEYS[i]] || DEFAULT_HORAIRES[DAY_KEYS[i]];
    let j = i;
    while (
      j + 1 < DAY_KEYS.length &&
      sig(h[DAY_KEYS[j + 1]] || DEFAULT_HORAIRES[DAY_KEYS[j + 1]]) === sig(day)
    ) {
      j++;
    }
    if (day.ouvert) {
      parts.push(`${labelFor(i, j)} ${formatH(day.debut)}-${formatH(day.fin)}`);
    } else {
      parts.push(`${labelFor(i, j)} fermé`);
    }
    i = j + 1;
  }
  return parts.join(', ');
}

type LegacyHoraires = { days?: Record<string, boolean>; start?: string; end?: string };

// Parse tolérant : gère JSON par-jour, JSON legacy {days,start,end},
// texte brut legacy (onboarding < juillet 2026), null/undefined.
// Ne jette JAMAIS (évite le 500 settings sur d'anciennes valeurs).
export function parseHoraires(raw: unknown): Horaires {
  if (raw == null || raw === '') return cloneDefault();

  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      // Ancienne valeur en texte brut ("Lun-Ven 9h-18h") : non parsable → défaut.
      return cloneDefault();
    }
  }

  if (typeof value !== 'object' || value === null) return cloneDefault();
  const obj = value as Record<string, unknown>;

  // Format par-jour déjà correct ?
  if (DAY_KEYS.some((k) => typeof obj[k] === 'object' && obj[k] !== null)) {
    const result = cloneDefault();
    for (const k of DAY_KEYS) {
      const d = obj[k] as Partial<DayHoraire> | undefined;
      if (d && typeof d === 'object') {
        result[k] = {
          ouvert: typeof d.ouvert === 'boolean' ? d.ouvert : result[k].ouvert,
          debut: typeof d.debut === 'string' ? d.debut : result[k].debut,
          fin: typeof d.fin === 'string' ? d.fin : result[k].fin,
        };
      }
    }
    return result;
  }

  // Format legacy {days, start, end} (settings avant juillet 2026)
  const legacy = value as LegacyHoraires;
  if (legacy.days || legacy.start || legacy.end) {
    const result = cloneDefault();
    for (const k of DAY_KEYS) {
      result[k] = {
        ouvert: legacy.days ? Boolean(legacy.days[k]) : result[k].ouvert,
        debut: legacy.start || result[k].debut,
        fin: legacy.end || result[k].fin,
      };
    }
    return result;
  }

  return cloneDefault();
}
