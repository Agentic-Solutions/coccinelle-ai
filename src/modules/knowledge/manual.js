// Routes pour la saisie manuelle : FAQ et Snippets
// Auth : JWT via requireAuth()

import * as auth from '../auth/helpers.js';

export async function handleKnowledgeManualRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ==================== FAQ ENDPOINTS ====================
  
  // GET /api/v1/knowledge/faq - Liste des FAQ
  if (path === '/api/v1/knowledge/faq' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const category = url.searchParams.get('category');

      let query = `
        SELECT id, question, answer, category, keywords, is_active, created_at
        FROM knowledge_faq
        WHERE tenant_id = ?
      `;
      const params = [tenant.id];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const result = await env.DB.prepare(query).bind(...params).all();

      return new Response(JSON.stringify({
        success: true,
        faq: result.results || [],
        count: result.results?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erreur liste FAQ:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/v1/knowledge/faq - Créer FAQ
  if (path === '/api/v1/knowledge/faq' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const body = await request.json();
      const { question, answer, category, keywords } = body;

      if (!question || !answer) {
        return new Response(JSON.stringify({ 
          error: 'Question et réponse requises' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const faqId = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await env.DB.prepare(`
        INSERT INTO knowledge_faq (
          id, tenant_id, question, answer, category, keywords, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).bind(
        faqId,
        tenant.id,
        question,
        answer,
        category || null,
        keywords || null
      ).run();

      return new Response(JSON.stringify({
        success: true,
        faqId,
        message: 'FAQ créée avec succès'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erreur création FAQ:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE /api/v1/knowledge/faq/:id - Supprimer FAQ
  if (path.startsWith('/api/v1/knowledge/faq/') && method === 'DELETE') {
    try {
      const faqId = path.split('/').pop();
      const authResult = await auth.requireAuth(request, env);
      
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { tenant } = authResult;

      await env.DB.prepare(`
        DELETE FROM knowledge_faq
        WHERE id = ? AND tenant_id = ?
      `).bind(faqId, tenant.id).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'FAQ supprimée avec succès'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erreur suppression FAQ:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ==================== SNIPPETS ENDPOINTS ====================
  
  // GET /api/v1/knowledge/snippets - Liste des snippets
  if (path === '/api/v1/knowledge/snippets' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { tenant } = authResult;
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const category = url.searchParams.get('category');

      let query = `
        SELECT id, name, content, category, usage_context, variables, is_active, created_at
        FROM knowledge_snippets
        WHERE tenant_id = ?
      `;
      const params = [tenant.id];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const result = await env.DB.prepare(query).bind(...params).all();

      return new Response(JSON.stringify({
        success: true,
        snippets: result.results || [],
        count: result.results?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erreur liste snippets:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/v1/knowledge/snippets - Créer snippet
  if (path === '/api/v1/knowledge/snippets' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { tenant } = authResult;
      const body = await request.json();
      const { name, content, category, usage_context, variables } = body;

      if (!name || !content) {
        return new Response(JSON.stringify({ 
          error: 'Nom et contenu requis' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const snippetId = `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await env.DB.prepare(`
        INSERT INTO knowledge_snippets (
          id, tenant_id, name, content, category, usage_context, variables, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).bind(
        snippetId,
        tenant.id,
        name,
        content,
        category || null,
        usage_context || null,
        variables || null
      ).run();

      return new Response(JSON.stringify({
        success: true,
        snippetId,
        message: 'Snippet créé avec succès'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erreur création snippet:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE /api/v1/knowledge/snippets/:id - Supprimer snippet
  if (path.startsWith('/api/v1/knowledge/snippets/') && method === 'DELETE') {
    try {
      const snippetId = path.split('/').pop();
      const authResult = await auth.requireAuth(request, env);
      
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { tenant } = authResult;

      await env.DB.prepare(`
        DELETE FROM knowledge_snippets
        WHERE id = ? AND tenant_id = ?
      `).bind(snippetId, tenant.id).run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Snippet supprimé avec succès'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erreur suppression snippet:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Aucune route ne correspond
  return null;
}
