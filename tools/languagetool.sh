#!/usr/bin/env bash
# LanguageTool on this computer for Casus's proofreading tab (Allan, 2026-10-19: "both, local first").
# The first run downloads LanguageTool (open source, LGPL; ~250 MB) to ~/.local/share/casus/languagetool, outside the
# project; every run starts its server on http://localhost:8081, which the page uses when it is running.
# Needs Java 17 or newer. Stop it with Ctrl+C.
set -euo pipefail
DIR="${CASUS_LT_DIR:-$HOME/.local/share/casus/languagetool}"
PORT="${CASUS_LT_PORT:-8081}"
command -v java >/dev/null || { echo "Java is needed (sudo apt install openjdk-21-jre-headless)"; exit 1; }
JAR=$(ls "$DIR"/LanguageTool-*/languagetool-server.jar 2>/dev/null | head -1 || true)
if [ -z "$JAR" ]; then
  mkdir -p "$DIR"
  echo "Downloading LanguageTool (about 250 MB, once) into $DIR …"
  curl -fL --retry 3 -o "$DIR/LanguageTool-stable.zip" https://languagetool.org/download/LanguageTool-stable.zip
  (cd "$DIR" && unzip -q LanguageTool-stable.zip && rm LanguageTool-stable.zip)
  JAR=$(ls "$DIR"/LanguageTool-*/languagetool-server.jar | head -1)
fi
echo "LanguageTool on http://localhost:$PORT — the Casus proofreading tab uses it while this runs (Ctrl+C stops it)."
exec java -cp "$JAR" org.languagetool.server.HTTPServer --port "$PORT" --allow-origin '*'
