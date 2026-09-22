// Probemodus: dieselbe Seite, aber am Testdienst.
//
// Wozu: der Kunde soll alles durchklicken duerfen - reservieren, bestellen,
// absagen - ohne dass ein echter Tisch belegt wird oder jemand Post bekommt
// (Jonas, 17.09.). Dafuer laeuft derselbe Dienst ein zweites Mal unter
// eigenem Namen, mit eigener Datenbank und ohne Mailversand. Welcher der
// beiden angesprochen wird, entscheidet allein diese Datei.
//
// Eingeschaltet wird er ueber die Adresse:
//
//   .../index.html?probe=1
//
// Danach bleibt er fuer diesen Tab erhalten - auch beim Weiterklicken auf
// Reservierung oder Takeaway. Ein neuer Tab faengt wieder im Echtbetrieb an;
// das ist Absicht. sessionStorage und nicht localStorage genau deswegen: ein
// Probemodus, der ein halbes Jahr spaeter noch im Browser des Wirts steckt,
// waere schlimmer als gar keiner.
//
// Diese Datei laeuft VOR allen anderen (erstes defer-Skript der Seite) und
// setzt nur ein Fenstermerkmal. Wer die Dienstadresse braucht, liest es:
//
//   window.WIRTSCHAFT_PROBE ? haus.probe : haus.api
//
// Steht in data/haus.json keine Probeadresse, passiert nichts - dann bleibt
// alles am echten Dienst, statt ins Leere zu greifen.

