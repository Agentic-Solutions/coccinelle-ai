export const runtime = 'edge';

/**
 * Webhook WhatsApp Business API (Meta/Twilio)
 * Auto-création de profils clients + Réponse IA automatique
 *
 * Configuration WhatsApp:
 * URL: https://votre-domaine.com/api/webhooks/whatsapp
 * Method: POST
 * Verification Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/services/customer/autoCreateService';

// Webhook verification (required by Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // TODO: Remplacer par votre vrai verify token
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your-verify-token-here';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ [WhatsApp] Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('❌ [WhatsApp] Verification failed');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Recevoir les messages WhatsApp
export async function POST(request: NextRequest) {
  try {
    console.log('💬 [WhatsApp Webhook] Message reçu');

    const body = await request.json();

    // Format WhatsApp Business API (Meta)
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        const message = value.messages[0];
        const from = message.from; // Numéro WhatsApp
        const text = message.text?.body;
        const messageId = message.id;

        if (!from || !text) {
          return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        console.log(`💬 [WhatsApp] De: ${from}, Message: "${text}"`);

        // Récupérer le tenant ID
        const businessPhoneId = value.metadata.phone_number_id;
        const tenantId = getTenantIdFromBusinessPhone(businessPhoneId);

        if (!tenantId) {
          console.error(`❌ [WhatsApp] Business Phone ID inconnu: ${businessPhoneId}`);
          return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        // Auto-créer le profil client si nécessaire
        const result = await handleIncomingMessage(
          tenantId,
          from,
          text,
          'whatsapp',
          {
            whatsappMessageId: messageId,
            whatsappFrom: from,
            businessPhoneId: businessPhoneId,
          }
        );

        console.log(
          `✅ [WhatsApp] Client ${result.wasCreated ? 'créé' : 'existant'}: ${result.customer.id}`
        );

        // TODO: Générer réponse IA automatique
        const aiResponse = await generateAIResponse(result.customer, text, tenantId);

        // Envoyer la réponse via WhatsApp Business API
        await sendWhatsAppMessage(businessPhoneId, from, aiResponse);

        console.log(`💬 [WhatsApp] Réponse envoyée: "${aiResponse}"`);

        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }
    }

    // Format Twilio WhatsApp
    if (body.From?.startsWith('whatsapp:')) {
      const from = body.From.replace('whatsapp:', '');
      const text = body.Body;
      const messageSid = body.MessageSid;

      if (!from || !text) {
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }

      console.log(`💬 [WhatsApp Twilio] De: ${from}, Message: "${text}"`);

      const to = body.To.replace('whatsapp:', '');
      const tenantId = getTenantIdFromTwilioNumber(to);

      if (!tenantId) {
        console.error(`❌ [WhatsApp] Numéro Twilio inconnu: ${to}`);
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }

      // Auto-créer le profil client
      const result = await handleIncomingMessage(
        tenantId,
        from,
        text,
        'whatsapp',
        {
          twilioMessageSid: messageSid,
          twilioFrom: `whatsapp:${from}`,
          twilioTo: `whatsapp:${to}`,
        }
      );

      console.log(
        `✅ [WhatsApp Twilio] Client ${result.wasCreated ? 'créé' : 'existant'}: ${result.customer.id}`
      );

      // Réponse TwiML
      const aiResponse = await generateAIResponse(result.customer, text, tenantId);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse}</Message>
</Response>`;

      return new NextResponse(twiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ [WhatsApp Webhook] Erreur:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Envoyer un message WhatsApp via Meta Business API
 */
async function sendWhatsAppMessage(
  businessPhoneId: string,
  to: string,
  message: string
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ [WhatsApp] Access token manquant');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${businessPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [WhatsApp] Erreur envoi:', error);
    }
  } catch (error) {
    console.error('❌ [WhatsApp] Erreur envoi message:', error);
  }
}

/**
 * Mapper le Business Phone ID au tenant
 * TODO: Remplacer par requête DB
 */
function getTenantIdFromBusinessPhone(businessPhoneId: string): string | null {
  const phoneToTenant: Record<string, string> = {
    '123456789012345': 'elegance-paris',
    // Ajouter vos Business Phone IDs ici
  };

  return phoneToTenant[businessPhoneId] || null;
}

/**
 * Mapper le numéro Twilio au tenant (pour WhatsApp Twilio)
 */
function getTenantIdFromTwilioNumber(twilioNumber: string): string | null {
  const numberToTenant: Record<string, string> = {
    '+33123456789': 'elegance-paris',
    '+33987654321': 'boutique-mode',
  };

  return numberToTenant[twilioNumber] || null;
}

/**
 * Générer une réponse IA automatique
 * TODO: Intégrer avec OpenAI/Claude
 */
async function generateAIResponse(
  customer: any,
  message: string,
  tenantId: string
): Promise<string> {
  const isNewCustomer = customer.totalOrders === 0;

  if (isNewCustomer) {
    return `Bonjour ${customer.firstName} ! 👋 Merci de nous contacter sur WhatsApp. Comment puis-je vous aider ?`;
  }

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('avez-vous') || lowerMessage.includes('disponible')) {
    return `Bonjour ${customer.firstName} ! Je vérifie la disponibilité pour vous. Un instant ! ⏳`;
  }

  if (lowerMessage.includes('commande') || lowerMessage.includes('suivi')) {
    return `Bonjour ${customer.firstName} ! Je regarde où en est votre commande. Je reviens vers vous ! 📦`;
  }

  if (lowerMessage.includes('horaire') || lowerMessage.includes('ouvert')) {
    return `Nous sommes ouverts du mardi au samedi de 10h à 19h. À bientôt ! 🏪`;
  }

  return `Bonjour ${customer.firstName} ! Merci pour votre message. Je vous réponds tout de suite ! 😊`;
}
