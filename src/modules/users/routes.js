// src/modules/users/routes.js - Gestion des utilisateurs et invitations
import { requireAuth, generateId, hashPassword, generateToken, logAudit, isValidEmail, isStrongPassword } from '../auth/helpers.js';
import { hasPermission } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

/**
 * Gère toutes les routes /api/v1/users
 */
export async function handleUsersRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ========================================
  // GET /api/v1/users/invite/:token (sans auth)
  // Récupère les infos d'une invitation par token
  // ========================================
  const inviteTokenMatch = path.match(/^\/api\/v1\/users\/invite\/([^/]+)$/);
  if (inviteTokenMatch && method === 'GET') {
    try {
      const token = inviteTokenMatch[1];

      const invitation = await env.DB.prepare(`
        SELECT ui.*, t.name as tenant_name
        FROM user_invitations ui
        JOIN tenants t ON t.id = ui.tenant_id
        WHERE ui.token = ? AND ui.accepted_at IS NULL
      `).bind(token).first();

      if (!invitation) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invitation introuvable ou déjà acceptée'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier expiration
      if (new Date(invitation.expires_at) < new Date()) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cette invitation a expiré'
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        invitation: {
          tenant_name: invitation.tenant_name,
          role: invitation.role,
          email: invitation.email,
          message: invitation.message
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Get invitation error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la récupération de l\'invitation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // POST /api/v1/users/accept-invite (sans auth)
  // Accepte une invitation et crée le compte
  // ========================================
  if (path === '/api/v1/users/accept-invite' && method === 'POST') {
    try {
      const body = await request.json();
      const { token, name, password } = body;

      if (!token || !name || !password) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token, nom et mot de passe requis'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!isStrongPassword(password)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Mot de passe trop faible (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Récupérer l'invitation
      const invitation = await env.DB.prepare(`
        SELECT * FROM user_invitations
        WHERE token = ? AND accepted_at IS NULL
      `).bind(token).first();

      if (!invitation) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invitation introuvable ou déjà acceptée'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier expiration
      if (new Date(invitation.expires_at) < new Date()) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cette invitation a expiré'
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier que l'email n'est pas déjà utilisé
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(invitation.email.toLowerCase().trim()).first();

      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Un compte existe déjà avec cet email'
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const now = new Date().toISOString();
      const userId = generateId('user');
      const passwordHash = await hashPassword(password);

      // Créer le user
      await env.DB.prepare(`
        INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        userId,
        invitation.tenant_id,
        invitation.email.toLowerCase().trim(),
        passwordHash,
        name.trim(),
        invitation.role,
        now,
        now
      ).run();

      // Marquer l'invitation comme acceptée
      await env.DB.prepare(`
        UPDATE user_invitations SET accepted_at = ? WHERE id = ?
      `).bind(now, invitation.id).run();

      // Générer JWT
      const jwtToken = generateToken({
        user_id: userId,
        tenant_id: invitation.tenant_id,
        role: invitation.role,
        email: invitation.email.toLowerCase().trim()
      }, env.JWT_SECRET, '7d');

      // Créer session
      const sessionId = generateId('session');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';

      await env.DB.prepare(`
        INSERT INTO sessions (id, user_id, tenant_id, token, ip_address, user_agent, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(sessionId, userId, invitation.tenant_id, jwtToken, clientIp, userAgent, expiresAt.toISOString(), now).run();

      await logAudit(env, {
        tenant_id: invitation.tenant_id,
        user_id: userId,
        action: 'user.invite_accepted',
        resource_type: 'user',
        resource_id: userId,
        changes: { email: invitation.email, role: invitation.role, invitation_id: invitation.id },
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(JSON.stringify({
        success: true,
        token: jwtToken,
        user: {
          id: userId,
          email: invitation.email.toLowerCase().trim(),
          name: name.trim(),
          role: invitation.role
        }
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Accept invite error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de l\'acceptation de l\'invitation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // Routes authentifiées ci-dessous
  // ========================================

  // ========================================
  // GET /api/v1/users
  // Liste les utilisateurs et invitations en attente
  // ========================================
  if (path === '/api/v1/users' && method === 'GET') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      // Vérifier permission manage_employees
      const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
      if (!canManage) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Permission insuffisante'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Récupérer les utilisateurs
      const users = await env.DB.prepare(`
        SELECT id, email, name, role, is_active, created_at
        FROM users
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `).bind(tenant.id).all();

      // Récupérer les invitations en attente
      const pendingInvitations = await env.DB.prepare(`
        SELECT id, email, role, message, invited_by, expires_at, created_at
        FROM user_invitations
        WHERE tenant_id = ? AND accepted_at IS NULL
        ORDER BY created_at DESC
      `).bind(tenant.id).all();

      return new Response(JSON.stringify({
        success: true,
        users: users.results || [],
        pending_invitations: pendingInvitations.results || []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('List users error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // POST /api/v1/users/invite
  // Envoie une invitation par email
  // ========================================
  if (path === '/api/v1/users/invite' && method === 'POST') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      // Vérifier permission
      const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
      if (!canManage) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Permission insuffisante'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json();
      const { email, role, message } = body;

      if (!email || !isValidEmail(email)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email invalide'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (role && !['manager', 'employee'].includes(role)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rôle invalide (manager ou employee)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier si l'email est déjà un user du tenant
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ? AND tenant_id = ?'
      ).bind(email.toLowerCase().trim(), tenant.id).first();

      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cet utilisateur fait déjà partie de votre équipe'
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier s'il y a déjà une invitation en attente
      const existingInvitation = await env.DB.prepare(
        'SELECT id FROM user_invitations WHERE email = ? AND tenant_id = ? AND accepted_at IS NULL'
      ).bind(email.toLowerCase().trim(), tenant.id).first();

      if (existingInvitation) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Une invitation est déjà en attente pour cet email'
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const invitationId = generateId('inv');
      const inviteToken = crypto.randomUUID();
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Insérer l'invitation
      await env.DB.prepare(`
        INSERT INTO user_invitations (id, tenant_id, email, role, token, message, invited_by, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        invitationId,
        tenant.id,
        email.toLowerCase().trim(),
        role || 'employee',
        inviteToken,
        message || null,
        user.id,
        expiresAt.toISOString(),
        now
      ).run();

      // Envoyer l'email via Resend
      const inviteUrl = `https://coccinelle-saas.pages.dev/accept-invite?token=${inviteToken}`;
      const roleName = (role || 'employee') === 'manager' ? 'Manager' : 'Collaborateur';

      try {
        if (env.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Coccinelle.ai <noreply@coccinelle.ai>',
              to: [email.toLowerCase().trim()],
              subject: `Vous êtes invité à rejoindre ${tenant.name} sur Coccinelle.ai`,
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                  <div style="background: white; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="color: #111827; font-size: 24px; margin: 0;">Coccinelle.ai</h1>
                    </div>

                    <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">
                      Vous avez été invité !
                    </h2>

                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                      <strong>${user.name}</strong> vous invite à rejoindre <strong>${tenant.name}</strong>
                      sur Coccinelle.ai en tant que <strong>${roleName}</strong>.
                    </p>

                    ${message ? `
                    <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">Message :</p>
                      <p style="color: #374151; font-size: 15px; margin: 0;">${message}</p>
                    </div>
                    ` : ''}

                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${inviteUrl}"
                         style="display: inline-block; background: #111827; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        Accepter l'invitation
                      </a>
                    </div>

                    <p style="color: #9ca3af; font-size: 13px; text-align: center;">
                      Cette invitation expire dans 7 jours. Si vous n'avez pas demandé cette invitation, ignorez cet email.
                    </p>
                  </div>
                </body>
                </html>
              `
            })
          });
        }
      } catch (emailError) {
        logger.error('Failed to send invitation email', { error: emailError.message });
        // On continue même si l'email échoue
      }

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgentStr = request.headers.get('User-Agent') || 'unknown';
      await logAudit(env, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'user.invite_sent',
        resource_type: 'invitation',
        resource_id: invitationId,
        changes: { email, role: role || 'employee' },
        ip_address: clientIp,
        user_agent: userAgentStr
      });

      return new Response(JSON.stringify({
        success: true,
        invitation_id: invitationId
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Invite user error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de l\'envoi de l\'invitation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // PUT /api/v1/users/:id/role
  // Changer le rôle d'un utilisateur
  // ========================================
  const roleMatch = path.match(/^\/api\/v1\/users\/([^/]+)\/role$/);
  if (roleMatch && method === 'PUT') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const targetUserId = roleMatch[1];

      // Admin only
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Seul un administrateur peut modifier les rôles'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json();
      const { role } = body;

      if (!role || !['admin', 'manager', 'employee'].includes(role)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rôle invalide (admin, manager ou employee)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE users SET role = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).bind(role, now, targetUserId, tenant.id).run();

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgentStr = request.headers.get('User-Agent') || 'unknown';
      await logAudit(env, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'user.role_changed',
        resource_type: 'user',
        resource_id: targetUserId,
        changes: { new_role: role },
        ip_address: clientIp,
        user_agent: userAgentStr
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Rôle mis à jour avec succès'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Update user role error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la mise à jour du rôle'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // DELETE /api/v1/users/:id
  // Désactiver un utilisateur (soft delete)
  // ========================================
  const deleteMatch = path.match(/^\/api\/v1\/users\/([^/]+)$/);
  if (deleteMatch && method === 'DELETE') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const targetUserId = deleteMatch[1];

      // Admin only
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Seul un administrateur peut désactiver des utilisateurs'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Ne peut pas se supprimer soi-même
      if (targetUserId === user.id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Vous ne pouvez pas désactiver votre propre compte'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE users SET is_active = 0, updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).bind(now, targetUserId, tenant.id).run();

      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgentStr = request.headers.get('User-Agent') || 'unknown';
      await logAudit(env, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'user.deactivated',
        resource_type: 'user',
        resource_id: targetUserId,
        ip_address: clientIp,
        user_agent: userAgentStr
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Utilisateur désactivé avec succès'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Delete user error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la désactivation de l\'utilisateur'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // DELETE /api/v1/users/invite/:id
  // Annuler une invitation
  // ========================================
  const cancelInviteMatch = path.match(/^\/api\/v1\/users\/invite\/([^/]+)$/);
  if (cancelInviteMatch && method === 'DELETE') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const invitationId = cancelInviteMatch[1];

      const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
      if (!canManage) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Permission insuffisante'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await env.DB.prepare(`
        DELETE FROM user_invitations
        WHERE id = ? AND tenant_id = ? AND accepted_at IS NULL
      `).bind(invitationId, tenant.id).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Invitation annulée'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Cancel invitation error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de l\'annulation de l\'invitation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return null;
}
