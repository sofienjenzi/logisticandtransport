# Power BI Embed in Website (Next Step)

This project already provides a dynamic analytics website in [site/index.html](../site/index.html).

If you want to embed real Power BI reports in the same website, use this professional pattern.

## 1) Publish report

1. Build your report in Power BI Desktop.
2. Publish to Power BI Service workspace.
3. Note: Workspace ID, Report ID, Dataset ID.

## 2) Configure Azure app (service principal)

1. Register an app in Azure AD.
2. Grant Power BI API permissions.
3. Create client secret.
4. Enable service principal access in Power BI tenant settings.

## 3) Create backend endpoint for embed token

Create secure API endpoint (never expose secret in frontend):

- Input: report identifier + user context
- Output: `embedUrl`, `reportId`, `accessToken`

## 4) Frontend embed code

```html
<script src="https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.min.js"></script>
<div id="pbi-container" style="height:720px"></div>
<script>
  async function renderPowerBI() {
    const resp = await fetch('/api/powerbi/embed-token', { method: 'POST' });
    const cfg = await resp.json();

    const models = window['powerbi-client'].models;
    const config = {
      type: 'report',
      tokenType: models.TokenType.Embed,
      accessToken: cfg.accessToken,
      embedUrl: cfg.embedUrl,
      id: cfg.reportId,
      permissions: models.Permissions.Read,
      settings: {
        panes: {
          filters: { visible: true },
          pageNavigation: { visible: true }
        },
        background: models.BackgroundType.Transparent
      }
    };

    const container = document.getElementById('pbi-container');
    window.powerbi.embed(container, config);
  }
  renderPowerBI();
</script>
```

## 5) Recommended architecture

- Keep this repository as data mart + KPI logic layer.
- Keep website UI as portal layer.
- Embed Power BI for advanced self-service pages.
- Keep row-level security in Power BI dataset for multi-user production.
