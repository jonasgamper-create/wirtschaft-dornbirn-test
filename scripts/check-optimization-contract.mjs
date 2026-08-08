import { readFile } from 'node:fs/promises';

const index = await readFile('site/index.html', 'utf8');
const catering = await readFile('site/feste-catering.html', 'utf8');
const hooks = await readFile('site/measurement-hooks.js', 'utf8');
const errors = [];

for (const [file, html] of [['site/index.html', index], ['site/feste-catering.html', catering]]) {
  if (!html.includes('measurement-hooks.js')) errors.push(`${file}: Mess-Schnittstelle fehlt`);
  if (/href="[^"]*(?:entwurf|draft)[^"]*"/i.test(html)) errors.push(`${file}: Produktionsseite verlinkt einen Entwurf`);
}

for (const eventName of ['view_events', 'reservation_click', 'menu_open', 'ticket_click', 'calendar_export', 'catering_submit']) {
  if (!hooks.includes(`'${eventName}'`)) errors.push(`measurement-hooks.js: Ereignis ${eventName} fehlt`);
}

// The test build must stay inert: no vendor tag, no storage and no external
// measurement endpoint are allowed before a production consent review.
for (const pattern of [/googletagmanager/i, /google-analytics/i, /document\.cookie/i, /localStorage/i, /sessionStorage/i, /fetch\s*\(/i, /navigator\.sendBeacon/i]) {
  if (pattern.test(hooks)) errors.push(`measurement-hooks.js: unerlaubtes Muster ${pattern}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Optimierungsvertrag OK: keine Entwürfe verlinkt, Mess-Hooks inert und vollständig.');
