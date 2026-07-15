function formToJson(form) {
  const fd = new FormData(form);
  const out = {};
  for (const [key, value] of fd.entries()) {
    const maybe = Number(value);
    out[key] = value !== "" && Number.isFinite(maybe) ? maybe : value;
  }
  return out;
}

function metricHtml(label, value) {
  return `<div class="metric"><span>${label}</span><span>${value}</span></div>`;
}

function chipList(items = []) {
  if (!items.length) return "<div class='chip-list'><span class='chip'>Aucun</span></div>";
  return `<div class="chip-list">${items.map((x) => `<span class="chip">${x}</span>`).join("")}</div>`;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erreur API ${response.status}: ${text.slice(0, 100)}`);
  }
  return response.json();
}

function renderMetrics(containerId, reportSection, metricMap) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!reportSection) {
    container.innerHTML = metricHtml("Statut", "Modèle non trouvé");
    return;
  }
  const bestModel = reportSection.best_model || "-";
  const leaderboard = reportSection.leaderboard || {};
  const bestMetrics = leaderboard[bestModel] || {};
  const problemLabels = {
    regression: "Régression",
    classification: "Classification",
    binary_classification: "Classification binaire"
  };
  container.innerHTML = [
    `<div class="metric"><span>Type</span><span class="badge">${problemLabels[reportSection.problem_type] || reportSection.problem_type}</span></div>`,
    metricHtml("Meilleur algorithme", bestModel),
    ...Object.entries(metricMap).map(([key, label]) => metricHtml(label, bestMetrics[key] ?? "-")),
    metricHtml("Enregistrements", (reportSection.records ?? "-").toLocaleString()),
    `<div class="hint"><strong>Champs utilisés</strong>${chipList(reportSection.supported_fields || [])}</div>`,
    `<div class="hint"><strong>Extensions futures</strong>${chipList(reportSection.missing_requested_fields || [])}</div>`
  ].join("");
}

async function loadOverview() {
  const response = await fetch("/api/ml/overview");
  const report = await response.json();

  renderMetrics("deliveryMetrics", report.delivery, { mae_cv: "MAE CV", r2_cv: "R² CV" });
  renderMetrics("clientMetrics", report.client, { f1_macro_cv: "F1 macro CV", accuracy_cv: "Accuracy CV" });
  renderMetrics("maintenanceMetrics", report.maintenance, { roc_auc_cv: "ROC AUC CV", f1_cv: "F1 CV", accuracy_cv: "Accuracy CV" });

  const note = document.getElementById("dataScopeNote");
  if (note) {
    note.innerHTML = "✅ Modèles entraînés avec succès sur les données du projet. Les extensions futures (trafic, météo, IoT) sont identifiées et prêtes à être intégrées.";
  }
}

function renderSingleResult(containerId, result, labelKey, labelValue) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<strong>${result[labelKey] ?? "-"}</strong><span>${result[labelValue] ?? ""}` +
    (result.best_model ? ` Modèle retenu : ${result.best_model}.` : "") +
    `</span>`;
}

async function bindForms() {
  // Delivery form
  const delForm = document.getElementById("deliveryForm");
  if (delForm) {
    delForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const target = document.getElementById("deliveryResult");
      target.innerHTML = '<div class="loading"><div class="spinner"></div> Calcul en cours...</div>';
      try {
        const payload = formToJson(e.target);
        const data = await postJson("/api/predict/delivery", payload);
        target.innerHTML = `<strong>${data.predicted_delivery_hours} h estimées</strong><span>${data.predicted_delivery_minutes} minutes au total. Modèle retenu : ${data.best_model}.</span>`;
      } catch (err) {
        target.innerHTML = `<strong>Erreur</strong><span>${err.message}</span>`;
      }
    });
  }

  // Client form
  const clientForm = document.getElementById("clientForm");
  if (clientForm) {
    clientForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const target = document.getElementById("clientResult");
      target.innerHTML = '<div class="loading"><div class="spinner"></div> Classification en cours...</div>';
      try {
        const payload = formToJson(e.target);
        const data = await postJson("/api/predict/client", payload);
        const probs = data.probabilities
          ? Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(" | ")
          : "Probabilités indisponibles";
        target.innerHTML = `<strong>Segment prédit : ${data.predicted_segment}</strong><span>${probs}. Modèle retenu : ${data.best_model}.</span>`;
      } catch (err) {
        target.innerHTML = `<strong>Erreur</strong><span>${err.message}</span>`;
      }
    });
  }

  // Maintenance form
  const maintForm = document.getElementById("maintenanceForm");
  if (maintForm) {
    maintForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const target = document.getElementById("maintenanceResult");
      target.innerHTML = '<div class="loading"><div class="spinner"></div> Évaluation en cours...</div>';
      try {
        const payload = formToJson(e.target);
        const data = await postJson("/api/predict/maintenance", payload);
        const risk = data.failure_risk == null ? "n/a" : `${(data.failure_risk * 100).toFixed(1)}%`;
        const riskClass = data.failure_risk >= 0.65 ? "secondary" : data.failure_risk >= 0.35 ? "warning" : "primary";
        target.innerHTML = `<strong style="color: var(--${riskClass})">${data.risk_label}</strong><span>Probabilité de panne : ${risk}. Sortie binaire : ${data.failure_prediction}. Modèle retenu : ${data.best_model}.</span>`;
      } catch (err) {
        target.innerHTML = `<strong>Erreur</strong><span>${err.message}</span>`;
      }
    });
  }
}

// Auto-init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    loadOverview().then(bindForms).catch((err) => {
      const note = document.getElementById("dataScopeNote");
      if (note) note.textContent = `⚠️ Erreur de chargement: ${err.message}`;
    });
  });
} else {
  loadOverview().then(bindForms).catch((err) => {
    const note = document.getElementById("dataScopeNote");
    if (note) note.textContent = `⚠️ Erreur de chargement: ${err.message}`;
  });
}