// ═══════════════════════════════════════
// TYPES BASE DE DONNÉES - Cloudflare D1 (SQLite)
// ═══════════════════════════════════════
// Ces types correspondent aux 15 tables de la base de données D1
// Ils sont utilisés partout dans l'application
//
// Note : D1/SQLite stocke les booléens en INTEGER (0/1)
// et les tableaux/objets en TEXT (JSON sérialisé).
// Les types ci-dessous reflètent les valeurs APRÈS parsing côté app.

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Organization, 'id'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<User, 'id'>>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<Session, 'id'>>
      }
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<Account, 'id'>>
      }
      verification: {
        Row: Verification
        Insert: Omit<Verification, 'id' | 'createdAt' | 'updatedAt'>
        Update: Partial<Omit<Verification, 'id'>>
      }
      phone_numbers: {
        Row: PhoneNumber
        Insert: Omit<PhoneNumber, 'id' | 'created_at'>
        Update: Partial<Omit<PhoneNumber, 'id'>>
      }
      contacts: {
        Row: Contact
        Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Contact, 'id'>>
      }
      calls: {
        Row: Call
        Insert: Omit<Call, 'id' | 'created_at'>
        Update: Partial<Omit<Call, 'id'>>
      }
      ai_agents: {
        Row: AIAgent
        Insert: Omit<AIAgent, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AIAgent, 'id'>>
      }
      sms_messages: {
        Row: SMSMessage
        Insert: Omit<SMSMessage, 'id' | 'created_at'>
        Update: Partial<Omit<SMSMessage, 'id'>>
      }
      voicemails: {
        Row: Voicemail
        Insert: Omit<Voicemail, 'id' | 'created_at'>
        Update: Partial<Omit<Voicemail, 'id'>>
      }
      ivr_menus: {
        Row: IVRMenu
        Insert: Omit<IVRMenu, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<IVRMenu, 'id'>>
      }
      call_queues: {
        Row: CallQueue
        Insert: Omit<CallQueue, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CallQueue, 'id'>>
      }
      call_recordings: {
        Row: CallRecording
        Insert: Omit<CallRecording, 'id' | 'created_at'>
        Update: Partial<Omit<CallRecording, 'id'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Subscription, 'id'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
    }
  }
}

// ═══════════════════════════════════════
// TYPES DES TABLES
// ═══════════════════════════════════════

export interface Organization {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  logo_url: string | null
  website: string | null
  timezone: string
  language: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'cancelled'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  telnyx_connection_id: string | null
  telnyx_messaging_profile_id: string | null
  monthly_minutes_limit: number
  monthly_minutes_used: number
  created_at: string
  updated_at: string
}

// Table users — colonnes Better Auth en camelCase + colonnes custom en snake_case
export interface User {
  id: string
  organization_id: string
  email: string
  emailVerified: number     // D1/SQLite INTEGER (0 = non, 1 = oui) — Better Auth camelCase
  name: string              // Better Auth attend 'name' (pas 'full_name')
  image: string | null      // Better Auth attend 'image' (pas 'avatar_url')
  role: 'owner' | 'admin' | 'manager' | 'agent'
  phone: string | null
  extension: string | null
  status: 'active' | 'inactive' | 'invited'
  is_available: number      // D1/SQLite INTEGER (0 = non, 1 = oui)
  last_login_at: string | null
  createdAt: string         // Better Auth camelCase
  updatedAt: string         // Better Auth camelCase
}

// Table sessions (Better Auth — colonnes camelCase)
export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  updatedAt: string
}

// Table accounts (Better Auth — colonnes camelCase)
export interface Account {
  id: string
  userId: string
  accountId: string
  providerId: string
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: string | null
  refreshTokenExpiresAt: string | null
  scope: string | null
  idToken: string | null
  password: string | null
  createdAt: string
  updatedAt: string
}

