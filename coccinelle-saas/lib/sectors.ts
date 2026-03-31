/**
 * Liste centralisee des secteurs d'activite
 * Source unique pour : Onboarding, Profil, VoixIA
 */

export const SECTORS = [
  { value: 'generaliste',  label: 'Generaliste' },
  { value: 'immobilier',   label: 'Immobilier' },
  { value: 'automobile',   label: 'Automobile' },
  { value: 'sante',        label: 'Santé' },
  { value: 'dentiste',     label: 'Dentiste' },
  { value: 'restaurant',   label: 'Restaurant & Hôtellerie' },
  { value: 'beaute',       label: 'Beaute & Bien-etre' },
  { value: 'fitness',      label: 'Fitness & Sport' },
  { value: 'education',    label: 'Education & Formation' },
  { value: 'ecommerce',    label: 'E-commerce' },
  { value: 'artisan',      label: 'Artisan & BTP' },
  { value: 'juridique',    label: 'Juridique & Conseil' },
  { value: 'autre',        label: 'Autre secteur' },
] as const;

export type SectorValue = typeof SECTORS[number]['value'];
