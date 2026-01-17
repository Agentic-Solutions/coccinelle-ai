export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '../../../../lib/rateLimiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Cloudflare Workers limite à 60s

interface AskRequest {
  question: string;
  tenantId?: string;
  maxResults?: number;
  useAI?: boolean; // Toggle pour activer/désactiver l'IA
}

// Fonction de recherche par mots-clés (fallback si pas d'API key)
function simpleSearch(query: string, documents: any[], maxResults: number) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const results = documents.map((doc: any) => {
    const content = (doc.title + ' ' + doc.content).toLowerCase();
    let score = 0;

    queryWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length;
        if (doc.title.toLowerCase().includes(word)) {
          score += 5;
        }
      }
    });

    return { ...doc, score };
  })
  .filter(doc => doc.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults);

  return results;
}

// Réponse intelligente avec Claude
async function generateAIResponse(question: string, documents: any[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }

  const anthropic = new Anthropic({ apiKey });

  // Préparer le contexte
  const context = documents
    .map((doc, idx) => `[Document ${idx + 1}: ${doc.title}]\n${doc.content}`)
    .join('\n\n---\n\n');

  const systemPrompt = `Tu es un assistant intelligent qui répond aux questions en te basant UNIQUEMENT sur les documents fournis.

Règles importantes:
- Ne réponds QUE si la réponse est dans les documents
- Cite précisément les documents utilisés
- Si l'information n'est pas dans les documents, dis-le clairement
- Sois concis et précis
- Utilise un ton professionnel mais accessible`;

  const userPrompt = `Voici les documents de la Knowledge Base:

${context}

---

Question: ${question}

Réponds à la question en te basant UNIQUEMENT sur ces documents. Cite les documents sources utilisés.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    temperature: 0.3,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  return {
    answer: responseText,
    usage: message.usage,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AskRequest = await request.json();
    const { question, tenantId = 'anonymous', maxResults = 3, useAI = true } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { success: false, error: 'Question manquante' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`rag_${tenantId}`, {
      maxRequests: 20, // 20 requêtes
      windowMs: 60 * 1000, // par minute
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit dépassé. Réessayez dans ${rateLimitResult.retryAfter} secondes.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    const documents = (body as any).documents || [];

    if (documents.length === 0) {
      return NextResponse.json({
        success: true,
        question: question,
        answer: "Aucun document dans votre Knowledge Base. Ajoutez des documents pour commencer !",
        sources: [],
        confidence: 0.0,
        mode: 'no-documents',
      });
    }

    // Recherche des documents pertinents
    const relevantDocs = simpleSearch(question, documents, maxResults);

    if (relevantDocs.length === 0) {
      return NextResponse.json({
        success: true,
        question: question,
        answer: "Je n'ai pas trouvé d'information pertinente dans vos documents pour cette question. Essayez de reformuler ou d'ajouter plus de contenu.",
        sources: [],
        confidence: 0.0,
        mode: 'no-results',
      });
    }

    // Mode AI avec Claude
    if (useAI) {
      try {
        const aiResponse = await generateAIResponse(question, relevantDocs);

        return NextResponse.json({
          success: true,
          question: question,
          answer: aiResponse.answer,
          sources: relevantDocs.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            url: doc.url,
            excerpt: doc.content.substring(0, 200).trim() + '...',
            score: doc.score,
            confidence: Math.min((doc.score / 10) * 100, 100).toFixed(0),
          })),
          confidence: 0.9,
          mode: 'ai',
          usage: aiResponse.usage,
          rateLimit: {
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          },
        });
      } catch (error: any) {
        // Fallback vers mode simple si erreur API
        if (error.message === 'API_KEY_NOT_CONFIGURED') {
          console.warn('⚠️ API Anthropic non configurée, fallback vers recherche simple');
        } else {
          console.error('❌ Erreur API Anthropic:', error);
        }
        // Continue vers le mode simple ci-dessous
      }
    }

    // Mode simple (fallback ou si useAI=false)
    const topDoc = relevantDocs[0];
    const excerpt = topDoc.content.substring(0, 300).trim() + '...';
    const answer = `D'après ${relevantDocs.length} document${relevantDocs.length > 1 ? 's' : ''} trouvé${relevantDocs.length > 1 ? 's' : ''} :\n\n${excerpt}\n\n💡 Mode recherche basique. Configurez une clé API Anthropic pour des réponses IA avancées.`;

    return NextResponse.json({
      success: true,
      question: question,
      answer: answer,
      sources: relevantDocs.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        excerpt: doc.content.substring(0, 200).trim() + '...',
        score: doc.score,
        confidence: Math.min((doc.score / 10) * 100, 100).toFixed(0),
      })),
      confidence: Math.min((topDoc.score / 10) * 100, 100) / 100,
      mode: 'simple',
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });

  } catch (error) {
    console.error('❌ Erreur API ask:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne',
      },
      { status: 500 }
    );
  }
}
