// Processeur intelligent pour transformer les pages crawlées en documents structurés

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

export interface StructuredDocument {
  title: string;
  content: string;
  category: string;
}

/**
 * Consolide et structure les pages crawlées en documents compréhensibles
 * En utilisant Claude pour extraire l'information pertinente
 */
export async function processCrawledPages(
  pages: CrawledPage[],
  apiKey: string
): Promise<StructuredDocument[]> {
  // Préparer le contenu de toutes les pages
  const allContent = pages
    .map((page, idx) => `=== Page ${idx + 1}: ${page.title} ===\nURL: ${page.url}\n${page.content}`)
    .join('\n\n');

  const systemPrompt = `Tu es un assistant spécialisé dans l'analyse et la structuration de contenu web.

Ta tâche est d'analyser le contenu d'un site web crawlé et de le transformer en documents structurés et compréhensibles pour une base de connaissances.

Tu dois identifier et extraire :
1. **Services** : Liste des services/produits proposés avec descriptions
2. **Tarifs et Prix** : Informations sur les tarifs
3. **Horaires** : Horaires d'ouverture, disponibilités
4. **À propos** : Présentation de l'entreprise, histoire, équipe
5. **FAQ** : Questions fréquentes et réponses
6. **Contact** : Informations de contact
7. **Politique** : Conditions d'annulation, politique de confidentialité

Pour chaque catégorie trouvée, crée un document structuré avec :
- Un titre clair
- Un contenu bien formaté et lisible
- Les informations consolidées de toutes les pages pertinentes

**IMPORTANT** :
- Ne crée QUE les documents pour lesquels tu as trouvé du contenu pertinent
- Rédige dans un style professionnel et clair
- Consolide les informations redondantes
- Ignore le contenu non pertinent (navigation, footer, etc.)

Format de réponse (JSON) :
{
  "documents": [
    {
      "title": "Nos Services",
      "category": "services",
      "content": "Contenu formaté et lisible..."
    },
    ...
  ]
}`;

  const userPrompt = `Voici le contenu crawlé d'un site web :

${allContent}

Analyse ce contenu et crée des documents structurés pour la base de connaissances.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: userPrompt
        }],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    // Extraire le JSON de la réponse
    const jsonMatch = content.match(/\{[\s\S]*"documents"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.documents || [];
  } catch (error) {
    console.error('Error processing crawled pages:', error);
    // Fallback : retourner des documents basiques
    return createBasicDocuments(pages);
  }
}

/**
 * Fallback : crée des documents basiques si l'IA échoue
 */
function createBasicDocuments(pages: CrawledPage[]): StructuredDocument[] {
  // Consolider tout le contenu en un seul document
  const consolidatedContent = pages
    .map(page => `## ${page.title}\n\n${page.content}`)
    .join('\n\n---\n\n');

  return [
    {
      title: 'Informations du site web',
      category: 'general',
      content: consolidatedContent
    }
  ];
}

/**
 * Version locale sans IA (pour le mode démo)
 * Extrait les informations basiques sans appel API
 */
export function processLocalCrawl(pages: CrawledPage[]): StructuredDocument[] {
  const documents: StructuredDocument[] = [];

  // Essayer de détecter les catégories par mots-clés
  const serviceKeywords = ['service', 'prestation', 'offre', 'produit'];
  const pricingKeywords = ['tarif', 'prix', 'coût', 'forfait'];
  const scheduleKeywords = ['horaire', 'ouverture', 'disponibilité'];
  const aboutKeywords = ['à propos', 'qui sommes', 'équipe', 'histoire'];
  const contactKeywords = ['contact', 'téléphone', 'email', 'adresse'];

  // Séparer les pages par catégorie
  const categorizedPages: { [key: string]: CrawledPage[] } = {
    services: [],
    pricing: [],
    schedule: [],
    about: [],
    contact: [],
    other: []
  };

  pages.forEach(page => {
    const lowerTitle = page.title.toLowerCase();
    const lowerContent = page.content.toLowerCase().substring(0, 500);

    if (serviceKeywords.some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw))) {
      categorizedPages.services.push(page);
    } else if (pricingKeywords.some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw))) {
      categorizedPages.pricing.push(page);
    } else if (scheduleKeywords.some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw))) {
      categorizedPages.schedule.push(page);
    } else if (aboutKeywords.some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw))) {
      categorizedPages.about.push(page);
    } else if (contactKeywords.some(kw => lowerTitle.includes(kw) || lowerContent.includes(kw))) {
      categorizedPages.contact.push(page);
    } else {
      categorizedPages.other.push(page);
    }
  });

  // Créer des documents pour chaque catégorie qui a du contenu
  if (categorizedPages.services.length > 0) {
    documents.push({
      title: 'Nos Services',
      category: 'services',
      content: consolidatePages(categorizedPages.services)
    });
  }

  if (categorizedPages.pricing.length > 0) {
    documents.push({
      title: 'Tarifs',
      category: 'pricing',
      content: consolidatePages(categorizedPages.pricing)
    });
  }

  if (categorizedPages.schedule.length > 0) {
    documents.push({
      title: 'Horaires',
      category: 'schedule',
      content: consolidatePages(categorizedPages.schedule)
    });
  }

  if (categorizedPages.about.length > 0) {
    documents.push({
      title: 'À propos',
      category: 'about',
      content: consolidatePages(categorizedPages.about)
    });
  }

  if (categorizedPages.contact.length > 0) {
    documents.push({
      title: 'Contact',
      category: 'contact',
      content: consolidatePages(categorizedPages.contact)
    });
  }

  // Si on a du contenu "other", le consolider
  if (categorizedPages.other.length > 0 && documents.length === 0) {
    documents.push({
      title: 'Informations générales',
      category: 'general',
      content: consolidatePages(categorizedPages.other)
    });
  }

  return documents;
}

function consolidatePages(pages: CrawledPage[]): string {
  return pages
    .map(page => {
      const cleanContent = page.content
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .trim();

      return `## ${page.title}\n\n${cleanContent}\n\nSource: ${page.url}`;
    })
    .join('\n\n---\n\n');
}
