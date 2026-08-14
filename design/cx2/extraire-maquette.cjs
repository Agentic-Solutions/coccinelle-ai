// Extrait le contenu réel d'une maquette Claude Design « bundled ».
//
// Le HTML livré n'est pas lisible tel quel : la page se déballe au chargement
// depuis deux blocs <script>. Le rendu approximatif du fichier brut ne fait donc
// PAS foi — c'est le template qui décrit la maquette, au caractère près.
//
//   node design/cx2/extraire-maquette.cjs design/cx2/mon-assistant.html /tmp/sortie.html
//
// Sortie : le template <x-dc> + la classe DCLogic (états, styles, libellés),
// mis en forme une balise par ligne pour être relisible.

const fs = require('fs');

const [, , src, out] = process.argv;
if (!src || !out) {
  console.error('usage: node extraire-maquette.js <maquette.html> <sortie.html>');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const bloc = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);
if (!bloc) {
  console.error('Aucun bloc __bundler/template : ce fichier n\'est pas une maquette bundled.');
  process.exit(2);
}

// Le template est stocké en chaîne JSON (échappements compris).
const template = JSON.parse(bloc[1]);
fs.writeFileSync(out, template.replace(/></g, '>\n<'));
console.log(`${out} — ${template.length} caractères`);
