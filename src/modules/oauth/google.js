/**
 * Module OAuth Google pour Coccinelle.ai
 * Permet aux clients de connecter leur compte Gmail
 */

// Configuration OAuth Google
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Scopes nécessaires pour lire et envoyer des emails
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

/**
 * Génère l'URL d'autorisation Google
 */
function getAuthorizationUrl(env, tenantId, redirectAfterAuth = '/dashboard/channels') {
  const state = JSON.stringify({ tenantId, redirectAfterAuth });
  const stateEncoded = btoa(state);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: stateEncoded,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre des tokens
 */
async function exchangeCodeForTokens(code, env) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: env.GOOGLE_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur échange token: ${error}`);
  }

  return response.json();
}

/**
 * Rafraîchit un access_token expiré
 */
async function refreshAccessToken(refreshToken, env) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Récupère les infos du profil Google
 */
async function getGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur récupération profil Google');
  }

  return response.json();
}

/**
 * Sauvegarde les tokens Google en base
 */
async function saveGoogleTokens(db, tenantId, tokens, userInfo) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

  const existing = await db.prepare(
    'SELECT id FROM oauth_google_tokens WHERE tenant_id = ?'
  ).bind(tenantId).first();

  if (existing) {
    await db.prepare(`
      UPDATE oauth_google_tokens
      SET access_token = ?,
          refresh_token = COALESCE(?, refresh_token),
          expires_at = ?,
          email = ?,
          updated_at = ?
      WHERE tenant_id = ?
    `).bind(
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      userInfo.email,
      now,
      tenantId
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO oauth_google_tokens (tenant_id, access_token, refresh_token, expires_at, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      userInfo.email,
      now,
      now
    ).run();
  }
}

/**
 * Récupère les tokens Google depuis la base
 */
export async function getGoogleTokens(db, tenantId) {
  return db.prepare(
    'SELECT * FROM oauth_google_tokens WHERE tenant_id = ?'
  ).bind(tenantId).first();
}

/**
 * Récupère un access_token valide (rafraîchit si nécessaire)
 */
export async function getValidAccessToken(db, tenantId, env) {
  const tokenData = await getGoogleTokens(db, tenantId);

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
        UPDATE oauth_google_tokens
        SET access_token = ?, expires_at = ?, updated_at = ?
        WHERE tenant_id = ?
      `).bind(newTokens.access_token, newExpiresAt, nowStr, tenantId).run();

      return newTokens.access_token;
    } catch (error) {
      console.error('Erreur refresh token:', error);
      return null;
    }
  }

  return tokenData.access_token;
}

// =============================================
// HANDLERS DE ROUTES
// =============================================

/**
 * GET /api/v1/oauth/google/authorize
 */
export async function handleGoogleAuthorize(request, env, ctx, tenantId) {
  const url = new URL(request.url);
  const redirectAfterAuth = url.searchParams.get('redirect') || '/dashboard/channels';

  const authUrl = getAuthorizationUrl(env, tenantId, redirectAfterAuth);

  return Response.redirect(authUrl, 302);
}

/**
 * GET /api/v1/oauth/google/callback
 */
export async function handleGoogleCallback(request, env, ctx) {
  console.log('=== GOOGLE CALLBACK START ===');
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateEncoded = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('code present:', !!code);
  console.log('state present:', !!stateEncoded);
  console.log('error:', error);

  if (error) {
    console.error('Erreur OAuth Google:', error);
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels?error=oauth_denied`, 302);
  }

  if (!code || !stateEncoded) {
    console.error('Missing code or state');
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels?error=missing_params`, 302);
  }

  try {
    console.log('Decoding state...');
    const state = JSON.parse(atob(stateEncoded));
    const { tenantId, redirectAfterAuth } = state;
    console.log('tenantId:', tenantId);

    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, env);
    console.log('Tokens received, access_token:', !!tokens.access_token);

    console.log('Getting user info...');
    const userInfo = await getGoogleUserInfo(tokens.access_token);
    console.log('User email:', userInfo.email);

    console.log('Saving to DB...');
    await saveGoogleTokens(env.DB, tenantId, tokens, userInfo);
    console.log('=== GOOGLE CALLBACK SUCCESS ===');

    return Response.redirect(`${env.FRONTEND_URL}${redirectAfterAuth}?gmail_connected=true&email=${encodeURIComponent(userInfo.email)}`, 302);

  } catch (err) {
    console.error('=== GOOGLE CALLBACK ERROR ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    return Response.redirect(`${env.FRONTEND_URL}/dashboard/channels?error=oauth_failed`, 302);
  }
}

/**
 * GET /api/v1/oauth/google/status
 */
export async function handleGoogleStatus(request, env, ctx, tenantId) {
  const tokenData = await getGoogleTokens(env.DB, tenantId);

  if (!tokenData) {
    return Response.json({ connected: false });
  }

  return Response.json({
    connected: true,
    email: tokenData.email,
    connectedAt: tokenData.created_at,
  });
}

/**
 * DELETE /api/v1/oauth/google/disconnect
 */
export async function handleGoogleDisconnect(request, env, ctx, tenantId) {
  await env.DB.prepare(
    'DELETE FROM oauth_google_tokens WHERE tenant_id = ?'
  ).bind(tenantId).run();

  return Response.json({ success: true, message: 'Gmail déconnecté' });
}
