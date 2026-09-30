// Ein Markdown-Dokument aus docs/ als PDF - im Blatt der Wirtschaft.
//
//   node scripts/build-doku-pdf.mjs docs/betriebshandbuch.md [docs/pdf/Betriebshandbuch.pdf]
//
// Ohne Abhaengigkeiten: ein kleiner Markdown-Leser fuer das, was unsere
// Dokumente benutzen (Ueberschriften, Absaetze, Listen, Haken, Tabellen,
// Codebloecke, fett, Code, Links), dazu das Druckblatt, dann Chrome ohne
// Fenster. Wer pandoc hat, darf pandoc nehmen; dieses Skript ist dafuer da,
// dass es auf jedem Rechner ohne Einrichtung geht.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [, , quelle, zielArg] = process.argv;
if (!quelle) {
  console.error('Aufruf: node scripts/build-doku-pdf.mjs docs/<datei>.md [docs/pdf/<Name>.pdf]');
  process.exit(1);
}

const schuetze = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Zeileninhalt: Code, fett, kursiv, Links - in dieser Reihenfolge. */
function inline(t) {
  const codes = [];
  let s = schuetze(t).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|\s)- \[ \]/g, '$1☐')
    .replace(/ – /g, ' – ');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

function markdownNachHtml(md) {
  const zeilen = md.replace(/\r/g, '').split('\n');
  const aus = [];
  let i = 0;
  const istTabelle = z => /^\|.*\|\s*$/.test(z);
  while (i < zeilen.length) {
    const z = zeilen[i];
    if (!z.trim()) { i += 1; continue; }
    if (z.startsWith('```')) {
      const block = [];
      i += 1;
      while (i < zeilen.length && !zeilen[i].startsWith('```')) { block.push(zeilen[i]); i += 1; }
      i += 1;
      aus.push(`<pre><code>${schuetze(block.join('\n'))}</code></pre>`);
      continue;
    }
    const h = z.match(/^(#{1,4})\s+(.*)$/);
    if (h) { aus.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i += 1; continue; }
    if (/^---+\s*$/.test(z)) { aus.push('<hr>'); i += 1; continue; }
    if (istTabelle(z)) {
      const rows = [];
      while (i < zeilen.length && istTabelle(zeilen[i])) { rows.push(zeilen[i]); i += 1; }
      const zellen = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const kopf = zellen(rows[0]);
      const koerper = rows.slice(1).filter(r => !/^\|\s*-{2,}/.test(r) && !/^\|(\s*:?-+:?\s*\|)+\s*$/.test(r));
      aus.push('<table><thead><tr>' + kopf.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        + koerper.map(r => '<tr>' + zellen(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')
        + '</tbody></table>');
      continue;
    }
    const li = z.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const geordnet = /\d+\./.test(li[2]);
      const items = [];
      while (i < zeilen.length) {
        const m = zeilen[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (m) { items.push(m[3]); i += 1; }
        else if (zeilen[i].trim() && /^\s{2,}/.test(zeilen[i]) && items.length) { items[items.length - 1] += ' ' + zeilen[i].trim(); i += 1; }
        else break;
      }
      const tag = geordnet ? 'ol' : 'ul';
      aus.push(`<${tag}>` + items.map(t => {
        const haken = t.match(/^\[( |x)\]\s+(.*)$/i);
        if (haken) return `<li class="haken"><span class="kasten${haken[1].toLowerCase() === 'x' ? ' voll' : ''}"></span>${inline(haken[2])}</li>`;
        return `<li>${inline(t)}</li>`;
      }).join('') + `</${tag}>`);
      continue;
    }
    // Absatz: bis zur naechsten Leerzeile
    const abs = [];
    while (i < zeilen.length && zeilen[i].trim() && !/^(#{1,4}\s|```|\||---|\s*[-*]\s|\s*\d+\.\s)/.test(zeilen[i])) { abs.push(zeilen[i].trim()); i += 1; }
    if (abs.length) aus.push(`<p>${inline(abs.join(' '))}</p>`);
    else i += 1;
  }
  return aus.join('\n');
}

const md = await readFile(quelle, 'utf8');
const titel = (md.match(/^#\s+(.*)$/m) || [, path.basename(quelle, '.md')])[1].replace(/`/g, '');
const stand = (md.match(/^Stand (\d{1,2}\. \S+ \d{4})/m) || [, ''])[1];
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${schuetze(titel)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">
<style>
  :root{--ink:#11110f; --paper:#f3efe6; --cream:#ead9bc; --wine:#8c292b; --gold:#c59b5d; --leise:#4f4a42; --linie:#11110f2e;
    --sans:Montserrat,-apple-system,system-ui,"Helvetica Neue",Arial,sans-serif; --serif:Newsreader,Georgia,"Times New Roman",serif}
  @page{size:A4; margin:16mm 15mm 18mm}
  *{box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact}
  body{margin:0; background:#fff; color:var(--ink); font-family:var(--serif); font-size:10.5pt; line-height:1.5}
  .kopf{background:var(--ink); color:var(--paper); padding:14mm 12mm 10mm; margin-bottom:7mm}
  .kopf .marke{font-family:var(--sans); font-size:8.5pt; font-weight:700; letter-spacing:.19em; text-transform:lowercase; color:var(--gold); margin:0 0 4mm}
  .kopf h1{font-family:var(--sans); font-size:24pt; font-weight:600; line-height:1.05; margin:0; letter-spacing:-.015em}
  .kopf .stand{margin:5mm 0 0; font-family:var(--sans); font-size:9pt; color:#cfc7b8}
  main > h1{display:none}
  h2{font-family:var(--sans); font-size:15pt; font-weight:600; margin:9mm 0 3mm; letter-spacing:-.01em; break-after:avoid}
  h3{font-family:var(--sans); font-size:11.5pt; font-weight:600; margin:6mm 0 2mm; break-after:avoid}
  h4{font-family:var(--sans); font-size:10pt; font-weight:700; margin:4mm 0 1.5mm; letter-spacing:.04em}
  p{margin:0 0 2.6mm}
  hr{border:0; border-top:1px solid var(--linie); margin:6mm 0}
  ul,ol{margin:0 0 3mm; padding-left:5mm}
  li{margin:0 0 1.2mm}
  li.haken{list-style:none; margin-left:-5mm; padding-left:6.5mm; position:relative}
  li.haken .kasten{position:absolute; left:0; top:.9mm; width:3.4mm; height:3.4mm; border:1.2px solid var(--ink); border-radius:.6mm; background:#fff}
  li.haken .kasten.voll{background:var(--ink)}
  table{width:100%; border-collapse:collapse; margin:2mm 0 6mm; font-size:9.3pt; break-inside:auto}
  th{font-family:var(--sans); font-size:8pt; font-weight:700; letter-spacing:.06em; text-transform:lowercase; text-align:left; color:var(--leise); padding:1.6mm 2mm; border-bottom:1.2px solid var(--ink)}
  td{padding:1.8mm 2mm; border-bottom:1px solid var(--linie); vertical-align:top}
  tr{break-inside:avoid}
  code{font-family:var(--sans); font-size:.86em; font-weight:600; padding:0 1.2mm; border-radius:.6mm; background:#f0e7d6; color:var(--ink); overflow-wrap:anywhere}
  pre{background:#f7f3ea; border:1px solid var(--linie); padding:3mm 3.5mm; margin:2mm 0 4mm; font-size:8.6pt; line-height:1.45; overflow-x:auto; break-inside:avoid}
  pre code{background:none; padding:0; font-weight:400; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  a{color:inherit}
  strong{font-weight:600}
</style></head><body>
<header class="kopf"><p class="marke">„wirtschaft“ dornbirn · emma &amp; eugen</p><h1>${schuetze(titel.replace(/^[^·]*·\s*/, '') === titel ? titel : titel)}</h1>${stand ? `<p class="stand">Stand ${schuetze(stand)}</p>` : ''}</header>
<main>${markdownNachHtml(md)}</main>
</body></html>`;

const arbeitsordner = process.env.DOKU_TMP || os.tmpdir();
const htmlPfad = path.join(arbeitsordner, `${path.basename(quelle, '.md')}.html`);
await writeFile(htmlPfad, html);

const ziel = zielArg || path.join('docs', 'pdf', `${titel.split('·')[0].trim().replace(/[^\wäöüÄÖÜß-]+/g, '-')}.pdf`);
await mkdir(path.dirname(ziel), { recursive: true });

const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'google-chrome', 'chromium', 'chromium-browser']
  .find(k => k.startsWith('/') ? existsSync(k) : true);
try {
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
    '--virtual-time-budget=8000', `--print-to-pdf=${path.resolve(ziel)}`, `file://${htmlPfad}`], { stdio: 'ignore' });
  console.log(`PDF: ${ziel} (aus ${quelle})`);
} catch (fehler) {
  console.error(`Chrome nicht gefunden oder Druck fehlgeschlagen - HTML liegt unter ${htmlPfad}. ${fehler.message}`);
  process.exit(1);
}
