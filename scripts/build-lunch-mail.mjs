import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'site', 'data', 'lunch-menu.json');
const outDir = path.join(root, 'output', 'lunch-mail');

const fail = message => {
  console.error(`Mittagsmenü-Mail FEHLER: ${message}`);
  process.exit(1);
};

let data;
try {
  data = JSON.parse(await readFile(source, 'utf8'));
} catch (error) {
  fail(`lunch-menu.json konnte nicht gelesen werden (${error.message})`);
}

if (!data?.weekLabel?.trim()) fail('weekLabel fehlt.');
if (!data?.serviceWindow?.trim()) fail('serviceWindow fehlt.');
if (!/^https:\/\/([\w-]+\.)*wirtschaft-dornbirn\.at\//i.test(data?.reservationUrl || '')) {
  fail('reservationUrl muss auf die offizielle Domain zeigen.');
}
const courses = Array.isArray(data?.courses) ? data.courses : [];
if (!courses.length) fail('Mindestens ein Gang ist erforderlich.');
for (const [index, course] of courses.entries()) {
  if (!course?.title?.trim() || !course?.price?.trim()) fail(`courses[${index}] braucht title und price.`);
}

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const courseRows = courses.map(course => `
      <tr>
        <td style="padding:14px 0;border-top:1px solid #d9d2c2;color:#8c292b;font:700 11px/1.4 Helvetica,Arial,sans-serif;vertical-align:top;">${escapeHtml(course.position || '')}</td>
        <td style="padding:14px 12px;border-top:1px solid #d9d2c2;vertical-align:top;">
          <p style="margin:0;font:400 19px/1.25 Georgia,serif;color:#11110f;">${escapeHtml(course.title)}</p>
          ${course.detail ? `<p style="margin:4px 0 0;font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#6a655c;">${escapeHtml(course.detail)}</p>` : ''}
        </td>
        <td style="padding:14px 0;border-top:1px solid #d9d2c2;text-align:right;font:400 17px/1.3 Georgia,serif;color:#11110f;vertical-align:top;white-space:nowrap;">${escapeHtml(course.price)}</td>
      </tr>`).join('');

const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mittagsmenü · Wirtschaft Dornbirn</title>
</head>
<body style="margin:0;padding:24px 12px;background:#f3efe6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border:1px solid #e0d8c8;">
    <tr><td style="padding:28px 28px 20px;">
      <p style="margin:0;font:800 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8c292b;">Mittag in der Wirtschaft</p>
      <h1 style="margin:10px 0 4px;font:400 34px/1.05 Georgia,serif;color:#11110f;">Das Mittagsmenü.</h1>
      <p style="margin:0;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:#6a655c;">${escapeHtml(data.weekLabel)} · ${escapeHtml(data.serviceWindow)}</p>
    </td></tr>
    <tr><td style="padding:0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${courseRows}
      </table>
    </td></tr>
    ${data.note ? `<tr><td style="padding:16px 28px 0;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#6a655c;">${escapeHtml(data.note)}</p></td></tr>` : ''}
    <tr><td style="padding:22px 28px 28px;">
      <a href="${escapeHtml(data.reservationUrl)}" style="display:inline-block;padding:14px 26px;background:#244635;color:#ffffff;font:800 12px/1 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border-radius:999px;">Tisch zum Mittag reservieren</a>
      <p style="margin:18px 0 0;font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Wirtschaft Dornbirn · Bahnhofstraße 24 · 6850 Dornbirn<br>Abmeldung jederzeit per Antwort auf diese E-Mail.</p>
    </td></tr>
  </table>
</body>
</html>
`;

const text = [
  `MITTAGSMENÜ · WIRTSCHAFT DORNBIRN`,
  `${data.weekLabel} · ${data.serviceWindow}`,
  '',
  ...courses.map(course => `${course.position ? `${course.position} · ` : ''}${course.title} – ${course.price}${course.detail ? ` (${course.detail})` : ''}`),
  ...(data.note ? ['', data.note] : []),
  '',
  `Tisch reservieren: ${data.reservationUrl}`,
  'Wirtschaft Dornbirn · Bahnhofstraße 24 · 6850 Dornbirn',
  'Abmeldung jederzeit per Antwort auf diese E-Mail.'
].join('\n');

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'mittagsmenu-mail.html'), html);
await writeFile(path.join(outDir, 'mittagsmenu-mail.txt'), `${text}\n`);
console.log(`Mittagsmenü-Mail erstellt: output/lunch-mail (${courses.length} Gänge, ${data.weekLabel})`);
