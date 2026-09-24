(() => {
  'use strict';

  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  const FALLBACK_BILDER = ['assets/abend-01.webp', 'assets/abend-02.webp', 'assets/abend-03.webp', 'assets/abend-04.webp'];
  let vorhandeneBilder = new Set();
  let alleEvents = [];
  let vorhandeneVideos = new Set();
  const MONATE = new Intl.DateTimeFormat('de-AT', { month: 'short' });

  const escapeHtml = wert => String(wert).replace(/[&<>"']/g, zeichen => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[zeichen]
  ));

  const preis = wert => `€ ${String(wert).replace('.', ',')}`;

  // Ausverkauft heisst: keine der Kategorien hat noch etwas frei. Die Zahl
  // stammt aus dem Ticketdienst; sagt der Veranstalter es zusaetzlich im
  // Text, zaehlt auch das (termin.buchbar).
  const ausverkauft = weg => {
    if (weg.buchbar === false) return true;
    const preise = weg.preise || [];
    return preise.length > 0 && preise.every(p => p.frei === 0);
  };

  // Die Adresse des eigenen Dienstes - einmal gelesen, dann gemerkt. Im
  // Probemodus der Testdienst, sonst der echte (siehe probe.js).
  const dienstAdresse = (() => {
    let versprochen = null;
    return () => {
      versprochen ||= fetch('data/haus.json?t=' + Date.now(), { cache: 'no-store' })
        .then(antwort => antwort.json())
        .then(daten => {
          const adresse = String((window.WIRTSCHAFT_PROBE && daten?.probe) || daten?.api || '').trim().replace(/\/+$/, '');
          return /^https?:\/\//.test(adresse) ? adresse : '';
        })
        .catch(() => '');
      return versprochen;
    };
  })();

  const statusWort = status => ({
    buchbar: 'buchbar',
    ausverkauft: 'ausverkauft',
    warteliste: 'warteliste'
  })[status] || status;

  /**
   * Eine Kachel - fuer beide Haeuser dieselbe Form.
   *
   * Die Daten kommen vom Ticketdienst: Name, Untertitel, Tag und Uhrzeit,
   * Ort, Bild und ob noch gekauft werden kann. Preise kennt er nicht; wo
   * wir eigene haben (data/events.json), stehen sie darunter, sonst nicht.
   * Geraten wird nichts.
   *
   * Der Ort entscheidet ueber die Farbe: die Abende im Kulturhaus sind
   * beige, die im eigenen Haus dunkel (Jonas, 11.09.). Eine Liste, zwei
   * Haeuser, ein Blick.
   */
  /**
   * @param vorbei  Der Abend war gestern oder frueher. Die Kachel bleibt
   *   noch eine Woche stehen - blass, mit "verpasst" im Bild und ohne
   *   Knoepfe. Ein Plakat oder ein geteilter Link soll nicht ins Leere
   *   fuehren, aber niemand soll auf einen toten Ticketknopf druecken.
   */
  function kachel(termin, index, vorbei = false) {
    const datum = new Date(`${termin.date}T12:00:00`);
    const tag = termin.date.slice(8, 10);
    const monat = MONATE.format(datum).replace('.', '');
    const wochentag = new Intl.DateTimeFormat('de-AT', { weekday: 'long' }).format(datum);
    const fallback = FALLBACK_BILDER[index % FALLBACK_BILDER.length];
    const bild = termin.bild || fallback;
    const video = vorhandeneVideos.has(termin.id) ? `assets/events/${encodeURIComponent(termin.id)}.mp4` : '';
    const imKulturhaus = termin.haus === 'kulturhaus';

    // Jede Kategorie eine Zeile: was sie heisst, was sie kostet, ob noch
    // etwas da ist. Beim zweiten Weg steht sein Name davor, damit man sieht,
    // wozu der Preis gehoert.
    const zeile = (p, praefix = '') => `
      <li data-status="${p.frei === 0 ? 'ausverkauft' : 'buchbar'}">
        <span class="tz-name">${escapeHtml(praefix && !String(p.name).toLowerCase().startsWith(praefix.toLowerCase()) ? `${praefix}: ${p.name}` : p.name)}</span>
        <span class="tz-detail">${escapeHtml(preis(p.preis))}${p.frei === 0 ? ' · ausverkauft' : ''}</span>
      </li>`;
    // Alle Posten eines Abends: die eigenen Kategorien und die des zweiten
    // Ticketwegs.
    const posten = [
      ...(termin.preise || []).map(p => ({ p })),
      ...(termin.varianten || []).flatMap(v => (v.preise || []).map(p => ({ p, praefix: v.label })))
    ];

    // Eine lange Liste zieht die ganze Reihe in die Hoehe: die Kacheln einer
    // Reihe sind gleich hoch, also bekommen die Nachbarn ein Loch. Bei der
    // Genussroute waren es fuenf Zeilen - fuenfmal derselbe Preis, weil dort
    // nicht Kategorien, sondern Startorte verkauft werden. Die Kachel war
    // 694 px hoch, ihre drei Nachbarn hatten 236 px Luft (Jonas, 17.09.).
    //
    // Zwei Regeln, beide inhaltlich begruendet:
    //  - Kostet alles gleich viel, genuegt EINE Zeile mit der Anzahl. Mehr
    //    sagt die Aufzaehlung nicht; welche es sind, steht beim Ticketdienst.
    //  - Bleiben trotzdem mehr als drei, stehen drei da und der Rest als
    //    Zeile. Das ist die Bremse fuer Abende, die es noch nicht gibt.
    const alleGleich = posten.length > 3
      && posten.every(x => x.p.preis === posten[0].p.preis && (x.p.frei === 0) === (posten[0].p.frei === 0));
    let sichtbar = posten;
    let rest = 0;
    if (alleGleich) {
      sichtbar = [{ p: { ...posten[0].p, name: `${posten.length} kategorien zur wahl` } }];
    } else if (posten.length > 3) {
      sichtbar = posten.slice(0, 3);
      rest = posten.length - 3;
    }

    const zeilen = sichtbar.map(x => zeile(x.p, x.praefix)).join('')
      + (rest ? `<li><span class="tz-name">und ${rest} weitere</span><span class="tz-detail"></span></li>` : '');

    // Zweite Zeile: wann und wo. Beim Kulturhaus gehoert der Ort dazu, im
    // eigenen Haus waere er Fuellsel - der Gast steht ja schon davor.
    const zweite = [
      wochentag,
      termin.zeit ? `${termin.zeit} Uhr` : '',
      imKulturhaus ? 'kulturhaus dornbirn' : '',
      termin.untertitel
    ].filter(Boolean).join(' · ');

    // Ein Abend, bis zu zwei Wege zur Karte: "dinner & comedy" um 19 Uhr und
    // "comedy only" um 21 Uhr sind beim Ticketdienst zwei Veranstaltungen -
    // hier stehen sie als zwei Knoepfe auf einer Kachel (Jonas, 14.09.).
    // Bei einem Weg genuegt "ausverkauft"; bei zweien muss dabeistehen,
    // WELCHER weg ist - sonst weiss der Gast nicht, ob der andere noch geht.
    const zweiWege = Boolean(termin.varianten?.length);
    const knopf = (weg, beschriftung, art) => ausverkauft(weg)
      ? `<span class="button ${art} kachel-ausverkauft" aria-disabled="true">${escapeHtml(zweiWege ? `${beschriftung} · ausverkauft` : 'ausverkauft')}</span>`
      : `<button class="button ${art}" type="button" data-buchen="${escapeHtml(weg.ticketUrl)}" data-titel="${escapeHtml(termin.title)}">${escapeHtml(beschriftung)}</button>`;

    const wege = [knopf(termin, zweiWege ? erstesWort(termin) : 'tickets buchen', 'light')];
    for (const v of termin.varianten || []) {
      wege.push(knopf({ ...v, preise: v.preise || [] }, v.label, 'ghost'));
    }
    // Ist ein Weg ausverkauft, gibt es die Warteliste - von selbst, ohne
    // dass jemand sie anlegt. Der Knopf steht NEBEN dem grauen "ausverkauft",
    // nicht statt seiner: der Gast soll beides sehen, den Stand und den Weg.
    if (wegeVon(termin).some(w => w.ausverkauft)) {
      wege.push(`<button class="button ghost kachel-warteliste" type="button" data-warteliste="${escapeHtml(termin.id)}">auf die warteliste</button>`);
    }

    return `
    <article class="event-kachel" data-haus="${escapeHtml(termin.haus || 'wirtschaft')}" data-status="${vorbei ? 'vorbei' : ausverkauft(termin) ? 'sold_out' : 'buchbar'}"${vorbei ? ' data-vorbei="ja"' : ''}>
      <div class="kachel-medien">
        <img src="${escapeHtml(bild)}"${termin.bild2x ? ` srcset="${escapeHtml(bild)} 1x, ${escapeHtml(termin.bild2x)} 2x"` : ''} width="1200" height="750" loading="lazy" decoding="async"
             alt="${escapeHtml(termin.title)}" data-fallback="${fallback}">
        ${video && !vorbei ? `<video preload="metadata" playsinline muted hidden src="${video}"></video>
        <button class="kachel-hoerprobe" type="button">Hörprobe ▶</button>` : ''}
        ${vorbei ? '<p class="kachel-verpasst">verpasst</p>' : ''}
      </div>
      <div class="kachel-inhalt">
        <div class="kachel-zeile">
          <time datetime="${escapeHtml(termin.date)}"><b>${escapeHtml(tag)}</b><span>${escapeHtml(monat)}</span></time>
          <h2>${escapeHtml(termin.title)}</h2>
        </div>
        <p class="kachel-typ">${escapeHtml(zweite)}</p>
        ${zeilen ? `<ul class="ticketzeilen">${zeilen}</ul>` : ''}
        ${vorbei ? '' : `<div class="kachel-aktionen">
          ${wege.join('')}
          <button class="button ghost kachel-kalender" type="button" data-kalender="${escapeHtml(termin.id)}" aria-label="${escapeHtml(termin.title)} in den Kalender eintragen">+ Kalender</button>
        </div>`}
      </div>
    </article>`;
  }

  /**
   * Die Beschriftung des ersten Knopfes, wenn es zwei Wege gibt. Sie kommt
   * aus dem Namen der Kategorie ("dinner & comedy (sitzplatz)" wird zu
   * "dinner & comedy") - so steht auf beiden Knoepfen, was man bekommt,
   * und nicht zweimal "tickets buchen".
   */
  function erstesWort(termin) {
    const name = (termin.preise || [])[0]?.name || '';
    const ohneKlammer = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return ohneKlammer || 'tickets buchen';
  }

  /**
   * Die Termine beider Haeuser: zuerst beim Dienst, der sie selbst beim
   * Ticketdienst liest und zwoelf Stunden haelt. Antwortet er nicht, gilt
   * der Stand, der bei uns liegt - lieber ein Programm von gestern als eine
   * leere Seite. Der Browser des Gastes fragt nie beim Ticketdienst an;
   * auch die Bilder liegen bei uns.
   */
  async function holeTermine() {
    const ausDatei = () => fetch('data/termine.json', { cache: 'no-store' })
      .then(a => a.json()).then(d => d?.termine || []).catch(() => []);
    const hinterlegt = await ausDatei();

    // Was bei uns liegt und was der Dienst NICHT liefern kann: die Bilder
    // (sie sollen nicht von aussen nachgeladen werden) und die Preise (der
    // Ticketdienst gibt sie oeffentlich nicht heraus). Beides kommt ueber
    // die Kennung an den frischen Termin.
    const dazu = new Map(hinterlegt.map(t => [t.id, {
      bild: t.bild || '',
      preise: t.preise || [],
      varianten: new Map((t.varianten || []).map(v => [v.id, v.preise || []]))
    }]));

    const ergaenze = termin => {
      const eigen = dazu.get(termin.id);
      if (!eigen) return termin;
      return {
        ...termin,
        bild: eigen.bild,
        preise: eigen.preise,
        varianten: (termin.varianten || []).map(v => ({ ...v, preise: eigen.varianten.get(v.id) || [] }))
      };
    };

    try {
      const haus = await fetch('data/haus.json?t=' + Date.now(), { cache: 'no-store' }).then(a => a.json());
      // Im Probemodus der Testdienst, sonst der echte (siehe probe.js).
      const basis = String((window.WIRTSCHAFT_PROBE && haus?.probe) || haus?.api || '').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//.test(basis)) return hinterlegt;
      const antwort = await fetch(`${basis}/api/termine`, { cache: 'no-store' }).then(a => a.json());
      const liste = antwort?.ok ? (antwort.termine || []) : [];
      return liste.length ? liste.map(ergaenze) : hinterlegt;
    } catch {
      return hinterlegt;
    }
  }

  /** Kennung beim Ticketdienst aus einem Ticketweg: .../events/<kennung>. */
  const kennungAus = adresse => (String(adresse || '').match(/\/events\/([a-z0-9-]+)/) || [])[1] || '';

  // Buchung im Haus: der Klick oeffnet Ticketist als Overlay. Der Gast
  // bleibt auf unserer Seite; Buchung und Zahlung laufen beim Anbieter.
  const dialog = document.getElementById('ticketDialog');
  const frame = document.getElementById('ticketDialogFrame');
  const dialogTitel = document.getElementById('ticketDialogTitel');
  const dialogExtern = document.getElementById('ticketDialogExtern');
  function oeffneBuchung(url, titel) {
    if (!dialog || !frame) { window.open(url, '_blank', 'noopener'); return; }
    dialogTitel.textContent = titel;
    dialogExtern.href = url;
    frame.src = url;
    dialog.showModal();
  }
  if (dialog) {
    document.getElementById('ticketDialogZu').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { frame.src = 'about:blank'; });
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }

  // Ein Termin als Kalenderdatei, mit echter Uhrzeit: der Abend beginnt zur
  // ersten Ticketzeit und endet um 23 Uhr - dieselbe Form wie die grosse
  // Datei wirtschaft-events.ics, damit beide Wege im Kalender gleich aussehen.
  function terminAlsIcs(event) {
    // Die Uhrzeit kommt jetzt vom Ticketdienst und stimmt damit auch fuer
    // die Abende im Kulturhaus. Die Ticketzeile bleibt als Rueckfall.
    const beginn = (event.zeit || event.tickets?.[0]?.beginn || '19:00').padStart(5, '0');
    const d = event.date.replaceAll('-', '');
    const stempel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const schuetze = wert => String(wert).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'PRODID:-//Wirtschaft Dornbirn//Veranstaltungen//DE',
      'BEGIN:VEVENT',
      `UID:${event.id}@wirtschaft-dornbirn.at`,
      `DTSTAMP:${stempel}`,
      `DTSTART;TZID=Europe/Vienna:${d}T${beginn.replace(':', '')}00`,
      `DTEND;TZID=Europe/Vienna:${d}T230000`,
      `SUMMARY:${schuetze(event.title)}`,
      `DESCRIPTION:${schuetze([event.untertitel, 'Tickets: ticketist.io'].filter(Boolean).join('. '))}`,
      // Der Ort kommt vom Ticketdienst: die Abende im Kulturhaus stehen
      // sonst mit unserer Adresse im Kalender des Gastes.
      `LOCATION:${schuetze(event.adresse ? `${event.ort}, ${event.adresse}` : 'Wirtschaft Dornbirn, Bahnhofstraße 24, 6850 Dornbirn')}`,
      'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  }
  function ladeIcsHerunter(inhalt, dateiname) {
    const url = URL.createObjectURL(new Blob([inhalt], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = dateiname; a.hidden = true;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Die Wege eines Abends, flach: der Hauptweg und jede Variante als eigener
   * Eintrag mit Kennung, Beschriftung, Zeit und ob noch etwas da ist. Die
   * Warteliste haengt am Weg, nicht am Abend - "dinner & comedy" und
   * "comedy only" sind beim Ticketdienst zwei Veranstaltungen.
   */
  function wegeVon(termin) {
    const zweiWege = Boolean(termin.varianten?.length);
    const raus = [{
      id: termin.id,
      titel: termin.title,
      label: zweiWege ? erstesWort(termin) : termin.title,
      datum: termin.date,
      zeit: termin.zeit || '',
      haus: termin.haus || 'wirtschaft',
      ticketUrl: termin.ticketUrl,
      ausverkauft: ausverkauft(termin)
    }];
    for (const v of termin.varianten || []) {
      raus.push({
        id: v.id,
        titel: `${termin.title} · ${v.label}`,
        label: v.label,
        datum: termin.date,
        zeit: v.zeit || '',
        haus: termin.haus || 'wirtschaft',
        ticketUrl: v.ticketUrl,
        ausverkauft: ausverkauft({ ...v, preise: v.preise || [] })
      });
    }
    return raus;
  }

  const kurzesDatum = (datum, zeit) => {
    const d = new Date(`${datum}T12:00:00`);
    const tag = new Intl.DateTimeFormat('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(d).replace(/\.$/, '');
    return zeit ? `${tag} · ${zeit} Uhr` : tag;
  };

  // ---- Die Warteliste --------------------------------------------------------
  //
  // Der Klick auf "auf die warteliste" oeffnet einen Kasten wie die
  // Ticketbuchung. Darin: alle ausverkauften Wege dieses Abends UND desselben
  // Programms an anderen Tagen (Luis spielt dreimal), je ein Haken -
  // vorgehakt ist, was auf der Kachel stand. Gibt es vom selben Programm
  // noch etwas zu kaufen, steht das gleich dabei, mit Knopf: wer heute
  // Karten will, soll nicht warten muessen, wenn morgen welche da sind.
  const warteDialog = document.getElementById('warteDialog');
  const warteForm = document.getElementById('warteForm');
  const warteNote = document.getElementById('warteNote');
  const warteWege = document.getElementById('warteWege');
  const warteAlternativen = document.getElementById('warteAlternativen');

  const programmVon = termin => String(termin.title || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function oeffneWarteliste(terminId) {
    if (!warteDialog || !warteForm) return;
    const termin = alleEvents.find(t => t.id === terminId);
    if (!termin) return;
    // Dasselbe Programm an anderen Tagen im selben Haus - erst dieser Abend,
    // dann die anderen nach Datum.
    const verwandte = alleEvents
      .filter(t => t.id !== termin.id && programmVon(t) === programmVon(termin) && (t.haus || 'wirtschaft') === (termin.haus || 'wirtschaft'))
      .sort((a, b) => a.date.localeCompare(b.date));
    const alleWege = [termin, ...verwandte].flatMap(wegeVon);
    const weg = alleWege.filter(w => w.ausverkauft);
    // Was noch zu haben ist: alles vom selben Abend, dazu hoechstens die
    // naechsten drei anderen Tage. "dinner & comedy" gibt es sechsmal im
    // Halbjahr - sechs Knoepfe waeren kein Hinweis mehr, sondern eine Liste.
    const nochAlle = alleWege.filter(w => !w.ausverkauft);
    const noch = [
      ...nochAlle.filter(w => w.datum === termin.date),
      ...nochAlle.filter(w => w.datum !== termin.date).sort((a, b) => a.datum.localeCompare(b.datum)).slice(0, 3)
    ];

    document.getElementById('warteDialogTitel').textContent = termin.title;
    warteWege.innerHTML = weg.map(w => `
      <label class="warte-weg">
        <input type="checkbox" name="weg" value="${escapeHtml(w.id)}"${w.datum === termin.date ? ' checked' : ''}>
        <span><b>${escapeHtml(w.label)}</b><small>${escapeHtml(kurzesDatum(w.datum, w.zeit))}${w.haus === 'kulturhaus' ? ' · kulturhaus' : ''} · ausverkauft</small></span>
      </label>`).join('');
    warteWege.dataset.wege = JSON.stringify(Object.fromEntries(weg.map(w => [w.id, { titel: w.titel, datum: w.datum, zeit: w.zeit, haus: w.haus }])));

    if (noch.length) {
      const selberAbend = noch.some(w => w.datum === termin.date);
      warteAlternativen.innerHTML = `<p>${selberAbend ? 'Am selben Abend gibt es noch Karten:' : 'An einem anderen Tag gibt es noch Karten:'}</p>
        <ul>${noch.map(w => `<li><span><b>${escapeHtml(w.label)}</b> · ${escapeHtml(kurzesDatum(w.datum, w.zeit))}${w.haus === 'kulturhaus' ? ' · kulturhaus' : ''}</span>
          <button class="button ghost" type="button" data-buchen="${escapeHtml(w.ticketUrl)}" data-titel="${escapeHtml(w.titel)}">tickets buchen</button></li>`).join('')}</ul>`;
      warteAlternativen.hidden = false;
      warteAlternativen.querySelectorAll('[data-buchen]').forEach(knopf => {
        knopf.addEventListener('click', () => { warteDialog.close(); oeffneBuchung(knopf.dataset.buchen, knopf.dataset.titel); });
      });
    } else {
      warteAlternativen.hidden = true;
      warteAlternativen.innerHTML = '';
    }

    delete warteForm.dataset.fertig;
    warteNote.textContent = '';
    delete warteNote.dataset.art;
    document.getElementById('warteSenden').disabled = false;
    document.getElementById('warteAbbrechen').textContent = 'abbrechen';
    warteDialog.showModal();
  }

  if (warteDialog && warteForm) {
    document.getElementById('warteZu').addEventListener('click', () => warteDialog.close());
    document.getElementById('warteAbbrechen').addEventListener('click', () => warteDialog.close());
    warteDialog.addEventListener('click', e => { if (e.target === warteDialog) warteDialog.close(); });

    warteForm.addEventListener('submit', async e => {
      e.preventDefault();
      const wege = [...warteWege.querySelectorAll('input[name="weg"]:checked')].map(el => el.value);
      const name = document.getElementById('warteName').value.trim();
      const email = document.getElementById('warteMail').value.trim();
      const telefon = document.getElementById('warteTelefon').value.trim();
      const personen = Number(document.getElementById('wartePersonen').value);
      const sage = (text, art = '') => { warteNote.textContent = text; if (art) warteNote.dataset.art = art; else delete warteNote.dataset.art; };

      if (!wege.length) return sage('Bitte mindestens einen Abend anhaken.', 'fehler');
      if (name.length < 2) return sage('Bitte deinen Namen eintragen.', 'fehler');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sage('Bitte eine gültige E-Mail-Adresse eintragen – dorthin schicken wir die Nachricht, wenn Karten da sind.', 'fehler');

      const basis = await dienstAdresse();
      if (!basis) return sage('Die Warteliste ist gerade nicht erreichbar. Ruf uns an: +43 (0)5572 20 540', 'fehler');
      const senden = document.getElementById('warteSenden');
      senden.disabled = true;
      sage('Einen Moment …');
      let ersatz = {};
      try { ersatz = JSON.parse(warteWege.dataset.wege || '{}'); } catch { ersatz = {}; }
      try {
        const antwort = await fetch(basis + '/api/event-warteliste', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, email, telefon, personen, wege, ersatz })
        });
        const daten = await antwort.json().catch(() => ({}));
        if (!daten?.ok) {
          senden.disabled = false;
          // Der schoenste Fehlschlag: es gibt wieder Karten. Dann keine
          // Warteliste, sondern der Weg zur Kasse.
          if (daten?.grund === 'buchbar') {
            const erster = (daten.wege || [])[0];
            sage('Gute Nachricht: für diesen Abend gibt es gerade wieder Karten. Du brauchst keine Warteliste.');
            if (erster?.ticketUrl) {
              warteDialog.close();
              oeffneBuchung(erster.ticketUrl, erster.titel || '');
            }
            return;
          }
          const gruende = {
            voll: 'Die Warteliste für diesen Abend ist voll – ruf uns an, wir finden etwas.',
            vergangen: 'Dieser Abend ist schon vorbei.',
            weg: 'Diesen Abend kennen wir nicht – bitte die Seite neu laden.'
          };
          return sage(gruende[daten?.grund] || 'Das hat nicht geklappt. Versuch es später noch einmal oder ruf uns an.', 'fehler');
        }
        const neu = daten.neu || [];
        const schonDa = (daten.schon || []).length;
        const namen = neu.map(n => `${n.titel} (${kurzesDatum(n.datum, '')})`);
        let text = '';
        if (neu.length) {
          text = `Eingetragen für ${namen.join(', ')}. Wir haben dir eine Bestätigung an ${email} geschickt – sobald wieder Karten da sind, melden wir uns dort.`;
        } else if (schonDa) {
          text = 'Du stehst für diesen Abend schon auf der Liste – alles gut, wir melden uns, sobald Karten da sind.';
        }
        if (neu.length && schonDa) text += ' Für einen Abend standest du schon auf der Liste.';
        warteForm.dataset.fertig = 'ja';
        document.getElementById('warteAbbrechen').textContent = 'schließen';
        sage(text);
        document.getElementById('warteName').value = '';
        document.getElementById('warteMail').value = '';
        document.getElementById('warteTelefon').value = '';
      } catch {
        senden.disabled = false;
        sage('Das hat nicht geklappt. Versuch es später noch einmal oder ruf uns an.', 'fehler');
      }
    });
  }

  function verdrahte() {
    grid.querySelectorAll('[data-warteliste]').forEach(knopf => {
      knopf.addEventListener('click', () => oeffneWarteliste(knopf.dataset.warteliste));
    });
    grid.querySelectorAll('[data-buchen]').forEach(knopf => {
      knopf.addEventListener('click', () => oeffneBuchung(knopf.dataset.buchen, knopf.dataset.titel));
    });
    grid.querySelectorAll('[data-kalender]').forEach(knopf => {
      knopf.addEventListener('click', () => {
        const event = alleEvents.find(e => e.id === knopf.dataset.kalender);
        if (event) ladeIcsHerunter(terminAlsIcs(event), `${event.id}.ics`);
      });
    });
    // Bilder: fehlt das Eventbild, springt ein Abendfoto ein.
    grid.querySelectorAll('.kachel-medien img').forEach(img => {
      img.addEventListener('error', () => {
        if (img.src.endsWith(img.dataset.fallback)) return;
        img.src = img.dataset.fallback;
      }, { once: true });
    });
    // Hoerprobe: der Knopf erscheint nur, wenn das Video wirklich daliegt.
    grid.querySelectorAll('.kachel-medien').forEach(medien => {
      const video = medien.querySelector('video');
      const knopf = medien.querySelector('.kachel-hoerprobe');
      if (!video || !knopf) return;
      knopf.addEventListener('click', () => {
        if (video.hidden) {
          video.hidden = false;
          video.controls = true;
          video.muted = false;
          video.play().catch(() => {});
          knopf.textContent = 'Hörprobe schließen ×';
        } else {
          video.pause();
          video.hidden = true;
          knopf.textContent = 'Hörprobe ▶';
        }
      });
    });
  }

  Promise.all([
    fetch('data/event-medien.json', { cache: 'no-store' }).then(antwort => antwort.json()).catch(() => ({ bilder: [], videos: [] })),
    holeTermine()
  ])
    .then(([medien, termine]) => {
      vorhandeneBilder = new Set(medien?.bilder || []);
      vorhandeneVideos = new Set(medien?.videos || []);
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);

      const istVorbei = termin => new Date(`${termin.date}T23:59:00`) < heute;
      const nachDatum = (a, b) => a.date.localeCompare(b.date) || String(a.zeit).localeCompare(String(b.zeit));

      const alle = (termine || []).filter(termin => termin.date);
      const kommende = alle.filter(t => !istVorbei(t)).sort(nachDatum);
      // Was vorbei ist, steht hinten: zuerst das, was noch zu holen ist.
      // Unter den vergangenen zuerst der letzte Abend - er ist der, an den
      // sich jemand erinnert. Der Dienst liefert nur die letzten sieben
      // Tage, laenger haelt sich kein "verpasst" (Jonas, 17.09.).
      const vergangene = alle.filter(istVorbei).sort((a, b) => nachDatum(b, a));

      if (!kommende.length && !vergangene.length) {
        grid.innerHTML = '<p class="events-laden">Gerade steht kein Termin fest – schau bald wieder vorbei oder trag dich unten ein.</p>';
        return;
      }

      alleEvents = kommende;
      grid.innerHTML = kommende.map((termin, index) => kachel(termin, index)).join('');
      const legende = document.getElementById('eventsLegende');
      if (legende) legende.hidden = !kommende.some(t => t.haus === 'kulturhaus');
      verdrahte();

      // Von der Startseite (oder aus einer Mail) direkt auf die Warteliste
      // eines Weges: ?warteliste=<kennung>. Der Abend wird gesucht, ob als
      // Hauptweg oder als Variante; die Kachel kommt ins Bild, der Kasten
      // geht auf. Ist der Weg inzwischen buchbar, oeffnet sich nichts -
      // dann steht der Ticketknopf da, und der ist der bessere Weg.
      const gewuenscht = new URLSearchParams(window.location.search).get('warteliste') || '';
      if (gewuenscht) {
        const abend = kommende.find(t => t.id === gewuenscht || (t.varianten || []).some(v => v.id === gewuenscht));
        const knopf = abend && grid.querySelector(`[data-warteliste="${CSS.escape(abend.id)}"]`);
        if (knopf) {
          knopf.closest('.event-kachel')?.scrollIntoView({ block: 'center' });
          oeffneWarteliste(abend.id);
          // Den gewuenschten Weg anhaken, wenn er nicht ohnehin der Abend ist.
          const haken = warteWege?.querySelector(`input[value="${CSS.escape(gewuenscht)}"]`);
          if (haken) haken.checked = true;
        } else if (abend) {
          grid.querySelector(`[data-kalender="${CSS.escape(abend.id)}"]`)?.closest('.event-kachel')?.scrollIntoView({ block: 'center' });
        }
      }

      // Die vergangenen Abende stehen NICHT im selben Raster: sonst sitzt
      // ein verpasster Abend in derselben Reihe wie einer, der noch zu
      // haben ist, und die Reihe erzaehlt zwei Geschichten (Jonas, 17.09.).
      // Eigener Block ganz unten, durch eine Linie abgesetzt, ausgeblendet.
      const altBereich = document.getElementById('eventsVorbei');
      if (altBereich) altBereich.remove();
      if (vergangene.length) {
        const bereich = document.createElement('section');
        bereich.id = 'eventsVorbei';
        bereich.className = 'events-vorbei';
        bereich.setAttribute('aria-label', 'Abende, die schon gelaufen sind');
        bereich.innerHTML = '<p class="events-vorbei-kappe">schon gelaufen</p>'
          + `<div class="events-grid">${vergangene.map((termin, index) => kachel(termin, index, true)).join('')}</div>`;
        grid.after(bereich);
      }
    })
    .catch(() => {
      grid.innerHTML = '<p class="events-laden">Die Termine konnten gerade nicht geladen werden. '
        + 'Ruf uns an, wir sagen dir, was ansteht: <a href="tel:+43557220540">+43 (0)5572 20 540</a></p>';
    });

  // Termin-Abo: derselbe Weg wie auf der Startseite frueher - eigene Liste,
  // gueltig erst mit dem Klick in der Bestaetigungsmail.
  const form = document.getElementById('ticketNews');
  if (!form) return;
  const note = document.getElementById('ticketNewsNote');
  const knopf = form.querySelector('button');

  const dienst = (() => {
    let versprochen = null;
    return () => {
      versprochen ||= fetch('data/haus.json?t=' + Date.now(), { cache: 'no-store' })
        .then(antwort => antwort.json())
        .then(daten => {
          // Im Probemodus der Testdienst, sonst der echte (siehe probe.js).
          const adresse = String((window.WIRTSCHAFT_PROBE && daten?.probe) || daten?.api || '').trim().replace(/\/+$/, '');
          return /^https?:\/\//.test(adresse) ? adresse : '';
        })
        .catch(() => '');
      return versprochen;
    };
  })();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const mail = form.email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
      note.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      return;
    }
    const basis = await dienst();
    if (!basis) {
      note.textContent = 'Die Anmeldung ist gerade nicht möglich. Versuch es später noch einmal.';
      return;
    }
    knopf.disabled = true;
    note.textContent = 'Einen Moment …';
    try {
      const antwort = await fetch(basis + '/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: mail, quelle: 'events', liste: 'events', einwilligung: true })
      });
      const daten = await antwort.json().catch(() => ({}));
      if (daten?.schon) {
        note.textContent = 'Diese Adresse ist schon angemeldet – alles gut.';
      } else if (daten?.ok) {
        note.textContent = 'Fast geschafft: Wir haben dir eine Bestätigungsmail geschickt. Erst mit dem Klick darin bist du angemeldet.';
        form.email.value = '';
      } else {
        note.textContent = 'Das hat nicht geklappt. Versuch es später noch einmal.';
      }
    } catch {
      note.textContent = 'Das hat nicht geklappt. Versuch es später noch einmal.';
    }
    knopf.disabled = false;
  });
})();
