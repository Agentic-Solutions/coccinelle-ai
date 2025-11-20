/**
 * Webhook Twilio pour réception de SMS
 * Auto-création de profils clients + Réponse IA automatique
 *
 * Configuration Twilio:
 * URL: https://votre-domaine.com/api/webhooks/twilio/sms
 * Method: POST
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/services/customer/autoCreateService';

export async function POST(request: NextRequest) {
  try {
    console.log('📱 [Twilio Webhook] SMS reçu');

    // Parse les données Twilio (form-urlencoded)
    const formData = await request.formData();

    const from = formData.get('From') as string; // +33601020304
    const to = formData.get('To') as string; // Numéro Twilio
    const body = formData.get('Body') as string; // Contenu du message
    const messageSid = formData.get('MessageSid') as string;

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: From, Body' },
        { status: 400 }
      );
    }

    console.log(`📱 [Twilio] De: ${from}, Message: "${body}"`);

    // Récupérer le tenant ID depuis le numéro To
    // TODO: Mapper le numéro Twilio au tenant (via DB)
    const tenantId = getTenantIdFromTwilioNumber(to);

    if (!tenantId) {
      console.error(`❌ [Twilio] Numéro Twilio inconnu: ${to}`);
      return NextResponse.json(
        { error: 'Unknown Twilio number' },
        { status: 404 }
      );
    }

    // Auto-créer le profil client si nécessaire
    const result = await handleIncomingMessage(
      tenantId,
      from,
      body,
      'sms',
      {
        twilioMessageSid: messageSid,
        twilioFrom: from,
        twilioTo: to,
      }
    );

    console.log(
      `✅ [Twilio] Client ${result.wasCreated ? 'créé' : 'existant'}: ${result.customer.id}`
    );

    // TODO: Générer réponse IA automatique
    const aiResponse = await generateAIResponse(result.customer, body, tenantId);

    // Répondre au SMS (format TwiML)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${aiResponse}</Message>
</Response>`;

    console.log(`💬 [Twilio] Réponse envoyée: "${aiResponse}"`);

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('❌ [Twilio Webhook] Erreur:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Configuration CORS pour Twilio
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'Twilio SMS Webhook',
      version: '1.0.0',
    },
    { status: 200 }
  );
}

/**
 * Mapper le numéro Twilio au tenant
 * TODO: Remplacer par requête DB
 */
function getTenantIdFromTwilioNumber(twilioNumber: string): string | null {
  // Map temporaire (à remplacer par DB)
  const numberToTenant: Record<string, string> = {
    '+33123456789': 'elegance-paris',
    '+33987654321': 'boutique-mode',
    // Ajouter vos numéros Twilio ici
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
  // Pour l'instant, réponse simple
  // TODO: Intégrer avec GPT-4 + contexte client + inventaire

  const isNewCustomer = customer.totalOrders === 0;

  if (isNewCustomer) {
    return `Bonjour ${customer.firstName} ! Merci de nous contacter. Je regarde ça tout de suite pour vous ! 😊`;
  }

  // Détecter l'intention du message
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('avez-vous') || lowerMessage.includes('disponible')) {
    return `Bonjour ${customer.firstName} ! Je vérifie la disponibilité pour vous. Un instant s'il vous plaît ! 😊`;
  }

  if (lowerMessage.includes('commande') || lowerMessage.includes('suivi')) {
    return `Bonjour ${customer.firstName} ! Je regarde où en est votre commande. Je reviens vers vous dans un instant ! 📦`;
  }

  if (lowerMessage.includes('horaire') || lowerMessage.includes('ouvert')) {
    return `Nous sommes ouverts du mardi au samedi de 10h à 19h. À bientôt ! 😊`;
  }

  // Réponse par défaut
  return `Bonjour ${customer.firstName} ! Merci pour votre message. Je vais regarder ça et vous réponds tout de suite ! 😊`;
}
