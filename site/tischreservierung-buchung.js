// Direkte Tischreservierung ueber den eigenen Dienst.
//
// Ist kein Dienst eingetragen, passiert hier nichts: die Seite bleibt genau
// wie bisher und leitet auf den offiziellen Anbieter weiter. Erst wenn der
// Dienst laeuft, wird aus dem Formular eine echte Buchung.

import { apiAdresse, buche, holeAmpel, holeFrei, holeGeschlossen, holeKarteInfo, holeTakeawayKarte, karteAdresse, meldeMittagskarte, trageWartelisteEin } from './haus-api.js?v=9bbaa1e5';
import { istFeiertag, istOffenerTag, naechsterOffenerTag } from './feiertage.mjs?v=def9b961';

const byId = id => document.getElementById(id);
start();

async function start() {
  const knopf = byId('bookDirect');
  const weiter = byId('submitBooking');
  if (!knopf || !weiter) return;
  if (!(await apiAdresse())) return;

  // Ab hier nehmen wir die Reservierung selbst an.
  const nameFeld = byId('guestNameField');
  const name = byId('guestName');
  const kontaktFeld = byId('guestContactField');
  const mail = byId('guestMail');
  const telefon = byId('guestPhone');
  const ergebnis = byId('bookingResult');
  const hinweis = byId('submitHint');
  nameFeld.hidden = false;
  name.required = true;
  kontaktFeld.hidden = false;
  // Der Vorspann stammt aus der Zeit des externen Anbieters. Nehmen wir die
  // Reservierung selbst an, stimmt er nicht mehr - und was ueber Daten auf
  // einer Seite steht, muss stimmen.
  const vorspann = byId('bookingLead');
  if (vorspann) {
    vorspann.textContent = 'Wähl’ Tag, Uhrzeit und Personenzahl. Wir teilen den Tisch direkt ein. '
      + 'Gespeichert werden nur Name, Termin, Personenzahl und eine Erreichbarkeit – '
      + 'gelöscht spätestens 30 Tage nach dem Termin.';
  }
  weiter.hidden = true;
  knopf.hidden = false;
  // Der Anruf bleibt erreichbar, aber als Hinweis neben dem Knopf - nicht als
  // zweiter, gleich grosser Knopf. Zwei gleichwertige Knoepfe lesen sich wie
  // zwei Empfehlungen, und der Anruf ist hier die Ausweichloesung.
  byId('callAside').hidden = false;
  hinweis.textContent = 'Sofort fix: Du bekommst die Zusage direkt hier – ohne Anruf, ohne Konto. '
    + 'Absagen geht jederzeit über den Link in der Bestätigung.';

  // ---- Die Mittagskarte, frisch vom Haus -----------------------------------
  //
  // Sie haengt am Dienst, nicht am Repo: laedt Wolfgang eine neue hoch, ist
  // sie hier mit dem naechsten Abruf da. Die Seite fragt beim Laden und
  // danach alle fuenf Minuten nach - wer die Seite offen liegen laesst,
  // bekommt die neue Karte trotzdem.
  async function zeigeKarte() {
    const kasten = byId('lunchLive');
    if (!kasten) return;
    const info = await holeKarteInfo();
    if (!info?.ok || !info.da) { kasten.hidden = true; return; }
    const link = byId('lunchLiveLink');
    link.href = await karteAdresse(info);
    // Ein gesetzter Plan ist eine Seite (dort: ansehen, als PDF speichern);
    // ein hochgeladenes PDF oeffnet direkt.
    link.textContent = info.art === 'plan' ? 'Mittagskarte ansehen' : 'Mittagskarte öffnen (PDF)';
    const stand = new Date(info.stand);
    byId('lunchLiveStand').textContent = Number.isNaN(stand.getTime()) ? '' : `Stand: ${stand.toLocaleDateString('de-AT', {
      weekday: 'long', day: 'numeric', month: 'long'
    })}, ${stand.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })} Uhr`;
    kasten.hidden = false;
  }
  zeigeKarte();
  setInterval(zeigeKarte, 5 * 60 * 1000);

  // Die Gerichte der Woche, live vom Haus - dieselbe Quelle wie die
  // Takeaway-Karte. Was der Wirt veroeffentlicht, steht hier im Kasten
  // "Heute auf dem Teller"; die statische Karte bleibt der Rueckfall.
  async function zeigeGerichte() {
    const kasten = document.querySelector('[data-lunch-web]');
    if (!kasten) return;
    const antwort = await holeTakeawayKarte();
    if (!antwort?.ok || !Array.isArray(antwort.gerichte) || !antwort.gerichte.length) return;
    const male = () => {
      kasten.textContent = '';
      for (const gericht of antwort.gerichte) {
        const zeile = document.createElement('div');
        zeile.className = 'menu-day gericht';
        const name = document.createElement('span');
        name.textContent = gericht.allergene?.length
          ? `${gericht.name} (${gericht.allergene.join(', ')})`
          : gericht.name;
        const preis = document.createElement('span');
        preis.className = 'gericht-preis';
        preis.textContent = `€ ${Number(gericht.preis).toFixed(2).replace('.', ',')}`;
        zeile.append(name, preis);
        kasten.append(zeile);
      }
    };
    // Die statische Fassung malt zeitversetzt - deshalb einmal jetzt und
    // noch einmal kurz danach, damit die Live-Karte stehen bleibt.
    male();
    setTimeout(male, 2000);
  }
  zeigeGerichte();

  // ---- Die Ampel: wie voll ist der Mittag heute ----------------------------
  //
  // Sie sagt vor jedem Klick, woran der Gast ist: gruen heisst Platz, Gold
  // heisst nur noch wenige Tische, Wein heisst voll. Die Zahlen kommen live
  // vom Dienst; sperrt das Haus Tische oder wird ein Tisch nach dem Essen
  // wieder frei, stimmt die Ampel mit dem naechsten Abruf wieder.

  async function zeigeAmpel() {
    const kasten = byId('ampelStand');
    if (!kasten) return;
    const jetzt = new Date();
    const pad = zahl => String(zahl).padStart(2, '0');
    const heute = `${jetzt.getFullYear()}-${pad(jetzt.getMonth() + 1)}-${pad(jetzt.getDate())}`;
    const antwort = await holeAmpel(heute);
    // Ohne ehrliche Auskunft keine Ampel: lieber nichts sagen als raten.
    if (!antwort?.ok || !antwort.stufe || antwort.stufe === 'vorbei') { kasten.hidden = true; return; }
    const tische = antwort.freieTische === 1 ? 'ist nur noch ein Tisch' : `sind nur noch ${antwort.freieTische} Tische`;
    const texte = {
      gruen: 'Heute Mittag ist noch gut Platz.',
      orange: antwort.zweierFrei
        ? `Heute Mittag ${tische} frei.`
        : 'Heute Mittag ist online kein Tisch für zwei mehr frei – für größere Gruppen kann es noch klappen.',
      rot: 'Heute Mittag ist online alles vergeben. Ruf uns kurz an: +43 (0)5572 20 540.'
    };
    if (!texte[antwort.stufe]) { kasten.hidden = true; return; }
    kasten.dataset.stufe = antwort.stufe;
    byId('ampelText').textContent = texte[antwort.stufe];
    kasten.hidden = false;
  }
  zeigeAmpel();
  // Jede Minute frisch - und sofort, wenn die Seite wieder in den Blick kommt:
  // wer sein Handy um 11:00 weglegt und um 12:30 draufschaut, sieht sonst
  // eine Ampel von vor anderthalb Stunden.
  setInterval(zeigeAmpel, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) zeigeAmpel(); });

  // Die Unvertraeglichkeit erscheint erst, wenn das Merken angehakt ist -
  // ohne Profil gaebe es nichts, worin sie stehen koennte. Und wer den Haken
  // wieder wegnimmt, soll nicht eine Angabe stehen lassen, von der er glaubt,
  // sie sei gespeichert.

  const sag = (text, art = 'info') => {
    ergebnis.hidden = false;
    ergebnis.textContent = text;
    ergebnis.dataset.art = art;
  };

  // ---- Zeigen, was frei ist ------------------------------------------------
  //
  // Alle Zeiten stehen lassen und die belegten ausgrauen - das ist die
  // uebliche Loesung und die ehrlichste: der Gast sieht auf einen Blick, was
  // geht, statt auf gut Glueck zu waehlen und dann eine Absage zu bekommen.

  const zeitKnoepfe = () => [...document.querySelectorAll('#timeSlots [data-time]')];
  const personenZahl = () => Number(document.querySelector('[name="guests"]')?.value || 0);

  let laeuft = 0;
  async function zeigeVerfuegbarkeit() {
    const tag = byId('day')?.value;
    const personen = personenZahl();
    if (!tag || personen < 1) return;

    // Nur die letzte Anfrage zaehlt: wer schnell klickt, loest mehrere aus,
    // und eine alte Antwort duerfte die neue nicht ueberschreiben.
    const meine = ++laeuft;
    for (const knopf of zeitKnoepfe()) knopf.dataset.pruefe = '1';
    const antwort = await holeFrei(tag, personen);
    if (meine !== laeuft) return;
    for (const knopf of zeitKnoepfe()) delete knopf.dataset.pruefe;

    if (!antwort?.ok || !Array.isArray(antwort.zeiten)) {
      // Ohne Auskunft nichts sperren: lieber anfragen lassen als abweisen.
      for (const knopf of zeitKnoepfe()) {
        knopf.disabled = false;
        knopf.removeAttribute('data-voll');
        knopf.title = '';
      }
      byId('slotInfo').textContent = antwort?.automatik === false
        ? 'Wir teilen jede Reservierung von Hand ein und melden uns kurz zurück.'
        : '';
      return;
    }

    const nachZeit = new Map(antwort.zeiten.map(entry => [entry.zeit, entry]));
    let freie = 0;
    for (const knopf of zeitKnoepfe()) {
      const eintrag = nachZeit.get(knopf.dataset.time);
      // Kennt der Dienst eine Zeit gar nicht, bietet das Haus sie an diesem Tag
      // nicht an - dann darf sie auch nicht waehlbar sein. Vorher blieben
      // 13:15 und 13:30 offen, obwohl die Kueche nur bis 13:00 annimmt: der
      // Gast fuellte alles aus und bekam erst beim Absenden eine Absage.
      // Genau der verlorene Gast, den wir weiter unten vermeiden wollen.
      const voll = eintrag ? !eintrag.frei : true;
      knopf.disabled = voll;
      knopf.title = voll ? 'Um diese Zeit ist für diese Personenzahl nichts mehr frei' : '';
      if (voll) knopf.setAttribute('data-voll', '');
      else { knopf.removeAttribute('data-voll'); freie += 1; }
      // Eine bereits gewaehlte, nun volle Zeit wieder abwaehlen.
      if (voll && knopf.getAttribute('aria-checked') === 'true') {
        knopf.setAttribute('aria-checked', 'false');
        byId('time').value = '';
      }
    }
    // Zwei verschiedene Nachrichten: an einem Tag ohne angebotene Zeiten ist
    // nichts "belegt" - da nimmt die Kueche ueberhaupt keine Reservierung an.
    // Das eine ist Pech, das andere eine Oeffnungszeit; wer das verwechselt,
    // laesst Gaeste vergeblich anrufen.
    const keineZeitenAngeboten = antwort.zeiten.length === 0;
    byId('slotInfo').textContent = keineZeitenAngeboten
      ? 'An diesem Tag nehmen wir mittags keine Reservierung an. Wähl bitte einen anderen Tag.'
      : freie === 0
      ? `Für ${personen} ${personen === 1 ? 'Person' : 'Personen'} ist an diesem Tag mittags leider alles belegt. Ruf uns an, wir schauen was geht: +43 (0)5572 20 540`
      : `Grau hinterlegte Zeiten sind für ${personen} ${personen === 1 ? 'Person' : 'Personen'} schon belegt.`;
    // Voll ist der Moment der Warteliste - vorher waere sie Laerm.
    // ...und an einem Tag ohne Mittagsbetrieb auch keine Warteliste: warten
    // kann man nur auf einen Tisch, den es an dem Tag ueberhaupt gibt.
    const warteliste = byId('warteliste');
    if (warteliste) warteliste.hidden = freie !== 0 || keineZeitenAngeboten;
  }

  // Mittags kochen wir Montag bis Freitag - und weder an Feiertagen noch an
  // Tagen, die das Haus zugesperrt hat. Ein Tag, der erst nach dem Ausfuellen
  // abgelehnt wird, ist ein verlorener Gast - deshalb sofort sagen. Die
  // Sperrtage kommen vom Dienst; ohne Antwort bleibt nur die Kalenderregel.
  const istWochenende = tag => [0, 6].includes(new Date(`${tag}T12:00:00`).getDay());
  let geschlosseneTage = [];

  const heuteIso = () => {
    const jetzt = new Date();
    const zweistellig = zahl => String(zahl).padStart(2, '0');
    return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}`;
  };

  /**
   * Warum das Datum gerade gesprungen ist. Der Hinweis muss den nachladenden
   * Verfuegbarkeitstext ueberleben - sonst sieht der Gast nur, DASS sich der
   * Tag geaendert hat, aber nicht warum.
   */
  let sprungHinweis = '';

  function pruefeTag() {
    const tag = byId('day').value;
    if (!tag) return false;
    if (istWochenende(tag)) {
      sprungHinweis = 'Mittags kochen wir Montag bis Freitag – hier gleich der nächste Werktag. '
        + 'Am Wochenende gibt es abends Platz über das Eventticket.';
    } else if (istFeiertag(tag)) {
      sprungHinweis = 'Der gewählte Tag ist ein Feiertag – hier gleich der nächste offene Tag.';
    } else if (geschlosseneTage.includes(tag)) {
      sprungHinweis = 'An dem Tag bleibt der Mittag ausnahmsweise zu – hier gleich der nächste offene Tag.';
    } else {
      return true;
    }
    // Der gesperrte Tag springt auf den naechsten offenen - ein geleertes
    // Feld liesse den Gast raten, was denn nun ginge.
    byId('day').value = naechsterOffenerTag(tag, geschlosseneTage);
    return false;
  }

  byId('day')?.addEventListener('change', async () => {
    // Auch nach einem Sprung auf den naechsten offenen Tag sollen gleich die
    // richtigen Zeiten dastehen - pruefen, dann laden, dann den Grund davor.
    sprungHinweis = '';
    pruefeTag();
    await zeigeVerfuegbarkeit();
    if (sprungHinweis) {
      byId('slotInfo').textContent = `${sprungHinweis} ${byId('slotInfo').textContent}`;
      sprungHinweis = '';
    }
  });
  document.querySelector('#bookingForm')?.addEventListener('click', event => {
    // Personenzahl geaendert: die Verfuegbarkeit haengt daran.
    if (event.target.closest('[data-step]')) setTimeout(zeigeVerfuegbarkeit, 0);
  });

  // Die Warteliste: eintragen, zuruecklehnen. Die Personenzahl kommt aus dem
  // Formular - sie entscheidet spaeter, wer bei einem frei gewordenen Tisch
  // ueberhaupt gemeint sein kann.
  byId('wlEintragen')?.addEventListener('click', async () => {
    const knopf = byId('wlEintragen');
    const status = byId('wlStatus');
    const eintrag = {
      name: byId('wlName').value.trim(),
      email: byId('wlMail').value.trim(),
      datum: byId('day').value,
      personen: personenZahl()
    };
    if (eintrag.name.length < 2) { status.textContent = 'Bitte den Namen eintragen.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eintrag.email)) { status.textContent = 'Bitte eine gültige E-Mail-Adresse eintragen.'; return; }
    knopf.disabled = true;
    status.textContent = 'Einen Moment …';
    const antwort = await trageWartelisteEin(eintrag);
    knopf.disabled = false;
    if (antwort?.schon) {
      status.textContent = 'Du stehst für diesen Tag schon auf der Liste – alles gut.';
    } else if (antwort?.ok) {
      status.textContent = `Eingetragen für ${eintrag.personen} ${eintrag.personen === 1 ? 'Person' : 'Personen'}. Wird etwas frei, bekommst du sofort eine Mail.`;
      byId('wlName').value = '';
      byId('wlMail').value = '';
    } else if (antwort?.grund === 'voll') {
      status.textContent = 'Die Warteliste für diesen Tag ist schon sehr lang – ruf uns lieber an: +43 (0)5572 20 540';
    } else {
      status.textContent = 'Das hat nicht geklappt – bitte noch einmal.';
    }
  });

  // Der Standardtag: heute, wenn heute offen ist - sonst der naechste offene
  // Tag. Ein leeres Datumsfeld ist die erste Huerde des Formulars; ein schon
  // richtiger Vorschlag ist die halbe Reservierung. Vergangenes sperrt `min`.
  (async () => {
    const feld = byId('day');
    if (!feld) return;
    const heute = heuteIso();
    feld.min = heute;
    const antwort = await holeGeschlossen();
    if (Array.isArray(antwort?.tage)) geschlosseneTage = antwort.tage;
    // Aus der Warteliste-Mail kommt der Gast mit ?tag= - dieser Tag hat
    // Vorrang vor dem errechneten Standard, wenn er gueltig und offen ist.
    const gewuenscht = new URLSearchParams(location.search).get('tag');
    if (gewuenscht && /^\d{4}-\d{2}-\d{2}$/.test(gewuenscht) && gewuenscht >= heute
      && istOffenerTag(gewuenscht, geschlosseneTage)) {
      feld.value = gewuenscht;
    }
    if (!feld.value) {
      // Nicht nur der Kalender zaehlt, auch die Uhr: um 15 Uhr ist "heute"
      // zwar ein offener Tag, aber jede Uhrzeit darunter schon gestrichen.
      // Der Gast sah dann als Erstes neun durchgestrichene Zeiten und den
      // Hinweis, er moege einen anderen Tag waehlen - der Vorschlag soll
      // aber die halbe Reservierung sein, nicht die erste Huerde. Ist die
      // letzte Zeit vorbei, beginnt der Vorschlag bei morgen.
      const zeiten = [...document.querySelectorAll('#timeSlots [data-time]')];
      const letzte = zeiten.length ? zeiten[zeiten.length - 1].dataset.time : '13:30';
      const jetzt = new Date();
      const vorbei = jetzt.getHours() * 60 + jetzt.getMinutes()
        >= Number(letzte.slice(0, 2)) * 60 + Number(letzte.slice(3, 5));
      const start = new Date(jetzt);
      if (vorbei) start.setDate(start.getDate() + 1);
      const zweistellig = zahl => String(zahl).padStart(2, '0');
      const startIso = `${start.getFullYear()}-${zweistellig(start.getMonth() + 1)}-${zweistellig(start.getDate())}`;
      feld.value = naechsterOffenerTag(startIso, geschlosseneTage);
    }
    pruefeTag();
    zeigeVerfuegbarkeit();
  })();

  /**
   * Die Bestaetigung. Sie ist der Beleg des Gastes - deshalb steht dort alles,
   * was er braucht, und nicht nur ein "hat geklappt". Dazu ein Kalendereintrag
   * zum Mitnehmen: er ist der einzige Beleg, den der Gast ohne unser Zutun
   * behaelt, und er kostet ihn keine Datenangabe.
   */
  /**
   * Der Kalendereintrag. Er ist die Bestaetigung des Gastes: er landet auf
   * seinem Telefon, erinnert ihn von selbst und kostet ihn keine einzige
   * zusaetzliche Angabe - keine Mailadresse, keine Telefonnummer.
   */
  function baueTermin({ wer, tag, zeit, gaeste }) {
    // Zeilen ueber 75 Zeichen muessen nach der Kalendernorm umgebrochen
    // werden; Fortsetzungszeilen beginnen mit einem Leerzeichen. Ohne das
    // verschlucken manche Kalender den Rest der Zeile.
    const falte = zeile => {
      if (zeile.length <= 74) return zeile;
      const teile = [zeile.slice(0, 74)];
      let rest = zeile.slice(74);
      while (rest.length > 73) {
        teile.push(` ${rest.slice(0, 73)}`);
        rest = rest.slice(73);
      }
      if (rest) teile.push(` ${rest}`);
      return teile.join('\r\n');
    };
    const schuetze = text => String(text).replace(/[\;,]/g, treffer => `\\${treffer}`).replace(/\n/g, '\\n');

    const oertlich = (datumsteil, uhrzeit) => `${datumsteil.replace(/-/g, '')}T${uhrzeit.replace(':', '')}00`;
    const [stunde, minute] = zeit.split(':').map(Number);
    const ende = `${String(Math.min(23, stunde + 2)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    // DTSTAMP ist Pflicht. Fehlt es, lehnen manche Kalender den Termin ab -
    // und der Gast haette eine Bestaetigung, die sich nicht speichern laesst.
    const jetzt = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const personen = `${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'}`;

    const zeilen = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'PRODID:-//Wirtschaft Dornbirn//Tischreservierung//DE',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${tag.replace(/-/g, '')}-${zeit.replace(':', '')}-${Math.random().toString(36).slice(2, 8)}@wirtschaft-dornbirn.at`,
      `DTSTAMP:${jetzt}`,
      `DTSTART:${oertlich(tag, zeit)}`,
      `DTEND:${oertlich(tag, ende)}`,
      'STATUS:CONFIRMED',
      'SUMMARY:Tisch in der Wirtschaft Dornbirn',
      // Ohne Tischnummer: fuer den Gast zaehlt die Zusage, nicht die interne
      // Nummer. Wo er sitzt, sagt ihm der Service an der Tuer - und bis dahin
      // kann sich der Tisch ohnehin noch aendern.
      falte(`DESCRIPTION:Reserviert auf ${schuetze(wer)}${schuetze(',')} ${personen}. Falls es doch nicht klappt${schuetze(',')} kurz anrufen: +43 5572 20540`),
      falte(`LOCATION:Wirtschaft Dornbirn${schuetze(',')} Bahnhofstraße 24${schuetze(',')} 6850 Dornbirn`),
      // Eine Erinnerung eine Stunde vorher - das ist der eigentliche Nutzen
      // gegenueber einer Mail, die im Postfach liegen bleibt.
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:In einer Stunde: Tisch in der Wirtschaft Dornbirn',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return `${zeilen.join('\r\n')}\r\n`;
  }

  function zeigeBestaetigung(daten) {
    const { wer, tag, zeit, gaeste, wohin } = daten;
    const kasten = byId('bookingDone');
    const langesDatum = new Date(`${tag}T12:00:00`).toLocaleDateString('de-AT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    byId('doneName').textContent = wer;
    byId('doneWhen').textContent = `${langesDatum}, ${zeit} Uhr`;
    byId('doneWho').textContent = `${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'}`;
    // Ohne Tischnummer faellt die Zeile weg - "Tisch null" waere schlimmer.
    kasten.hidden = false;
    kasten.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const link = byId('doneCalendar');
    // Blob statt data-Adresse: nur so uebernehmen Browser den Dateinamen
    // zuverlaessig, und sehr lange Adressen entfallen.
    const blob = new Blob([baueTermin(daten)], { type: 'text/calendar;charset=utf-8' });
    if (link.dataset.blob) URL.revokeObjectURL(link.dataset.blob);
    const adresse = URL.createObjectURL(blob);
    link.href = adresse;
    link.dataset.blob = adresse;
    link.download = `wirtschaft-dornbirn-${tag}.ics`;

    // Automatisch anbieten. Browser duerfen das ablehnen, wenn sie es nicht
    // als Folge eines Klicks sehen - deshalb bleibt der Knopf sichtbar und der
    // Hinweis sagt, was zu tun ist, statt dass der Gast im Leeren steht.
    let ausgeloest = false;
    try {
      link.click();
      ausgeloest = true;
    } catch {
      ausgeloest = false;
    }
    const perMail = wohin ? ' Die Bestätigung schicken wir dir zusätzlich per E-Mail.' : '';
    byId('doneHint').textContent = (ausgeloest
      ? 'Der Termin wurde in deinen Kalender gelegt. Öffnet sich nichts, tipp auf den Knopf.'
      : 'Tipp auf den Knopf, um den Termin in deinen Kalender zu legen.') + perMail;

    // Die Mittagskarte kommt erst nach dem Erfolg ins Bild. Vorher waere sie
    // eine Huerde im Formular; jetzt ist sie eine Zugabe - und nur sichtbar,
    // wenn es eine Adresse gibt, an die sie gehen koennte.
    byId('doneNewsletterRow').hidden = !wohin;
  }

  byId('guestNewsletter')?.addEventListener('change', async event => {
    const kasten = event.target;
    const status = byId('doneNewsletterHint');
    if (!kasten.checked) return;
    const wohin = mail.value.trim();
    if (!wohin) { kasten.checked = false; return; }
    kasten.disabled = true;
    const antwort = await meldeMittagskarte(wohin, 'reservierung');
    status.hidden = false;
    if (antwort?.ok) {
      status.textContent = 'Fast geschafft: Wir haben dir eine Mail geschickt – bestätige die Anmeldung dort kurz.';
    } else {
      status.textContent = 'Das hat gerade nicht geklappt. Du kannst es später auf dieser Seite noch einmal versuchen.';
      kasten.disabled = false;
      kasten.checked = false;
    }
  });

  knopf.addEventListener('click', async () => {
    const tag = byId('day')?.value;
    const zeit = byId('time')?.value;
    const gaeste = Number(document.querySelector('[name="guests"]')?.value || 0);
    const wer = name.value.trim();
    const wohin = mail.value.trim();
    const anruf = telefon.value.trim();

    // Vor dem Netz pruefen, was man ohne Netz pruefen kann.
    if (!wer || wer.length < 2) return sag('Bitte den Namen eintragen, auf den der Tisch laufen soll.', 'fehler');
    if (!tag) return sag('Bitte einen Tag wählen.', 'fehler');
    if (!zeit) return sag('Bitte eine Uhrzeit wählen.', 'fehler');
    if (gaeste < 1) return sag('Bitte die Personenzahl angeben.', 'fehler');
    if (istWochenende(tag)) return sag('Mittags kochen wir Montag bis Freitag – am Wochenende gibt es abends Platz über das Eventticket.', 'fehler');
    // Eines von beiden - nicht als Huerde, sondern damit eine Absage ankommt.
    kontaktFeld.classList.toggle('invalid', !wohin && !anruf);
    if (!wohin && !anruf) {
      return sag('Bitte eine E-Mail-Adresse oder eine Telefonnummer angeben. Sonst können wir dich nicht erreichen, '
        + 'wenn wir kurzfristig absagen müssen.', 'fehler');
    }

    knopf.disabled = true;
    sag('Einen Moment, wir schauen nach einem Tisch …');
    const antwort = await buche({
      name: wer, date: tag, time: zeit, guests: gaeste,
      wunsch: byId('guestWish')?.value.trim() || null,
      // Zwei getrennte Zustimmungen: merken, und - eigens - die
      // Unvertraeglichkeit. Der Dienst prueft das noch einmal selbst.,
      kontakt: { email: wohin || null, telefon: anruf || null }
    });
    knopf.disabled = false;

    if (!antwort?.ok) {
      const gruende = {
        name: 'Der Name ist zu kurz.',
        datum: 'Das Datum passt nicht.',
        uhrzeit: 'Die Uhrzeit passt nicht.',
        personen: 'Die Personenzahl passt nicht.',
        vergangen: 'Dieser Tag liegt in der Vergangenheit.',
        zu_weit: 'So weit im Voraus nehmen wir online noch keine Reservierung an.',
        wochenende: 'Mittags kochen wir Montag bis Freitag.',
        geschlossen: 'An diesem Tag bleibt der Mittag zu – bitte einen anderen Tag wählen.',
        voll: 'Um diese Zeit ist mittags leider alles belegt – wähl eine andere Zeit oder trag dich unten auf die Warteliste ein.',
        zu_viele: 'Gerade kommen sehr viele Anfragen. Bitte ruf uns kurz an.',
        kontakt: 'Bitte eine E-Mail-Adresse oder eine Telefonnummer angeben.',
        mail: 'Diese E-Mail-Adresse sieht nicht richtig aus. Bitte noch einmal prüfen.',
        telefon: 'Diese Telefonnummer sieht nicht richtig aus. Bitte noch einmal prüfen.',
        netz: 'Die Verbindung hat nicht geklappt. Bitte ruf uns kurz an: +43 (0)5572 20 540.',
        aus: 'Bitte ruf uns kurz an: +43 (0)5572 20 540.'
      };
      return sag(gruende[antwort?.grund] || 'Das hat nicht geklappt. Bitte ruf uns kurz an: +43 (0)5572 20 540.', 'fehler');
    }
    if (antwort.doppelt) {
      return sag(`Diese Reservierung haben wir schon – auf den Namen ${antwort.reservierung.name} um ${antwort.reservierung.time}. Bis dann!`, 'gut');
    }
    if (antwort.fix || antwort.tisch) {
      zeigeVerfuegbarkeit();
      zeigeAmpel();
      zeigeBestaetigung({ wer, tag, zeit, gaeste, wohin });
      // Die Tischnummer erscheint nur, wenn das Haus sie ausdruecklich zeigt -
      // fuer den Gast zaehlt die Zusage, nicht die interne Nummer.
      return sag(`Passt: ${wer}, ${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'} am ${tag} um ${zeit}. `
        + 'Dein Platz ist fix reserviert. Wir sehen uns – ein Anruf ist nicht mehr nötig.', 'gut');
    }
    if (antwort.automatik === false) {
      zeigeVerfuegbarkeit();
      return sag(`Danke, ${wer}. Deine Anfrage für ${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'} am ${tag} `
        + `um ${zeit} ist da. Wir teilen den Tisch von Hand ein und melden uns kurz zurück.`, 'gut');
    }
    // Angenommen, aber kein Tisch: ehrlich sagen, dass sich jemand meldet.
    const alternativen = (antwort.alternativen || []).join(', ');
    return sag('Wir haben deine Anfrage aufgenommen, aber um diese Zeit ist es sehr voll. '
      + (alternativen ? `Freier wäre es um ${alternativen}. ` : '')
      + 'Bitte ruf uns kurz an, damit wir es sicher hinbekommen: +43 (0)5572 20 540.', 'warnung');
  });
}
