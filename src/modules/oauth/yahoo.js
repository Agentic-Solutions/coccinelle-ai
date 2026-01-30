/**
 * Module OAuth Yahoo pour Coccinelle.ai
 * Permet aux clients de connecter leur compte Yahoo Mail
 */

// Configuration OAuth Yahoo
const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth';
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';

// Scopes nécessaires
const SCOPES = 'openid mail-r mail-w';

/**
 * Génère l'URL d'autorisation Yahoo
 */
function getAuthorizationUrl(env, tenantId, redirectAfterAuth = '/dashboard/channels/email') {
  const state = JSON.stringify({ tenantId, redirectAfterAuth, provider: 'yahoo' });
  const stateEncoded = btoa(state);

  const params = new URLSearchParams({
    client_id: env.YAHOO_CLIENT_ID,
    redirect_uri: env.YAHOO_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state: stateEncoded,
  });

  return `${YAHOO_AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre des tokens
 */
async function exchangeCodeForTokens(code, env) {
  const credentials = btoa(`${env.YAHOO_CLIENT_ID}:${env.YAHOO_CLIENT_SECRET}`);
  
  const response = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: env.YAHOO_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur échange token Yahoo: ${error}`);
  }

  return response.json();
}

/**
 * Rafraîchit un access_token expiré
 */
async function refreshAccessToken(refreshToken, env) {
  const credentials = btoa(`${env.YAHOO_CLIENT_ID}:${env.YAHOO_CLIENT_SECRET}`);
  
  const response = await fetch(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur refresh token Yahoo: ${error}`);
  }

  return response.json();
}

/**
 * Récupère les infos du profil Yahoo
 */
async function getYahooUserInfo(accessToken) {
  const response = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur récupération profil Yahoo');
  }

  return response.json();
}

/**
 * Sauvegarde les tokens en base de données
 */
async function saveYahooTokens(db, tenantId, tokens, userInfo) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

  const existing = await db.prepare(
    'SELECT id FROM oauth_yahoo_tokens WHERE tenant_id = ?'
  ).bind(tenantId).first();

  if (existing) {
    await db.prepare(`
      UPDATE oauth_yahoo_tokens 
      SET access_token = ?, 
          refresh_token = COALESCE(?, refresh_token),
          expires_at = ?,
          email = ?,
          display_name = ?,
          updated_at = ?
      WHERE tenant_id = ?
    `).bind(
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      userInfo.email,
      userInfo.name || null,
      now,
      tenantId
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO oauth_yahoo_tokens (tenant_id, access_token, refresh_token, expires_at, email, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      userInfo.email,
      userInfo.name || null,
      now,
      now
    ).run();
  }
}

/**
 * Récupère les tokens depuis la base de données
 */
async function getYahooTokens(db, tenantId) {
  return db.prepare(
    'SELECT * FROM oauth_yahoo_tokens WHERE tenant_id = ?'
  ).bind(tenantId).first();
}

/**
 * Récupère un access_token valide (rafraîchit si nécessaire)
 */
async function getValidAccessToken(db, env, tenantId) {
  const tokenData = await getYahooTokens(db, tenantId);
  
  if (!tokenData) {
    return null;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    try {
      const newTokens = await refreshAccessToken(tokenData.refresh_token, env);
      
      const nowStr = new Date().toISOString();
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();
      
      await db.prepare(`
        UPDATE oauth_yahoo_tokens 
        SET access_token = ?, expires_at = ?, updated_at = ?
        WHERE tenant_id = ?
      `).bind(newTokens.access_token, newExpiresAt, nowStr, tenantId).run();

      return newTokens.access_token;
    } catch (error) {
      console.error('Erreur refresh token Yahoo:', error);
      return null;
    }
  }

  return tokenData.access_token;
}

// ============================================
// HANDLERS DE ROUTES
// ============================================

export async function handleYahooAuthorize(request, env, ctx, tenantId) {
  const url = new URL(request.url);
  const redirectAfterAuth = url.searchParams.get('redirect') || '/dashboard/channels/email';
  
  const authUrl = getAuthorizationUrl(env, tenantId, redirectAfterAuth);
  
  return Response.redirect(authUrl, 302);
}

export async function handleYahooCallback(request, env, ctx) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateEncoded = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Erreur OAuth Yahoo:', error);
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels/email?error=oauth_denied`, 302);
  }

  if (!code || !stateEncoded) {
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels/email?error=missing_params`, 302);
  }

  try {
    const state = JSON.parse(atob(stateEncoded));
    const { tenantId, redirectAfterAuth } = state;

    const tokens = await exchangeCodeForTokens(code, env);
    const userInfo = await getYahooUserInfo(tokens.access_token);
    await saveYahooTokens(env.DB, tenantId, tokens, userInfo);

    return Response.redirect(`${env.FRONTEND_URL}${redirectAfterAuth}?provider=yahoo&connected=true&email=${encodeURIComponent(userInfo.email)}`, 302);

  } catch (err) {
    console.error('Erreur callback OAuth Yahoo:', err);
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels/email?error=oauth_failed`, 302);
  }
}

export async function handleYahooStatus(request, env, ctx, tenantId) {
  const tokenData = await getYahooTokens(env.DB, tenantId);

  if (!tokenData) {
    return Response.json({ connected: false });
  }

  return Response.json({
    connected: true,
    email: tokenData.email,
    displayName: tokenData.display_name,
    connectedAt: tokenData.created_at,
  });
}

export async function handleYahooDisconnect(request, env, ctx, tenantId) {
  await env.DB.prepare(
    'DELETE FROM oauth_yahoo_tokens WHERE tenant_id = ?'
  ).bind(tenantId).run();

  return Response.json({ success: true, message: 'Yahoo déconnecté' });
}

export {
  getValidAccessToken,
  getYahooTokens,
};
