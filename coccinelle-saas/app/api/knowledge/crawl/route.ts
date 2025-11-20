import { NextRequest, NextResponse } from 'next/server';

interface CrawlRequest {
  startUrl: string;
  tenantId?: string;
  maxPages?: number;
  maxDepth?: number;
}

/**
 * API Route pour crawler un site web
 * POST /api/knowledge/crawl
 */
export async function POST(request: NextRequest) {
  try {
    const body: CrawlRequest = await request.json();
    const { startUrl, maxPages = 10, maxDepth = 2 } = body;

    if (!startUrl) {
      return NextResponse.json(
        { success: false, error: 'URL manquante' },
        { status: 400 }
      );
    }

    // Validation basique de l'URL
    let url: URL;
    try {
      url = new URL(startUrl);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'URL invalide' },
        { status: 400 }
      );
    }

    // Import dynamique de cheerio
    const cheerio = await import('cheerio');
    const axios = (await import('axios')).default;

    const crawledPages: any[] = [];
    const visitedUrls = new Set<string>();
    const urlsToCrawl: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];

    // Fonction pour crawler une page
    const crawlPage = async (pageUrl: string): Promise<{ title: string; content: string; links: string[] }> => {
      try {
        const response = await axios.get(pageUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CoccinelleBot/1.0; +http://coccinelle.ai)'
          }
        });

        const $ = cheerio.load(response.data);

        // Extraire le titre
        const title = $('title').text() || $('h1').first().text() || 'Sans titre';

        // Extraire le contenu textuel
        // Supprimer les scripts, styles, et autres éléments non pertinents
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('iframe').remove();
        $('noscript').remove();

        // Extraire le contenu de manière structurée
        let content = '';

        // Titre principal
        const h1 = $('h1').first().text().trim();
        if (h1) {
          content += `# ${h1}\n\n`;
        }

        // Essayer d'abord les conteneurs sémantiques
        let mainContent = $('main, article, .content, #content, [role="main"]');

        // Si aucun conteneur sémantique trouvé, utiliser le body entier
        if (mainContent.length === 0) {
          mainContent = $('body');
        }

        // Extraire tous les éléments textuels pertinents
        mainContent.find('h1, h2, h3, h4, h5, p, li, div, section, span').each((_, element) => {
          const $el = $(element);

          // Vérifier que l'élément contient du texte direct (pas juste dans ses enfants)
          const directText = $el.clone().children().remove().end().text().trim();

          if (directText && directText.length >= 5) { // Seuil plus bas pour capturer plus de contenu
            const tagName = $el.prop('tagName')?.toLowerCase();

            if (tagName === 'h1') {
              content += `\n# ${directText}\n\n`;
            } else if (tagName === 'h2') {
              content += `\n## ${directText}\n\n`;
            } else if (tagName === 'h3') {
              content += `\n### ${directText}\n\n`;
            } else if (tagName === 'li') {
              content += `- ${directText}\n`;
            } else if (tagName === 'p' || (tagName === 'div' && directText.length > 20)) {
              content += `${directText}\n\n`;
            } else if (directText.length > 30) {
              // Capturer aussi les sections de texte dans des spans/divs
              content += `${directText}\n\n`;
            }
          }
        });

        // Si toujours pas de contenu, extraire tout le texte visible
        if (content.length < 100) {
          const bodyText = $('body').text().trim();
          if (bodyText) {
            content = bodyText
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 20)
              .join('\n\n');
          }
        }

        // Nettoyer et limiter
        content = content
          .replace(/\n{3,}/g, '\n\n') // Pas plus de 2 retours à la ligne consécutifs
          .replace(/\s+/g, ' ') // Normaliser les espaces multiples
          .trim()
          .substring(0, 15000); // Augmenter la limite à 15000 caractères

        // Extraire les liens
        const links: string[] = [];
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, pageUrl).href;
              // Ne garder que les liens du même domaine
              if (new URL(absoluteUrl).hostname === url.hostname) {
                links.push(absoluteUrl);
              }
            } catch {
              // Ignorer les URLs invalides
            }
          }
        });

        return { title, content, links };
      } catch (error) {
        console.error(`❌ Erreur crawl ${pageUrl}:`, error);
        return { title: 'Erreur', content: '', links: [] };
      }
    };

    // Boucle de crawling
    while (urlsToCrawl.length > 0 && crawledPages.length < maxPages) {
      const { url: currentUrl, depth } = urlsToCrawl.shift()!;

      // Éviter de revisiter une URL
      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);

      const { title, content, links } = await crawlPage(currentUrl);

      if (content) {
        crawledPages.push({
          url: currentUrl,
          title,
          content,
          depth
        });
      }

      // Ajouter les liens trouvés si on n'a pas atteint la profondeur max
      if (depth < maxDepth) {
        for (const link of links) {
          if (!visitedUrls.has(link) && urlsToCrawl.length + crawledPages.length < maxPages) {
            urlsToCrawl.push({ url: link, depth: depth + 1 });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      jobId: `crawl_${Date.now()}`,
      pagesCount: crawledPages.length,
      pages: crawledPages
    });

  } catch (error) {
    console.error('❌ Erreur API crawl:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
}
