#!/bin/bash
# Veroeffentlicht den Reservierungsdienst der Wirtschaft Dornbirn.
#
# Ein Befehl, von ueberall aus aufrufbar:
#   bash ~/Projects/wirtschaft-dornbirn-test/server/deploy.sh
#
# Das Skript loest zwei Stolpersteine, an denen es sonst haengen bleibt:
#  1. Es findet sein eigenes Verzeichnis. "cd server" scheitert, wenn das
#     Terminal woanders steht - und das tut es fast immer.
#  2. Es benutzt einen eigenen npm-Zwischenspeicher. Im Ordner ~/.npm liegen
#     auf diesem Rechner Dateien, die root gehoeren (Ueberbleibsel eines
#     frueheren "sudo npm"). npx bricht daran mit EACCES ab. Der dauerhafte
#     Fix waere "sudo chown -R 501:20 ~/.npm" und braucht ein Passwort - der
#     eigene Zwischenspeicher kommt ohne aus.

set -u

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJEKT="$(cd "$HIER/.." && pwd)"
export NPM_CONFIG_CACHE="$HOME/.wirtschaft-npm-cache"
mkdir -p "$NPM_CONFIG_CACHE"

WRANGLER=(npx --yes wrangler@4)

sag() { printf '\n\033[1m%s\033[0m\n' "$1"; }
fehler() { printf '\n\033[31m%s\033[0m\n' "$1"; }

cd "$HIER" || { fehler "Ordner $HIER nicht gefunden."; exit 1; }

sag "Wirtschaft Dornbirn · Reservierungsdienst veröffentlichen"
echo "Projekt: $PROJEKT"

# ---- 1. Anmeldung ----------------------------------------------------------
sag "Schritt 1 von 4: Anmeldung bei Cloudflare"
if "${WRANGLER[@]}" whoami >/dev/null 2>&1; then
  KONTO="$("${WRANGLER[@]}" whoami 2>/dev/null | grep -i -m1 'account' || true)"
  echo "Bereits angemeldet. ${KONTO}"
else
  echo "Es öffnet sich gleich der Browser. Dort auf „Allow“ klicken."
  echo "Falls du noch kein Cloudflare-Konto hast: im Browser eines anlegen"
  echo "(kostenlos), dann kommt das Skript von selbst weiter."
  if ! "${WRANGLER[@]}" login; then
    fehler "Die Anmeldung hat nicht geklappt. Nochmal starten."
    exit 1
  fi
fi

# ---- 2. Hausschlüssel ------------------------------------------------------
sag "Schritt 2 von 4: Hausschlüssel setzen"
echo "Der Hausschlüssel schützt die interne Planung. Gäste brauchen ihn nie."
echo
read -r -p "Soll ich einen sicheren Schlüssel erzeugen? [J/n] " ANTWORT
ANTWORT="${ANTWORT:-J}"

if [[ "$ANTWORT" =~ ^([JjYy])$ ]]; then
  SCHLUESSEL="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-28)"
  if printf '%s' "$SCHLUESSEL" | "${WRANGLER[@]}" secret put HAUS_TOKEN; then
    sag "Dein Hausschlüssel – jetzt aufschreiben, er wird nicht nochmal angezeigt:"
    printf '\n    \033[1;32m%s\033[0m\n\n' "$SCHLUESSEL"
    echo "Du trägst ihn später einmal im Tischplan ein, unter"
    echo "Einrichten → Reservierungsdienst."
    read -r -p "Notiert? Weiter mit [Enter] "
  else
    fehler "Der Schlüssel liess sich nicht setzen."
    exit 1
  fi
else
  echo "Dann tipp ihn jetzt selbst ein (er wird nicht angezeigt):"
  "${WRANGLER[@]}" secret put HAUS_TOKEN || { fehler "Abgebrochen."; exit 1; }
fi

# ---- 3. Veröffentlichen ----------------------------------------------------
sag "Schritt 3 von 4: Dienst veröffentlichen"
AUSGABE="$("${WRANGLER[@]}" deploy 2>&1)"
STATUS=$?
echo "$AUSGABE"
if [ $STATUS -ne 0 ]; then
  fehler "Das Veröffentlichen ist fehlgeschlagen. Die Meldung steht oben."
  exit 1
fi

ADRESSE="$(printf '%s' "$AUSGABE" | grep -o 'https://[a-zA-Z0-9._-]*\.workers\.dev' | head -1)"

# ---- 4. Eintragen ----------------------------------------------------------
sag "Schritt 4 von 4: Adresse eintragen"
if [ -z "$ADRESSE" ]; then
  fehler "Die Adresse liess sich nicht automatisch auslesen."
  echo "Sie steht oben in der Ausgabe hinter „Deployed“. Bitte von Hand in"
  echo "$PROJEKT/site/data/haus.json eintragen."
  exit 0
fi

echo "Gefunden: $ADRESSE"
node -e '
const fs = require("node:fs");
const [datei, adresse] = process.argv.slice(1);
const daten = JSON.parse(fs.readFileSync(datei, "utf8"));
daten.api = adresse;
daten.status = "an";
fs.writeFileSync(datei, JSON.stringify(daten, null, 2) + "\n");
' "$PROJEKT/site/data/haus.json" "$ADRESSE" || { fehler "Eintragen fehlgeschlagen."; exit 1; }

echo "In site/data/haus.json eingetragen."

sag "Fertig. Das steht jetzt an:"
cat <<TEXT

  1. Im Projektordner einmal:   cd "$PROJEKT" && npm run ci
     Das trägt die Adresse in die Sicherheitsregeln ein.

  2. Änderungen hochladen (oder Jonas/Claude machen lassen).

  3. Im Tischplan unter Einrichten → Reservierungsdienst den Hausschlüssel
     eintragen und auf „Übernehmen und veröffentlichen“ drücken.

  Adresse des Dienstes: $ADRESSE

TEXT
