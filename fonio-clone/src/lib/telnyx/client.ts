// ═══════════════════════════════════════
// CLIENT TELNYX - Configuration principale
// ═══════════════════════════════════════
// Utilisé côté serveur uniquement (API Routes)
// Documentation : https://developers.telnyx.com
// SDK v6.29.7 — méthodes typées :
//   calls.dial(), calls.actions.*, messages.send()

import { Telnyx } from 'telnyx'
import type { TelnyxAvailableNumber } from '@/types/telnyx'
import { getEnv } from '../db'

// ═══════════════════════════════════════
// INITIALISATION LAZY DU CLIENT
// ═══════════════════════════════════════
// getEnv() nécessite le contexte de requête Cloudflare,
// donc on initialise le client à la première utilisation

function getTelnyxClient(): Telnyx {
  const apiKey = String(getEnv('TELNYX_API_KEY') || '')
  return new Telnyx({ apiKey })
}

export default getTelnyxClient

// ═══════════════════════════════════════
// TYPES INTERNES
// ═══════════════════════════════════════

// Options de recherche de numéros
interface SearchAvailableNumbersOptions {
  countryCode: string       // 'FR', 'US', etc.
  type?: 'local' | 'mobile' | 'toll_free' | 'national' | 'shared_cost'
  limit?: number
  contains?: string         // Recherche par pattern (ex: "06")
}

// Options pour créer un appel
interface MakeCallOptions {
  from: string              // Numéro Telnyx (format E.164)
  to: string                // Numéro de destination
  connectionId: string      // ID de la connexion Telnyx
  webhookUrl?: string       // URL pour les événements de l'appel
  clientState?: string      // Données custom (base64)
}

// Options pour collecter des touches DTMF
interface GatherDTMFOptions {
  audioUrl?: string         // Audio à jouer pendant la collecte
  maxDigits?: number        // Nombre max de touches
  timeoutSeconds?: number   // Temps d'attente
  terminatingDigit?: string // Touche de fin (#)
}

// Options pour envoyer un SMS
interface SendSMSOptions {
  from: string              // Numéro Telnyx (format E.164)
  to: string                // Numéro de destination
  text: string              // Contenu du message
  messagingProfileId?: string
}

// Options pour envoyer un MMS
interface SendMMSOptions {
  from: string
  to: string
  text: string
  mediaUrls: string[]       // URLs des médias (images, etc.)
  messagingProfileId?: string
}

// ═══════════════════════════════════════
// NUMÉROS DE TÉLÉPHONE
// ═══════════════════════════════════════

// Rechercher des numéros disponibles à l'achat
export async function searchAvailableNumbers(
  options: SearchAvailableNumbersOptions
): Promise<TelnyxAvailableNumber[]> {
  try {
    const client = getTelnyxClient()
    const result = await client.availablePhoneNumbers.list({
      filter: {
        country_code: options.countryCode,
        phone_number_type: options.type ?? 'local',
        limit: options.limit ?? 10,
        ...(options.contains ? { phone_number: { contains: options.contains } } : {}),
      },
    })
    // Mapper la réponse SDK vers notre type interne
    const data = (result as unknown as { data?: TelnyxAvailableNumber[] }).data
    return data ?? []
  } catch (error) {
    console.error('Erreur recherche numéros:', error instanceof Error ? error.message : String(error))
    return []
  }
}

