@echo off
cd /d "%~dp0"
echo Starting Logistics Analytics website on http://127.0.0.1:8501/site/
echo Keep this window open while using the website.
python -m http.server 8501 --bind 127.0.0.1
