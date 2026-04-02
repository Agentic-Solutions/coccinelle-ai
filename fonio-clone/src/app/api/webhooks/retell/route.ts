import { NextRequest, NextResponse } from 'next/server'
import { getDB, getEnv } from '@/lib/db'

// ═══════════════════════════════════════
// WEBHOOK RETELLAI - Cloudflare D1
// ═══════════════════════════════════════
// Reçoit les événements RetellAI (appels IA)
// Vérifie la signature HMAC avant traitement

export const runtime = 'edge'

interface RetellCallAnalysis {
  call_summary: string
  user_sentiment: 'Positive' | 'Neutral' | 'Negative'
  custom_analysis_data?: Record<string, unknown>
}

interface RetellCall {
  call_id: string
  agent_id: string
  call_status: string
  start_timestamp: number
  end_timestamp?: number
  duration_ms?: number
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  transcript: string
  call_analysis?: RetellCallAnalysis
  recording_url?: string
}

interface RetellWebhookPayload {
  event: 'call_started' | 'call_ended' | 'call_analyzed'
  call: RetellCall
}

interface Agent {
  id: string
  total_calls: number
  avg_call_duration: number
}

// Vérifier la signature HMAC du webhook RetellAI
async function verifyRetellSignature(body: string, signature: string): Promise<boolean> {
  const apiKey = getEnv('RETELL_API_KEY')
  if (!apiKey) {
    console.error('[RetellAI] RETELL_API_KEY non configurée')
    return false
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(String(apiKey)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Décoder la signature hex
    const sigBytes = new Uint8Array(
      (signature.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16))
    )

    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
  } catch (error) {
    console.error('[RetellAI] Erreur vérification signature:', error instanceof Error ? error.message : String(error))
    return false
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-retell-signature') || ''

    // Vérifier la signature HMAC (obligatoire en production)
    if (!signature) {
      console.error('[RetellAI Webhook] Header x-retell-signature manquant')
      return NextResponse.json({ error: 'Signature manquante' }, { status: 401 })
    }

    const isValid = await verifyRetellSignature(rawBody, signature)
    if (!isValid) {
      console.error('[RetellAI Webhook] Signature invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    const body: RetellWebhookPayload = JSON.parse(rawBody)
    const { event, call } = body
    const db = getDB()

    console.log(`[RetellAI Webhook] Event: ${event}, Call: ${call.call_id}`)

    if (event === 'call_started') {
      await db.prepare(`
        UPDATE calls SET retell_call_id = ?, status = 'in_progress', answered_at = ?
        WHERE from_number = ? AND to_number = ? AND status = 'ringing'
      `).bind(
        call.call_id,
        new Date(call.start_timestamp).toISOString(),
        call.from_number,
        call.to_number
      ).run()
    }

    if (event === 'call_ended') {
      const duration = call.duration_ms ? Math.round(call.duration_ms / 1000) : 0

      await db.prepare(`
        UPDATE calls SET
          status = ?,
          duration = ?,
          ended_at = ?,
          transcript = ?,
          recording_url = ?
        WHERE retell_call_id = ?
      `).bind(
        call.call_status === 'error' ? 'failed' : 'completed',
        duration,
        call.end_timestamp ? new Date(call.end_timestamp).toISOString() : new Date().toISOString(),
        call.transcript || null,
        call.recording_url || null,
        call.call_id
      ).run()

      // Mettre à jour les stats de l'agent IA
      const agent = await db.prepare(
        'SELECT id, total_calls, avg_call_duration FROM ai_agents WHERE retell_agent_id = ?'
      ).bind(call.agent_id).first<Agent>()

      if (agent) {
        const newTotal = agent.total_calls + 1
        const newAvg = Math.round((agent.avg_call_duration * agent.total_calls + duration) / newTotal)

        await db.prepare(`
          UPDATE ai_agents SET total_calls = ?, avg_call_duration = ? WHERE id = ?
        `).bind(newTotal, newAvg, agent.id).run()
      }
    }

    if (event === 'call_analyzed' && call.call_analysis) {
      const sentimentMap: Record<string, string> = {
        Positive: 'positive', Neutral: 'neutral', Negative: 'negative',
      }

      await db.prepare(`
        UPDATE calls SET
          transcript_summary = ?,
          sentiment = ?,
          metadata = ?
        WHERE retell_call_id = ?
      `).bind(
        call.call_analysis.call_summary,
        sentimentMap[call.call_analysis.user_sentiment] || 'neutral',
        JSON.stringify(call.call_analysis.custom_analysis_data || {}),
        call.call_id
      ).run()
    }

    // Répondre 200 immédiatement (bonne pratique webhook)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[RetellAI Webhook] Erreur:', error instanceof Error ? error.message : String(error))
    // Retourner 200 même en erreur pour éviter les re-tentatives infinies
    return NextResponse.json({ error: 'Erreur interne' }, { status: 200 })
  }
}
