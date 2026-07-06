// src/modules/settings/routes.js - Parametres utilisateur et entreprise
import { requireAuth, hashPassword, verifyPassword, isStrongPassword } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';
import { syncHorairesToSlots } from '../shared/horaires-slots.js';

/**
 * Gere toutes les routes /api/v1/settings
 */
export async function handleSettingsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ========================================
  // GET /api/v1/settings
  // Retourne compte utilisateur + infos entreprise + preferences notifications
  // ========================================
  if (path === '/api/v1/settings' && method === 'GET') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      // Recuperer preferences de notification.
      // Isolé dans son propre try/catch : une lecture de notifications qui échoue
      // (table absente, etc.) ne doit JAMAIS faire échouer tout le GET /settings
      // et re-blanchir la page Paramètres (cf. migration 0070).
      let notifPrefs = null;
      try {
        notifPrefs = await env.DB.prepare(`
          SELECT email_after_call, sms_reminder_j1, weekly_summary, quota_alerts
          FROM notification_preferences
          WHERE user_id = ? AND tenant_id = ?
        `).bind(user.id, tenant.id).first();
      } catch (notifError) {
        logger.error('Get settings — notification_preferences lookup failed', { error: notifError.message });
        // notifPrefs reste null → repli sur les défauts ci-dessous
      }

      return new Response(JSON.stringify({
        success: true,
        account: {
          first_name: user.name ? user.name.split(' ')[0] : '',
          last_name: user.name ? user.name.split(' ').slice(1).join(' ') : '',
          email: user.email,
          phone: user.phone || '',
          phone_verified: user.phone_verified || 0,
        },
        company: {
          name: tenant.name || '',
          sector: tenant.sector || '',
          address: tenant.address || '',
          phone: tenant.phone || '',
          email_pro: tenant.email_pro || '',
          horaires: (() => { try { return tenant.horaires ? JSON.parse(tenant.horaires) : null; } catch { return null; } })(),
        },
        notifications: notifPrefs || {
          email_after_call: 1,
          sms_reminder_j1: 1,
          weekly_summary: 1,
          quota_alerts: 1,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Get settings error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la recuperation des parametres'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // PUT /api/v1/settings/account
  // Met a jour prenom, nom, mot de passe
  // ========================================
  if (path === '/api/v1/settings/account' && method === 'PUT') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Corps de requete invalide' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { first_name, last_name, current_password, new_password } = body;

      // Mettre a jour le nom si fourni
      if (first_name !== undefined || last_name !== undefined) {
        const fullName = [first_name || '', last_name || ''].filter(Boolean).join(' ').trim();
        if (fullName) {
          await env.DB.prepare(`
            UPDATE users SET name = ?, updated_at = datetime('now')
            WHERE id = ? AND tenant_id = ?
          `).bind(fullName, user.id, tenant.id).run();
        }
      }

      // Changer le mot de passe si fourni
      if (new_password) {
        if (!current_password) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Le mot de passe actuel est requis'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Verifier le mot de passe actuel
        const userFull = await env.DB.prepare(
          'SELECT password_hash FROM users WHERE id = ?'
        ).bind(user.id).first();

        if (!userFull) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Utilisateur introuvable'
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const passwordValid = await verifyPassword(current_password, userFull.password_hash);
        if (!passwordValid) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Mot de passe actuel incorrect'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!isStrongPassword(new_password)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Le nouveau mot de passe doit contenir au moins 8 caracteres, 1 majuscule, 1 minuscule et 1 chiffre'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const newHash = await hashPassword(new_password);
        await env.DB.prepare(`
          UPDATE users SET password_hash = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(newHash, user.id).run();
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Compte mis a jour'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Update account error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la mise a jour du compte'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // PUT /api/v1/settings/company
  // Met a jour les infos entreprise
  // ========================================
  if (path === '/api/v1/settings/company' && method === 'PUT') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      // Seuls admin et manager peuvent modifier l'entreprise
      if (user.role !== 'admin' && user.role !== 'manager') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Permission insuffisante. Seuls les administrateurs et managers peuvent modifier les informations entreprise.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Corps de requete invalide' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { name, sector, address, phone, email_pro, horaires } = body;

      // Construire la requete UPDATE dynamiquement
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name.trim());
        // Chantier #2 : garder company_name synchronisé avec name (source unique tenants.name)
        updates.push('company_name = ?');
        values.push(name.trim());
      }
      if (sector !== undefined) {
        updates.push('sector = ?');
        values.push(sector);
      }
      if (address !== undefined) {
        updates.push('address = ?');
        values.push(address.trim());
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone.trim());
      }
      if (email_pro !== undefined) {
        updates.push('email_pro = ?');
        values.push(email_pro.trim());
      }
      if (horaires !== undefined) {
        updates.push('horaires = ?');
        values.push(JSON.stringify(horaires));
      }

      if (updates.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Aucune donnee a mettre a jour'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      updates.push("updated_at = datetime('now')");
      values.push(tenant.id);

      await env.DB.prepare(`
        UPDATE tenants SET ${updates.join(', ')}
        WHERE id = ?
      `).bind(...values).run();

      // SSOT horaires : si les horaires société ont été modifiés, les projeter dans
      // availability_slots (agent société par défaut = maître). Non bloquant.
      if (horaires !== undefined) {
        await syncHorairesToSlots(env, tenant.id, horaires);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Informations entreprise mises a jour'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Update company error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la mise a jour des informations entreprise'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // GET /api/v1/settings/usage
  // Retourne l'utilisation courante (minutes vocales, SMS)
  // ========================================
  if (path === '/api/v1/settings/usage' && method === 'GET') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { tenant } = authResult;

      // Obtenir le mois courant
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Compter les appels et la duree totale ce mois
      const callStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_calls,
          COALESCE(SUM(duration_seconds), 0) as total_seconds
        FROM calls
        WHERE tenant_id = ?
          AND created_at >= ?
          AND created_at <= ?
      `).bind(tenant.id, monthStart, monthEnd).first();

      // Compter les SMS envoyes ce mois
      const smsStats = await env.DB.prepare(`
        SELECT COUNT(*) as total_sms
        FROM channel_messages_log
        WHERE tenant_id = ?
          AND channel = 'sms'
          AND direction = 'outbound'
          AND created_at >= ?
          AND created_at <= ?
      `).bind(tenant.id, monthStart, monthEnd).first();

      // Recuperer le plan actuel pour les quotas
      const subscription = await env.DB.prepare(`
        SELECT plan, status, trial_ends_at, current_period_end
        FROM subscriptions
        WHERE tenant_id = ?
        ORDER BY created_at DESC LIMIT 1
      `).bind(tenant.id).first();

      // Quotas par plan
      const planQuotas = {
        essentiel: { minutes: 500, sms: 0 },
        starter: { minutes: 500, sms: 0 },
        pro: { minutes: 1000, sms: 250 },
        business: { minutes: 5000, sms: 1000 },
        trial: { minutes: 60, sms: 10 },
      };

      const plan = subscription?.plan || 'trial';
      const quota = planQuotas[plan] || planQuotas.trial;
      const minutesUsed = Math.round((callStats?.total_seconds || 0) / 60);
      const smsUsed = smsStats?.total_sms || 0;

      return new Response(JSON.stringify({
        success: true,
        usage: {
          minutes_used: minutesUsed,
          minutes_included: quota.minutes,
          sms_used: smsUsed,
          sms_included: quota.sms,
          plan: plan,
          status: subscription?.status || 'trial',
          trial_ends_at: subscription?.trial_ends_at || null,
          current_period_end: subscription?.current_period_end || null,
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Get usage error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la recuperation de l\'utilisation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // PUT /api/v1/settings/notifications
  // Met a jour les preferences de notifications
  // ========================================
  if (path === '/api/v1/settings/notifications' && method === 'PUT') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ success: false, error: 'Corps de requete invalide' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const {
        email_after_call = 1,
        sms_reminder_j1 = 1,
        weekly_summary = 1,
        quota_alerts = 1,
      } = body;

      // UPSERT notification_preferences
      await env.DB.prepare(`
        INSERT INTO notification_preferences (user_id, tenant_id, email_after_call, sms_reminder_j1, weekly_summary, quota_alerts, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET
          email_after_call = excluded.email_after_call,
          sms_reminder_j1 = excluded.sms_reminder_j1,
          weekly_summary = excluded.weekly_summary,
          quota_alerts = excluded.quota_alerts,
          updated_at = datetime('now')
      `).bind(
        user.id,
        tenant.id,
        email_after_call ? 1 : 0,
        sms_reminder_j1 ? 1 : 0,
        weekly_summary ? 1 : 0,
        quota_alerts ? 1 : 0
      ).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Preferences de notifications mises a jour'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Update notifications error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la mise a jour des notifications'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return null;
}
