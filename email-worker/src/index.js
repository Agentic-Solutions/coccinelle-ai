/**
 * Coccinelle Email Worker
 * Reçoit les emails entrants et les envoie à l'API principale
 */

export default {
  async email(message, env, ctx) {
    try {
      // Extraire les informations de l'email
      const from = message.from;
      const to = message.to;
      const subject = message.headers.get('subject') || '(Sans sujet)';
      
      console.log('📧 Email reçu:', { from, to, subject });
      
      // Lire le contenu brut de l'email
      const rawEmail = await new Response(message.raw).text();
      
      // Extraire le corps du message (après la ligne vide qui sépare headers et body)
      let body = '';
      const parts = rawEmail.split('\r\n\r\n');
      if (parts.length > 1) {
        body = parts.slice(1).join('\r\n\r\n');
      } else {
        // Essayer avec \n\n si \r\n\r\n ne fonctionne pas
        const parts2 = rawEmail.split('\n\n');
        if (parts2.length > 1) {
          body = parts2.slice(1).join('\n\n');
        }
      }
      
      // Appeler le webhook de l'API principale
      const webhookUrl = `${env.API_URL}/webhooks/omnichannel/email`;
      
      const payload = {
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
      };
      
      console.log('📤 Envoi au webhook:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.text();
      console.log('📥 Réponse webhook:', response.status, result);
      
    } catch (error) {
      console.error('❌ Erreur Email Worker:', error.message);
    }
  }
};
