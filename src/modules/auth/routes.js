// src/auth-routes.js - Routes d'authentification complètes
import * as auth from './helpers.js';
import { initTenantPermissions } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';
import { rateLimitResponse } from '../../utils/rate-limiter.js';

// ========================================
// FONCTIONS UTILITAIRES POUR LE SLUG
// ========================================

/**
 * Génère un slug à partir d'un nom d'entreprise
 * "Salon Marie & Fils" → "salon-marie-fils"
 * "Café de la Gare" → "cafe-de-la-gare"
 */
function generateSlugFromName(name) {
  if (!name) return null;
  
  return name
    .toLowerCase()
    .trim()
    // Remplace les caractères accentués
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplace les espaces et caractères spéciaux par des tirets
    .replace(/[^a-z0-9]+/g, '-')
    // Supprime les tirets en début et fin
    .replace(/^-+|-+$/g, '')
    // Limite la longueur à 50 caractères
    .substring(0, 50);
}

/**
 * Vérifie si un slug est disponible
 */
async function isSlugAvailable(db, slug) {
  if (!slug) return false;
  
  const existing = await db.prepare(
    'SELECT id FROM tenants WHERE slug = ?'
  ).bind(slug).first();
  
  return !existing;
}

/**
 * Génère un slug unique en ajoutant un suffixe si nécessaire
 * "salon-marie" → "salon-marie" (si disponible)
 * "salon-marie" → "salon-marie-2" (si pris)
 * "salon-marie" → "salon-marie-3" (si -2 aussi pris)
 */
