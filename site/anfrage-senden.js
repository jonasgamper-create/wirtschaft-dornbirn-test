// Anfragen aus Locations und Agentur an den eigenen Dienst schicken (01.10.).
// Der Dienst speichert die Anfrage, mailt sie ans Haus und schickt dem Gast
// eine automatische Bestaetigung. Antwortet er nicht, faellt das Formular
// auf den alten Weg zurueck: das Mailprogramm mit der fertigen Anfrage.
(() => {
  'use strict';
  async function dienst() {
    try {
      const daten = await fetch('data/haus.json?t=' + Date.now(), { cache: 'no-store' }).then(a => a.json());
      const adresse = String((window.WIRTSCHAFT_PROBE && daten?.probe) || daten?.api || '').trim().replace(/\/+$/, '');
      return /^https:\/\//.test(adresse) ? adresse : '';
    } catch { return ''; }
  }
  window.wirtschaftAnfrage = async anfrage => {
    const basis = await dienst();
    if (!basis) return { ok: false, grund: 'aus' };
    try {
      const antwort = await fetch(`${basis}/api/anfrage`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(anfrage)
      });
      return await antwort.json().catch(() => ({ ok: false, grund: 'antwort' }));
    } catch { return { ok: false, grund: 'netz' }; }
  };
})();
