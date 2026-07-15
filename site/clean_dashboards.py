"""Clean up KPI dashboard files: remove dashboard-nav, dashboardSelect, and keep only essentials."""
from pathlib import Path

SITE = Path(__file__).resolve().parent

dashboards = [
    "dashboard-executif.html", "dashboard-ventes.html", "dashboard-achats.html",
    "dashboard-stocks.html", "dashboard-livraisons.html", "dashboard-transport.html",
    "dashboard-vehicules.html", "dashboard-rh.html", "dashboard-incidents.html",
    "dashboard-satisfaction.html"
]

NAVBAR_HTML = '''  <nav class="navbar">
    <a href="index.html" class="navbar-brand">
      <img src="iteslab-logo.png" alt="ITESLAB" class="logo-img" />
      <span>ITESLAB Analytics</span>
    </a>
    <ul class="navbar-links">
      <li><a href="index.html">Accueil</a></li>
      <li><a href="ml-overview.html">IA & ML</a></li>
    </ul>
  </nav>'''

for filename in dashboards:
    path = SITE / filename
    if not path.exists():
        continue
    content = path.read_text(encoding="utf-8")
    
    # Remove dashboard navigation
    lines = content.split("\n")
    cleaned = []
    skip_nav_block = False
    
    for line in lines:
        # Remove the dashboard-nav line
        if 'id="dashboardNav"' in line:
            continue
        # Remove the dashboardSelect line  
        if 'id="dashboardSelect"' in line:
            continue
        # Remove the old back-link
        if 'class="back-link"' in line and 'Portail' in line:
            continue
        cleaned.append(line)
    
    content = "\n".join(cleaned)
    
    # Fix the navbar to use simple img tag without onerror
    old_nav_start = '<nav class="navbar">'
    nav_end = '</nav>'
    
    if old_nav_start in content:
        start_idx = content.index(old_nav_start)
        end_idx = content.index(nav_end, start_idx) + len(nav_end)
        content = content[:start_idx] + NAVBAR_HTML + content[end_idx:]
    
    # Remove duplicate empty lines
    import re
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    path.write_text(content, encoding="utf-8")
    print(f"✅ Cleaned: {filename}")

print("\n🎯 All dashboards cleaned!")