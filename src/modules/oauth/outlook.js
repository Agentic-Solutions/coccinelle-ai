/**
 * Module OAuth Microsoft/Outlook pour Coccinelle.ai
 * Permet aux clients de connecter leur compte Outlook/Hotmail/Live/M365
 */

// Configuration OAuth Microsoft
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

// Scopes nécessaires pour lire et envoyer des emails
const SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/User.Read',
  'offline_access',
].join(' ');

/**
 * Génère l'URL d'autorisation Microsoft
 */
function getAuthorizationUrl(env, tenantId, redirectAfterAuth = '/dashboard/channels/email') {
  const state = JSON.stringify({ tenantId, redirectAfterAuth, provider: 'outlook' });
  const stateEncoded = btoa(state);

  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    redirect_uri: env.MICROSOFT_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    response_mode: 'query',
    state: stateEncoded,
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre des tokens
 */
async function exchangeCodeForTokens(code, env) {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur échange token Microsoft: ${error}`);
  }

  return response.json();
}

/**
 * Rafraîchit un access_token expiré
 */
async function refreshAccessToken(refreshToken, env) {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur refresh token Microsoft: ${error}`);
  }

  return response.json();
}

/**
 * Récupère les infos du profil Microsoft
 */
async function getMicrosoftUserInfo(accessToken) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur récupération profil Microsoft');
  }

  return response.json();
}

/**
 * Sauvegarde les tokens en base de données
 */
async function saveOutlookTokens(db, tenantId, tokens, userInfo) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();
  const email = userInfo.mail || userInfo.userPrincipalName;

  // Vérifie si une config existe déjà
  const existing = await db.prepare(
    'SELECT id FROM oauth_outlook_tokens WHERE tenant_id = ?'
  ).bind(tenantId).first();

  if (existing) {
    await db.prepare(`
      UPDATE oauth_outlook_tokens 
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
      email,
      userInfo.displayName || null,
      now,
      tenantId
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO oauth_outlook_tokens (tenant_id, access_token, refresh_token, expires_at, email, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt,
      email,
      userInfo.displayName || null,
      now,
      now
    ).run();
  }
}

/**
 * Récupère les tokens depuis la base de données
 */
async function getOutlookTokens(db, tenantId) {
  return db.prepare(
    'SELECT * FROM oauth_outlook_tokens WHERE tenant_id = ?'
  ).bind(tenantId).first();
}

/**
 * Récupère un access_token valide (rafraîchit si nécessaire)
 */
async function getValidAccessToken(db, env, tenantId) {
  const tokenData = await getOutlookTokens(db, tenantId);
  
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
        UPDATE oauth_outlook_tokens 
        SET access_token = ?, expires_at = ?, updated_at = ?
        WHERE tenant_id = ?
      `).bind(newTokens.access_token, newExpiresAt, nowStr, tenantId).run();

      return newTokens.access_token;
    } catch (error) {
      console.error('Erreur refresh token Outlook:', error);
      return null;
    }
  }

  return tokenData.access_token;
}

// ============================================
// HANDLERS DE ROUTES
// ============================================

export async function handleOutlookAuthorize(request, env, ctx, tenantId) {
  const url = new URL(request.url);
  const redirectAfterAuth = url.searchParams.get('redirect') || '/dashboard/channels/email';
  
  const authUrl = getAuthorizationUrl(env, tenantId, redirectAfterAuth);
  
  return Response.redirect(authUrl, 302);
}

export async function handleOutlookCallback(request, env, ctx) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateEncoded = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Erreur OAuth Microsoft:', error);
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels/email?error=oauth_denied`, 302);
  }

  if (!code || !stateEncoded) {
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels/email?error=missing_params`, 302);
  }

  try {
    const state = JSON.parse(atob(stateEncoded));
    const { tenantId, redirectAfterAuth } = state;

    const tokens = await exchangeCodeForTokens(code, env);
    const userInfo = await getMicrosoftUserInfo(tokens.access_token);
    await saveOutlookTokens(env.DB, tenantId, tokens, userInfo);

    const email = userInfo.mail || userInfo.userPrincipalName;
    return Response.redirect(`${env.FRONTEND_URL}${redirectAfterAuth}?provider=outlook&connected=true&email=${encodeURIComponent(email)}`, 302);

  } catch (err) {
    console.error('Erreur callback OAuth Microsoft:', err);
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels/email?error=oauth_failed`, 302);
  }
}

export async function handleOutlookStatus(request, env, ctx, tenantId) {
  const tokenData = await getOutlookTokens(env.DB, tenantId);

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

export async function handleOutlookDisconnect(request, env, ctx, tenantId) {
  await env.DB.prepare(
    'DELETE FROM oauth_outlook_tokens WHERE tenant_id = ?'
  ).bind(tenantId).run();

  return Response.json({ success: true, message: 'Outlook déconnecté' });
}

export {
  getValidAccessToken,
  getOutlookTokens,
};
