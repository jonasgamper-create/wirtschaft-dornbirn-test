// Baut den internen Tischplan zu einer einzigen HTML-Datei zusammen.
//
// Warum: Die Fassung in site/ braucht einen lokalen Server, weil sie Module
// importiert und die Konfiguration per fetch holt - beides scheitert an file://.
// Die Einzeldatei traegt alles im Dokument und laesst sich per Doppelklick
// oeffnen, auch aus Dropbox oder von einem Stick. Sie wird bei jedem Lauf
// vollstaendig ueberschrieben.
//
// Die Datei geht bewusst NICHT in den oeffentlichen Build. Sie ist ein internes
// Werkzeug; Gaestedaten entstehen erst im Browser desjenigen, der sie oeffnet.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const target = path.join(root, 'output/tischplan/wirtschaft-tischplan.html');

// Die Modulimporte tragen Versionsangaben (./floorplan.js?v=11), damit der
// Browser sie nicht aus dem Cache nimmt. Fuer das Buendeln muessen sie weg.
const stripVersionQuery = {
  name: 'strip-version-query',
  setup(build) {
    build.onResolve({ filter: /\?v=\d+$/ }, args => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?v=\d+$/, ''))
    }));
  }
};

const buendel = async name => (await esbuild.build({
  entryPoints: [path.join(site, name)],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  charset: 'utf8',
  write: false,
  plugins: [stripVersionQuery]
})).outputFiles[0].text;

const store = await readFile(path.join(site, 'inventory-store.js'), 'utf8');
const target2 = path.join(root, 'output/tischplan/wirtschaft-kundenplan.html');
const config = JSON.parse(await readFile(path.join(site, 'data/floorplan.json'), 'utf8'));
const logo = await readFile(path.join(site, 'assets/wirtschaft-logo.png'));

const styles = (await Promise.all(
  ['gastgeber.css', 'gastgeber-mobile-fix.css', 'floorplan.css']
    .map(name => readFile(path.join(site, name), 'utf8'))
)).join('\n');

// JSON sicher in ein Script einbetten: </script> im Text wuerde es sonst
// vorzeitig schliessen, und U+2028/2029 sind in JS-Quelltext Zeilenumbrueche.
const embed = value => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

async function baue({ quelle, ziel, code, kopfErsatz }) {
  const script = `window.WIRTSCHAFT_FLOORPLAN=${embed(config)};\n${code}`;
  const styleBody = `\n${styles}\n  `;
  const scriptBody = `\n${script}\n  `;
  const sha = value => `'sha256-${createHash('sha256').update(value, 'utf8').digest('base64')}'`;

  let html = await readFile(path.join(site, quelle), 'utf8');
  html = html
    .replace(/\n\s*<link rel="stylesheet"[^>]*>/g, '')
    .replace(/\n\s*<script[^>]*><\/script>/g, '')
    .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="data:image/png;base64,${logo.toString('base64')}" type="image/png">`)
    .replace(/src="assets\/wirtschaft-logo\.png"/g, `src="data:image/png;base64,${logo.toString('base64')}"`)
    .replace('</head>', `  <style>${styleBody}</style>\n</head>`)
    // Das Skript ans Ende des Body: ein Inline-Skript kennt kein defer, im Kopf
    // liefe es vor dem Inhalt und faende die Bedienelemente nicht.
    .replace('</body>', `  <script>${scriptBody}</script>\n</body>`);

  if (kopfErsatz) html = html.replace(kopfErsatz[0], kopfErsatz[1]);

  // Kein Netzzugriff noetig und keiner erlaubt. Inline-Skript und -Stil sind
  // ueber ihren Hash freigegeben, nicht ueber 'unsafe-inline'.
  html = html.replace(
    /<meta http-equiv="Content-Security-Policy"[^>]*>/,
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; '
    + `base-uri 'none'; object-src 'none'; frame-src 'none'; img-src data:; font-src 'self'; `
    + `style-src ${sha(styleBody)}; script-src ${sha(scriptBody)}; connect-src 'none'; form-action 'none'">`
  );

  await mkdir(path.dirname(ziel), { recursive: true });
  await writeFile(ziel, html);
  return Math.round(Buffer.byteLength(html) / 1024);
}

const kbIntern = await baue({
  quelle: 'gastgeber-tischplan.html',
  ziel: target,
  code: `${store}\n${await buendel('gastgeber-floorplan.js')}`,
  kopfErsatz: [
    /<a href="gastgeber\.html">[^<]*<\/a>/,
    '<span class="fp-single">Einzeldatei · offline</span>'
  ]
});

const kbKunde = await baue({
  quelle: 'kundenplan.html',
  ziel: target2,
  code: await buendel('kundenplan.js')
});

console.log(`Einzeldateien geschrieben:`);
console.log(`  ${path.relative(root, target)} (${kbIntern} KB) - interne Planung`);
console.log(`  ${path.relative(root, target2)} (${kbKunde} KB) - zum Verschicken an den Kunden`);
