#!/usr/bin/env bash
set -euo pipefail

# Prefer the workspace runtime when available; otherwise use the developer's
# normal Python installation (which must provide reportlab/pdfplumber).
if [[ -x "${CODEX_PYTHON:-}" ]]; then
  exec "$CODEX_PYTHON" "$@"
fi
if [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" ]]; then
  exec "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" "$@"
fi
exec python3 "$@"
