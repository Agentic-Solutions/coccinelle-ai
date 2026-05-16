// ─── Formulaire Validation Worker ────────────────────────────────────────────
// Page 1 : 2 questions (secteur + situation)
// Page 2 : Offre Fondateur (< 2 inscrits) ou Priorite (>= 2)
// Page 3 : Confirmation
// ─────────────────────────────────────────────────────────────────────────────

const SECTEURS = [
  'Notaire',
  'Avocat',
  'M\u00e9decin',
  'Syndic',
  'Immobilier',
  'Automobile',
  'Dentiste',
  'Restaurant & H\u00f4tellerie',
  'Beaut\u00e9 & Bien-\u00eatre',
  'Fitness & Sport',
  '\u00c9ducation & Formation',
  'E-commerce',
  'Artisan & BTP',
  'Autre',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── POST /submit — sauvegarder sondage + retourner offre ──
    if (request.method === 'POST' && url.pathname === '/submit') {
      try {
        const data = await request.json();
        const { secteur, situation } = data;
        if (!secteur || !situation) {
          return json({ error: 'Champs obligatoires manquants' }, 400);
        }
        await env.DB.prepare(
          'INSERT INTO reponses (secteur, q2, created_at) VALUES (?, ?, datetime("now"))'
        ).bind(secteur, situation).run();

        // Compter les fondateurs dans ce secteur
        const row = await env.DB.prepare(
          "SELECT COUNT(*) as cnt FROM waitlist WHERE secteur = ? AND offre = 'fondateur'"
        ).bind(secteur).first();
        const count = row?.cnt || 0;
        const offre = count < 2 ? 'fondateur' : 'priorite';
        const remaining = count < 2 ? 2 - count : 0;

        return json({ ok: true, offre, remaining, count });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // ── POST /waitlist-submit — inscription testeur ──
    if (request.method === 'POST' && url.pathname === '/waitlist-submit') {
      try {
        const data = await request.json();
        const { nom, email, telephone, secteur, offre } = data;
        if (!nom || !email || !secteur || !offre) {
          return json({ error: 'Champs obligatoires manquants' }, 400);
        }
        await env.DB.prepare(
          'INSERT INTO waitlist (nom, email, telephone, secteur, offre, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
        ).bind(nom, email, telephone || '', secteur, offre).run();
        return json({ ok: true });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // ── GET / — page HTML ──
    return new Response(buildHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS },
    });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function buildHTML() {
  const options = SECTEURS.map(s => `<option value="${s}">${s}</option>`).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Testeurs Fondateurs &mdash; Coccinelle.ai</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; color: #1a1a1a; }
.container { max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

/* ─ Commun ─ */
h1 { font-size: 22px; color: #1a1a1a; margin-bottom: 8px; }
.intro { color: #555; font-size: 14px; margin-bottom: 28px; line-height: 1.6; }
.question { margin-bottom: 28px; }
label.main { font-weight: bold; display: block; margin-bottom: 10px; color: #1a1a1a; font-size: 15px; }
select, input[type=text], input[type=email], input[type=tel] {
  width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;
  font-size: 14px; margin-top: 4px; background: white;
}
select:focus, input:focus { outline: none; border-color: #999; }
.btn-submit {
  background: #D85A30; color: white; border: none; padding: 14px 28px;
  border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; margin-top: 8px;
  font-weight: bold;
}
.btn-submit:hover { background: #c04e27; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─ Boutons situation ─ */
.situation-options { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.situation-btn {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border: 2px solid #ddd; border-radius: 8px;
  background: white; cursor: pointer; transition: all 0.2s;
  font-size: 14px; color: #333; text-align: left;
}
.situation-btn:hover { border-color: #bbb; background: #fafafa; }
.situation-btn.active { border-color: #D85A30; background: #fff8f6; }
.situation-btn .radio-dot {
  width: 20px; height: 20px; border-radius: 50%; border: 2px solid #ccc;
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.situation-btn.active .radio-dot {
  border-color: #D85A30; background: #D85A30;
}
.situation-btn.active .radio-dot::after {
  content: ''; width: 8px; height: 8px; border-radius: 50%; background: white;
}

/* ─ Page 2 : offre ─ */
.page2 { display: none; }
.merci-header { text-align: center; margin-bottom: 28px; }
.merci-header h2 { font-size: 24px; color: #1a1a1a; margin-bottom: 8px; }
.merci-header p { color: #555; font-size: 15px; line-height: 1.6; }
.produit-block {
  background: #1a1a1a; color: white; border-radius: 12px;
  padding: 28px; margin-bottom: 24px;
}
.produit-block h3 { font-size: 18px; color: white; margin-bottom: 12px; line-height: 1.4; }
.produit-block p { font-size: 14px; color: #ccc; line-height: 1.7; margin-bottom: 12px; }
.offre-card { border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.offre-fondateur { background: #fff8f6; border: 2px solid #D85A30; }
.offre-priorite { background: #f0f4ff; border: 2px solid #3b5bdb; }
.badge {
  display: inline-block; font-size: 12px; padding: 4px 12px;
  border-radius: 20px; font-weight: bold; margin-bottom: 12px;
}
.badge-fondateur { background: #D85A30; color: white; }
.badge-priorite { background: #3b5bdb; color: white; }
.offre-card h3 { font-size: 17px; color: #1a1a1a; margin-bottom: 4px; }
.offre-card .offre-subtitle { font-size: 14px; color: #888; margin-bottom: 12px; }
.offre-card .offre-detail { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 16px; }
.offre-card .places { font-size: 13px; color: #888; margin-bottom: 20px; }
.field-group { margin-bottom: 14px; }
.field-group label {
  font-size: 13px; font-weight: bold; color: #333;
  display: block; margin-bottom: 6px;
}
.field-group input { border: 1px solid #ddd; margin-top: 0; }
.offre-fondateur .field-group input { border-color: #f0c8b8; }
.offre-priorite .field-group input { border-color: #b8c8f0; }
.btn-inscription {
  background: #D85A30; color: white; border: none; padding: 14px 24px;
  border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%;
  font-weight: bold; margin-top: 8px;
}
.btn-inscription:hover { background: #c04e27; }
.btn-inscription:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-priorite { background: #3b5bdb; }
.btn-priorite:hover { background: #2f4fc0; }

/* ─ Page 3 : confirmation ─ */
.page3 { display: none; }
.confirm-block { text-align: center; padding: 40px 20px; }
.confirm-icon {
  width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px;
  display: flex; align-items: center; justify-content: center; font-size: 28px;
}
.confirm-fondateur { background: #fff3f0; color: #D85A30; }
.confirm-priorite { background: #f0f4ff; color: #3b5bdb; }
.confirm-block h2 { font-size: 22px; color: #1a1a1a; margin-bottom: 12px; }
.confirm-block p { font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 8px; }
.confirm-block .contact-note {
  font-size: 14px; color: #D85A30; font-weight: bold; margin-top: 20px;
}
.cta-block { text-align: center; margin-top: 24px; }
.cta-link {
  display: inline-block; padding: 14px 28px; background: #1a1a1a;
  color: white; text-decoration: none; border-radius: 8px;
  font-size: 15px; font-weight: bold;
}
.cta-link:hover { background: #333; }
</style>
</head>
<body>
<div class="container">

<!-- ═══ PAGE 1 — 2 QUESTIONS ══════════════════════════════════════════════ -->
<div id="page1">
<h1>Testez votre agent vocal IA</h1>
<p class="intro">R&eacute;pondez &agrave; 2 questions pour d&eacute;couvrir votre offre personnalis&eacute;e.<br><strong>30 secondes, 2 places Fondateur par secteur.</strong></p>

<form id="surveyForm">

<div class="question">
<label class="main">1. Votre secteur d'activit&eacute; *</label>
<select name="secteur" id="secteurSelect" required>
<option value="">-- Choisissez --</option>
${options}
</select>
</div>

<div class="question">
<label class="main">2. Votre situation *</label>
<div class="situation-options">
<div class="situation-btn" data-value="rate_appels" onclick="selectSituation(this)">
<span class="radio-dot"></span>
<span>Je rate des appels pendant mon activit&eacute;</span>
</div>
<div class="situation-btn" data-value="standard_deborde" onclick="selectSituation(this)">
<span class="radio-dot"></span>
<span>Mon standard est d&eacute;bord&eacute;</span>
</div>
<div class="situation-btn" data-value="ameliorer_accueil" onclick="selectSituation(this)">
<span class="radio-dot"></span>
<span>Je veux am&eacute;liorer mon accueil client</span>
</div>
</div>
<input type="hidden" name="situation" id="situationInput" required>
</div>

<button type="submit" class="btn-submit" id="btnSurvey">Voir mon offre &rarr;</button>
</form>
</div>

<!-- ═══ PAGE 2 — OFFRE DYNAMIQUE ══════════════════════════════════════════ -->
<div id="page2" class="page2">

<div class="merci-header">
<h2>Votre offre est pr&ecirc;te</h2>
<p>Bas&eacute;e sur votre secteur et les places disponibles.</p>
</div>

<div class="produit-block">
<h3>Et si vous ne perdiez plus jamais un appel ?</h3>
<p>Votre assistant IA r&eacute;pond &agrave; vos appels, qualifie vos contacts et vous envoie un compte rendu &mdash; pendant que vous travaillez.</p>
</div>

<!-- Offre Fondateur -->
<div id="offreFondateur" class="offre-card offre-fondateur" style="display:none">
<span class="badge badge-fondateur">&starf; Membre Fondateur</span>
<h3>Vous &ecirc;tes parmi les premiers de votre secteur</h3>
<p class="offre-detail"><strong>2 mois gratuits</strong> + <strong>&minus;20% &agrave; vie</strong> tant que vous restez abonn&eacute;.</p>
<p class="places" id="placesFondateur"></p>

<form id="formFondateur">
<div class="field-group">
<label>Pr&eacute;nom et Nom *</label>
<input type="text" name="nom" placeholder="Jean Dupont" required>
</div>
<div class="field-group">
<label>Email professionnel *</label>
<input type="email" name="email" placeholder="jean@entreprise.fr" required>
</div>
<div class="field-group">
<label>T&eacute;l&eacute;phone *</label>
<input type="tel" name="telephone" placeholder="+33 6 12 34 56 78" required>
</div>
<button type="submit" class="btn-inscription">Je veux participer</button>
</form>
</div>

<!-- Offre Priorite -->
<div id="offrePriorite" class="offre-card offre-priorite" style="display:none">
<span class="badge badge-priorite">&loz; Acc&egrave;s Prioritaire</span>
<h3>Les places Fondateur sont prises dans votre secteur</h3>
<p class="offre-subtitle">Bonne nouvelle : vous b&eacute;n&eacute;ficiez de l'offre Priorit&eacute;</p>
<p class="offre-detail"><strong>1 mois gratuit</strong> + <strong>&minus;10% &agrave; vie</strong> tant que vous restez abonn&eacute;.</p>

<form id="formPriorite">
<div class="field-group">
<label>Pr&eacute;nom et Nom *</label>
<input type="text" name="nom" placeholder="Jean Dupont" required>
</div>
<div class="field-group">
<label>Email professionnel *</label>
<input type="email" name="email" placeholder="jean@entreprise.fr" required>
</div>
<div class="field-group">
<label>T&eacute;l&eacute;phone *</label>
<input type="tel" name="telephone" placeholder="+33 6 12 34 56 78" required>
</div>
<button type="submit" class="btn-inscription btn-priorite">Je veux participer</button>
</form>
</div>
</div>

<!-- ═══ PAGE 3 — CONFIRMATION ═════════════════════════════════════════════ -->
<div id="page3" class="page3">
<div class="confirm-block">
<div class="confirm-icon" id="confirmIcon">&check;</div>
<h2>Votre demande est enregistr&eacute;e</h2>
<p id="confirmText"></p>
<p class="contact-note">Youssef vous contacte personnellement dans les 48h<br>pour configurer votre agent vocal.</p>
</div>
<div class="cta-block">
<a href="https://coccinelle.ai" class="cta-link">D&eacute;couvrir Coccinelle.ai &rarr;</a>
</div>
</div>

</div>

<script>
var selectedSecteur = '';
var selectedOffre = '';
var selectedSituation = '';

// ── Situation buttons ───────────────────────────────────────────────────────
function selectSituation(el) {
  document.querySelectorAll('.situation-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  selectedSituation = el.getAttribute('data-value');
  document.getElementById('situationInput').value = selectedSituation;
}

// ── Survey submit ───────────────────────────────────────────────────────────
document.getElementById('surveyForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!selectedSituation) { alert('Veuillez choisir votre situation.'); return; }
  var btn = document.getElementById('btnSurvey');
  btn.disabled = true;
  btn.textContent = 'Chargement...';

  var secteur = document.getElementById('secteurSelect').value;
  selectedSecteur = secteur;

  try {
    var res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secteur: secteur, situation: selectedSituation })
    });
    var result = await res.json();

    if (result.offre === 'fondateur') {
      selectedOffre = 'fondateur';
      var r = result.remaining;
      document.getElementById('placesFondateur').textContent =
        'Il reste ' + r + ' place' + (r > 1 ? 's' : '') + ' Fondateur dans votre secteur.';
      document.getElementById('offreFondateur').style.display = 'block';
      document.getElementById('offrePriorite').style.display = 'none';
    } else {
      selectedOffre = 'priorite';
      document.getElementById('offreFondateur').style.display = 'none';
      document.getElementById('offrePriorite').style.display = 'block';
    }

    document.getElementById('page1').style.display = 'none';
    document.getElementById('page2').style.display = 'block';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Voir mon offre \\u2192';
    alert('Erreur de connexion. Veuillez r\\u00e9essayer.');
  }
});

// ── Inscription submit ──────────────────────────────────────────────────────
function handleInscription(e) {
  e.preventDefault();
  var form = e.target;
  var btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';

  var fd = new FormData(form);
  var payload = {
    nom: fd.get('nom'),
    email: fd.get('email'),
    telephone: fd.get('telephone'),
    secteur: selectedSecteur,
    offre: selectedOffre
  };

  fetch('/waitlist-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function() {
    var icon = document.getElementById('confirmIcon');
    var text = document.getElementById('confirmText');
    if (selectedOffre === 'fondateur') {
      icon.className = 'confirm-icon confirm-fondateur';
      text.innerHTML = 'Votre place <strong>Membre Fondateur</strong> est r\\u00e9serv\\u00e9e.<br>2 mois gratuits + \\u221220% \\u00e0 vie vous attendent.';
    } else {
      icon.className = 'confirm-icon confirm-priorite';
      text.innerHTML = 'Votre <strong>Acc\\u00e8s Prioritaire</strong> est confirm\\u00e9.<br>1 mois gratuit + \\u221210% \\u00e0 vie vous attendent.';
    }
    document.getElementById('page2').style.display = 'none';
    document.getElementById('page3').style.display = 'block';
  }).catch(function() {
    btn.disabled = false;
    btn.textContent = 'Je veux participer';
    alert('Erreur de connexion. Veuillez r\\u00e9essayer.');
  });
}

document.getElementById('formFondateur').addEventListener('submit', handleInscription);
document.getElementById('formPriorite').addEventListener('submit', handleInscription);
</script>
</body>
</html>`;
}
