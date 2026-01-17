export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface StructureRequest {
  documents: Array<{
    id: string;
    title: string;
    content: string;
    sourceType: 'crawl' | 'manual' | 'google';
  }>;
  tenantId?: string;
}

interface StructuredInfo {
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  hours?: {
    [key: string]: string;
  };
  services?: string[];
  about?: string;
  category?: string;
}

/**
 * API Route pour structurer les pages crawlées avec l'IA
 * POST /api/knowledge/structure-ai
 */
export async function POST(request: NextRequest) {
  try {
    const body: StructureRequest = await request.json();
    const { documents } = body;

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun document à structurer' },
        { status: 400 }
      );
    }

    // Filtrer uniquement les documents crawlés
    const crawledDocs = documents.filter(doc => doc.sourceType === 'crawl');

    if (crawledDocs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune page crawlée à structurer' },
        { status: 400 }
      );
    }

    console.log('🤖 Structuration IA de', crawledDocs.length, 'pages...');

    // Initialiser Anthropic
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY non configurée');
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Combiner tout le contenu des pages crawlées
    const combinedContent = crawledDocs.map((doc, idx) =>
      `=== PAGE ${idx + 1}: ${doc.title} ===\n${doc.content}`
    ).join('\n\n');

    // Prompt pour extraire les informations structurées
    const prompt = `Tu es un assistant expert en extraction d'informations business depuis des pages web.

Analyse le contenu suivant provenant de plusieurs pages d'un site web et extrais les informations business suivantes au format JSON:

{
  "contact": {
    "address": "adresse complète si trouvée",
    "phone": "numéro de téléphone si trouvé",
    "email": "email si trouvé",
    "website": "URL du site web si trouvée"
  },
  "hours": {
    "Lundi": "horaires",
    "Mardi": "horaires",
    ...
  },
  "services": ["service 1", "service 2", ...],
  "about": "description courte de l'entreprise/activité (2-3 phrases max)",
  "category": "catégorie de l'entreprise (ex: Restaurant, Agence Web, etc.)"
}

Instructions:
- N'inclue que les informations RÉELLEMENT trouvées dans le contenu
- Si une information n'est pas trouvée, ne l'inclue pas dans le JSON
- Pour les services, liste uniquement les services/produits principaux (max 10)
- Pour "about", crée une description concise en français basée sur le contenu
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après

CONTENU DES PAGES:

${combinedContent.substring(0, 15000)}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('🤖 Réponse IA:', responseText);

    // Parser le JSON
    let structuredInfo: StructuredInfo;
    try {
      // Extraire le JSON de la réponse (en cas de texte avant/après)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé dans la réponse');
      }
      structuredInfo = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de l\'analyse des données' },
        { status: 500 }
      );
    }

    // Créer les documents structurés
    const structuredDocuments: Array<{
      id: string;
      title: string;
      content: string;
      category: string;
      sourceType: 'google';
      created_at: string;
    }> = [];

    const timestamp = Date.now();

    // Documents Contact - créer un document séparé pour chaque information
    if (structuredInfo.contact && Object.keys(structuredInfo.contact).length > 0) {
      let docIndex = 0;

      if (structuredInfo.contact.address) {
        structuredDocuments.push({
          id: `doc_ai_contact_address_${timestamp}_${docIndex++}`,
          title: 'Contact - Adresse',
          content: `# Adresse\n\n**Adresse**: ${structuredInfo.contact.address}\n\n`,
          category: 'contact',
          sourceType: 'google',
          created_at: new Date().toISOString()
        });
      }

      if (structuredInfo.contact.phone) {
        structuredDocuments.push({
          id: `doc_ai_contact_phone_${timestamp}_${docIndex++}`,
          title: 'Contact - Téléphone',
          content: `# Téléphone\n\n**Téléphone**: ${structuredInfo.contact.phone}\n\n`,
          category: 'contact',
          sourceType: 'google',
          created_at: new Date().toISOString()
        });
      }

      if (structuredInfo.contact.email) {
        structuredDocuments.push({
          id: `doc_ai_contact_email_${timestamp}_${docIndex++}`,
          title: 'Contact - Email',
          content: `# Email\n\n**Email**: ${structuredInfo.contact.email}\n\n`,
          category: 'contact',
          sourceType: 'google',
          created_at: new Date().toISOString()
        });
      }

      if (structuredInfo.contact.website) {
        structuredDocuments.push({
          id: `doc_ai_contact_website_${timestamp}_${docIndex++}`,
          title: 'Contact - Site web',
          content: `# Site web\n\n**Site web**: ${structuredInfo.contact.website}\n\n`,
          category: 'contact',
          sourceType: 'google',
          created_at: new Date().toISOString()
        });
      }
    }

    // Documents Horaires - créer un document séparé pour chaque jour
    if (structuredInfo.hours && Object.keys(structuredInfo.hours).length > 0) {
      let dayIndex = 0;
      Object.entries(structuredInfo.hours).forEach(([day, hours]) => {
        structuredDocuments.push({
          id: `doc_ai_hours_${day}_${timestamp}_${dayIndex++}`,
          title: `Horaires - ${day}`,
          content: `# Horaires\n\n**${day}**: ${hours}\n\n`,
          category: 'schedule',
          sourceType: 'google',
          created_at: new Date().toISOString()
        });
      });
    }

    // Documents Services - créer un document séparé pour chaque service
    if (structuredInfo.services && structuredInfo.services.length > 0) {
      structuredInfo.services.forEach((service, index) => {
        structuredDocuments.push({
          id: `doc_ai_service_${timestamp}_${index}`,
          title: 'Service',
          content: `# Service\n\n- ${service}\n`,
          category: 'services',
          sourceType: 'google',
          created_at: new Date().toISOString()
        });
      });
    }

    // Document À propos
    if (structuredInfo.about) {
      let aboutContent = `# À propos\n\n${structuredInfo.about}\n\n`;

      if (structuredInfo.category) {
        aboutContent += `**Catégorie**: ${structuredInfo.category}\n\n`;
      }

      structuredDocuments.push({
        id: `doc_ai_about_${timestamp}`,
        title: 'À propos',
        content: aboutContent,
        category: 'about',
        sourceType: 'google',
        created_at: new Date().toISOString()
      });
    }

    console.log('✅ Documents structurés créés:', structuredDocuments.length);

    return NextResponse.json({
      success: true,
      structuredDocuments,
      originalCount: crawledDocs.length,
      message: `${structuredDocuments.length} document(s) structuré(s) créé(s) depuis ${crawledDocs.length} page(s)`
    });

  } catch (error) {
    console.error('❌ Erreur structuration IA:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
}
