// Utiliser Edge runtime pour Cloudflare Pages
export const runtime = 'edge';

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

    console.log(`🌐 Crawl demandé pour: ${startUrl} (max ${maxPages} pages, depth ${maxDepth})`);

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

    const crawledPages: any[] = [];
    const visitedUrls = new Set<string>();
    const urlsToCrawl: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];

    // Fonction pour crawler une page
    const crawlPage = async (pageUrl: string, retries = 0): Promise<{ title: string; content: string; links: string[] }> => {
      try {
        // Utiliser fetch au lieu d'axios (compatible edge runtime)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 secondes

        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CoccinelleBot/1.0; +http://coccinelle.ai)'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

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
        // Retry logic pour le premier essai en cas de timeout ou erreur réseau
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        const isNetworkError = error instanceof TypeError;

        if (retries < 1 && (isTimeout || isNetworkError)) {
          console.log(`🔄 Retry crawl ${pageUrl} (tentative ${retries + 1}/1)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s avant retry
          return crawlPage(pageUrl, retries + 1);
        }

        console.error(`❌ Erreur crawl ${pageUrl}:`, error);
        return { title: 'Erreur', content: '', links: [] };
      }
    };

    // Boucle de crawling
    let attemptedUrls = 0;
    while (urlsToCrawl.length > 0 && crawledPages.length < maxPages) {
      const { url: currentUrl, depth } = urlsToCrawl.shift()!;

      // Éviter de revisiter une URL
      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);

      attemptedUrls++;
      console.log(`📄 Crawling [${attemptedUrls}]: ${currentUrl}`);

      const { title, content, links } = await crawlPage(currentUrl);

      if (content) {
        console.log(`✅ Page récupérée: "${title}" (${content.length} chars, ${links.length} liens)`);
        crawledPages.push({
          url: currentUrl,
          title,
          content,
          depth
        });
      } else {
        console.log(`⚠️  Page vide ou erreur pour ${currentUrl}`);
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

    console.log(`✅ Crawl terminé: ${crawledPages.length}/${attemptedUrls} pages réussies`);
    if (crawledPages.length > 0) {
      crawledPages.forEach((page, idx) => {
        console.log(`  [${idx + 1}] ${page.title} - ${page.content.length} chars`);
      });
    } else if (attemptedUrls > 0) {
      console.log(`⚠️  Aucune page n'a pu être crawlée sur ${attemptedUrls} tentatives`);
    } else {
      console.log(`⚠️  Aucune URL à crawler`);
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
