// Umstellen in einem Zug (01.10.): alle Adressen, die sich bei der Uebergabe
// oder beim Domainumzug aendern, an EINER Stelle. Ohne --schreiben zeigt es
// nur, was es aendern wuerde.
//
//   node scripts/umstellen.mjs \
//     --seite https://wirtschaft-dornbirn.at \
//     --dienst https://wirtschaft-reservierung.<konto>.workers.dev \
//     --probe https://wirtschaft-reservierung-probe.<konto>.workers.dev \
//     --wirt-mail wolfgang@… --anfrage-mail willkommen@wirtschaft-dornbirn.at \
//     [--schreiben]
//
// Danach: npm run ci, Pull Request, Dienst neu ausrollen (beide Umgebungen),
// npm run check:umzug gegen die neue Seite.
import { readFile, writeFile } from 'node:fs/promises';

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const schreiben = process.argv.includes('--schreiben');
const ohneSchraegstrich = w => w?.replace(/\/+$/, '');
const seite = ohneSchraegstrich(arg('seite'));
const dienst = ohneSchraegstrich(arg('dienst'));
const probe = ohneSchraegstrich(arg('probe'));
const wirtMail = arg('wirt-mail');
const anfrageMail = arg('anfrage-mail');
if (!seite && !dienst && !probe && !wirtMail && !anfrageMail) {
  console.error('Nichts zu tun. Aufruf siehe Kopf von scripts/umstellen.mjs.');
  process.exit(1);
}
for (const [n, w] of [['seite', seite], ['dienst', dienst], ['probe', probe]]) {
  if (w && !/^https:\/\/[a-z0-9.-]+$/i.test(w)) { console.error(`--${n} muss eine https-Adresse ohne Pfad sein: ${w}`); process.exit(1); }
}
for (const [n, w] of [['wirt-mail', wirtMail], ['anfrage-mail', anfrageMail]]) {
  if (w && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(w)) { console.error(`--${n} ist keine Mailadresse: ${w}`); process.exit(1); }
}

const aenderungen = [];
const datei = async (pfad, aendere) => {
  const vorher = await readFile(pfad, 'utf8');
  const nachher = aendere(vorher);
  if (nachher !== vorher) {
    aenderungen.push(pfad);
    if (schreiben) await writeFile(pfad, nachher);
  }
};

// site/data/haus.json - von hier liest die Seite die Dienstadressen
await datei('site/data/haus.json', text => {
  const d = JSON.parse(text);
  if (dienst) d.api = dienst;
  if (probe) d.probe = probe;
  return JSON.stringify(d, null, 2) + '\n';
});

// server/wrangler.jsonc - beide Umgebungen; DIENST_BASIS je Umgebung
await datei('server/wrangler.jsonc', text => {
  let t = text;
  if (seite) {
    const www = seite.replace('https://', 'https://www.');
    const herkunft = [...new Set([seite, seite.startsWith('https://www.') ? seite.replace('www.', '') : www,
      'http://localhost:4321', 'http://localhost:4322', 'http://localhost:4323'])].join(',');
    t = t.replace(/"ALLOWED_ORIGINS": "[^"]*"/g, `"ALLOWED_ORIGINS": "${herkunft}"`);
    t = t.replace(/"GAESTE_SEITE": "[^"]*"/g, `"GAESTE_SEITE": "${seite}"`);
  }
  let n = 0;
  t = t.replace(/"DIENST_BASIS": "[^"]*"/g, treffer => {
    n += 1;
    if (n === 1 && dienst) return `"DIENST_BASIS": "${dienst}"`;
    if (n === 2 && probe) return `"DIENST_BASIS": "${probe}"`;
    return treffer;
  });
  if (wirtMail) t = t.replace(/"WIRT_MAIL": "[^"]*"/g, `"WIRT_MAIL": "${wirtMail}"`);
  if (anfrageMail) t = t.replace(/"ANFRAGE_MAIL": "[^"]*"/g, `"ANFRAGE_MAIL": "${anfrageMail}"`);
  return t;
});

// site/data/qr-ziele.json - erst nach dem Umzug neu drucken
if (seite) {
  await datei('site/data/qr-ziele.json', text => {
    const d = JSON.parse(text);
    if (d.events) d.events.url = `${seite}/events`;
    if (d.takeaway) d.takeaway.url = `${seite}/takeaway`;
    return JSON.stringify(d, null, 2) + '\n';
  });
}

console.log(aenderungen.length ? `${schreiben ? 'Geändert' : 'Würde ändern'}: ${aenderungen.join(', ')}` : 'Alles steht schon so.');
if (!schreiben && aenderungen.length) console.log('Mit --schreiben ausführen, dann npm run ci, PR, Dienst ausrollen, npm run check:umzug.');
