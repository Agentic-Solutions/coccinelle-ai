/**
 * Cloudflare Email Worker
 * Reçoit les emails entrants et les envoie au webhook
 */

export default {
  async email(message, env, ctx) {
    // Extraire les informations de l'email
    const from = message.from;
    const to = message.to;
    const subject = message.headers.get('subject') || '(Sans sujet)';
    
    // Lire le contenu de l'email
    const rawEmail = await new Response(message.raw).text();
    
    // Extraire le corps du message (simplifiié)
    let body = '';
    const lines = rawEmail.split('\n');
    let inBody = false;
    for (const line of lines) {
      if (inBody) {
        body += line + '\n';
      }
      if (line.trim() === '') {
        inBody = true;
      }
    }
    
    // Envoyer au webhook
    const webhookUrl = 'https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/omnichannel/email';
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'email.received',
          created_at: new Date().toISOString(),
          data: {
            email_id: message.headers.get('message-id') || `email_${Date.now()}`,
            from: from,
            to: to,
            subject: subject,
            text: body.trim(),
            html: null
          }
        })
      });
      
      console.log('Webhook response:', response.status);
    } catch (error) {
      console.error('Failed to call webhook:', error);
    }
  }
}