// Acheter un numéro de téléphone
export async function purchasePhoneNumber(
  phoneNumber: string,
  connectionId: string
): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    const result = await client.numberOrders.create({
      phone_numbers: [{ phone_number: phoneNumber }],
      connection_id: connectionId,
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur achat numéro:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Libérer (supprimer) un numéro de téléphone
export async function releasePhoneNumber(phoneNumberId: string): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    const result = await client.phoneNumbers.delete(phoneNumberId)
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur libération numéro:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Lister les numéros actifs
export async function listPhoneNumbers(): Promise<Record<string, unknown>[]> {
  try {
    const client = getTelnyxClient()
    const result = await client.phoneNumbers.list({ 'page[size]': 100 })
    return (result as unknown as { data: Record<string, unknown>[] }).data ?? []
  } catch (error) {
    console.error('Erreur listage numéros:', error instanceof Error ? error.message : String(error))
    return []
  }
}

// ═══════════════════════════════════════
// APPELS VOCAUX (Call Control v2)
// ═══════════════════════════════════════
// SDK v6 : calls.dial() pour initier, calls.actions.* pour contrôler

// Passer un appel sortant
export async function makeCall(options: MakeCallOptions): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.dial() remplace calls.create()
    const result = await client.calls.dial({
      connection_id: options.connectionId,
      to: options.to,
      from: options.from,
      ...(options.webhookUrl ? { webhook_url: options.webhookUrl } : {}),
      ...(options.clientState ? { client_state: options.clientState } : {}),
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur création appel:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Répondre à un appel entrant
export async function answerCall(
  callControlId: string,
  webhookUrl?: string
): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.answer() remplace calls.answer()
    const result = await client.calls.actions.answer(callControlId, {
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur réponse appel:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Raccrocher un appel
export async function hangupCall(callControlId: string): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.hangup()
    const result = await client.calls.actions.hangup(callControlId, {})
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur raccroché appel:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Transférer un appel
export async function transferCall(
  callControlId: string,
  to: string
): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.transfer()
    const result = await client.calls.actions.transfer(callControlId, { to })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur transfert appel:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Jouer un audio dans l'appel
export async function playAudio(
  callControlId: string,
  audioUrl: string
): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.startPlayback()
    const result = await client.calls.actions.startPlayback(callControlId, {
      audio_url: audioUrl,
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur lecture audio:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Démarrer l'enregistrement d'un appel
export async function startRecording(callControlId: string): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.startRecording()
    const result = await client.calls.actions.startRecording(callControlId, {
      format: 'mp3',
      channels: 'dual',
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur démarrage enregistrement:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Arrêter l'enregistrement
export async function stopRecording(callControlId: string): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.stopRecording()
    const result = await client.calls.actions.stopRecording(callControlId, {})
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur arrêt enregistrement:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Mettre en attente (musique)
export async function holdCall(
  callControlId: string,
  audioUrl?: string
): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.startPlayback() avec loop
    const result = await client.calls.actions.startPlayback(callControlId, {
      audio_url: audioUrl ?? 'https://example.com/hold-music.mp3',
      loop: 'infinity',
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur attente appel:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Collecter des touches DTMF (IVR)
export async function gatherDTMF(
  callControlId: string,
  options: GatherDTMFOptions
): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    // SDK v6 : calls.actions.gather()
    const result = await client.calls.actions.gather(callControlId, {
      ...(options.audioUrl ? { audio_url: options.audioUrl } : {}),
      maximum_digits: options.maxDigits ?? 1,
      timeout_millis: (options.timeoutSeconds ?? 10) * 1000,
      terminating_digit: options.terminatingDigit ?? '#',
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur collecte DTMF:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// ═══════════════════════════════════════
// SMS / MMS
// ═══════════════════════════════════════

// Envoyer un SMS
export async function sendSMS(options: SendSMSOptions): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    const messagingProfileId = options.messagingProfileId ?? String(getEnv('TELNYX_MESSAGING_PROFILE_ID') || '')
    // SDK v6 : messages.send() remplace messages.create()
    const result = await client.messages.send({
      from: options.from,
      to: options.to,
      text: options.text,
      messaging_profile_id: messagingProfileId,
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur envoi SMS:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// Envoyer un MMS (avec média)
export async function sendMMS(options: SendMMSOptions): Promise<Record<string, unknown>> {
  try {
    const client = getTelnyxClient()
    const messagingProfileId = options.messagingProfileId ?? String(getEnv('TELNYX_MESSAGING_PROFILE_ID') || '')
    // SDK v6 : messages.send() avec media_urls
    const result = await client.messages.send({
      from: options.from,
      to: options.to,
      text: options.text,
      media_urls: options.mediaUrls,
      messaging_profile_id: messagingProfileId,
    })
    return (result as unknown as { data: Record<string, unknown> }).data ?? {}
  } catch (error) {
    console.error('Erreur envoi MMS:', error instanceof Error ? error.message : String(error))
    return {}
  }
}

// ═══════════════════════════════════════
// RÉEXPORTS depuis webhooks.ts
// ═══════════════════════════════════════
// Pour compatibilité ascendante, les constantes webhook
// sont aussi disponibles depuis ce fichier.
// Pour les API routes edge, importer directement depuis
// '@/lib/telnyx/webhooks' (évite de bundler le SDK Telnyx)

export {
  verifyWebhookSignature,
  TELNYX_WEBHOOK_EVENTS,
  type TelnyxWebhookEventType,
} from './webhooks'
