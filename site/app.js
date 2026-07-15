const DATA_BASE = "../data/curated";
const DATA_VERSION = "realistic-20260701-2055";
const ZIP_PATH = `../data/logistics_exports.zip?v=${DATA_VERSION}`;

const tableFiles = {
  dimDate: "dim_date.csv",
  dimClient: "dim_client.csv",
  dimProduct: "dim_product.csv",
  dimOrder: "dim_order.csv",
  factSales: "fact_sales.csv",
  factDelivery: "fact_delivery.csv",
  factTransport: "fact_transport.csv",
  factStock: "fact_stock.csv",
  factPresence: "fact_driver_presence.csv",
  factIncident: "fact_incident.csv",
  factSatisfaction: "fact_customer_satisfaction.csv"
};

const charts = {};
const state = {
  rows: {},
  enriched: {
    sales: [],
    delivery: [],
    transport: [],
    stock: [],
    presence: [],
    incident: [],
    satisfaction: []
  }
};

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function euro(v) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function pct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

function avg(arr) {
  if (!arr.length) {
    return 0;
  }
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function loadCsv(file) {
  const response = await fetch(`${DATA_BASE}/${file}`);
  if (!response.ok) {
    throw new Error(`Impossible de charger ${file}`);
  }
  const text = await response.text();
  return Papa.parse(text, { header: true, dynamicTyping: false, skipEmptyLines: true }).data;
}

async function loadFromZip() {
  const response = await fetch(ZIP_PATH);
  if (!response.ok) {
    throw new Error("ZIP non disponible");
  }

  const blob = await response.blob();
  const zip = await JSZip.loadAsync(blob);
  const loaded = {};

  for (const [key, fileName] of Object.entries(tableFiles)) {
    const entry = zip.file(fileName);
    if (!entry) {
      throw new Error(`Fichier manquant dans ZIP: ${fileName}`);
    }
    const text = await entry.async("string");
    loaded[key] = Papa.parse(text, { header: true, dynamicTyping: false, skipEmptyLines: true }).data;
  }

  return loaded;
}

function buildIndex(rows, key) {
  const out = new Map();
  for (const r of rows) {
    out.set(String(r[key]), r);
  }
  return out;
}

function enrichData() {
  const dateIdx = buildIndex(state.rows.dimDate, "sk_date");
  const clientIdx = buildIndex(state.rows.dimClient, "sk_client");
  const productIdx = buildIndex(state.rows.dimProduct, "sk_product");

  state.enriched.sales = state.rows.factSales.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    const c = clientIdx.get(String(r.sk_client));
    const p = productIdx.get(String(r.sk_product));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      yearMonth: d?.year_month ?? "NA",
      clientName: c?.client_name ?? "NA",
      productName: p?.product_name ?? "NA",
      revenue: parseNum(r.revenue_amount),
      margin: parseNum(r.margin_amount)
    };
  });

  state.enriched.delivery = state.rows.factDelivery.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    const c = clientIdx.get(String(r.sk_client));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      yearMonth: d?.year_month ?? "NA",
      clientName: c?.client_name ?? "NA",
      onTime: parseNum(r.delivered_on_time_flag),
      delayCategory: r.delay_category
    };
  });

  state.enriched.transport = state.rows.factTransport.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      yearMonth: d?.year_month ?? "NA",
      distance: parseNum(r.distance_km),
      cost: parseNum(r.transport_cost_amount),
      costPerKm: parseNum(r.transport_cost_per_km),
      fillRate: parseNum(r.fill_rate)
    };
  });

  state.enriched.stock = state.rows.factStock.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    const p = productIdx.get(String(r.sk_product));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      productName: p?.product_name ?? "NA",
      stockout: parseNum(r.stockout_flag),
      status: r.stock_status
    };
  });

  state.enriched.presence = state.rows.factPresence.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      attendance: r.attendance_status
    };
  });

  state.enriched.incident = state.rows.factIncident.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      severity: r.severity_band
    };
  });

  state.enriched.satisfaction = state.rows.factSatisfaction.map((r) => {
    const d = dateIdx.get(String(r.sk_date));
    return {
      country: d?.country_code ?? "NA",
      year: d?.year_num ?? "NA",
      score: parseNum(r.satisfaction_score),
      nps: r.nps_class
    };
  });
}

function uniqSorted(values) {
  return [...new Set(values)].sort();
}

function fillSelect(id, options) {
  const sel = document.getElementById(id);
  sel.innerHTML = "";
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    sel.appendChild(el);
  }
}

