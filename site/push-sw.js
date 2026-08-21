// Der Service Worker fuer die Abholmeldung.
//
// Er tut genau zwei Dinge: er nimmt das Anklopfen des Push-Dienstes entgegen
// und er oeffnet auf Tippen die eigene Bestellseite. Kein Zwischenspeicher,
// keine Offline-Kopie - diese Seite soll immer den echten Stand zeigen, und
// ein Service Worker, der Seiten aufbewahrt, ist die haeufigste Ursache
// dafuer, dass Leute eine alte Fassung sehen.
//
// Das Anklopfen kommt ohne Inhalt. Was in der Meldung steht, holt der Worker
// selbst beim Dienst - damit laeuft ueber die Server von Google und Apple nur
// "da war etwas" und nicht "Nr. 4, Kaesknoepfle, Anna".

const LAGER = 'wirtschaft-abholung';
const SCHLUESSEL_ADRESSE = '/__abholung__/schluessel';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ereignis => ereignis.waitUntil(self.clients.claim()));

/**
 * Der Bestellschluessel liegt im Cache, weil der Worker ihn auch dann braucht,
 * wenn keine Seite mehr offen ist. Es ist derselbe Schluessel, der ohnehin in
 * der Adresse der Statusseite steht - er verlaesst das Geraet nur an den
 * eigenen Dienst.
 */
async function merke(daten) {
  const lager = await caches.open(LAGER);
  await lager.put(SCHLUESSEL_ADRESSE, new Response(JSON.stringify(daten)));
}

async function hole() {
  try {
    const lager = await caches.open(LAGER);
    const antwort = await lager.match(SCHLUESSEL_ADRESSE);
    return antwort ? await antwort.json() : null;
  } catch {
    return null;
  }
}

// Die Seite reicht Schluessel und Dienstadresse herein, sobald sich der Gast
// angemeldet hat - und raeumt sie beim Abmelden wieder weg.
self.addEventListener('message', ereignis => {
  const nachricht = ereignis.data || {};
  if (nachricht.art === 'merke') ereignis.waitUntil(merke(nachricht.daten));
  if (nachricht.art === 'vergiss') ereignis.waitUntil(caches.delete(LAGER));
});

self.addEventListener('push', ereignis => {
  ereignis.waitUntil((async () => {
    const daten = await hole();

    // Ohne Schluessel bleibt nur die allgemeine Meldung. Eine Meldung MUSS
    // gezeigt werden - zeigt ein Worker nach einem Push gar nichts, blenden
    // die Browser von sich aus "Diese Seite wurde im Hintergrund aktualisiert"
    // ein, und das ist die schlechtere Auskunft.
    let titel = 'Wirtschaft Dornbirn';
    let text = 'Es gibt Neues zu deiner Bestellung.';
    let ziel = daten?.seite || '/';

    if (daten?.api && daten?.token) {
      try {
        const antwort = await fetch(
          `${daten.api}/api/takeaway/status?t=${encodeURIComponent(daten.token)}`,
          { cache: 'no-store' }
        );
        const stand = await antwort.json();
        if (stand?.ok) {
          if (stand.status === 'fertig') {
            titel = `Abholbereit – Nr. ${stand.nummer}`;
            text = 'Dein Essen wartet, wir halten es warm.';
          } else if (stand.verschobenVon) {
            titel = `Es dauert etwas länger – Nr. ${stand.nummer}`;
            text = `Statt ${stand.verschobenVon} Uhr jetzt ${stand.abholzeit} Uhr. Danke fürs Warten!`;
          } else {
            titel = `Deine Bestellung – Nr. ${stand.nummer}`;
            text = `Abholung gegen ${stand.abholzeit} Uhr.`;
          }
          ziel = `${daten.seite}?bestellung=${encodeURIComponent(daten.token)}`;
        }
      } catch {
        /* Kein Netz: dann eben die allgemeine Meldung. */
      }
    }

    await self.registration.showNotification(titel, {
      body: text,
      icon: daten?.symbol || undefined,
      badge: daten?.symbol || undefined,
      // Eine Bestellung, eine Meldung: eine neue ersetzt die vorige, statt
      // sich zu stapeln. Wer "+10 Min" und danach "fertig" bekommt, soll
      // nicht zwei widersprechende Zettel im Sperrbildschirm haben.
      tag: 'wirtschaft-abholung',
      renotify: true,
      data: { ziel }
    });
  })());
});

self.addEventListener('notificationclick', ereignis => {
  ereignis.notification.close();
  const ziel = ereignis.notification.data?.ziel || '/';
  ereignis.waitUntil((async () => {
    // Ist die Seite noch irgendwo offen, wird sie nach vorne geholt statt
    // ein zweites Fenster aufzumachen.
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const eines of fenster) {
      if (eines.url.includes('takeaway') && 'focus' in eines) {
        await eines.navigate?.(ziel).catch(() => {});
        return eines.focus();
      }
    }
    return self.clients.openWindow(ziel);
  })());
});
