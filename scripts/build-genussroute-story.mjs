import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'output', 'social-canva', 'genussroute-story-template');
const assets = path.join(root, 'site', 'assets');
const event = JSON.parse(await readFile(path.join(dir, 'event.json'), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const upper = value => esc(String(value).toUpperCase());
const title = esc(event.title).replace(/\s+([^\s]+)$/, '<br>$1');
const replacements = {
  '{{KICKER}}': upper(event.kicker),
  '{{TITLE}}': title,
  '{{DATE}}': upper(event.date),
  '{{TIME}}': upper(event.time),
  '{{LOCATION}}': upper(event.location),
  '{{FACTS}}': upper(event.facts),
  '{{CTA}}': upper(event.cta),
};
const replaceTokens = source => Object.entries(replacements).reduce((value, [token, replacement]) => value.replaceAll(token, replacement), source);

const sourceHtml = await readFile(path.join(dir, 'story-template.html'), 'utf8');
await writeFile(path.join(dir, 'story-live.html'), replaceTokens(sourceHtml));

const imageData = async (name) => {
  const file = path.join(assets, path.basename(name));
  return `data:image/${path.extname(file).slice(1)};base64,${(await readFile(file)).toString('base64')}`;
};
const background = await imageData(event.background || 'food.webp');
const truck = await imageData('eugen-truck-closed.webp');
const titleLines = title.split('<br>');
const text = (value, x, y, size, fill, family = 'Helvetica Neue,Arial,sans-serif', weight = 400, letterSpacing = 0) => `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${value}</text>`;

const frameSvg = progress => {
  const x = -540 + progress * 1660;
  const noteX = x + 38;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#11110f"/><rect x="38" y="38" width="1004" height="1844" rx="28" fill="#ead9bc"/>
  <rect x="66" y="66" width="948" height="720" rx="18" fill="#11110f"/><image href="${background}" x="66" y="66" width="948" height="720" preserveAspectRatio="xMidYMid slice" opacity=".72"/><rect x="66" y="66" width="948" height="720" rx="18" fill="#11110f" opacity=".28"/>
  ${text('„wirtschaft“',106,152,24,'#f3efe6','Helvetica Neue,Arial,sans-serif',700,4)}${text('CAFE · RESTAURANT · BAR',106,188,11,'#f3efe6','Helvetica Neue,Arial,sans-serif',400,2)}
  ${text(replacements['{{KICKER}}'],106,622,18,'#d5af64','Helvetica Neue,Arial,sans-serif',700,4)}
  ${titleLines.map((line, index) => text(line,106,704 + index * 76,78,'#f3efe6','Georgia,serif',400,-2)).join('')}
  ${text(replacements['{{DATE}}'],106,960,28,'#11110f','Helvetica Neue,Arial,sans-serif',700,3)}${text(`${replacements['{{TIME}}']} · ${replacements['{{LOCATION}}']}`,106,1010,24,'#11110f','Helvetica Neue,Arial,sans-serif',400,1)}
  <line x1="106" y1="1060" x2="974" y2="1060" stroke="#11110f" stroke-opacity=".25"/>
  ${text('Fünf Orte.',106,1140,45,'#8c292b','Georgia,serif',400,-1)}${text('Ein Abend.',106,1196,45,'#8c292b','Georgia,serif',400,-1)}
  ${text(replacements['{{FACTS}}'],106,1270,21,'#11110f','Helvetica Neue,Arial,sans-serif',700,1)}
  <rect x="106" y="1428" width="350" height="72" rx="36" fill="#11110f"/>${text(`${replacements['{{CTA}}']} ↗`,281,1473,19,'#ead9bc','Helvetica Neue,Arial,sans-serif',700,2)}
  ${text('wirtschaft-dornbirn.at',106,1728,18,'#11110f','Helvetica Neue,Arial,sans-serif',400,1)}${text('Bahnhofstraße 24 · 6850 Dornbirn',106,1772,14,'#11110f','Helvetica Neue,Arial,sans-serif',400,1)}
  <image href="${truck}" x="${x.toFixed(1)}" y="1460" width="520" height="296" preserveAspectRatio="xMidYMid meet"/><text x="${noteX.toFixed(1)}" y="1508" fill="#8c292b" font-family="Georgia,serif" font-size="32">♪</text><text x="${(noteX + 48).toFixed(1)}" y="1468" fill="#8c292b" font-family="Georgia,serif" font-size="26">♫</text>
  </svg>`;
};

await writeFile(path.join(dir, 'story-cover.svg'), frameSvg(.48));
const frames = path.join(dir, '.frames');
await rm(frames, { recursive: true, force: true });
await mkdir(frames, { recursive: true });
const fps = 24;
const count = 6 * fps;
for (let index = 0; index < count; index += 1) {
  const progress = index / (count - 1);
  const svg = path.join(frames, `frame-${String(index).padStart(4, '0')}.svg`);
  const png = path.join(frames, `frame-${String(index).padStart(4, '0')}.png`);
  await writeFile(svg, frameSvg(progress));
  await run('sips', ['-s', 'format', 'png', svg, '--out', png], { maxBuffer: 8 * 1024 * 1024 });
}
await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'frame-%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(dir, 'story-preview.mp4')], { maxBuffer: 8 * 1024 * 1024 });
await rm(frames, { recursive: true, force: true });
console.log('Story erstellt: output/social-canva/genussroute-story-template/story-preview.mp4');
