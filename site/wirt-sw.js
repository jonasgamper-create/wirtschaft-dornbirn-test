// Der Service Worker der Wirt-App: er laesst das Telefon klingeln, wenn
// eine Bestellung oder eine Reservierung hereinkommt.
//
// Er tut genau zwei Dinge: er nimmt das Anklopfen des Push-Dienstes entgegen
// und oeffnet auf Tippen die Wirt-Ansicht. Kein Zwischenspeicher, keine
// Offline-Kopie - die Ansicht soll immer den echten Stand zeigen.
//
// Das Anklopfen kommt ohne Inhalt. Was in der Meldung steht, holt der Worker
// selbst beim Dienst, mit dem Hausschluessel - ueber Apple und Google laeuft
// nur "da war etwas", nie ein Name oder eine Bestellung.

const LAGER = 'wirtschaft-wirt';
const ADRESSE = '/__wirt__/zugang';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ereignis => ereignis.waitUntil(self.clients.claim()));

async function merke(daten) {
  const lager = await caches.open(LAGER);
  await lager.put(ADRESSE, new Response(JSON.stringify(daten)));
}

async function hole() {
  try {
    const lager = await caches.open(LAGER);
    const antwort = await lager.match(ADRESSE);
    return antwort ? await antwort.json() : null;
  } catch {
    return null;
  }
}

// Die Seite reicht Dienstadresse und Schluessel herein, wenn das Geraet
// angemeldet wird - und raeumt sie beim Abmelden wieder weg.
self.addEventListener('message', ereignis => {
  const nachricht = ereignis.data || {};
  if (nachricht.art === 'merke') ereignis.waitUntil(merke(nachricht.daten));
  if (nachricht.art === 'vergiss') ereignis.waitUntil(caches.delete(LAGER));
});

self.addEventListener('push', ereignis => {
  ereignis.waitUntil((async () => {
    const daten = await hole();
    // Eine Meldung MUSS gezeigt werden - sonst blendet der Browser von sich
    // aus "im Hintergrund aktualisiert" ein, und das sagt dem Wirt nichts.
    let titel = 'Wirtschaft · neu im Haus';
    let text = 'Eine neue Bestellung oder Reservierung ist da.';
    let ziel = daten?.seite || './wirt.html';

    if (daten?.api && daten?.token) {
      try {
        const antwort = await fetch(`${daten.api}/api/push/haus`, {
          cache: 'no-store',
          headers: { 'x-haus-token': daten.token }
        });
        const stand = await antwort.json();
        // Die Zahl am Symbol gleich mitsetzen - die App selbst ist zu.
        if (stand?.ok && Number.isFinite(stand.offen) && 'setAppBadge' in self.navigator) {
          await (stand.offen > 0 ? self.navigator.setAppBadge(stand.offen) : self.navigator.clearAppBadge()).catch(() => {});
        }
        if (stand?.ok && stand.letzte?.titel) {
          titel = stand.letzte.titel;
          text = stand.letzte.text || text;
          // Die Meldung oeffnet gleich den richtigen Tag - eine Vorbestellung
          // fuer Montag soll nicht in einer leeren Samstagsliste enden.
          if (stand.letzte.datum) {
            const adresse = new URL(ziel, self.location.href);
            adresse.searchParams.set('tag', stand.letzte.datum);
            ziel = adresse.href;
          }
        }
      } catch {
        /* Kein Netz: dann eben die allgemeine Meldung. */
      }
    }

    await self.registration.showNotification(titel, {
      body: text,
      icon: daten?.symbol || undefined,
      badge: daten?.symbol || undefined,
      // Jede Bestellung ihre eigene Meldung: zwei Bestellungen kurz
      // hintereinander sollen zwei Zettel sein, nicht einer.
      tag: `wirtschaft-haus-${Date.now()}`,
      data: { ziel }
    });
  })());
});

self.addEventListener('notificationclick', ereignis => {
  ereignis.notification.close();
  const ziel = ereignis.notification.data?.ziel || './wirt.html';
  ereignis.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const eines of fenster) {
      if (eines.url.includes('wirt') && 'focus' in eines) {
        await eines.navigate?.(ziel).catch(() => {});
        return eines.focus();
      }
    }
    return self.clients.openWindow(ziel);
  })());
});
