#!/bin/sh
cd "$(dirname "$0")"
URL=http://localhost:8080
( sleep 1; (xdg-open $URL || open $URL) >/dev/null 2>&1 ) &
if command -v python3 >/dev/null; then python3 -m http.server 8080; else (xdg-open index.html || open index.html); fi
