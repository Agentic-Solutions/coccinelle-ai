/**
 * Controller pour l'envoi d'emails via Resend
 */

import { omniLogger } from '../utils/logger.js';

/**
 * POST /api/v1/omnichannel/email/send
 * Envoyer un email de test
 */
export async function sendEmail(request, env) {
  try {
    const { to, subject, html, text } = await request.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: to, subject'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = env.RESEND_API_KEY;
    const from = env.RESEND_FROM_EMAIL || 'sara@coccinelle.ai';

    const body = {
      from: from.includes('<') ? from : `Sara <${from}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      omniLogger.error('Resend API error', { status: response.status, data });
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: data
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    omniLogger.info('Email sent successfully', { emailId: data.id, to });

    return new Response(JSON.stringify({
      success: true,
      emailId: data.id,
      message: 'Email sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Send email error', { error: error.message });
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
