"""Final fix: clean empty nav-wrap, update JS version, fix layout."""
from pathlib import Path
import re

SITE = Path(__file__).resolve().parent

dashboards = [
    "dashboard-executif.html", "dashboard-ventes.html", "dashboard-achats.html",
    "dashboard-stocks.html", "dashboard-livraisons.html", "dashboard-transport.html",
    "dashboard-vehicules.html", "dashboard-rh.html", "dashboard-incidents.html",
    "dashboard-satisfaction.html"
]

for fname in dashboards:
    path = SITE / fname
    if not path.exists():
        continue
    content = path.read_text(encoding="utf-8")
    
    # 1. Remove empty nav-wrap blocks
    content = re.sub(r'<div class="nav-wrap">\s*</div>', '', content)
    
    # 2. Update JS version to force browser cache refresh
    content = content.replace(
        'js/dashboard-page.js?v=realistic-20260701-2055',
        'js/dashboard-page.js?v=modern-20260713'
    )
    
    # 3. Fix indentation of navbar (remove extra 4 spaces before navbar)
    content = content.replace('    <nav class="navbar">\n    <a href', '<nav class="navbar">\n    <a href')
    
    path.write_text(content, encoding="utf-8")
    print(f"Fixed: {fname}")

print("\n✅ All dashboards fixed!")