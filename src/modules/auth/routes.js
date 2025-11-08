// src/auth-routes.js - Routes d'authentification complètes
import * as auth from './helpers.js';

/**
 * Gère toutes les routes d'authentification
 */
export async function handleAuthRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ========================================
  // POST /api/v1/auth/signup
  // ========================================
  if (path === '/api/v1/auth/signup' && method === 'POST') {
    try {
      const body = await request.json();
      const { company_name, email, password, name, phone, sector } = body;

      // Validation des données
      const errors = [];
      if (!company_name || company_name.trim().length < 2) errors.push('company_name requis (min 2 caractères)');
      if (!email || !auth.isValidEmail(email)) errors.push('email invalide');
      if (!password || !auth.isStrongPassword(password)) errors.push('password faible (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)');
      if (!name || name.trim().length < 2) errors.push('name requis (min 2 caractères)');

      if (errors.length > 0) {
        return new Response(JSON.stringify({ success: false, errors }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier email unique
      const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
      if (existingUser) {
        return new Response(JSON.stringify({ success: false, error: 'Cet email est déjà utilisé' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Générer slug unique
      let slug = auth.generateSlug(company_name);
      let slugExists = true;
      let slugAttempt = 0;
      while (slugExists && slugAttempt < 10) {
        const existingSlug = await env.DB.prepare('SELECT id FROM tenants WHERE slug = ?').bind(slugAttempt === 0 ? slug : `${slug}-${slugAttempt}`).first();
        if (!existingSlug) {
          slugExists = false;
          if (slugAttempt > 0) slug = `${slug}-${slugAttempt}`;
        } else {
          slugAttempt++;
        }
      }

      const passwordHash = await auth.hashPassword(password);
      const apiKey = 'sk_' + auth.generateId('').substring(0, 32);
      const tenantId = auth.generateId('tenant');
      const userId = auth.generateId('user');
      const now = new Date().toISOString();

      // Créer tenant
      await env.DB.prepare(`INSERT INTO tenants (id, name, email, api_key, company_name, slug, status, subscription_plan, sector, admin_email, max_agents, max_calls_per_month, timezone, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(tenantId, company_name.trim(), email.toLowerCase().trim(), apiKey, company_name.trim(), slug, 'trial', 'free', sector || 'other', email.toLowerCase().trim(), 5, 100, 'Europe/Paris', 1, now).run();

      // Créer user admin
      await env.DB.prepare(`INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(userId, tenantId, email.toLowerCase().trim(), passwordHash, name.trim(), 'admin', 1, now, now).run();

      // Générer JWT et créer session
      const token = auth.generateToken({ user_id: userId, tenant_id: tenantId, role: 'admin', email: email.toLowerCase().trim() }, env.JWT_SECRET, '7d');
      const sessionId = auth.generateId('session');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.DB.prepare(`INSERT INTO sessions (id, user_id, tenant_id, token, ip_address, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(sessionId, userId, tenantId, token, clientIp, userAgent, expiresAt.toISOString(), now).run();
      await auth.logAudit(env, { tenant_id: tenantId, user_id: userId, action: 'user.signup', resource_type: 'user', resource_id: userId, changes: { email: email.toLowerCase().trim(), role: 'admin', tenant_created: true }, ip_address: clientIp, user_agent: userAgent });

      return new Response(JSON.stringify({ success: true, token, user: { id: userId, email: email.toLowerCase().trim(), name: name.trim(), role: 'admin' }, tenant: { id: tenantId, company_name: company_name.trim(), slug, status: 'trial', subscription_plan: 'free', api_key: apiKey }, session: { expires_at: expiresAt.toISOString() } }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Signup error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de l\'inscription', message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ========================================
  // POST /api/v1/auth/login
  // ========================================
  if (path === '/api/v1/auth/login' && method === 'POST') {
    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !auth.isValidEmail(email)) {
        return new Response(JSON.stringify({ success: false, error: 'Email invalide' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!password) {
        return new Response(JSON.stringify({ success: false, error: 'Mot de passe requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Email ou mot de passe incorrect' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const passwordValid = await auth.verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        return new Response(JSON.stringify({ success: false, error: 'Email ou mot de passe incorrect' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!user.is_active) {
        return new Response(JSON.stringify({ success: false, error: 'Compte désactivé. Contactez l\'administrateur.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const tenant = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(user.tenant_id).first();
      if (!tenant || !tenant.is_active) {
        return new Response(JSON.stringify({ success: false, error: 'Organisation inactive' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = auth.generateToken({ user_id: user.id, tenant_id: user.tenant_id, role: user.role, email: user.email }, env.JWT_SECRET, '7d');
      const sessionId = auth.generateId('session');
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.DB.prepare(`INSERT INTO sessions (id, user_id, tenant_id, token, ip_address, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(sessionId, user.id, user.tenant_id, token, clientIp, userAgent, expiresAt.toISOString(), now).run();
      await auth.logAudit(env, { tenant_id: user.tenant_id, user_id: user.id, action: 'user.login', resource_type: 'user', resource_id: user.id, ip_address: clientIp, user_agent: userAgent });

      return new Response(JSON.stringify({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, tenant: { id: tenant.id, company_name: tenant.company_name, slug: tenant.slug, status: tenant.status, subscription_plan: tenant.subscription_plan }, session: { expires_at: expiresAt.toISOString() } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la connexion', message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ========================================
  // GET /api/v1/auth/me
  // ========================================
  if (path === '/api/v1/auth/me' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { user, tenant, session } = authResult;
      return new Response(JSON.stringify({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenant_id: user.tenant_id, is_active: user.is_active, created_at: user.created_at }, tenant: { id: tenant.id, name: tenant.name, company_name: tenant.company_name, slug: tenant.slug, email: tenant.email, status: tenant.status, subscription_plan: tenant.subscription_plan, sector: tenant.sector, max_agents: tenant.max_agents, max_calls_per_month: tenant.max_calls_per_month, timezone: tenant.timezone, is_active: tenant.is_active }, session: { id: session.id, expires_at: session.expires_at, created_at: session.created_at } }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la récupération du profil', message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ========================================
  // POST /api/v1/auth/logout
  // ========================================
  if (path === '/api/v1/auth/logout' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { user, tenant, session } = authResult;
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, { tenant_id: tenant.id, user_id: user.id, action: 'user.logout', resource_type: 'user', resource_id: user.id, ip_address: clientIp, user_agent: userAgent });

      return new Response(JSON.stringify({ success: true, message: 'Déconnexion réussie' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Logout error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la déconnexion', message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ========================================
  // POST /api/v1/auth/refresh
  // ========================================
  if (path === '/api/v1/auth/refresh' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { user, tenant, session } = authResult;
      const newToken = auth.generateToken({ user_id: user.id, tenant_id: user.tenant_id, role: user.role, email: user.email }, env.JWT_SECRET, '7d');
      const now = new Date().toISOString();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await env.DB.prepare(`UPDATE sessions SET token = ?, expires_at = ?, created_at = ? WHERE id = ?`).bind(newToken, newExpiresAt.toISOString(), now, session.id).run();

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, { tenant_id: tenant.id, user_id: user.id, action: 'user.token_refresh', resource_type: 'session', resource_id: session.id, ip_address: clientIp, user_agent: userAgent });

      return new Response(JSON.stringify({ success: true, token: newToken, expires_at: newExpiresAt.toISOString(), message: 'Token renouvelé avec succès' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors du renouvellement du token', message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // Route non trouvée
  return null;
}
