"""Update all KPI dashboard HTML files with modern navbar, logo, breadcrumbs and back button."""
from pathlib import Path

SITE = Path(__file__).resolve().parent

NAVBAR_HTML = '''  <nav class="navbar">
    <a href="index.html" class="navbar-brand">
      <img src="iteslab-logo.png" alt="ITESLAB" class="logo-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <div class="brand-icon" style="display:none">📊</div>
      <span>ITESLAB Analytics</span>
    </a>
    <ul class="navbar-links">
      <li><a href="index.html">Accueil</a></li>
      <li><a href="ml-overview.html">IA & ML</a></li>
    </ul>
  </nav>'''

BREADCRUMBS_HTML = '''  <div class="container">
    <nav class="breadcrumbs">
      <a href="index.html">Accueil</a>
      <span class="separator">▸</span>
      <span class="current" id="breadcrumbCurrent">DASHBOARD_NAME</span>
    </nav>
    <a href="index.html" class="btn-back">← Retour à l'accueil</a>'''

FOOTER_HTML = '''  </div>
  <footer class="footer">
    <p>ITESLAB LOGISTICS ANALYTICS &copy; 2026 — Plateforme de visualisation et d'intelligence artificielle</p>
  </footer>'''

HEAD_UPDATE = '''  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="dashboard.css?v=realistic-20260701-2055" />
  <link rel="stylesheet" href="styles.css" />'''

dashboard_names = {
    "dashboard-ventes.html": "Dashboard Ventes",
    "dashboard-achats.html": "Dashboard Achats",
    "dashboard-stocks.html": "Dashboard Stocks",
    "dashboard-livraisons.html": "Dashboard Livraisons",
    "dashboard-transport.html": "Dashboard Transport",
    "dashboard-vehicules.html": "Dashboard Véhicules",
    "dashboard-rh.html": "Dashboard RH",
    "dashboard-incidents.html": "Dashboard Incidents",
    "dashboard-satisfaction.html": "Dashboard Satisfaction",
}

# First fix executif which was already partially done
exec_file = SITE / "dashboard-executif.html"
if exec_file.exists():
    content = exec_file.read_text(encoding="utf-8")
    # Fix the container close
    content = content.replace('  </main>', '')
    # Ensure we have container div closing and footer
    if '</div>' in content and '<footer' not in content:
        # Add footer before </body>
        content = content.replace('  <script', f'{FOOTER_HTML}\n  <script')
    exec_file.write_text(content, encoding="utf-8")
    print(f"Fixed: dashboard-executif.html")

for filename, display_name in dashboard_names.items():
    filepath = SITE / filename
    if not filepath.exists():
        print(f"Skipping {filename}: not found")
        continue
    
    content = filepath.read_text(encoding="utf-8")
    
    # 1. Update title
    old_title = f"ITESLAB8LOGISTIC8ANALITYCS"
    content = content.replace(old_title, "ITESLAB Logistics")
    
    # 2. Update <head> section - replace font links and css
    old_head_pattern = '''  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="dashboard.css?v=realistic-20260701-2055" />'''
    
    if old_head_pattern in content:
        content = content.replace(old_head_pattern, HEAD_UPDATE)
    
    # 3. Replace <body data-dashboard="..."> with navbar before it
    import re
    body_match = re.search(r'<body data-dashboard="(\w+)">', content)
    if body_match:
        dash_name = body_match.group(1)
        old_body = body_match.group(0)
        content = content.replace(old_body, f'{old_body}\n{NAVBAR_HTML}', 1)
    
    # 4. Replace <main class="container"> with container div + breadcrumbs
    bc = BREADCRUMBS_HTML.replace("DASHBOARD_NAME", display_name)
    content = content.replace('<main class="container">', bc, 1)
    
    # 5. Replace </main> with footer div close
    content = content.replace('</main>', f'{FOOTER_HTML}', 1)
    
    # 6. Remove old back-link if present (it's now replaced by btn-back)
    content = content.replace('        <a class="back-link" href="index.html">Portail</a>\n', '')
    
    filepath.write_text(content, encoding="utf-8")
    print(f"Updated: {filename}")

print("\n✅ All dashboard pages updated!")