function bootFilters() {
  const countries = uniqSorted(state.enriched.sales.map((x) => x.country));
  const years = uniqSorted(state.enriched.sales.map((x) => String(x.year)));
  const clients = uniqSorted(state.enriched.sales.map((x) => x.clientName));
  const products = uniqSorted(state.enriched.sales.map((x) => x.productName));

  fillSelect("countryFilter", ["ALL", ...countries]);
  fillSelect("yearFilter", ["ALL", ...years]);
  fillSelect("clientFilter", ["ALL", ...clients]);
  fillSelect("productFilter", ["ALL", ...products]);
}

function currentFilters() {
  return {
    country: document.getElementById("countryFilter").value,
    year: document.getElementById("yearFilter").value,
    client: document.getElementById("clientFilter").value,
    product: document.getElementById("productFilter").value
  };
}

function applyBaseFilters(rows, filters, withClientProduct = false) {
  return rows.filter((r) => {
    const countryOk = filters.country === "ALL" || r.country === filters.country;
    const yearOk = filters.year === "ALL" || String(r.year) === filters.year;
    const clientOk = !withClientProduct || filters.client === "ALL" || r.clientName === filters.client;
    const productOk = !withClientProduct || filters.product === "ALL" || r.productName === filters.product;
    return countryOk && yearOk && clientOk && productOk;
  });
}

function groupSum(rows, key, valueFn) {
  const out = new Map();
  for (const r of rows) {
    const k = r[key];
    out.set(k, (out.get(k) || 0) + valueFn(r));
  }
  return out;
}

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
  }
}

function renderKpis(filters) {
  const sales = applyBaseFilters(state.enriched.sales, filters, true);
  const delivery = applyBaseFilters(state.enriched.delivery, filters, true);
  const transport = applyBaseFilters(state.enriched.transport, filters);
  const sat = applyBaseFilters(state.enriched.satisfaction, filters);
  const stock = applyBaseFilters(state.enriched.stock, filters, true);

  const totalRevenue = sales.reduce((a, r) => a + r.revenue, 0);
  const totalMargin = sales.reduce((a, r) => a + r.margin, 0);
  const onTimeRate = delivery.length ? delivery.reduce((a, r) => a + r.onTime, 0) / delivery.length : 0;
  const transportCost = transport.reduce((a, r) => a + r.cost, 0);
  const satAvg = sat.length ? avg(sat.map((x) => x.score)) : 0;
  const stockoutRate = stock.length ? stock.reduce((a, r) => a + r.stockout, 0) / stock.length : 0;

  document.getElementById("kpiRevenue").textContent = euro(totalRevenue);
  document.getElementById("kpiMargin").textContent = euro(totalMargin);
  document.getElementById("kpiOnTime").textContent = pct(onTimeRate);
  document.getElementById("kpiTransport").textContent = euro(transportCost);
  document.getElementById("kpiSat").textContent = satAvg.toFixed(2);
  document.getElementById("kpiStockout").textContent = pct(stockoutRate);
}