(() => {
  'use strict';

  const MERKER = 'wirtschaft-probe';

  const ausAdresse = () => {
    const suche = window.location.search || '';
    const raute = window.location.hash || '';
    return /(^|[?&])probe=1(&|$)/.test(suche) || /(^|#|&)probe(&|$)/.test(raute);
  };

  const lies = () => {
    try { return sessionStorage.getItem(MERKER) === '1'; } catch { return false; }
  };
  const merke = an => {
    try {
      if (an) sessionStorage.setItem(MERKER, '1');
      else sessionStorage.removeItem(MERKER);
    } catch { /* privater Modus: dann gilt nur die Adresse */ }
  };

  const an = ausAdresse() || lies();
  if (ausAdresse()) merke(true);
  window.WIRTSCHAFT_PROBE = an;
  if (!an) return;

  // Das Band. Es steht ueber allem und bleibt stehen: wer eine Viertelstunde
  // klickt, soll nicht vergessen, worin er klickt. Farben aus der CI (Wein
  // und Creme), keine neuen Bausteine.
  //
  // Gesetzt wird jede Eigenschaft einzeln, statt ein <style> einzuhaengen.
  // Grund: die Einzeldatei der Wirt-Ansicht laesst per CSP nur EIN Stilblatt
  // zu, erkannt an seinem Fingerabdruck. Ein nachtraeglich eingefuegtes
  // <style> waere dort still blockiert worden - das Band haette als nackter
  // Text am Seitenende gestanden (17.09.). Zuweisungen ueber .style gehen
  // durch, sie sind kein eingelesener Stil.
  const band = document.createElement('div');
  band.id = 'probeband';
  band.setAttribute('role', 'status');

  const titel = document.createElement('b');
  titel.textContent = 'Probemodus';
  const satz = document.createElement('span');
  satz.textContent = 'Alles, was du hier einträgst, landet im Testdienst '
    + '– keine echte Reservierung, keine Bestellung, keine Mail.';
  const raus = document.createElement('button');
  raus.type = 'button';
  raus.textContent = 'Zurück zum Echtbetrieb';
  band.append(titel, satz, raus);

  Object.assign(band.style, {
    position: 'fixed', left: '0', right: '0', bottom: '0', zIndex: '2147483000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexWrap: 'wrap', gap: '6px 14px', padding: '10px 16px',
    background: '#8c292b', color: '#f3efe6',
    fontFamily: 'Montserrat,-apple-system,system-ui,"Helvetica Neue",Arial,sans-serif',
    fontSize: '13px', lineHeight: '1.35', textAlign: 'center',
    boxShadow: '0 -8px 24px #11110f55'
  });
  Object.assign(titel.style, { letterSpacing: '.12em', textTransform: 'lowercase' });
  Object.assign(satz.style, { opacity: '.92', maxWidth: '62ch' });
  Object.assign(raus.style, {
    minHeight: '34px', padding: '0 14px', border: '1px solid #f3efe6aa',
    borderRadius: '99px', background: 'transparent', color: 'inherit',
    font: 'inherit', fontSize: '12px', fontWeight: '700',
    letterSpacing: '.06em', cursor: 'pointer'
  });

  // Was ein Medienblock erledigt haette: am Telefon bleibt nur die Marke und
  // der Ausstieg, der Erklaersatz waere dort eine dritte Zeile.
  const engAnpassen = () => {
    const eng = window.innerWidth < 560;
    satz.style.display = eng ? 'none' : '';
    band.style.fontSize = eng ? '12px' : '13px';
    band.style.padding = eng ? '8px 12px' : '10px 16px';
  };

  /**
   * Platz schaffen, damit das Band nichts verdeckt.
   *
   * Zwei verschiedene Faelle, und der zweite ist der wichtigere:
   *
   *  1. Was im Fluss steht (Fusszeile), kommt mit Luft unter dem Koerper frei.
   *  2. Was fest am unteren Rand klebt, kommt damit NICHT frei - Polsterung
   *     bewegt einen fixierten Kasten nicht. Genau dort sitzen aber die
   *     wichtigsten Knoepfe des Hauses: die Bestellleiste im Takeaway
   *     (#taJetzt), die Absendezeile der Reservierung am Telefon und die
   *     Reiterleiste der Wirt-Ansicht. Ohne diesen Schritt lag das Band auf
   *     "Bestellung aufgeben" (17.09.).
   *
   * Deshalb wird jeder fixierte Kasten, der tiefer sitzt als das Band hoch
   * ist, um die Bandhoehe angehoben. Gesucht wird nach dem berechneten Wert,
   * nicht nach Namen: eine Leiste, die es in einem halben Jahr dazugibt,
   * wird so von selbst mitgenommen.
   */
  const platz = () => {
    const hoch = band.offsetHeight;
    document.documentElement.style.setProperty('--probeband-h', `${hoch}px`);
    document.body.style.paddingBottom = `${hoch}px`;

    for (const el of document.querySelectorAll('body *')) {
      if (el === band || band.contains(el)) continue;
      const stand = getComputedStyle(el);
      if (stand.position !== 'fixed') continue;
      // Wer oben angeschlagen ist, haengt nicht am unteren Rand - auch dann
      // nicht, wenn seine berechnete Unterkante zufaellig klein aussieht.
      // Ohne diese Zeile bekam die Kachel "aktuelles programm" auf der
      // Startseite eine Unterkante gesetzt; da sie zugleich oben haengt,
      // spannte sie sich ueber beides und wurde zu einer 719 px hohen
      // beigen Pille quer ueber das Kopfbild (Jonas, 21.09., am iPhone).
      if (stand.top !== 'auto') continue;
      const unten = parseFloat(stand.bottom);
      // "auto" oder weit oben: der Kasten haengt nicht am unteren Rand.
      if (!Number.isFinite(unten) || unten > hoch + 24) continue;
      if (el.dataset.probeGehoben === String(hoch)) continue;
      el.dataset.probeGehoben = String(hoch);
      el.style.bottom = `calc(${stand.bottom} + ${hoch}px)`;
    }
  };

  // Kein Band am unteren Rand mehr (Kunde, 22.09.: die Seite soll immer
  // final aussehen, auch beim Herzeigen). Der Probemodus selbst bleibt:
  // ?probe=1 schaltet den Tab auf den Testdienst, ein neuer Tab ist wieder
  // Echtbetrieb. Wer wissen will, wo er ist: window.WIRTSCHAFT_PROBE.
  const BAND_ZEIGEN = false;
  const zeige = () => {
    if (!BAND_ZEIGEN) return;
    document.body.appendChild(band);
    engAnpassen();
    platz();
    window.addEventListener('resize', () => { engAnpassen(); platz(); }, { passive: true });
    // Ein zweiter Durchgang, wenn die Seite fertig aufgebaut ist: manche
    // Leisten entstehen erst, wenn Daten da sind, und eine Regel aus einem
    // Medienblock greift erst nach dem ersten Zeichnen.
    setTimeout(platz, 1500);
    raus.addEventListener('click', () => {
      merke(false);
      window.location.href = window.location.pathname;
    });
  };

  if (document.body) zeige();
  else document.addEventListener('DOMContentLoaded', zeige, { once: true });
})();
