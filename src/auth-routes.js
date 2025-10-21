// src/auth-routes.js - Routes d'authentification
import * as auth from './auth.js';

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

      // 1. VALIDATION DES DONNÉES
      const errors = [];

      if (!company_name || company_name.trim().length < 2) {
        errors.push('company_name requis (min 2 caractères)');
      }

      if (!email || !auth.isValidEmail(email)) {
        errors.push('email invalide');
      }

      if (!password || !auth.isStrongPassword(password)) {
        errors.push('password faible (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)');
      }

      if (!name || name.trim().length < 2) {
        errors.push('name requis (min 2 caractères)');
      }

      if (errors.length > 0) {
        return new Response(JSON.stringify({
          success: false,
          errors
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. VÉRIFIER EMAIL UNIQUE
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email.toLowerCase().trim()).first();

      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cet email est déjà utilisé'
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 3. GÉNÉRER SLUG UNIQUE
      let slug = auth.generateSlug(company_name);
      let slugExists = true;
      let slugAttempt = 0;

      while (slugExists && slugAttempt < 10) {
        const existingSlug = await env.DB.prepare(
          'SELECT id FROM tenants WHERE slug = ?'
        ).bind(slugAttempt === 0 ? slug : `${slug}-${slugAttempt}`).first();

        if (!existingSlug) {
          slugExists = false;
          if (slugAttempt > 0) slug = `${slug}-${slugAttempt}`;
        } else {
          slugAttempt++;
        }
      }

      if (slugExists) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Impossible de générer un slug unique, réessayez'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 4. HASH PASSWORD
      const passwordHash = await auth.hashPassword(password);

      // 5. GÉNÉRER API KEY
      const apiKey = 'sk_' + auth.generateId('').substring(0, 32);

      // 6. CRÉER TENANT
      const tenantId = auth.generateId('tenant');
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO tenants (
          id, name, email, api_key, company_name, slug, status, subscription_plan,
          sector, admin_email, max_agents, max_calls_per_month,
          timezone, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        company_name.trim(),
        email.toLowerCase().trim(),
        apiKey,
        company_name.trim(),
        slug,
        'trial',
        'free',
        sector || 'other',
        email.toLowerCase().trim(),
        5,
        100,
        'Europe/Paris',
        1,
        now
      ).run();

      // 7. CRÉER USER ADMIN
      const userId = auth.generateId('user');

      await env.DB.prepare(`
        INSERT INTO users (
          id, tenant_id, email, password_hash, name, role, 
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        tenantId,
        email.toLowerCase().trim(),
        passwordHash,
        name.trim(),
        'admin',
        1,
        now,
        now
      ).run();

      // 8. GÉNÉRER JWT TOKEN
      const tokenPayload = {
        user_id: userId,
        tenant_id: tenantId,
        role: 'admin',
        email: email.toLowerCase().trim()
      };

      const token = auth.generateToken(tokenPayload, env.JWT_SECRET, '7d');

      // 9. CRÉER SESSION DB
      const sessionId = auth.generateId('session');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.DB.prepare(`
        INSERT INTO sessions (
          id, user_id, tenant_id, token, ip_address, user_agent,
          expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        userId,
        tenantId,
        token,
        clientIp,
        userAgent,
        expiresAt.toISOString(),
        now
      ).run();

      // 10. AUDIT LOG
      await auth.logAudit(env, {
        tenant_id: tenantId,
        user_id: userId,
        action: 'user.signup',
        resource_type: 'user',
        resource_id: userId,
        changes: {
          email: email.toLowerCase().trim(),
          role: 'admin',
          tenant_created: true
        },
        ip_address: clientIp,
        user_agent: userAgent
      });

      // 11. RÉPONSE SUCCÈS
      return new Response(JSON.stringify({
        success: true,
        token,
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          role: 'admin'
        },
        tenant: {
          id: tenantId,
          company_name: company_name.trim(),
          slug,
          status: 'trial',
          subscription_plan: 'free',
          api_key: apiKey
        },
        session: {
          expires_at: expiresAt.toISOString()
        }
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Signup error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de l\'inscription',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Route non trouvée
  return null;
}
