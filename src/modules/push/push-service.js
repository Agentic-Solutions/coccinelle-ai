/**
 * Web Push Service — Cloudflare Workers compatible
 * Uses crypto.subtle for VAPID auth + RFC 8291 payload encryption
 */
import { logger } from '../../utils/logger.js';

// ─── Base64url helpers ───

function base64urlToBuffer(str) {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return Uint8Array.from([...binary].map(c => c.charCodeAt(0)));
}

function bufferToBase64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── HKDF using crypto.subtle ───

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info },
      key,
      length * 8
    )
  );
}

// ─── VAPID JWT ───

async function createVapidJwt(endpoint, privateKeyJwk, subject) {
  const origin = new URL(endpoint).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };

  const headerB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = bufferToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'jwk',
    { ...privateKeyJwk, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${bufferToBase64url(signature)}`;
}

// ─── RFC 8291 Payload Encryption ───

async function encryptPayload(payloadText, subscription) {
  const payload = new TextEncoder().encode(payloadText);

  // Subscriber keys
  const uaPublicRaw = base64urlToBuffer(subscription.p256dh);
  const authSecret = base64urlToBuffer(subscription.auth);

  // Generate ephemeral ECDH key pair
  const asKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import subscriber public key for ECDH
  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: uaPublicKey },
      asKeyPair.privateKey,
      256
    )
  );

  // Export ephemeral public key
  const asPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', asKeyPair.publicKey)
  );

  // Key info for HKDF: "WebPush: info\0" + ua_public + as_public
  const keyInfoHeader = new TextEncoder().encode('WebPush: info\0');
  const keyInfo = new Uint8Array(keyInfoHeader.length + uaPublicRaw.length + asPublicRaw.length);
  keyInfo.set(keyInfoHeader, 0);
  keyInfo.set(uaPublicRaw, keyInfoHeader.length);
  keyInfo.set(asPublicRaw, keyInfoHeader.length + uaPublicRaw.length);

  // Derive IKM: HKDF(salt=auth, ikm=shared_secret, info=key_info, 32)
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // Random salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive CEK and nonce
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad payload: payload + 0x02
  const padded = new Uint8Array(payload.length + 1);
  padded.set(payload);
  padded[payload.length] = 2;

  // AES-128-GCM encrypt
  const cekKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded)
  );

  // Build aes128gcm header: salt(16) + rs(4) + idLen(1) + keyId(65)
  const recordSize = 4096;
  const header = new Uint8Array(16 + 4 + 1 + asPublicRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize);
  header[20] = asPublicRaw.length;
  header.set(asPublicRaw, 21);

  // Combine header + encrypted
  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

// ─── Send Push Notification ───

export async function sendPushNotification(env, subscription, payload) {
  try {
    if (!env.VAPID_PRIVATE_KEY_JWK || !env.VAPID_PUBLIC_KEY) {
      logger.warn('VAPID keys not configured, skipping push');
      return { success: false, error: 'VAPID keys not configured' };
    }

    const privateKeyJwk = JSON.parse(env.VAPID_PRIVATE_KEY_JWK);
    const subject = env.VAPID_SUBJECT || 'mailto:contact@coccinelle.ai';

    const payloadJson = JSON.stringify(payload);
    const encryptedBody = await encryptPayload(payloadJson, subscription);

    const jwt = await createVapidJwt(subscription.endpoint, privateKeyJwk, subject);
    const authHeader = `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`;

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body: encryptedBody,
    });

    if (response.status === 201) {
      return { success: true };
    }

    if (response.status === 404 || response.status === 410) {
      return { success: false, expired: true };
    }

    const text = await response.text();
    logger.warn('Push send failed', { status: response.status, body: text });
    return { success: false, error: `HTTP ${response.status}` };
  } catch (error) {
    logger.error('Push send error', { error: error.message });
    return { success: false, error: error.message };
  }
}

// ─── Send to all subscriptions for a tenant ───

export async function sendPushToTenant(env, tenantId, payload) {
  try {
    const subs = await env.DB.prepare(
      'SELECT * FROM push_subscriptions WHERE tenant_id = ?'
    ).bind(tenantId).all();

    if (!subs.results?.length) return { sent: 0 };

    let sent = 0;
    const expired = [];

    for (const sub of subs.results) {
      const result = await sendPushNotification(env, {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      }, payload);

      if (result.success) {
        sent++;
      } else if (result.expired) {
        expired.push(sub.id);
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      for (const id of expired) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(id).run();
      }
      logger.info('Cleaned expired push subscriptions', { count: expired.length, tenantId });
    }

    return { sent, total: subs.results.length, expired: expired.length };
  } catch (error) {
    logger.error('sendPushToTenant error', { tenantId, error: error.message });
    return { sent: 0, error: error.message };
  }
}

// ─── VAPID Key Generation Helper ───

export async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: bufferToBase64url(publicKeyRaw),
    privateKeyJwk: JSON.stringify(privateKeyJwk),
  };
}
