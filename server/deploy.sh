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

# ---- 2. Veröffentlichen ----------------------------------------------------
# Erst veroeffentlichen, dann das Geheimnis setzen. Andersherum geht es
# verloren: "wrangler deploy" bindet nur, was in der Konfiguration steht, und
# ein zuvor gesetztes Geheimnis faellt dabei aus der Bindungsliste. Der Dienst
# meldet dann "Der Hausschluessel stimmt nicht" - obwohl er richtig ist.
sag "Schritt 2 von 4: Dienst veröffentlichen"
AUSGABE="$("${WRANGLER[@]}" deploy 2>&1)"
STATUS=$?
echo "$AUSGABE"
if [ $STATUS -ne 0 ]; then
  fehler "Das Veröffentlichen ist fehlgeschlagen. Die Meldung steht oben."
  exit 1
fi
ADRESSE="$(printf '%s' "$AUSGABE" | grep -o 'https://[a-zA-Z0-9._-]*\.workers\.dev' | head -1)"

# ---- 3. Hausschlüssel ------------------------------------------------------
sag "Schritt 3 von 4: Hausschlüssel setzen"
echo "Der Hausschlüssel schützt die interne Planung. Gäste brauchen ihn nie."
echo

SCHLUESSEL="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 28)"
if ! printf '%s' "$SCHLUESSEL" | "${WRANGLER[@]}" secret put HAUS_TOKEN; then
  fehler "Der Schlüssel liess sich nicht setzen."
  exit 1
fi

# Nachsehen statt hoffen: der Dienst muss den Schluessel wirklich annehmen.
if [ -n "$ADRESSE" ]; then
  sleep 5
  MIT="$(curl -s -o /dev/null -w '%{http_code}' -H "x-haus-token: $SCHLUESSEL" "$ADRESSE/api/stand")"
  OHNE="$(curl -s -o /dev/null -w '%{http_code}' "$ADRESSE/api/stand")"
  if [ "$MIT" != "200" ] || [ "$OHNE" != "401" ]; then
    fehler "Der Schlüssel greift noch nicht (mit: $MIT, ohne: $OHNE)."
    echo "Bitte in einer Minute nochmal starten - manchmal braucht die"
    echo "Verteilung etwas. Bleibt es dabei, melde dich mit dieser Zeile."
    exit 1
  fi
  echo "Geprüft: mit Schlüssel 200, ohne Schlüssel 401."
fi

sag "Dein Hausschlüssel – jetzt aufschreiben, er wird nicht nochmal angezeigt:"
printf '\n    \033[1;32m%s\033[0m\n\n' "$SCHLUESSEL"
if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "$SCHLUESSEL" | pbcopy
  echo "Er liegt auch in der Zwischenablage – im Tischplan mit Cmd+V einfügen."
fi
read -r -p "Notiert? Weiter mit [Enter] "

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
