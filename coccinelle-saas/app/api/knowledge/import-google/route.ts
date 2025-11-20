import { NextRequest, NextResponse } from 'next/server';
import { extractGoogleBusinessData, googleBusinessToDocuments } from '@/lib/google-business-extractor';

interface ImportGoogleRequest {
  url: string;
  tenantId?: string;
}

/**
 * API Route pour importer une fiche Google Business
 * POST /api/knowledge/import-google
 */
export async function POST(request: NextRequest) {
  try {
    const body: ImportGoogleRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL manquante' },
        { status: 400 }
      );
    }

    // Valider que c'est une URL Google
    if (!url.includes('google.com')) {
      return NextResponse.json(
        { success: false, error: 'L\'URL doit être une URL Google (Google Maps, Google Search, etc.)' },
        { status: 400 }
      );
    }

    console.log('📍 Import Google Business depuis:', url);

    // Extraire les données
    const businessData = await extractGoogleBusinessData(url);

    if (!businessData || !businessData.name) {
      return NextResponse.json(
        { success: false, error: 'Impossible d\'extraire les données. Vérifiez que l\'URL est correcte.' },
        { status: 400 }
      );
    }

    console.log('✅ Données extraites:', businessData.name);

    // Convertir en documents structurés
    const documents = googleBusinessToDocuments(businessData);

    console.log('📚 Documents créés:', documents.length);

    return NextResponse.json({
      success: true,
      businessData,
      documents,
      message: `${documents.length} document(s) importé(s) depuis ${businessData.name}`
    });

  } catch (error) {
    console.error('❌ Erreur import Google Business:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
}
