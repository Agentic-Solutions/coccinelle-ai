import { NextRequest, NextResponse } from 'next/server'
import { getDB, generateId } from '@/lib/db'
import { TELNYX_WEBHOOK_EVENTS, verifyWebhookSignature } from '@/lib/telnyx/webhooks'
import type { TelnyxWebhookEvent, TelnyxCallPayload, TelnyxMessagePayload } from '@/types/telnyx'

// ═══════════════════════════════════════
// WEBHOOK TELNYX - Cloudflare D1
// ═══════════════════════════════════════
// Reçoit les événements Telnyx (appels, SMS)
// Stocke dans D1 (Cloudflare)

export const runtime = 'edge'

// Types pour les résultats de lookup D1
interface PhoneNumberLookup {
  id: string
  organization_id: string
}

interface CallLookup {
  id: string
  organization_id: string
}

interface ContactLookup {
  id: string
}

// Résoudre l'organisation à partir d'un numéro de téléphone
async function resolvePhoneNumber(
  db: D1Database,
  phoneNumber: string
): Promise<PhoneNumberLookup | null> {
  return await db.prepare(
    'SELECT id, organization_id FROM phone_numbers WHERE phone_number = ? AND status = ?'
  ).bind(phoneNumber, 'active').first<PhoneNumberLookup>()
}

