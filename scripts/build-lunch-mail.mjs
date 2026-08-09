import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'site', 'data', 'lunch-menu.json');
const outDir = path.join(root, 'output', 'lunch-mail');

const fail = message => {
  console.error(`Mittagskarten-Mail FEHLER: ${message}`);
  process.exit(1);
};

let data;
try {
  data = JSON.parse(await readFile(source, 'utf8'));
} catch (error) {
  fail(`lunch-menu.json konnte nicht gelesen werden (${error.message})`);
}

if (!/^https:\/\/([\w-]+\.)*wirtschaft-dornbirn\.at\//i.test(data?.reservationUrl || '')) {
  fail('reservationUrl muss auf die offizielle Domain zeigen.');
}

const days = [...(data.days || [])].sort((a, b) => a.date.localeCompare(b.date));
if (data.status === 'active' && !days.length) fail('Kein Tag mit Gerichten vorhanden.');

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const formatDay = date => new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(`${date}T12:00:00`));

const dayBlocks = days.map(day => `
      <tr><td style="padding:18px 0 0;border-top:1px solid #d9d2c2;">
        <p style="margin:0 0 8px;font:800 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8c292b;">${escapeHtml(formatDay(day.date))}</p>
        ${(day.dishes || []).map(dish => `<p style="margin:0 0 6px;font:400 18px/1.3 Georgia,serif;color:#11110f;">${escapeHtml(dish.title)}${dish.price ? ` <span style="color:#6a655c;font-size:15px;">· ${escapeHtml(dish.price)}</span>` : ''}${dish.detail ? `<br><span style="font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#6a655c;">${escapeHtml(dish.detail)}</span>` : ''}</p>`).join('')}
      </td></tr>`).join('');

const body = days.length
  ? dayBlocks
  : `<tr><td style="padding:18px 0 0;border-top:1px solid #d9d2c2;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">${escapeHtml(data.pauseNote || 'Aktuell kochen wir nicht mittags.')}</p></td></tr>`;

const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mittagskarte · Wirtschaft Dornbirn</title>
</head>
<body style="margin:0;padding:24px 12px;background:#f3efe6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border:1px solid #e0d8c8;">
    <tr><td style="padding:28px 28px 18px;">
      <p style="margin:0;font:800 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8c292b;">Mittag in der Wirtschaft</p>
      <h1 style="margin:10px 0 4px;font:400 34px/1.05 Georgia,serif;color:#11110f;">Die Mittagskarte.</h1>
      <p style="margin:0;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:#6a655c;">${escapeHtml(data.serviceWindow || '')}</p>
    </td></tr>
    <tr><td style="padding:0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}
    </table></td></tr>
    <tr><td style="padding:24px 28px 28px;">
      <a href="${escapeHtml(data.reservationUrl)}" style="display:inline-block;padding:14px 26px;background:#244635;color:#ffffff;font:800 12px/1 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border-radius:999px;">Tisch reservieren</a>
      <p style="margin:18px 0 0;font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Wirtschaft Dornbirn · Bahnhofstraße 24 · 6850 Dornbirn<br>Abmeldung jederzeit per Antwort auf diese E-Mail.</p>
    </td></tr>
  </table>
</body>
</html>
`;

const text = [
  'MITTAGSKARTE · WIRTSCHAFT DORNBIRN',
  data.serviceWindow || '',
  '',
  ...(days.length
    ? days.flatMap(day => [formatDay(day.date), ...(day.dishes || []).map(dish => `  ${dish.title}${dish.price ? ` · ${dish.price}` : ''}${dish.detail ? ` (${dish.detail})` : ''}`), ''])
    : [data.pauseNote || '', '']),
  `Tisch reservieren: ${data.reservationUrl}`,
  'Wirtschaft Dornbirn · Bahnhofstraße 24 · 6850 Dornbirn',
  'Abmeldung jederzeit per Antwort auf diese E-Mail.'
].join('\n');

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'mittagskarte-mail.html'), html);
await writeFile(path.join(outDir, 'mittagskarte-mail.txt'), `${text}\n`);
console.log(`Mittagskarten-Mail erstellt: output/lunch-mail (${days.length} Tage, status ${data.status})`);
