import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicFiles = [
  path.join(root, 'dist/index.html'),
  path.join(root, 'dist/app.js'),
  path.join(root, 'dist/feste-catering.js')
];
const forbidden = [
  /inventory-store/i,
  /recordReservationInquiry/i,
  /recordTicketInquiry/i,
  /\blocalStorage\b/i,
  /\bsessionStorage\b/i,
  /document\.cookie/i,
  /google-analytics/i,
  /gtag\s*\(/i,
  /connect-src\s+[^;]*https?:/i,
  /form-action\s+[^;]*mailto:/i,
  /Anfrage per E-Mail/i
];

for (const file of publicFiles) {
  const content = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(content)) throw new Error(`${pattern} in ${path.relative(root, file)}`);
  }
}

console.log('Privacy-Prüfung OK: kein öffentliches Browser-Tracking oder internes Inventar gefunden.');
