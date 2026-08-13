// Serveur de recette des pages CX-2 — statique + relais vers le Worker de prod.
//
//   cd coccinelle-saas && npm run build      # produit out/
//   node design/cx2/serveur-recette.mjs      # puis ouvrir http://localhost:3000/_session
//
// POURQUOI CE RELAIS
// `lib/config.ts` bascule sur l'API LOCALE dès que le hostname vaut
// « localhost » : sans relais, tous les appels partent vers ce serveur au lieu
// du Worker, d'où le ERR_CONNECTION_REFUSED sur /auth/login puis des 401
// partout. Et servir sur 127.0.0.1 ne sauve rien : l'origine ne figure pas dans
// la liste CORS du Worker. Le relais tient les deux bouts — le navigateur voit
// « localhost » (origine autorisée, API locale), le Worker voit une requête
// serveur à serveur.
//
// Le jeton n'est jamais tapé dans l'URL ni collé dans la console : il est lu
// SUR LE DISQUE par ce serveur et posé dans le navigateur par /_session.

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = process.env.CX2_OUT || resolve(ICI, '../../coccinelle-saas/out');
const JETON = process.env.CX2_TOKEN || '/tmp/gt_token.txt';
const PORT = Number(process.env.CX2_PORT || 3000);
const WORKER = process.env.CX2_API || 'https://coccinelle-api.youssef-amrouche.workers.dev';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── Relais API ──
  if (url.pathname.startsWith('/api/')) {
    const corps = req.method === 'GET' || req.method === 'HEAD' ? undefined
      : await new Promise((ok) => { let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => ok(d)); });
    // Un echec reseau ne doit PAS tuer le serveur : sans ce filet, un
    // « fetch failed » passager coupait la session de test en plein parcours.
    try {
      const amont = await fetch(WORKER + url.pathname + url.search, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
        },
        body: corps || undefined,
      });
      const type = amont.headers.get('content-type') || 'application/json';
      res.writeHead(amont.status, { 'Content-Type': type });
      // Les previews de voix renvoient de l'audio, pas du JSON.
      res.end(Buffer.from(await amont.arrayBuffer()));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'relais indisponible : ' + e.message }));
    }
    return;
  }

  // ── Ouverture de session ──
  if (url.pathname === '/_session') {
    let jeton;
    try { jeton = (await readFile(JETON, 'utf8')).trim(); } catch {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<meta charset="utf-8"><p>Jeton introuvable : <code>${JETON}</code></p>`);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta charset="utf-8">
      <body style="font-family:system-ui;padding:40px">
      <p>Session ouverte. Redirection…</p>
      <script>
        localStorage.setItem('auth_token', ${JSON.stringify(jeton)});
        document.cookie = 'auth_token=' + ${JSON.stringify(jeton)} + '; path=/';
        location.replace('/dashboard/savoir/');
      </script></body>`);
    return;
  }

  // ── Statique ──
  let chemin = url.pathname;
  if (chemin.endsWith('/')) chemin += 'index.html';
  if (!extname(chemin)) chemin += '/index.html';
  try {
    const contenu = await readFile(join(RACINE, chemin));
    res.writeHead(200, { 'Content-Type': MIME[extname(chemin)] || 'application/octet-stream' });
    res.end(contenu);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('introuvable : ' + chemin);
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Recette CX-2 prete.`);
  console.log(`  1. ouvrir  http://localhost:${PORT}/_session   (pose la session, redirige)`);
  console.log(`  2. pages   http://localhost:${PORT}/dashboard/savoir/`);
  console.log(`             http://localhost:${PORT}/dashboard/assistant/`);
  console.log(`  statique : ${RACINE}`);
  console.log(`  jeton    : ${JETON}`);
});
