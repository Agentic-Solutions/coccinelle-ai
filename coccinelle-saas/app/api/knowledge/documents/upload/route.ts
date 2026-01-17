export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: 'upload';
  created_at: string;
  tenantId?: string;
  fileName?: string;
  fileType?: string;
}

/**
 * API Route pour uploader des fichiers (PDF, TXT, DOCX)
 * POST /api/knowledge/documents/upload
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tenantId = formData.get('tenantId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    console.log(`📤 Upload du fichier: ${file.name} (${file.type})`);

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Fichier trop volumineux (max 10MB)' },
        { status: 400 }
      );
    }

    // Extraire le texte selon le type de fichier
    let content = '';
    const fileName = file.name;
    const fileType = file.name.split('.').pop()?.toLowerCase();

    try {
      if (fileType === 'txt') {
        // Fichier texte simple
        content = await file.text();
      } else if (fileType === 'pdf') {
        // Pour les PDF, on utiliserait pdf-parse
        // TODO: Installer pdf-parse avec `npm install pdf-parse`
        const buffer = await file.arrayBuffer();
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(Buffer.from(buffer));
        content = pdfData.text;
      } else if (fileType === 'doc' || fileType === 'docx') {
        // Pour les DOCX, on utiliserait mammoth
        // TODO: Installer mammoth avec `npm install mammoth`
        const buffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        content = result.value;
      } else {
        return NextResponse.json(
          { success: false, error: `Type de fichier non supporté: ${fileType}` },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('❌ Erreur parsing fichier:', parseError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la lecture du fichier' },
        { status: 500 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Le fichier est vide ou n\'a pas pu être lu' },
        { status: 400 }
      );
    }

    // Créer le document
    const document: Document = {
      id: `doc_upload_${Date.now()}`,
      title: fileName.replace(/\.[^/.]+$/, ''), // Nom sans extension
      content: content.substring(0, 50000), // Limiter à 50k caractères
      sourceType: 'upload',
      created_at: new Date().toISOString(),
      tenantId,
      fileName,
      fileType
    };

    console.log(`✅ Fichier parsé: ${document.title} (${content.length} caractères)`);

    return NextResponse.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('❌ Erreur API upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
}
