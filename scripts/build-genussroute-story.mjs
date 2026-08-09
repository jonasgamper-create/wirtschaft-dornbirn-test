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
const leadLines = String(event.lead || 'Fünf Orte.|Ein Abend.')
  .split('|')
  .map(line => line.trim())
  .filter(Boolean);
const replacements = {
  '{{KICKER}}': upper(event.kicker),
  '{{TITLE}}': title,
  '{{DATE}}': upper(event.date),
  '{{TIME}}': upper(event.time),
  '{{LOCATION}}': upper(event.location),
  '{{FACTS}}': upper(event.facts),
  '{{LEAD}}': leadLines.map((line, index) => `<span${index ? ' class="lead-accent"' : ''}>${esc(line)}</span>`).join('<br>'),
  '{{CTA}}': upper(event.cta),
  '{{BACKGROUND}}': `../../site/assets/${path.basename(event.background || 'food.webp')}`,
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
const brand = await imageData('emma-eugen.png');
const titleLines = title.split('<br>');
const text = (value, x, y, size, fill, family = 'Helvetica Neue,Arial,sans-serif', weight = 400, letterSpacing = 0) => `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${value}</text>`;
const centerText = (value, x, y, size, fill, family = 'Helvetica Neue,Arial,sans-serif', weight = 400, letterSpacing = 0) => `<text text-anchor="middle" x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${value}</text>`;

const frameSvg = progress => {
  const x = -560 + progress * 1700;
  const noteX = x + 58;
  const svgTitleLines = titleLines.map(line => line.toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#29292b"/><rect x="38" y="38" width="1004" height="1844" fill="none" stroke="#ffffff" stroke-opacity=".14"/>
  <image href="${brand}" x="350" y="84" width="380" height="250" preserveAspectRatio="xMidYMid meet"/>
  ${text('ⓘ',778,170,30,'#f5f4f1','Arial,sans-serif',300)}<line x1="850" y1="135" x2="850" y2="186" stroke="#bca875" stroke-opacity=".65"/>${text('▧',879,170,28,'#f5f4f1','Arial,sans-serif',300)}<line x1="948" y1="135" x2="948" y2="186" stroke="#bca875" stroke-opacity=".65"/>${text('♡',973,170,30,'#f5f4f1','Arial,sans-serif',300)}
  ${centerText(replacements['{{KICKER}}'],540,570,18,'#a3874a','Helvetica Neue,Arial,sans-serif',500,4)}
  ${svgTitleLines.map((line, index) => centerText(line,540,682 + index * 86,68,'#f5f4f1','Helvetica Neue,Arial,sans-serif',300,1)).join('')}
  ${centerText(replacements['{{DATE}}'],540,900,28,'#f5f4f1','Helvetica Neue,Arial,sans-serif',500,3)}${centerText(`${replacements['{{TIME}}']} · ${replacements['{{LOCATION}}']}`,540,950,20,'#c8c6c2','Helvetica Neue,Arial,sans-serif',400,1)}
  <line x1="190" y1="1010" x2="890" y2="1010" stroke="#bca875" stroke-opacity=".42"/>
  ${centerText(leadLines[0] ? esc(leadLines[0]) : '',540,1100,44,'#f5f4f1','Helvetica Neue,Arial,sans-serif',300)}${centerText(leadLines[1] ? esc(leadLines[1]) : '',540,1158,44,'#a3874a','Helvetica Neue,Arial,sans-serif',300)}
  ${centerText(replacements['{{FACTS}}'],540,1260,18,'#d8d5cf','Helvetica Neue,Arial,sans-serif',400,2)}
  <rect x="365" y="1334" width="350" height="72" fill="#a3874a"/>${centerText(`${replacements['{{CTA}}']} ↗`,540,1380,18,'#201d19','Helvetica Neue,Arial,sans-serif',500,2)}
  <image href="${background}" x="734" y="1512" width="282" height="270" preserveAspectRatio="xMidYMid slice" opacity=".52"/><rect x="734" y="1512" width="282" height="270" fill="#29292b" opacity=".2"/>
  <image href="${truck}" x="${x.toFixed(1)}" y="1500" width="520" height="296" preserveAspectRatio="xMidYMid meet"/><image href="${brand}" x="${(x + 92).toFixed(1)}" y="${(1580).toFixed(1)}" width="175" height="110" preserveAspectRatio="xMidYMid meet"/><text x="${noteX.toFixed(1)}" y="1550" fill="#a3874a" font-family="Georgia,serif" font-size="32">♪</text><text x="${(noteX + 52).toFixed(1)}" y="1510" fill="#a3874a" font-family="Georgia,serif" font-size="26">♫</text>
  ${centerText('wirtschaft-dornbirn.at',540,1810,16,'#c8c6c2','Helvetica Neue,Arial,sans-serif',400,2)}
  </svg>`;
};

const cover = frameSvg(.48);
await writeFile(path.join(dir, 'story-cover.svg'), cover);
await writeFile(path.join(dir, 'story-template.svg'), cover);
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