async function generateUniqueSlug(db, baseName) {
  const baseSlug = generateSlugFromName(baseName);
  
  if (!baseSlug) {
    // Si pas de nom, génère un slug aléatoire
    return 'tenant-' + Math.random().toString(36).substring(2, 10);
  }
  
  // Vérifie si le slug de base est disponible
  if (await isSlugAvailable(db, baseSlug)) {
    return baseSlug;
  }
  
  // Sinon, essaie avec des suffixes numériques
  for (let i = 2; i <= 100; i++) {
    const candidateSlug = `${baseSlug}-${i}`;
    if (await isSlugAvailable(db, candidateSlug)) {
      return candidateSlug;
    }
  }
  
  // En dernier recours, ajoute un suffixe aléatoire
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${randomSuffix}`;
}

// ========================================
// ROUTES D'AUTHENTIFICATION
// ========================================

/**
 * Gère toutes les routes d'authentification
 */
export async function handleAuthRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Rate limit login/signup: 10 requests/minute per IP
  if (path === '/api/v1/auth/login' || path === '/api/v1/auth/signup') {
    const rateLimited = rateLimitResponse(request, path, { maxRequests: 10, windowMs: 60000 });
    if (rateLimited) return rateLimited;
  }

  // ========================================
  // POST /api/v1/auth/signup
  // ========================================
  if (path === '/api/v1/auth/signup' && method === 'POST') {
    try {
      const body = await request.json();
      const { company_name, email, password, name, phone, sector, cgu_accepted } = body;

      // Validation des données
      const errors = [];
      // CGU obligatoire
      if (!cgu_accepted) errors.push('Vous devez accepter les Conditions Générales d\'Utilisation');
      // company_name est optionnel au signup, sera rempli dans l'onboarding
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

      const passwordHash = await auth.hashPassword(password);
      const apiKey = 'sk_' + auth.generateId('').substring(0, 32);
      // Générer tenant_id basé sur l'email (comme le frontend)
      const tenantId = `tenant_${btoa(email.toLowerCase().trim()).replace(/=/g, '')}`;
      const userId = auth.generateId('user');
      const now = new Date().toISOString();

      // ========================================
      // NOUVEAU : Générer un slug unique
      // ========================================
      const tenantName = company_name?.trim() || name.trim();
      const slug = await generateUniqueSlug(env.DB, tenantName);
      
      logger.info('New tenant created', { name: tenantName, slug });

      // Créer tenant AVEC LE SLUG + TRIAL
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      await env.DB.prepare(`
        INSERT INTO tenants (id, name, company_name, email, api_key, slug, trial_ends_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tenantId,
        tenantName,
        tenantName,
        email.toLowerCase().trim(),
        apiKey,
        slug,
        trialEndsAt.toISOString(),
        now
      ).run();

      // Créer les catégories de produits par défaut
      const defaultCategories = [
        { id: `cat_${tenantId}_real_estate`, key: 'real_estate', name: 'Immobilier', description: 'Biens immobiliers', icon: 'Home', color: 'blue', fields: JSON.stringify([{"key": "surface", "label": "Surface (m²)", "type": "number", "required": false}]), display_order: 1 },
        { id: `cat_${tenantId}_retail`, key: 'retail', name: 'Commerce', description: 'Articles de vente', icon: 'ShoppingBag', color: 'purple', fields: JSON.stringify([{"key": "brand", "label": "Marque", "type": "text", "required": false}]), display_order: 2 },
        { id: `cat_${tenantId}_food`, key: 'food', name: 'Restauration', description: 'Produits alimentaires', icon: 'UtensilsCrossed', color: 'orange', fields: JSON.stringify([]), display_order: 3 },
        { id: `cat_${tenantId}_services`, key: 'services', name: 'Services', description: 'Services professionnels', icon: 'Briefcase', color: 'green', fields: JSON.stringify([]), display_order: 4 }
      ];
      const catStatements = defaultCategories.map(cat => env.DB.prepare(`INSERT INTO product_categories (id, tenant_id, key, name, description, icon, color, is_system, fields, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).bind(cat.id, tenantId, cat.key, cat.name, cat.description, cat.icon, cat.color, cat.fields, cat.display_order, now, now));
      await env.DB.batch(catStatements);

      // Mettre à jour le secteur d'activité si fourni
      if (body.industry) {
        await env.DB.prepare('UPDATE tenants SET industry = ? WHERE id = ?').bind(body.industry, tenantId).run();
      }

      // Créer les permissions par défaut pour ce tenant
      await initTenantPermissions(env, tenantId);

      // Créer subscription trial (14 jours)
      const subscriptionId = auth.generateId('sub');
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);
      await env.DB.prepare(`
        INSERT INTO subscriptions (id, tenant_id, plan, status, trial_ends_at, created_at)
        VALUES (?, ?, 'trial', 'trialing', ?, ?)
      `).bind(subscriptionId, tenantId, trialEnds.toISOString(), now).run();

      // Créer user admin (avec cgu_accepted_at)
      await env.DB.prepare(`INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active, cgu_accepted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(userId, tenantId, email.toLowerCase().trim(), passwordHash, name.trim(), 'admin', 1, cgu_accepted ? now : null, now, now).run();

      // Générer JWT et créer session
      const token = auth.generateToken({ user_id: userId, tenant_id: tenantId, role: 'admin', email: email.toLowerCase().trim() }, env.JWT_SECRET, '7d');
      const sessionId = auth.generateId('session');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.DB.prepare(`INSERT INTO sessions (id, user_id, tenant_id, token, ip_address, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(sessionId, userId, tenantId, token, clientIp, userAgent, expiresAt.toISOString(), now).run();
      await auth.logAudit(env, { tenant_id: tenantId, user_id: userId, action: 'user.signup', resource_type: 'user', resource_id: userId, changes: { email: email.toLowerCase().trim(), role: 'admin', tenant_created: true, slug: slug }, ip_address: clientIp, user_agent: userAgent });

      // ========================================
      // Email de vérification
      // ========================================
      const verificationToken = crypto.randomUUID();
      await env.DB.prepare('UPDATE users SET verification_token = ? WHERE id = ?').bind(verificationToken, userId).run();

      const verifyLink = `https://coccinelle-saas.pages.dev/verify-email?token=${verificationToken}`;
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
            to: email.toLowerCase().trim(),
            subject: 'Bienvenue sur Coccinelle.ai ! Confirmez votre email',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1a1a1a; font-size: 24px;">Bienvenue sur Coccinelle.ai !</h1>
                <p style="color: #4a4a4a; font-size: 16px;">Bonjour ${name.trim()},</p>
                <p style="color: #4a4a4a; font-size: 16px;">Merci de vous être inscrit. Confirmez votre adresse email en cliquant sur le bouton ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyLink}" style="background-color: #1a1a1a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Confirmer mon email</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #aaa; font-size: 12px;">Coccinelle.ai - Votre assistant IA</p>
              </div>
            `
          })
        });
      } catch (emailError) {
        logger.error('Failed to send verification email on signup', { error: emailError.message });
      }

      // ========================================
      // NOUVEAU : Retourner aussi le slug et l'email Coccinelle
      // ========================================
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
          name: tenantName, 
          email: email.toLowerCase().trim(), 
          api_key: apiKey,
          slug: slug,  // ← NOUVEAU
          coccinelle_email: `${slug}@coccinelle.ai`  // ← NOUVEAU : email de réception
        }, 
        session: { 
          expires_at: expiresAt.toISOString() 
        } 
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Signup error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de l\'inscription' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      if (!tenant) {
        return new Response(JSON.stringify({ success: false, error: 'Organisation introuvable' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

      // ========================================
      // NOUVEAU : Retourner aussi le slug et l'email Coccinelle
      // ========================================
      return new Response(JSON.stringify({ 
        success: true, 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role 
        }, 
        tenant: { 
          id: tenant.id, 
          name: tenant.name, 
          email: tenant.email,
          slug: tenant.slug,  // ← NOUVEAU
          coccinelle_email: tenant.slug ? `${tenant.slug}@coccinelle.ai` : null  // ← NOUVEAU
        }, 
        session: { 
          expires_at: expiresAt.toISOString() 
        } 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Login error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la connexion' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

      // Calculer trial_active et jours restants
      let trialActive = false;
      let trialDaysRemaining = 0;
      if (tenant.trial_ends_at) {
        const trialEnd = new Date(tenant.trial_ends_at);
        const now = new Date();
        const diff = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        trialActive = diff > 0;
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant_id: user.tenant_id,
          is_active: user.is_active,
          weekly_report_enabled: user.weekly_report_enabled ?? 1,
          created_at: user.created_at
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          api_key: tenant.api_key,
          timezone: tenant.timezone,
          slug: tenant.slug,
          coccinelle_email: tenant.slug ? `${tenant.slug}@coccinelle.ai` : null,
          trial_ends_at: tenant.trial_ends_at,
          trial_active: trialActive,
          trial_days_remaining: trialDaysRemaining,
          setup_completed_at: tenant.setup_completed_at,
          test_call_done: tenant.test_call_done === 1,
          created_at: tenant.created_at
        },
        session: {
          id: session.id,
          expires_at: session.expires_at,
          created_at: session.created_at
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Get profile error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la récupération du profil' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      logger.error('Logout error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la déconnexion' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      logger.error('Refresh token error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors du renouvellement du token' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }

  // ========================================
  // PUT /api/v1/auth/profile
  // ========================================
  if (path === '/api/v1/auth/profile' && method === 'PUT') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { user, tenant } = authResult;
      const body = await request.json();
      const { name, phone, company_name, industry, weekly_report_enabled } = body;

      const now = new Date().toISOString();

      // Mettre à jour le nom de l'utilisateur
      if (name) {
        await env.DB.prepare(`
          UPDATE users
          SET name = ?, updated_at = ?
          WHERE id = ?
        `).bind(name.trim(), now, user.id).run();
      }

      // Mettre à jour weekly_report_enabled
      if (weekly_report_enabled !== undefined) {
        await env.DB.prepare(`
          UPDATE users
          SET weekly_report_enabled = ?, updated_at = ?
          WHERE id = ?
        `).bind(weekly_report_enabled ? 1 : 0, now, user.id).run();
      }

      // Mettre à jour les informations du tenant (entreprise, téléphone, secteur)
      if (company_name || phone || industry) {
        await env.DB.prepare(`
          UPDATE tenants
          SET name = COALESCE(?, name),
              phone = COALESCE(?, phone),
              sector = COALESCE(?, sector),
              updated_at = ?
          WHERE id = ?
        `).bind(
          company_name || null,
          phone || null,
          industry || null,
          now,
          tenant.id
        ).run();
      }

      // Log audit
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'user.profile_update',
        resource_type: 'user',
        resource_id: user.id,
        changes: { name, phone, company_name, industry },
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Profil mis à jour avec succès'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Update profile error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la mise à jour du profil',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // GET /api/v1/auth/check-slug
  // Vérifie si un slug est disponible (utile pour le frontend)
  // ========================================
  if (path === '/api/v1/auth/check-slug' && method === 'GET') {
    try {
      const slug = url.searchParams.get('slug');
      
      if (!slug) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Paramètre slug requis' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const normalizedSlug = generateSlugFromName(slug);
      const available = await isSlugAvailable(env.DB, normalizedSlug);
      
      let suggestions = [];
      if (!available) {
        // Génère quelques suggestions
        for (let i = 2; i <= 4; i++) {
          const candidate = `${normalizedSlug}-${i}`;
          if (await isSlugAvailable(env.DB, candidate)) {
            suggestions.push(candidate);
          }
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        slug: normalizedSlug,
        available: available,
        suggestions: suggestions,
        email_preview: `${normalizedSlug}@coccinelle.ai`
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } catch (error) {
      logger.error('Check slug error', { error: error.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erreur lors de la vérification du slug' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }

  // ========================================
  // POST /api/v1/auth/forgot-password
  // ========================================
  if (path === '/api/v1/auth/forgot-password' && method === 'POST') {
    try {
      const body = await request.json();
      const { email } = body;

      if (!email || !auth.isValidEmail(email)) {
        return new Response(JSON.stringify({ success: true, message: 'Si cet email existe, un lien a été envoyé' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user = await env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email.toLowerCase().trim()).first();

      if (user) {
        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

        await env.DB.prepare(
          'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?'
        ).bind(resetToken, expiresAt, user.id).run();

        // Envoyer email via Resend
        const resetLink = `https://coccinelle-saas.pages.dev/reset-password?token=${resetToken}`;
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
              to: email.toLowerCase().trim(),
              subject: 'Réinitialisez votre mot de passe Coccinelle.ai',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #1a1a1a; font-size: 24px;">Réinitialisation de votre mot de passe</h1>
                  <p style="color: #4a4a4a; font-size: 16px;">Bonjour ${user.name || ''},</p>
                  <p style="color: #4a4a4a; font-size: 16px;">Vous avez demandé la réinitialisation de votre mot de passe Coccinelle.ai.</p>
                  <p style="color: #4a4a4a; font-size: 16px;">Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #1a1a1a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Réinitialiser mon mot de passe</a>
                  </div>
                  <p style="color: #888; font-size: 14px;">Ce lien expire dans 1 heure.</p>
                  <p style="color: #888; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="color: #aaa; font-size: 12px;">Coccinelle.ai - Votre assistant IA</p>
                </div>
              `
            })
          });
        } catch (emailError) {
          logger.error('Failed to send reset email', { error: emailError.message });
        }
      }

      // Toujours retourner 200 pour ne pas révéler si l'email existe
      return new Response(JSON.stringify({ success: true, message: 'Si cet email existe, un lien a été envoyé' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Forgot password error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la demande' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // POST /api/v1/auth/reset-password
  // ========================================
  if (path === '/api/v1/auth/reset-password' && method === 'POST') {
    try {
      const body = await request.json();
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        return new Response(JSON.stringify({ success: false, error: 'Token et nouveau mot de passe requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!auth.isStrongPassword(newPassword)) {
        return new Response(JSON.stringify({ success: false, error: 'Le mot de passe doit contenir minimum 8 caractères, 1 majuscule, 1 minuscule et 1 chiffre' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user = await env.DB.prepare(
        'SELECT id, tenant_id FROM users WHERE reset_token = ?'
      ).bind(token).first();

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Token invalide ou expiré' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier expiration
      const fullUser = await env.DB.prepare(
        'SELECT reset_token_expires FROM users WHERE id = ?'
      ).bind(user.id).first();

      if (!fullUser.reset_token_expires || new Date(fullUser.reset_token_expires) < new Date()) {
        return new Response(JSON.stringify({ success: false, error: 'Token invalide ou expiré' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const passwordHash = await auth.hashPassword(newPassword);
      const now = new Date().toISOString();

      await env.DB.prepare(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ? WHERE id = ?'
      ).bind(passwordHash, now, user.id).run();

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, {
        tenant_id: user.tenant_id,
        user_id: user.id,
        action: 'user.password_reset',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(JSON.stringify({ success: true, message: 'Mot de passe réinitialisé avec succès' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Reset password error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la réinitialisation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // GET /api/v1/auth/verify-email
  // ========================================
  if (path === '/api/v1/auth/verify-email' && method === 'GET') {
    try {
      const verificationToken = url.searchParams.get('token');

      if (!verificationToken) {
        return new Response(JSON.stringify({ success: false, error: 'Token de vérification requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const user = await env.DB.prepare(
        'SELECT id, tenant_id FROM users WHERE verification_token = ?'
      ).bind(verificationToken).first();

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: 'Token invalide ou expiré' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const now = new Date().toISOString();
      await env.DB.prepare(
        'UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = ? WHERE id = ?'
      ).bind(now, user.id).run();

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, {
        tenant_id: user.tenant_id,
        user_id: user.id,
        action: 'user.email_verified',
        resource_type: 'user',
        resource_id: user.id,
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(JSON.stringify({ success: true, message: 'Email vérifié avec succès' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Verify email error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la vérification' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // POST /api/v1/auth/resend-verification
  // ========================================
  if (path === '/api/v1/auth/resend-verification' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user } = authResult;

      const verificationToken = crypto.randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(
        'UPDATE users SET verification_token = ?, updated_at = ? WHERE id = ?'
      ).bind(verificationToken, now, user.id).run();

      // Envoyer email via Resend
      const verifyLink = `https://coccinelle-saas.pages.dev/verify-email?token=${verificationToken}`;
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
            to: user.email,
            subject: 'Confirmez votre adresse email - Coccinelle.ai',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1a1a1a; font-size: 24px;">Confirmez votre email</h1>
                <p style="color: #4a4a4a; font-size: 16px;">Bonjour ${user.name || ''},</p>
                <p style="color: #4a4a4a; font-size: 16px;">Cliquez sur le bouton ci-dessous pour confirmer votre adresse email :</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyLink}" style="background-color: #1a1a1a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">Confirmer mon email</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #aaa; font-size: 12px;">Coccinelle.ai - Votre assistant IA</p>
              </div>
            `
          })
        });
      } catch (emailError) {
        logger.error('Failed to send verification email', { error: emailError.message });
      }

      return new Response(JSON.stringify({ success: true, message: 'Email de vérification envoyé' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Resend verification error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de l\'envoi' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // DELETE /api/v1/auth/account (RGPD)
  // ========================================
  if (path === '/api/v1/auth/account' && method === 'DELETE') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const body = await request.json();
      const { password, confirmation } = body;

      if (!password || !confirmation) {
        return new Response(JSON.stringify({ success: false, error: 'Mot de passe et confirmation requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (confirmation !== 'SUPPRIMER') {
        return new Response(JSON.stringify({ success: false, error: 'Tapez SUPPRIMER pour confirmer' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier le mot de passe
      const fullUser = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
      const passwordValid = await auth.verifyPassword(password, fullUser.password_hash);

      if (!passwordValid) {
        return new Response(JSON.stringify({ success: false, error: 'Mot de passe incorrect' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Log audit AVANT suppression
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'account.deleted',
        resource_type: 'tenant',
        resource_id: tenant.id,
        changes: { email: user.email, tenant_name: tenant.name },
        ip_address: clientIp,
        user_agent: userAgent
      });

      // Supprimer toutes les données du tenant
      const deleteStatements = [
        env.DB.prepare('DELETE FROM sessions WHERE tenant_id = ?').bind(tenant.id),
        env.DB.prepare('DELETE FROM prospects WHERE tenant_id = ?').bind(tenant.id),
        env.DB.prepare('DELETE FROM customers WHERE tenant_id = ?').bind(tenant.id),
        env.DB.prepare('DELETE FROM appointments WHERE tenant_id = ?').bind(tenant.id),
        env.DB.prepare('DELETE FROM products WHERE tenant_id = ?').bind(tenant.id),
        env.DB.prepare('DELETE FROM users WHERE tenant_id = ?').bind(tenant.id),
        env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(tenant.id)
      ];

      await env.DB.batch(deleteStatements);

      return new Response(JSON.stringify({ success: true, message: 'Compte supprimé avec succès. Toutes vos données ont été effacées.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Delete account error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur lors de la suppression du compte' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Route non trouvée
  return null;
}
