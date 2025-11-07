/**
 * Liste unifiée des secteurs d'activité
 * Utilisée dans Signup ET Onboarding
 */

export const INDUSTRIES = [
  { value: 'real_estate', label: 'Immobilier' },
  { value: 'beauty', label: 'Beauté & Bien-être' },
  { value: 'health', label: 'Santé' },
  { value: 'fitness', label: 'Fitness & Sport' },
  { value: 'education', label: 'Éducation & Formation' },
  { value: 'restaurant', label: 'Restaurant & Hôtellerie' },
  { value: 'automotive', label: 'Automobile' },
  { value: 'travel', label: 'Voyage & Tourisme' },
  { value: 'retail', label: 'Commerce de détail' },
  { value: 'services', label: 'Services aux entreprises' },
  { value: 'construction', label: 'Construction & Travaux' },
  { value: 'home_services', label: 'Services à domicile' },
  { value: 'legal', label: 'Juridique & Comptabilité' },
  { value: 'recruitment', label: 'Recrutement & RH' },
  { value: 'creative', label: 'Créatif & Design' },
  { value: 'marketing', label: 'Marketing & Communication' },
  { value: 'other', label: 'Autre secteur' }
] as const;

export type IndustryValue = typeof INDUSTRIES[number]['value'];
