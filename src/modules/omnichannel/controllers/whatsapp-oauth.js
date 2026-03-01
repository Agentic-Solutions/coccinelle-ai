/**
 * WhatsApp OAuth Controller - Version corrigée
 */
import { requireAuth, generateId } from '../../auth/helpers.js';
import { omniLogger } from '../utils/logger.js';

export async function handleOAuthCallback(request, env) {
  try {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error, success: false }), { 
        status: auth.status, headers: { 'Content-Type': 'application/json' }
      });
    }
    const { tenant, user } = auth;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return new Response(JSON.stringify({ error: 'Code OAuth manquant', success: false }), { 
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&code=${encodeURIComponent(code)}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return new Response(JSON.stringify({ error: 'Erreur token', details: tokenData.error, success: false }), { 
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    const accessToken = tokenData.access_token;
    // Récupérer les WABAs via debug_token
    const debugUrl = `https://graph.facebook.com/v22.0/debug_token?input_token=${accessToken}`;
    const debugResponse = await fetch(debugUrl, {
      headers: { 'Authorization': `Bearer ${env.META_APP_ID}|${env.META_APP_SECRET}` }
    });
    const debugData = await debugResponse.json();
    let phoneNumbers = [];
    if (debugData.data?.granular_scopes) {
      for (const scope of debugData.data.granular_scopes) {
        if (scope.scope === 'whatsapp_business_management' && scope.target_ids) {
          for (const wabaId of scope.target_ids) {
            const wabaUrl = `https://graph.facebook.com/v22.0/${wabaId}?fields=id,name,phone_numbers{id,display_phone_number,verified_name}`;
            const wabaResponse = await fetch(wabaUrl, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const wabaInfo = await wabaResponse.json();
            if (wabaInfo.phone_numbers?.data) {
              for (const phone of wabaInfo.phone_numbers.data) {
                phoneNumbers.push({
                  waba_id: wabaId,
                  waba_name: wabaInfo.name,
                  phone_number_id: phone.id,
                  phone_number: phone.display_phone_number,
                  verified_name: phone.verified_name
                });
              }
            }
          }
        }
      }
    }
    // Stocker dans omni_phone_mappings
    let storedCount = 0;
    let firstPhoneNumber = null;
    for (const phone of phoneNumbers) {
      try {
        const existing = await env.DB.prepare('SELECT id FROM omni_phone_mappings WHERE meta_phone_number_id = ?').bind(phone.phone_number_id).first();
        if (existing) {
          await env.DB.prepare('UPDATE omni_phone_mappings SET tenant_id = ?, meta_access_token = ?, meta_waba_id = ?, phone_number = ?, display_name = ?, is_active = 1, updated_at = datetime("now") WHERE id = ?').bind(tenant.id, accessToken, phone.waba_id, phone.phone_number, phone.verified_name || phone.waba_name, existing.id).run();
        } else {
          const mappingId = generateId('wam');
          await env.DB.prepare('INSERT INTO omni_phone_mappings (id, tenant_id, phone_number, channel_type, meta_phone_number_id, meta_waba_id, meta_access_token, display_name, is_active, created_at, updated_at) VALUES (?, ?, ?, "whatsapp", ?, ?, ?, ?, 1, datetime("now"), datetime("now"))').bind(mappingId, tenant.id, phone.phone_number, phone.phone_number_id, phone.waba_id, accessToken, phone.verified_name || phone.waba_name).run();
        }
        storedCount++;
        if (!firstPhoneNumber) firstPhoneNumber = phone.phone_number;
      } catch (dbError) {
        omniLogger.error('OAuth DB error', { error: dbError.message });
      }
    }
    if (phoneNumbers.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Aucun numéro WhatsApp trouvé' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp connecté avec succès!',
      phone_number: firstPhoneNumber,
      phones_connected: storedCount
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    omniLogger.error('OAuth error', { error: error.message });
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: error.message, success: false }), { 
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function getSharedWABAs(request, env) {
  try {
    const auth = await requireAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ error: auth.error }), { 
        status: auth.status, headers: { 'Content-Type': 'application/json' }
      });
    }
    const { tenant } = auth;
    const mappings = await env.DB.prepare('SELECT id, phone_number, display_name, meta_phone_number_id, meta_waba_id, is_active, created_at FROM omni_phone_mappings WHERE tenant_id = ? AND channel_type = "whatsapp" ORDER BY created_at DESC').bind(tenant.id).all();
    return new Response(JSON.stringify({ success: true, wabas: mappings.results || [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { 
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
