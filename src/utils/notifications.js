/**
 * Helper pour créer des notifications en base
 */
export async function createNotification(env, { tenant_id, user_id, type, title, message, data }) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await env.DB.prepare(`
    INSERT INTO notifications (id, tenant_id, user_id, type, title, message, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(id, tenant_id, user_id || null, type, title, message || null, data ? JSON.stringify(data) : null).run();
  return id;
}
