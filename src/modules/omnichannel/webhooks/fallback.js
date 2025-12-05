/**
 * Webhook Fallback - Handler de secours si le webhook principal échoue
 */

import { omniLogger } from '../utils/logger.js';

/**
 * POST /webhooks/omnichannel/fallback
 * Webhook Twilio de secours si /voice échoue
 */
export async function handleFallback(request, env) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const from = formData.get('From');
    const errorCode = formData.get('ErrorCode');
    const errorMessage = formData.get('ErrorMessage');

    omniLogger.error('Fallback webhook triggered', {
      callSid,
      from,
      errorCode,
      errorMessage
    });

    // TwiML simple pour informer l'utilisateur
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Lea-Neural">
    Nous rencontrons actuellement un problème technique.
    Veuillez réessayer dans quelques instants ou nous contacter par email.
    Merci de votre compréhension.
  </Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    omniLogger.error('Fallback handler failed', { error: error.message });

    // Dernier recours : TwiML minimaliste
    const emergencyTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Service temporairement indisponible.</Say>
  <Hangup/>
</Response>`;

    return new Response(emergencyTwiml, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
