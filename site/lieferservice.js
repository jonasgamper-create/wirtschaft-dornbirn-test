/**
 * Der Bestellweg fuer das Takeaway - Felder, Reihenfolge und Regeln wie beim
 * offiziellen Bestellsystem: vier Angaben zur Person, Abholzeit im
 * Viertelstundenraster von 11:30 bis 13:00, Newsletter freiwillig, Datenschutz
 * verpflichtend. Keine Adresse und keine Zonen: geliefert wird nicht, abgeholt
 * wird in der Bahnhofstrasse.
 *
 * Warum hier und nicht in takeaway.js: dieser Weg laeuft OHNE Hausdienst. Er
 * prueft, sammelt und uebergibt - abgeschlossen wird beim offiziellen Dienst.
 * Laeuft der Hausdienst, gehoert der Abschluss ihm und dieser Weg tritt ab.
 */
import { apiAdresse, bestelleTakeaway } from './haus-api.js?v=14d80640';

(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const ERSTE = 11 * 60 + 30;   // 11:30
  const LETZTE = 13 * 60;       // 13:00
  const SCHRITT = 15;

  const HAUS = 'willkommen@wirtschaft-dornbirn.at';
  let summe = 0;
  let portionen = 0;
  let positionen = [];
  const zahlung = 'bar';
  /** Der zuletzt gebaute Bestelltext - fuer den Kopierweg. */
  let bestelltext = '';

  const alsPreis = wert => '€ ' + wert.toFixed(2).replace('.', ',');

  document.addEventListener('ta:summe', e => {
    summe = e.detail?.summe || 0;
    portionen = e.detail?.portionen || 0;
    positionen = e.detail?.positionen || [];
    zeigeGesamt();
  });

  document.addEventListener('ta:bereit', e => {
    const nurAnsicht = Boolean(e.detail?.nurAnsicht);
    const jetzt = byId('taJetzt');
    const info = byId('taJetztInfo');
    // Laeuft der Hausdienst, hat er seinen eigenen Abschluss - zwei
    // Bestellknoepfe waeren eine Falle.
    if (!nurAnsicht) {
      if (jetzt) jetzt.hidden = true;
      if (info) info.hidden = true;
      return;
    }
    zeigeZeiten();
    zeigeGesamt();
    if (info) {
      info.textContent = 'Die Bestellung geht als vorbereitete E-Mail an die Wirtschaft – '
        + 'du musst sie nur noch abschicken. Diese Seite speichert nichts.';
    }
  });

  /** Das feste Abholfenster: 11:30 bis 13:00 im Viertelstundenraster. */
  function zeigeZeiten() {
    const kasten = byId('taZeiten');
    if (!kasten || kasten.querySelector('[data-abholung]')) return;
    kasten.textContent = '';
    for (let minute = ERSTE; minute <= LETZTE; minute += SCHRITT) {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.setAttribute('role', 'radio');
      knopf.setAttribute('aria-checked', 'false');
      const zeit = String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
      knopf.dataset.abholung = zeit;
      knopf.textContent = zeit + ' Uhr';
      kasten.append(knopf);
    }
    kasten.addEventListener('click', event => {
      const knopf = event.target.closest('[data-abholung]');
      if (!knopf) return;
      kasten.querySelectorAll('[data-abholung]').forEach(k =>
        k.setAttribute('aria-checked', String(k === knopf)));
    });
    const zeitInfo = byId('taZeitInfo');
    if (zeitInfo) zeitInfo.textContent = 'Abgeholt werden kann zwischen 11:30 und 13:00 Uhr.';
  }

  function gewaehlteZeit() {
    return byId('taZeiten')?.querySelector('[aria-checked="true"]')?.dataset.abholung || '';
  }

  function zeigeGesamt() {
    const kasten = byId('taGesamt');
    if (!kasten) return;
    kasten.textContent = portionen
      ? `Gesamtpreis: ${alsPreis(summe)} · ${portionen} ${portionen === 1 ? 'Portion' : 'Portionen'}`
      : 'Gesamtpreis: € 0,00';
  }


  /**
   * Fehlt etwas, sagt die Seite WAS - nicht nur, dass etwas fehlt. Reihenfolge
   * wie im Formular, damit der Blick nicht springt.
   */
  function fehlendes() {
    const fehlt = [];
    if (!portionen) fehlt.push('mindestens ein Gericht');
    const pflicht = [
      ['taVorname', 'Vorname'], ['taName', 'Nachname'],
      ['taTelefon', 'Telefonnummer'], ['taMail', 'E-Mail-Adresse']
    ];
    for (const [id, name] of pflicht) if (!byId(id)?.value.trim()) fehlt.push(name);
    const mail = byId('taMail')?.value.trim();
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) fehlt.push('eine gültige E-Mail-Adresse');
    if (!gewaehlteZeit()) fehlt.push('eine Abholzeit');
    if (!byId('taDatenschutz')?.checked) fehlt.push('die Zustimmung zur Datenschutzerklärung');
    return fehlt;
  }

  /** Tag in Klartext - im Betreff und in der Mail steht kein rohes Datum. */
  function tagText() {
    const wert = byId('taDatum')?.value
      || document.querySelector('#taTage .ta-tag[aria-pressed="true"]')?.dataset.wert || '';
    if (!wert) return { wert: '', text: '' };
    const tag = new Date(`${wert}T12:00:00`);
    return {
      wert,
      text: tag.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    };
  }

  /**
   * Der Bestelltext, wie die Kueche ihn braucht: erst wann, dann was, dann
   * wohin. Eine Zeile je Position mit Menge, Name und Zeilenpreis - damit
   * beim Abhaken nichts gerechnet werden muss.
   */
  function baueText() {
    const tag = tagText();
    const zeilen = positionen.map(p =>
      `${p.menge} × ${p.name} — ${alsPreis(p.preis * p.menge)}`);
    const trenner = '----------------------------------------';
    return [
      'Neue Bestellung über wirtschaft-dornbirn.at',
      '',
      `Abholtag:    ${tag.text}`,
      `Abholzeit:   ${gewaehlteZeit()} Uhr`,
      'Zahlung:     bei der Abholung',
      '',
      'BESTELLUNG',
      trenner,
      ...zeilen,
      trenner,
      `Gesamt: ${alsPreis(summe)}  (${portionen} ${portionen === 1 ? 'Portion' : 'Portionen'})`,
      '',
      'GAST',
      `${byId('taVorname').value.trim()} ${byId('taName').value.trim()}`,
      '',
      `Telefon:  ${byId('taTelefon').value.trim()}`,
      `E-Mail:   ${byId('taMail').value.trim()}`,
      '',
      `Newsletter: ${byId('taNewsletter')?.checked ? 'ja, bitte eintragen' : 'nein'}`,
      'Datenschutzerklärung: gelesen und akzeptiert',
      '',
      'Diese Bestellung wurde auf der Takeaway-Seite zusammengestellt und per',
      'E-Mail geschickt. Bitte kurz bestätigen – danke!'
    ].join('\n');
  }

  function betreff() {
    const tag = tagText();
    const name = `${byId('taVorname').value.trim()} ${byId('taName').value.trim()}`.trim();
    return `Takeaway-Bestellung ${tag.text || ''} · Abholung ${gewaehlteZeit()} Uhr · ${name}`.replace(/\s+/g, ' ');
  }

  byId('taKopieren')?.addEventListener('click', async () => {
    const info = byId('taJetztInfo');
    if (!bestelltext) {
      if (info) {
        info.dataset.art = 'warnung';
        info.textContent = 'Es ist noch keine Bestellung fertig. Bitte zuerst Gerichte wählen und die Felder ausfüllen.';
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(bestelltext);
      if (info) { info.dataset.art = 'info'; info.textContent = `Bestelltext kopiert – bitte an ${HAUS} schicken.`; }
    } catch {
      // Kein Zugriff auf die Ablage: dann markiert der Gast selbst.
      if (info) { info.dataset.art = 'warnung'; info.textContent = `Kopieren nicht möglich. Bitte telefonisch bestellen: +43 (0)5572 20 540`; }
    }
  });

  byId('taJetztBestellen')?.addEventListener('click', () => {
    const info = byId('taJetztInfo');
    const fehlt = fehlendes();
    if (fehlt.length) {
      if (info) {
        info.dataset.art = 'warnung';
        info.textContent = fehlt.length === 1
          ? `Es fehlt noch: ${fehlt[0]}.`
          : `Es fehlen noch: ${fehlt.join(', ')}.`;
      }
      return;
    }

    // Die Bestellung geht als E-Mail ans Haus. Eine Seite ohne eigenen Server
    // kann keine Mail verschicken - sie kann aber eine fertig geschriebene
    // oeffnen, die nur noch abgeschickt werden muss. Nichts wird hier
    // gespeichert und nichts an Dritte uebergeben.
    bestelltext = baueText();
    schickeAb(info);
  });

  /**
   * Zwei Wege, in dieser Reihenfolge:
   *
   * 1. Der Dienst des Hauses. Laeuft er, nimmt er die Bestellung an und
   *    verschickt die Mail selbst - dort liegt der Versanddienst (Brevo), und
   *    nur dort darf er liegen: ein Schluessel im Browser waere fuer jeden
   *    lesbar. Der Gast muss dann nichts mehr tun.
   * 2. Antwortet der Dienst nicht, oeffnet sich die fertig geschriebene Mail
   *    an das Haus. Sie kommt an, sobald der Gast sie abschickt.
   *
   * So ist die Bestellung nie verloren, und sobald der Dienst laeuft, laeuft
   * sie automatisch - ohne Aenderung an dieser Seite.
   */
  async function schickeAb(info) {
    const knopf = byId('taJetztBestellen');
    const tag = tagText();
    if (knopf) knopf.disabled = true;
    if (info) { info.dataset.art = 'info'; info.textContent = 'Einen Moment, die Bestellung geht raus …'; }

    let angenommen = false;
    try {
      if (await apiAdresse()) {
        const antwort = await bestelleTakeaway({
          name: `${byId('taVorname').value.trim()} ${byId('taName').value.trim()}`.trim(),
          telefon: byId('taTelefon').value.trim(),
          email: byId('taMail').value.trim(),
          newsletter: Boolean(byId('taNewsletter')?.checked),
          posten: positionen.map(p => ({ id: p.id, menge: p.menge })),
          abholung: gewaehlteZeit(),
          datum: tag.wert
        });
        angenommen = Boolean(antwort?.ok);
      }
    } catch {
      angenommen = false; // Kein Netz, kein Dienst - dann eben der Mailweg.
    }
    if (knopf) knopf.disabled = false;

    if (angenommen) {
      if (info) {
        info.dataset.art = 'info';
        info.textContent = `Danke! Die Bestellung liegt in der Küche – die Bestätigung geht an ${byId('taMail').value.trim()}.`;
      }
      return;
    }

    if (info) {
      info.dataset.art = 'info';
      info.textContent = 'Dein E-Mail-Programm öffnet mit der fertigen Bestellung – bitte nur noch abschicken. '
        + `Kommt nichts, kopier’ den Bestelltext und schick ihn an ${HAUS}.`;
    }
    const notweg = byId('taNotweg');
    if (notweg) notweg.hidden = false;
    window.location.href = `mailto:${HAUS}?subject=${encodeURIComponent(betreff())}&body=${encodeURIComponent(bestelltext)}`;
  }
})();