function renderCharts(filters) {
  const sales = applyBaseFilters(state.enriched.sales, filters, true);
  const delivery = applyBaseFilters(state.enriched.delivery, filters, true);
  const transport = applyBaseFilters(state.enriched.transport, filters);
  const stock = applyBaseFilters(state.enriched.stock, filters, true);
  const presence = applyBaseFilters(state.enriched.presence, filters);
  const incidents = applyBaseFilters(state.enriched.incident, filters);
  const sat = applyBaseFilters(state.enriched.satisfaction, filters);

  const monthAgg = groupSum(sales, "yearMonth", (x) => x.revenue);
  const monthLabels = [...monthAgg.keys()].sort();
  destroyChart("revenueTrend");
  charts.revenueTrend = new Chart(document.getElementById("revenueTrend"), {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [{
        label: "CA",
        data: monthLabels.map((m) => monthAgg.get(m)),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15,118,110,.2)",
        borderWidth: 3,
        pointRadius: 2,
        tension: 0.28,
        fill: true
      }]
    },
    options: { maintainAspectRatio: false }
  });

  const marginCountryAgg = groupSum(sales, "country", (x) => x.margin);
  const marginCountries = [...marginCountryAgg.keys()].sort();
  destroyChart("marginByCountry");
  charts.marginByCountry = new Chart(document.getElementById("marginByCountry"), {
    type: "bar",
    data: {
      labels: marginCountries,
      datasets: [{ label: "Marge", data: marginCountries.map((c) => marginCountryAgg.get(c)), backgroundColor: "#0f766e" }]
    },
    options: { maintainAspectRatio: false }
  });

  const clientAgg = groupSum(sales, "clientName", (x) => x.revenue);
  const topClients = [...clientAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  destroyChart("topClients");
  charts.topClients = new Chart(document.getElementById("topClients"), {
    type: "bar",
    data: {
      labels: topClients.map((x) => x[0]),
      datasets: [{ label: "CA", data: topClients.map((x) => x[1]), backgroundColor: "#d97706" }]
    },
    options: { indexAxis: "y", maintainAspectRatio: false }
  });

  const onTimeCountryMap = new Map();
  for (const r of delivery) {
    const v = onTimeCountryMap.get(r.country) || { yes: 0, total: 0 };
    v.yes += r.onTime;
    v.total += 1;
    onTimeCountryMap.set(r.country, v);
  }
  const onTimeCountries = [...onTimeCountryMap.keys()].sort();
  destroyChart("onTimeByCountry");
  charts.onTimeByCountry = new Chart(document.getElementById("onTimeByCountry"), {
    type: "bar",
    data: {
      labels: onTimeCountries,
      datasets: [{
        label: "Taux a temps",
        data: onTimeCountries.map((c) => (onTimeCountryMap.get(c).yes / onTimeCountryMap.get(c).total) * 100),
        backgroundColor: "#0ea5e9"
      }]
    },
    options: { maintainAspectRatio: false }
  });

  const delayAgg = groupSum(delivery, "delayCategory", () => 1);
  const delayLabels = [...delayAgg.keys()];
  destroyChart("delayCategory");
  charts.delayCategory = new Chart(document.getElementById("delayCategory"), {
    type: "doughnut",
    data: {
      labels: delayLabels,
      datasets: [{ data: delayLabels.map((x) => delayAgg.get(x)), backgroundColor: ["#16a34a", "#facc15", "#fb923c", "#dc2626"] }]
    },
    options: { maintainAspectRatio: false }
  });

  const stockAgg = groupSum(stock, "status", () => 1);
  const stockLabels = [...stockAgg.keys()];
  destroyChart("stockStatus");
  charts.stockStatus = new Chart(document.getElementById("stockStatus"), {
    type: "bar",
    data: {
      labels: stockLabels,
      datasets: [{ data: stockLabels.map((x) => stockAgg.get(x)), backgroundColor: "#059669" }]
    },
    options: { maintainAspectRatio: false }
  });

  destroyChart("transportScatter");
  charts.transportScatter = new Chart(document.getElementById("transportScatter"), {
    type: "scatter",
    data: {
      datasets: [{
        label: "Trajets",
        data: transport.slice(0, 650).map((x) => ({ x: x.distance, y: x.costPerKm })),
        backgroundColor: "rgba(217,119,6,.65)"
      }]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Distance (km)" } },
        y: { title: { display: true, text: "Cout par km" } }
      }
    }
  });

  const presenceAgg = groupSum(presence, "attendance", () => 1);
  const presenceLabels = [...presenceAgg.keys()];
  destroyChart("attendance");
  charts.attendance = new Chart(document.getElementById("attendance"), {
    type: "bar",
    data: {
      labels: presenceLabels,
      datasets: [{ data: presenceLabels.map((x) => presenceAgg.get(x)), backgroundColor: ["#0f766e", "#f59e0b", "#dc2626"] }]
    },
    options: { maintainAspectRatio: false }
  });

  const incidentAgg = groupSum(incidents, "severity", () => 1);
  const incidentLabels = [...incidentAgg.keys()];
  destroyChart("incidentSeverity");
  charts.incidentSeverity = new Chart(document.getElementById("incidentSeverity"), {
    type: "bar",
    data: {
      labels: incidentLabels,
      datasets: [{ data: incidentLabels.map((x) => incidentAgg.get(x)), backgroundColor: ["#ef4444", "#f59e0b", "#10b981"] }]
    },
    options: { maintainAspectRatio: false }
  });

  const npsAgg = groupSum(sat, "nps", () => 1);
  const npsLabels = [...npsAgg.keys()];
  destroyChart("npsMix");
  charts.npsMix = new Chart(document.getElementById("npsMix"), {
    type: "pie",
    data: {
      labels: npsLabels,
      datasets: [{ data: npsLabels.map((x) => npsAgg.get(x)), backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"] }]
    },
    options: { maintainAspectRatio: false }
  });
}

function refreshAll() {
  const filters = currentFilters();
  renderKpis(filters);
  renderCharts(filters);
}

async function init() {
  try {
    state.rows = await loadFromZip();
    console.info("Data source: logistics_exports.zip");
  } catch (zipError) {
    console.warn("ZIP load failed, fallback to curated CSV folder", zipError);
    const keys = Object.keys(tableFiles);
    for (const key of keys) {
      state.rows[key] = await loadCsv(tableFiles[key]);
    }
  }

  enrichData();
  bootFilters();

  ["countryFilter", "yearFilter", "clientFilter", "productFilter"].forEach((id) => {
    document.getElementById(id).addEventListener("change", refreshAll);
  });
  document.getElementById("refreshBtn").addEventListener("click", () => window.location.reload());

  refreshAll();
}

init().catch((err) => {
  alert(`Erreur de chargement: ${err.message}. Lance le site via un serveur local.`);
});
