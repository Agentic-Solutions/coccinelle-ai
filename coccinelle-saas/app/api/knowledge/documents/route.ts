export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Document {
  id: string;
  title: string;
  content: string;
  url?: string;
  sourceType: 'crawl' | 'manual' | 'assistant';
  created_at: string;
  tenantId?: string;
}

/**
 * API Route pour gérer les documents de la Knowledge Base
 * GET /api/knowledge/documents - Récupérer tous les documents
 * POST /api/knowledge/documents - Ajouter un document
 */

export async function GET(request: NextRequest) {
  try {
    // Pour l'instant, on retourne les documents vides
    // En production, cela viendrait d'une base de données
    return NextResponse.json({
      success: true,
      documents: []
    });
  } catch (error) {
    console.error('❌ Erreur GET documents:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, url, sourceType = 'manual', tenantId } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title et content requis' },
        { status: 400 }
      );
    }

    const document: Document = {
      id: `doc_${Date.now()}`,
      title,
      content,
      url,
      sourceType,
      created_at: new Date().toISOString(),
      tenantId
    };

    console.log(`✅ Document créé: ${document.id} - ${title}`);

    // En production, sauvegarder dans une base de données
    // Pour l'instant, on retourne juste le document créé

    return NextResponse.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('❌ Erreur POST document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
