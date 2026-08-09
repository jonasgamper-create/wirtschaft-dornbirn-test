/**
 * Erzeugt quadratische Seitensymbole aus dem unveraenderten Wirtschaft-Logo.
 *
 * Das Original ist 300x69 und damit 4,3:1 breit. Browser rendern Favicons
 * quadratisch, wodurch der Schriftzug unlesbar zusammengequetscht wird. Hier
 * wird das Logo daher massstabsgetreu auf eine Papierflaeche gesetzt - das
 * Logo selbst bleibt unveraendert, es bekommt nur eine Buehne.
 */
import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'site', 'assets', 'wirtschaft-logo.png');
const outDir = path.join(root, 'site', 'assets', 'icons');

const PYTHON = [
  process.env.CODEX_PYTHON,
  path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'),
  'python3'
].filter(Boolean);

// Groesse -> seitlicher Rand in Prozent der Kantenlaenge
const TARGETS = [
  { file: 'favicon-32.png', size: 32, pad: 0.06 },
  { file: 'favicon-180.png', size: 180, pad: 0.12 },
  { file: 'favicon-512.png', size: 512, pad: 0.14 }
];

const SCRIPT = `
import sys, json
from PIL import Image
src, out_dir, targets = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
PAPER = (243, 239, 230, 255)
logo = Image.open(src).convert("RGBA")
for t in targets:
    size, pad = t["size"], t["pad"]
    canvas = Image.new("RGBA", (size, size), PAPER)
    inner = int(size * (1 - 2 * pad))
    ratio = logo.width / logo.height
    w = inner
    h = max(1, int(round(inner / ratio)))
    if h > inner:
        h = inner
        w = max(1, int(round(inner * ratio)))
    resized = logo.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(resized, ((size - w) // 2, (size - h) // 2))
    canvas.save(f"{out_dir}/{t['file']}")
    print(f"{t['file']}: {size}x{size}, Logo {w}x{h}")
`;

async function pickPython() {
  for (const candidate of PYTHON) {
    try {
      await run(candidate, ['-c', 'import PIL']);
      return candidate;
    } catch { /* naechster Kandidat */ }
  }
  throw new Error('Kein Python mit Pillow gefunden.');
}

await access(source);
await mkdir(outDir, { recursive: true });
const python = await pickPython();
const { stdout } = await run(python, ['-c', SCRIPT, source, outDir, JSON.stringify(TARGETS)]);
process.stdout.write(stdout);
console.log(`Seitensymbole erstellt: ${path.relative(root, outDir)}`);
