// ═══════════════════════════════════════
// TYPES TELNYX - Événements Webhook
// ═══════════════════════════════════════

// Structure de base d'un webhook Telnyx
export type TelnyxWebhookPayload = TelnyxCallPayload | TelnyxMessagePayload

export interface TelnyxWebhookEvent {
  data: {
    event_type: string
    id: string
    occurred_at: string
    payload: TelnyxWebhookPayload
    record_type: string
  }
  meta: {
    attempt: number
    delivered_to: string
  }
}

// Payload pour les événements d'appels
export interface TelnyxCallPayload {
  call_control_id: string
  call_leg_id: string
  call_session_id: string
  client_state: string | null
  connection_id: string
  direction: 'incoming' | 'outgoing'
  from: string
  to: string
  state: 'parked' | 'bridging' | 'active' | 'hangup'
  start_time: string
  end_time?: string
  recording_urls?: {
    mp3: string
    wav: string
  }
  // Pour les événements gather (DTMF)
  digits?: string
  // Pour les événements recording
  recording_url?: string
  duration_secs?: number
}

// Payload pour les événements SMS
export interface TelnyxMessagePayload {
  id: string
  direction: 'inbound' | 'outbound'
  from: {
    phone_number: string
    carrier: string
    line_type: string
  }
  to: Array<{
    phone_number: string
    status: 'queued' | 'sending' | 'sent' | 'delivered' | 'sending_failed' | 'delivery_failed'
  }>
  text: string
  media: Array<{
    url: string
    content_type: string
    size: number
  }>
  messaging_profile_id: string
  type: 'SMS' | 'MMS'
  completed_at: string | null
  cost: {
    amount: string
    currency: string
  } | null
}

// Types pour la recherche de numéros
export interface TelnyxAvailableNumber {
  phone_number: string
  region_information: Array<{
    region_name: string
    region_type: string
  }>
  cost_information: {
    monthly_cost: string
    upfront_cost: string
    currency: string
  }
  phone_number_type: string
  features: Array<{
    name: string
  }>
}

// Configuration WebRTC
export interface TelnyxWebRTCConfig {
  login: string              // SIP username
  password: string           // SIP password
  callerIdName: string
  callerIdNumber: string
}