// Table verification (Better Auth — colonnes camelCase)
export interface Verification {
  id: string
  identifier: string
  value: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface PhoneNumber {
  id: string
  organization_id: string
  telnyx_id: string
  phone_number: string
  friendly_name: string | null
  country_code: string
  type: 'local' | 'mobile' | 'toll_free'
  // Capacités stockées en colonnes séparées dans D1 (INTEGER 0/1)
  capabilities_voice: number
  capabilities_sms: number
  capabilities_mms: number
  assigned_to: string | null
  ai_agent_id: string | null
  routing_type: 'user' | 'ai_agent' | 'ivr' | 'queue'
  ivr_menu_id: string | null
  call_queue_id: string | null
  monthly_cost: number | null
  status: 'active' | 'released' | 'suspended'
  purchased_at: string
  created_at: string
}

// Type enrichi avec les capacités parsées (pour l'affichage frontend)
export interface PhoneNumberWithCapabilities extends Omit<PhoneNumber, 'capabilities_voice' | 'capabilities_sms' | 'capabilities_mms'> {
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

export interface Contact {
  id: string
  organization_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  phone_secondary: string | null
  company: string | null
  job_title: string | null
  address: string | null
  city: string | null
  country: string | null
  tags: string               // JSON sérialisé en TEXT dans D1 (ex: '["vip","prospect"]')
  notes: string | null
  source: 'website' | 'referral' | 'ads' | 'manual' | 'ai_call' | null
  status: 'new' | 'contacted' | 'qualified' | 'customer' | 'lost'
  lead_score: number
  last_contacted_at: string | null
  total_calls: number
  total_call_duration: number
  custom_fields: string      // JSON sérialisé en TEXT dans D1 (ex: '{"key":"value"}')
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  organization_id: string
  telnyx_call_control_id: string | null
  telnyx_call_session_id: string | null
  retell_call_id: string | null
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  phone_number_id: string | null
  contact_id: string | null
  user_id: string | null
  ai_agent_id: string | null
  status: 'ringing' | 'in_progress' | 'completed' | 'missed' | 'voicemail' | 'failed'
  duration: number
  wait_time: number
  recording_url: string | null
  recording_duration: number | null
  voicemail_url: string | null
  transcript: string | null
  transcript_summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  tags: string               // JSON sérialisé en TEXT dans D1
  notes: string | null
  cost: number | null
  metadata: string           // JSON sérialisé en TEXT dans D1
  started_at: string | null
  answered_at: string | null
  ended_at: string | null
  created_at: string
}

export interface AIAgent {
  id: string
  organization_id: string
  retell_agent_id: string | null
  name: string
  description: string | null
  voice_id: string | null
  language: string
  prompt: string
  greeting_message: string | null
  tools: string              // JSON sérialisé en TEXT dans D1
  knowledge_base: string     // JSON sérialisé en TEXT dans D1
  max_call_duration: number
  transfer_to: string | null
  transfer_phone: string | null
  webhook_url: string | null
  is_active: number          // D1/SQLite INTEGER (0 = non, 1 = oui)
  total_calls: number
  avg_call_duration: number
  satisfaction_score: number | null
  created_at: string
  updated_at: string
}

export interface SMSMessage {
  id: string
  organization_id: string
  telnyx_message_id: string | null
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  phone_number_id: string | null
  contact_id: string | null
  user_id: string | null
  body: string
  media_urls: string         // JSON sérialisé en TEXT dans D1
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  cost: number | null
  created_at: string
}

export interface Voicemail {
  id: string
  organization_id: string
  call_id: string | null
  phone_number_id: string | null
  contact_id: string | null
  from_number: string
  duration: number
  audio_url: string
  transcript: string | null
  is_read: number            // D1/SQLite INTEGER (0 = non, 1 = oui)
  read_by: string | null
  read_at: string | null
  created_at: string
}

export interface IVRMenu {
  id: string
  organization_id: string
  name: string
  welcome_message: string
  welcome_audio_url: string | null
  options: string            // JSON sérialisé en TEXT dans D1
  timeout_seconds: number
  timeout_action: 'repeat' | 'voicemail' | 'transfer'
  max_retries: number
  is_active: number          // D1/SQLite INTEGER (0 = non, 1 = oui)
  created_at: string
  updated_at: string
}

// Type pour une option IVR (après parsing JSON)
export interface IVROption {
  key: string
  label: string
  action: 'transfer_user' | 'transfer_queue' | 'transfer_ai' | 'voicemail' | 'submenu'
  target: string
}

export interface CallQueue {
  id: string
  organization_id: string
  name: string
  music_on_hold_url: string | null
  max_wait_time: number
  max_queue_size: number
  distribution: 'round_robin' | 'longest_idle' | 'skills_based'
  members: string            // JSON sérialisé en TEXT dans D1
  is_active: number          // D1/SQLite INTEGER (0 = non, 1 = oui)
  created_at: string
  updated_at: string
}

export interface CallRecording {
  id: string
  organization_id: string
  call_id: string
  recording_url: string
  r2_key: string | null     // Clé de stockage R2 (migration 001)
  duration: number
  file_size: number | null
  format: string
  expires_at: string | null
  created_at: string
}

export interface Subscription {
  id: string
  organization_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'past_due' | 'cancelled' | 'trialing'
  current_period_start: string | null
  current_period_end: string | null
  cancel_at: string | null
  cancelled_at: string | null
  trial_start: string | null
  trial_end: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  details: string            // JSON sérialisé en TEXT dans D1
  ip_address: string | null
  created_at: string
}

// ═══════════════════════════════════════
// HELPERS - Parsing JSON depuis D1
// ═══════════════════════════════════════

// Parser un champ JSON TEXT depuis D1 en tableau
export function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

// Parser un champ JSON TEXT depuis D1 en objet
export function parseJsonObject<T extends Record<string, unknown>>(
  value: string | null | undefined
): T {
  if (!value) return {} as T
  try {
    return JSON.parse(value) as T
  } catch {
    return {} as T
  }
}
