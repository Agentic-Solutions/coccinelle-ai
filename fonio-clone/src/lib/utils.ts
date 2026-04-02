import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Combiner les classes Tailwind intelligemment
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Formater un numéro de téléphone pour l'affichage
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  // Format français: +33 6 12 34 56 78
  if (phone.startsWith('+33')) {
    const digits = phone.replace('+33', '0')
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  return phone
}

// Formater une durée en secondes → "2m 34s"
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}m ${secs}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

// Formater une date relative (il y a 5 min, hier, etc.)
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'À l\'instant'
  if (diffMins < 60) return `Il y a ${diffMins}min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return d.toLocaleDateString('fr-FR')
}

// Formater un montant en euros
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Tronquer un texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Générer les initiales d'un nom
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Couleurs de statut par type
// Couvre tous les statuts utilisés dans les interfaces de database.ts
const STATUS_COLORS: Record<string, string> = {
  // Appels
  ringing: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  voicemail: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',

  // Contacts
  new: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  qualified: 'bg-indigo-100 text-indigo-800',
  customer: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',

  // SMS
  queued: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  received: 'bg-gray-100 text-gray-800',

  // Organisation / Utilisateur / Numéro / Abonnement
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  invited: 'bg-blue-100 text-blue-800',
  suspended: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
  released: 'bg-gray-100 text-gray-800',
  past_due: 'bg-orange-100 text-orange-800',
  trialing: 'bg-blue-100 text-blue-800',
} as const

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'
}
