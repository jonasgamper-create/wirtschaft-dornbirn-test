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
  const band = document.createElement('div');
  band.id = 'probeband';
  band.setAttribute('role', 'status');
  band.innerHTML = '<b>Probemodus</b><span>Alles, was du hier einträgst, landet im Testdienst '
    + '– keine echte Reservierung, keine Bestellung, keine Mail.</span>'
    + '<button type="button">Zurück zum Echtbetrieb</button>';

  const stil = document.createElement('style');
  stil.textContent = `
    #probeband{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;
      display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px 14px;
      padding:10px 16px;background:#8c292b;color:#f3efe6;
      font-family:Montserrat,-apple-system,system-ui,"Helvetica Neue",Arial,sans-serif;
      font-size:13px;line-height:1.35;text-align:center;
      box-shadow:0 -8px 24px #11110f55}
    #probeband b{letter-spacing:.12em;text-transform:lowercase}
    #probeband span{opacity:.92;max-width:62ch}
    #probeband button{min-height:34px;padding:0 14px;border:1px solid #f3efe6aa;
      border-radius:99px;background:transparent;color:inherit;font-size:12px;
      font-weight:700;letter-spacing:.06em;cursor:pointer}
    #probeband button:hover{background:#f3efe61f}
    @media(max-width:560px){
      #probeband{font-size:12px;padding:8px 12px;gap:4px 10px}
      #probeband span{display:none}
    }`;

  const zeige = () => {
    document.head.appendChild(stil);
    document.body.appendChild(band);
    // Damit das Band nichts verdeckt, was unten steht (Fusszeile, Knopfleiste
    // der Bestellung): der Seite unten so viel Luft geben, wie das Band hoch
    // ist. Ohne das lag es auf dem Absende-Knopf des Takeaway.
    const luft = () => {
      document.body.style.paddingBottom = `${band.offsetHeight}px`;
    };
    luft();
    window.addEventListener('resize', luft, { passive: true });
    band.querySelector('button').addEventListener('click', () => {
      merke(false);
      window.location.href = window.location.pathname;
    });
  };

  if (document.body) zeige();
  else document.addEventListener('DOMContentLoaded', zeige, { once: true });
})();
