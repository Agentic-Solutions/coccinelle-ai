import { NextRequest, NextResponse } from 'next/server'
import { getDB, getEnv, generateId } from '@/lib/db'

// ═══════════════════════════════════════
// WEBHOOK STRIPE - Cloudflare D1
// ═══════════════════════════════════════
// Vérifie la signature HMAC (R17) avec Web Crypto API
// Compatible edge runtime (pas de Node.js crypto)

export const runtime = 'edge'

// ═══════════════════════════════════════
// TYPES LOCAUX (pas d'import Stripe SDK pour edge)
// ═══════════════════════════════════════

interface StripeSubscriptionItem {
  price: {
    id: string
  }
}

interface StripeSubscription {
  id: string
  customer: string
  status: string
  items: {
    data: StripeSubscriptionItem[]
  }
  current_period_start: number
  current_period_end: number
  cancel_at: number | null
  canceled_at: number | null
}

interface StripeInvoice {
  customer: string | null
}

interface StripeEvent {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

interface Organization {
  id: string
}

// ═══════════════════════════════════════
// VÉRIFICATION HMAC STRIPE (Web Crypto API)
// ═══════════════════════════════════════
// Stripe utilise HMAC-SHA256 avec un format : t=timestamp,v1=signature
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  try {
    // Parser le header Stripe : "t=timestamp,v1=signature"
    const elements = signatureHeader.split(',')
    const timestamp = elements.find(e => e.startsWith('t='))?.slice(2)
    const signature = elements.find(e => e.startsWith('v1='))?.slice(3)

    if (!timestamp || !signature) {
      console.error('[Stripe] Header de signature invalide')
      return false
    }

    // Vérifier que le timestamp n'est pas trop ancien (5 min max)
    const timestampSeconds = parseInt(timestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampSeconds) > 300) {
      console.error('[Stripe] Timestamp trop ancien (>5min)')
      return false
    }

    // Calculer la signature attendue : HMAC-SHA256(secret, "timestamp.payload")
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signedPayload = `${timestamp}.${payload}`
    const expectedSignatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    )

    // Convertir en hex
    const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Comparaison constante pour éviter les attaques timing
    if (signature.length !== expectedSignature.length) return false
    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
    }
    return result === 0
  } catch (error) {
    console.error('[Stripe] Erreur vérification HMAC:', error instanceof Error ? error.message : String(error))
    return false
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Répondre 200 le plus vite possible (R17 : réponse immédiate)
  // On traite quand même, mais on ne bloque pas Stripe
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
    }

    // Vérifier la signature HMAC avant tout traitement (R17)
    const webhookSecret = String(getEnv('STRIPE_WEBHOOK_SECRET') || '')
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET non configuré')
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    }

    const isValid = await verifyStripeSignature(body, signature, webhookSecret)
    if (!isValid) {
      console.error('[Stripe Webhook] Signature HMAC invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
    }

    const event = JSON.parse(body) as StripeEvent
    const db = getDB()

    switch (event.type) {
      case 'customer.subscription.created': {
        const sub = event.data.object as unknown as StripeSubscription
        const customerId = sub.customer
        const org = await db.prepare(
          'SELECT id FROM organizations WHERE stripe_customer_id = ?'
        ).bind(customerId).first<Organization>()

        if (org) {
          const priceId = sub.items.data[0]?.price.id
          const id = generateId()

          await db.batch([
            db.prepare(`
              INSERT INTO subscriptions (id, organization_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_start, current_period_end)
              VALUES (?, ?, ?, ?, 'starter', ?, ?, ?)
            `).bind(id, org.id, sub.id, priceId, sub.status, new Date(sub.current_period_start * 1000).toISOString(), new Date(sub.current_period_end * 1000).toISOString()),
            db.prepare(`
              UPDATE organizations SET stripe_subscription_id = ?, status = 'active' WHERE id = ?
            `).bind(sub.id, org.id),
          ])
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as StripeSubscription
        await db.prepare(`
          UPDATE subscriptions SET status = ?, current_period_start = ?, current_period_end = ?, cancel_at = ?, cancelled_at = ?
          WHERE stripe_subscription_id = ?
        `).bind(
          sub.status,
          new Date(sub.current_period_start * 1000).toISOString(),
          new Date(sub.current_period_end * 1000).toISOString(),
          sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          sub.id
        ).run()
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSubscription
        const customerId = sub.customer

        await db.batch([
          db.prepare('UPDATE subscriptions SET status = ? WHERE stripe_subscription_id = ?').bind('cancelled', sub.id),
          db.prepare('UPDATE organizations SET status = ?, plan = ? WHERE stripe_customer_id = ?').bind('cancelled', 'starter', customerId),
        ])
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as StripeInvoice
        console.log(`[Stripe] Paiement échoué pour client: ${invoice.customer}`)
        break
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Stripe Webhook] Erreur:', error instanceof Error ? error.message : String(error))
    // Retourner 200 pour éviter les re-tentatives Stripe en boucle
    return NextResponse.json({ error: 'Erreur interne' }, { status: 200 })
  }
}
