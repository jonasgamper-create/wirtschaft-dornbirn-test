#!/bin/bash
# Setzt einen neuen Hausschluessel und zeigt ihn an.
#
#   bash ~/Projects/wirtschaft-dornbirn-test/server/schluessel.sh
#
# Warum es das gibt: "wrangler secret put" zeigt den eingegebenen Wert nicht an.
# Wer sich vertippt oder ihn nicht notiert, kommt nicht mehr hinein und weiss
# nicht, warum. Dieses Skript erzeugt den Wert selbst, setzt ihn und zeigt ihn
# genau einmal - zum Kopieren.

set -u

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export NPM_CONFIG_CACHE="$HOME/.wirtschaft-npm-cache"
mkdir -p "$NPM_CONFIG_CACHE"
cd "$HIER" || exit 1

printf '\n\033[1mNeuen Hausschlüssel setzen\033[0m\n\n'

# Nur Buchstaben und Ziffern: ein Schluessel, den man auch am Handy abtippen
# kann, ohne an Sonderzeichen oder Autokorrektur zu scheitern.
SCHLUESSEL="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 28)"

if ! printf '%s' "$SCHLUESSEL" | npx --yes wrangler@4 secret put HAUS_TOKEN; then
  printf '\n\033[31mDas hat nicht geklappt. Meldung steht oben.\033[0m\n'
  exit 1
fi

# Oertlich ablegen (nicht im Repository), damit deploy.sh ihn nach jedem
# Veroeffentlichen wieder setzen kann - sonst sperrt jede Code-Aenderung das
# Haus aus.
printf '%s' "$SCHLUESSEL" > "$HIER/.haus-token"
chmod 600 "$HIER/.haus-token"

# Nachsehen statt hoffen. "wrangler deploy" wirft ein zuvor gesetztes
# Geheimnis aus der Bindungsliste - deshalb hier immer pruefen, ob der
# Schluessel wirklich greift, statt ihn nur hochzuladen.
ADRESSE="$(node -e 'const f=require("node:fs");try{process.stdout.write(JSON.parse(f.readFileSync(process.argv[1],"utf8")).api||"")}catch{}' "$HIER/../site/data/haus.json" 2>/dev/null)"
if [ -n "$ADRESSE" ]; then
  sleep 5
  MIT="$(curl -s -o /dev/null -w '%{http_code}' -H "x-haus-token: $SCHLUESSEL" "$ADRESSE/api/stand")"
  OHNE="$(curl -s -o /dev/null -w '%{http_code}' "$ADRESSE/api/stand")"
  if [ "$MIT" = "200" ] && [ "$OHNE" = "401" ]; then
    printf '\n\033[32mGeprüft: mit Schlüssel 200, ohne Schlüssel 401.\033[0m\n'
  else
    printf '\n\033[31mAchtung: der Schlüssel greift noch nicht (mit: %s, ohne: %s).\033[0m\n' "$MIT" "$OHNE"
    printf 'Bitte in einer Minute nochmal starten.\n'
  fi
fi

printf '\n\033[1mDein neuer Hausschlüssel:\033[0m\n'
printf '\n    \033[1;32m%s\033[0m\n\n' "$SCHLUESSEL"

# Auf macOS gleich in die Zwischenablage, dann muss niemand abtippen.
if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "$SCHLUESSEL" | pbcopy
  printf 'Er liegt jetzt in der Zwischenablage – im Tischplan einfach\n'
  printf 'mit Cmd+V ins Feld "Hausschlüssel" einfügen.\n\n'
fi

cat <<'TEXT'
So geht es weiter:

  1. Tischplan öffnen und mit Cmd+Shift+R neu laden:
     https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/tischplan/

  2. Reiter "Einrichten" → Kasten "Reservierungsdienst"

  3. Schlüssel einfügen, Standard-Etage wählen,
     "Übernehmen und veröffentlichen" drücken.

TEXT