// Résoudre un contact à partir de son numéro de téléphone et de l'organisation
async function resolveContact(
  db: D1Database,
  phoneNumber: string,
  organizationId: string
): Promise<ContactLookup | null> {
  return await db.prepare(
    'SELECT id FROM contacts WHERE phone = ? AND organization_id = ?'
  ).bind(phoneNumber, organizationId).first<ContactLookup>()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Lire le body brut pour la vérification de signature
    const rawBody = await request.text()
    const signatureHeader = request.headers.get('telnyx-signature-ed25519') || ''
    const timestampHeader = request.headers.get('telnyx-timestamp') || ''

    // Vérifier la signature du webhook (sécurité)
    if (!(await verifyWebhookSignature(rawBody, signatureHeader, timestampHeader))) {
      console.error('[Telnyx Webhook] Signature invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    const body = JSON.parse(rawBody) as TelnyxWebhookEvent
    const eventType = body.data.event_type
    const payload = body.data.payload
    const db = getDB()

    console.log(`[Telnyx Webhook] Event: ${eventType}`)

    // ═══════════════════════════════════════
    // APPELS
    // ═══════════════════════════════════════
    if (eventType === TELNYX_WEBHOOK_EVENTS.CALL_INITIATED) {
      const p = payload as TelnyxCallPayload
      const id = generateId()
      const isInbound = p.direction === 'incoming'

      // Résoudre le numéro de téléphone interne (to pour inbound, from pour outbound)
      const internalNumber = isInbound ? p.to : p.from
      const externalNumber = isInbound ? p.from : p.to
      const phoneNum = await resolvePhoneNumber(db, internalNumber)

      // Résoudre le contact externe si l'organisation est connue
      let contactId: string | null = null
      if (phoneNum) {
        const contact = await resolveContact(db, externalNumber, phoneNum.organization_id)
        contactId = contact?.id ?? null
      }

      await db.prepare(`
        INSERT INTO calls (id, organization_id, telnyx_call_control_id, telnyx_call_session_id, direction, from_number, to_number, phone_number_id, contact_id, status, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ringing', ?)
      `).bind(
        id,
        phoneNum?.organization_id ?? null,
        p.call_control_id,
        p.call_session_id,
        isInbound ? 'inbound' : 'outbound',
        p.from,
        p.to,
        phoneNum?.id ?? null,
        contactId,
        p.start_time
      ).run()
    }

    if (eventType === TELNYX_WEBHOOK_EVENTS.CALL_ANSWERED) {
      const p = payload as TelnyxCallPayload
      await db.prepare(`
        UPDATE calls SET status = 'in_progress', answered_at = datetime('now')
        WHERE telnyx_call_control_id = ?
      `).bind(p.call_control_id).run()
    }

    if (eventType === TELNYX_WEBHOOK_EVENTS.CALL_HANGUP) {
      const p = payload as TelnyxCallPayload
      await db.prepare(`
        UPDATE calls SET status = 'completed', ended_at = ?, duration = COALESCE(?, 0)
        WHERE telnyx_call_control_id = ?
      `).bind(
        p.end_time || new Date().toISOString(),
        p.duration_secs || 0,
        p.call_control_id
      ).run()

      // Mettre à jour les statistiques du contact (total_calls, total_call_duration)
      const call = await db.prepare(
        'SELECT contact_id, duration FROM calls WHERE telnyx_call_control_id = ?'
      ).bind(p.call_control_id).first<{ contact_id: string | null; duration: number }>()

      if (call?.contact_id) {
        await db.prepare(`
          UPDATE contacts SET
            total_calls = total_calls + 1,
            total_call_duration = total_call_duration + ?,
            last_contacted_at = datetime('now')
          WHERE id = ?
        `).bind(call.duration, call.contact_id).run()
      }
    }

    if (eventType === TELNYX_WEBHOOK_EVENTS.CALL_RECORDING_SAVED) {
      const p = payload as TelnyxCallPayload
      if (p.recording_urls?.mp3) {
        const call = await db.prepare(
          'SELECT id, organization_id FROM calls WHERE telnyx_call_control_id = ?'
        ).bind(p.call_control_id).first<CallLookup>()

        if (call) {
          const recId = generateId()
          await db.batch([
            db.prepare(`
              INSERT INTO call_recordings (id, organization_id, call_id, recording_url, duration, format)
              VALUES (?, ?, ?, ?, ?, 'mp3')
            `).bind(recId, call.organization_id, call.id, p.recording_urls.mp3, p.duration_secs || 0),
            db.prepare(`
              UPDATE calls SET recording_url = ? WHERE id = ?
            `).bind(p.recording_urls.mp3, call.id),
          ])
        }
      }
    }

    if (eventType === TELNYX_WEBHOOK_EVENTS.CALL_GATHER_ENDED) {
      const p = payload as TelnyxCallPayload
      console.log(`[IVR] Digits: ${p.digits} pour appel ${p.call_control_id}`)
      // TODO: Router selon les touches IVR
    }

    // ═══════════════════════════════════════
    // SMS
    // ═══════════════════════════════════════
    if (eventType === TELNYX_WEBHOOK_EVENTS.MESSAGE_RECEIVED) {
      const p = payload as TelnyxMessagePayload
      const id = generateId()
      const toNumber = p.to[0]?.phone_number || ''

      // Résoudre le numéro interne (destination du SMS entrant)
      const phoneNum = await resolvePhoneNumber(db, toNumber)

      // Résoudre le contact expéditeur si l'organisation est connue
      let contactId: string | null = null
      if (phoneNum) {
        const contact = await resolveContact(db, p.from.phone_number, phoneNum.organization_id)
        contactId = contact?.id ?? null
      }

      await db.prepare(`
        INSERT INTO sms_messages (id, organization_id, telnyx_message_id, direction, from_number, to_number, phone_number_id, contact_id, body, media_urls, status)
        VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?, ?, ?, 'received')
      `).bind(
        id,
        phoneNum?.organization_id ?? null,
        p.id,
        p.from.phone_number,
        toNumber,
        phoneNum?.id ?? null,
        contactId,
        p.text,
        JSON.stringify(p.media?.map(m => m.url) || [])
      ).run()
    }

    if (eventType === TELNYX_WEBHOOK_EVENTS.MESSAGE_FINALIZED) {
      const p = payload as TelnyxMessagePayload
      const status = p.to[0]?.status
      const mappedStatus = status === 'delivered' ? 'delivered' : status === 'sending_failed' ? 'failed' : 'sent'

      await db.prepare(`
        UPDATE sms_messages SET status = ?, cost = ? WHERE telnyx_message_id = ?
      `).bind(
        mappedStatus,
        p.cost ? parseFloat(p.cost.amount) : null,
        p.id
      ).run()
    }

    // Répondre 200 immédiatement (bonne pratique webhook)
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('[Telnyx Webhook] Erreur:', error instanceof Error ? error.message : String(error))
    // Retourner 200 même en erreur pour éviter les re-tentatives infinies de Telnyx
    return NextResponse.json({ error: 'Erreur interne' }, { status: 200 })
  }
}
