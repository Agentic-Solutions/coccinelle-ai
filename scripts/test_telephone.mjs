import { normaliserTelephone as n } from '../src/modules/shared/telephone.js';
let ok=0, ko=[];
const v=(e,a,l)=>{ const r=n(a); (r.e164===e) ? ok++ : ko.push(`${l}: ${JSON.stringify(a)} → ${r.e164} (attendu ${e})`); };
// Ce que le formulaire demande, et ses variantes humaines
v('+33612345678','06 12 34 56 78','placeholder du formulaire');
v('+33612345678','0612345678','sans espaces');
v('+33612345678','06.12.34.56.78','points');
v('+33612345678','06-12-34-56-78','tirets');
v('+33612345678',' 06 12 34 56 78 ','espaces autour');
v('+33612345678','+33 6 12 34 56 78','E.164 espace');
v('+33612345678','+33612345678','E.164 strict');
v('+33612345678','0033612345678','indicatif 00');
v('+33612345678','33612345678','indicatif nu');
v('+33712345678','07 12 34 56 78','mobile 07');
v('+33112345678','01 12 34 56 78','fixe 01');
v('+32475123456','+32 475 12 34 56','belge');
// Ce qui doit etre refuse
v(null,'06 12 34 56 7','un chiffre en moins');
v(null,'06 12 34 56 789','un chiffre en trop');
v(null,'','vide');
v(null,'abc','lettres');
v(null,'0','un zero');
console.log(`  ${ok}/${ok+ko.length}`); ko.forEach(x=>console.log('  ❌ '+x));
process.exit(ko.length?1:0);
