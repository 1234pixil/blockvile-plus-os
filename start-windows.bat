@echo off
cd /d "%~dp0"
where python >nul 2>nul && (start "" http://localhost:8080 & python -m http.server 8080 & goto :eof)
start "" "%~dp0index.html"
