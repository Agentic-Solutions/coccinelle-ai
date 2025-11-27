// Twilio Signature Validator
// Valide l'authenticité des requêtes Twilio
import { logger } from '../../utils/logger.js';

export class TwilioSignatureValidator {
  constructor(authToken) {
    this.authToken = authToken;
  }

  async validate(request, url) {
    const signature = request.headers.get('X-Twilio-Signature');

    if (!signature) {
      logger.warn('Missing Twilio signature');
      return false;
    }

    try {
      // Récupérer les paramètres POST
      const formData = await request.clone().formData();
      const params = {};
      for (const [key, value] of formData.entries()) {
        params[key] = value;
      }

      // Construire la chaîne à signer
      const dataToSign = this.buildSignatureString(url, params);

      // Calculer le HMAC-SHA1
      const expectedSignature = await this.computeSignature(dataToSign);

      // Comparer
      const isValid = signature === expectedSignature;

      if (!isValid) {
        logger.warn('Invalid Twilio signature', { expected: expectedSignature, received: signature });
      }

      return isValid;

    } catch (error) {
      logger.error('Signature validation error', { error: error.message });
      return false;
    }
  }

  buildSignatureString(url, params) {
    // Trier les paramètres par clé
    const sortedKeys = Object.keys(params).sort();

    // Concaténer URL + paramètres triés
    let data = url;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    return data;
  }

  async computeSignature(data) {
    // Encoder le token et les données
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.authToken);
    const messageData = encoder.encode(data);

    // Importer la clé
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Signer
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // Convertir en Base64
    const signatureArray = new Uint8Array(signature);
    const base64 = btoa(String.fromCharCode(...signatureArray));

    return base64;
  }
}

// Middleware de validation Twilio
export async function validateTwilioRequest(request, env) {
  // En développement, on peut désactiver la validation
  if (env.ENVIRONMENT === 'development' && !env.TWILIO_VALIDATE_SIGNATURE) {
    return true;
  }

  const authToken = env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    logger.warn('TWILIO_AUTH_TOKEN not configured, skipping validation');
    return true;
  }

  const validator = new TwilioSignatureValidator(authToken);
  const url = request.url;

  return await validator.validate(request, url);
}
