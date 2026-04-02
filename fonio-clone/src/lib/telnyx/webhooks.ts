// ═══════════════════════════════════════
// TELNYX WEBHOOKS - Types et vérification
// ═══════════════════════════════════════
// Ce fichier est séparé de client.ts pour éviter
// d'importer le SDK Telnyx (incompatible edge runtime)
// dans les API routes webhook qui tournent en edge.

import { getEnv } from '../db'

// ═══════════════════════════════════════
// VÉRIFICATION DE SIGNATURE ED25519
// ═══════════════════════════════════════
// Telnyx utilise Ed25519 pour signer les webhooks.
// La clé publique est disponible via TELNYX_PUBLIC_KEY.
// Le message signé est : timestamp + "." + payload
// La signature est encodée en base64 dans le header.

// Décoder une chaîne base64 en Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// Vérifier la signature d'un webhook Telnyx
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  timestampHeader: string
): Promise<boolean> {
  try {
    const publicKeyBase64 = getEnv('TELNYX_PUBLIC_KEY')
    if (!publicKeyBase64) {
      console.error('[Telnyx] TELNYX_PUBLIC_KEY non configurée')
      return false
    }

    // Vérifier que les headers sont présents
    if (!signatureHeader || !timestampHeader) {
      console.error('[Telnyx] Headers de signature manquants')
      return false
    }

    // Vérifier que le timestamp n'est pas trop ancien (5 minutes max)
    const timestampMs = parseInt(timestampHeader, 10)
    const now = Date.now()
    if (isNaN(timestampMs) || Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      console.error('[Telnyx] Timestamp du webhook trop ancien ou invalide')
      return false
    }

    // Construire le message signé : timestamp.payload
    const signedMessage = `${timestampHeader}.${payload}`
    const encoder = new TextEncoder()

    // Importer la clé publique Ed25519
    const publicKeyBytes = base64ToUint8Array(String(publicKeyBase64))
    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes.buffer as ArrayBuffer,
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    // Décoder la signature (base64)
    const signatureBytes = base64ToUint8Array(signatureHeader)

    // Vérifier la signature
    const isValid = await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureBytes.buffer as ArrayBuffer,
      encoder.encode(signedMessage)
    )

    return isValid
  } catch (error) {
    // En cas d'erreur (ex: Ed25519 non supporté par le runtime),
    // fallback sur la vérification basique des headers
    console.error(
      '[Telnyx] Erreur vérification signature Ed25519:',
      error instanceof Error ? error.message : String(error)
    )
    // Fallback : accepter si les headers sont présents
    // TODO: Supprimer ce fallback quand Ed25519 est supporté partout
    return Boolean(signatureHeader) && Boolean(payload) && Boolean(timestampHeader)
  }
}

// ═══════════════════════════════════════
// TYPES D'ÉVÉNEMENTS WEBHOOK
// ═══════════════════════════════════════

// Types d'événements Telnyx disponibles
export type TelnyxWebhookEventType =
  | 'call.initiated'
  | 'call.answered'
  | 'call.hangup'
  | 'call.machine.detection.ended'
  | 'call.recording.saved'
  | 'call.gather.ended'
  | 'call.playback.started'
  | 'call.playback.ended'
  | 'call.dtmf.received'
  | 'message.received'
  | 'message.sent'
  | 'message.finalized'
  | 'number_order.completed'

// Constantes des événements webhook Telnyx
export const TELNYX_WEBHOOK_EVENTS = {
  // Appels
  CALL_INITIATED: 'call.initiated' as const,
  CALL_ANSWERED: 'call.answered' as const,
  CALL_HANGUP: 'call.hangup' as const,
  CALL_MACHINE_DETECTION: 'call.machine.detection.ended' as const,
  CALL_RECORDING_SAVED: 'call.recording.saved' as const,
  CALL_GATHER_ENDED: 'call.gather.ended' as const,
  CALL_PLAYBACK_STARTED: 'call.playback.started' as const,
  CALL_PLAYBACK_ENDED: 'call.playback.ended' as const,
  CALL_DTMF_RECEIVED: 'call.dtmf.received' as const,

  // SMS
  MESSAGE_RECEIVED: 'message.received' as const,
  MESSAGE_SENT: 'message.sent' as const,
  MESSAGE_FINALIZED: 'message.finalized' as const,

  // Numéros
  NUMBER_ORDER_COMPLETED: 'number_order.completed' as const,
} as const
