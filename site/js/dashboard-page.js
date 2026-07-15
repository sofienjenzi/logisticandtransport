const DATA_VERSION = "realistic-20260701-2115";
const ZIP_PATH = `../data/logistics_exports.zip?v=${DATA_VERSION}`;

const tableFiles = {
  dim_date: "dim_date.csv",
  dim_client: "dim_client.csv",
  dim_product: "dim_product.csv",
  dim_order: "dim_order.csv",
  dim_supplier: "dim_supplier.csv",
  dim_vehicle: "dim_vehicle.csv",
  dim_driver: "dim_driver.csv",
  dim_route: "dim_route.csv",
  dim_carrier: "dim_carrier.csv",
  dim_warehouse: "dim_warehouse.csv",
  dim_incident: "dim_incident.csv",
  dim_transport_mode: "dim_transport_mode.csv",
  fact_sales: "fact_sales.csv",
  fact_purchase: "fact_purchase.csv",
  fact_delivery: "fact_delivery.csv",
  fact_transport: "fact_transport.csv",
  fact_stock: "fact_stock.csv",
  fact_driver_presence: "fact_driver_presence.csv",
  fact_incident: "fact_incident.csv",
  fact_maintenance: "fact_maintenance.csv",
  fact_fuel: "fact_fuel.csv",
  fact_customer_satisfaction: "fact_customer_satisfaction.csv"
};

const charts = {};
let model = null;

const dashboardCatalog = {
  executif: "Dashboard Executif",
  ventes: "Dashboard Ventes",
  achats: "Dashboard Achats",
  stocks: "Dashboard Stocks",
  livraisons: "Dashboard Livraisons",
  transport: "Dashboard Transport",
  vehicules: "Dashboard Vehicules",
  rh: "Dashboard RH Chauffeurs",
  incidents: "Dashboard Incidents",
  satisfaction: "Dashboard Satisfaction"
};

const dashboardSubtitles = {
  executif: "Pilotage global avec alertes finance, service, stock, transport et experience client.",
  ventes: "Analyse commerciale par client, produit, canal, pays et niveau de marge.",
  achats: "Controle des fournisseurs, couts d'approvisionnement et delais reels vs planifies.",
  stocks: "Risque de rupture, valeur immobilisee, entrepots et statuts de stock.",
  livraisons: "Ponctualite, categories de retard, chauffeurs, vehicules et clients servis.",
  transport: "Couts, distance, remplissage, transporteurs, routes et impact CO2.",
  vehicules: "Flotte, maintenance, carburant, pannes, immobilisation et efficacite vehicule.",
  rh: "Presence chauffeurs, retards, heures travaillees, experience et disponibilite.",
  incidents: "Risque operationnel par gravite, type d'incident, pays, route et vehicule.",
  satisfaction: "NPS, reclamations, satisfaction par pays, client et segment de note."
};

const palette = {
  green: "#0f766e",
  green2: "#22c55e",
  blue: "#0ea5e9",
  orange: "#d97706",
  amber: "#f59e0b",
  red: "#dc2626",
  slate: "#475569",
  purple: "#7c3aed"
};

const filterSpecs = {
  executif: [
    ["country", "Pays", "country", ["sales", "livraisons", "transport", "stocks", "satisfaction"]],
    ["year", "Annee", "year", ["sales", "livraisons", "transport", "stocks", "satisfaction"]],
    ["marginBand", "Segment marge", "marginBand", ["sales"]],
    ["nps", "Classe NPS", "nps", ["satisfaction"]]
  ],
  ventes: [
    ["country", "Pays", "country", ["sales"]],
    ["year", "Annee", "year", ["sales"]],
    ["client", "Client", "client", ["sales"]],
    ["product", "Produit", "product", ["sales"]],
    ["channel", "Canal", "channel", ["sales"]],
    ["marginBand", "Segment marge", "marginBand", ["sales"]]
  ],
  achats: [
    ["country", "Pays", "country", ["achats"]],
    ["year", "Annee", "year", ["achats"]],
    ["supplier", "Fournisseur", "supplier", ["achats"]],
    ["product", "Produit", "product", ["achats"]],
    ["delayClass", "Etat delai", "delayClass", ["achats"]]
  ],
  stocks: [
    ["country", "Pays", "country", ["stocks"]],
    ["year", "Annee", "year", ["stocks"]],
    ["warehouse", "Entrepot", "warehouse", ["stocks"]],
    ["product", "Produit", "product", ["stocks"]],
    ["status", "Statut stock", "status", ["stocks"]]
  ],
  livraisons: [
    ["country", "Pays", "country", ["livraisons"]],
    ["year", "Annee", "year", ["livraisons"]],
    ["client", "Client", "client", ["livraisons"]],
    ["driver", "Chauffeur", "driver", ["livraisons"]],
    ["vehicle", "Vehicule", "vehicle", ["livraisons"]],
    ["delayCategory", "Categorie retard", "delayCategory", ["livraisons"]]
  ],
  transport: [
    ["country", "Pays", "country", ["transport"]],
    ["year", "Annee", "year", ["transport"]],
    ["route", "Route", "route", ["transport"]],
    ["carrier", "Transporteur", "carrier", ["transport"]],
    ["mode", "Mode", "mode", ["transport"]],
    ["fillBand", "Remplissage", "fillBand", ["transport"]]
  ],
  vehicules: [
    ["country", "Pays", "country", ["vehicules", "fuel"]],
    ["year", "Annee", "year", ["vehicules", "fuel"]],
    ["vehicle", "Vehicule", "vehicle", ["vehicules", "fuel"]],
    ["vehicleType", "Type vehicule", "vehicleType", ["vehicules", "fuel"]],
    ["vehicleStatus", "Statut vehicule", "vehicleStatus", ["vehicules", "fuel"]]
  ],
  rh: [
    ["country", "Pays", "country", ["presence"]],
    ["year", "Annee", "year", ["presence"]],
    ["driver", "Chauffeur", "driver", ["presence"]],
    ["status", "Statut presence", "status", ["presence"]],
    ["experienceBand", "Experience", "experienceBand", ["presence"]]
  ],
  incidents: [
    ["country", "Pays", "country", ["incidents"]],
    ["year", "Annee", "year", ["incidents"]],
    ["severity", "Gravite", "severity", ["incidents"]],
    ["incidentType", "Type incident", "incidentType", ["incidents"]],
    ["route", "Route", "route", ["incidents"]],
    ["vehicle", "Vehicule", "vehicle", ["incidents"]]
  ],
  satisfaction: [
    ["country", "Pays", "country", ["satisfaction"]],
    ["year", "Annee", "year", ["satisfaction"]],
    ["client", "Client", "client", ["satisfaction"]],
    ["nps", "Classe NPS", "nps", ["satisfaction"]],
    ["band", "Segment satisfaction", "band", ["satisfaction"]]
  ]
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sum(arr, fn) {
  return arr.reduce((a, x) => a + fn(x), 0);
}

function avg(arr, fn) {
  return arr.length ? sum(arr, fn) / arr.length : 0;
}

function euro(v) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function pct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

function compact(v) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function number(v) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v);
}

function decimal(v) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);
}

function formatChartValue(value, format = "number") {
  if (!Number.isFinite(Number(value))) return String(value ?? "");
  const n = Number(value);
  if (format === "currency") return euro(n);
  if (format === "percent") return `${decimal(n)}%`;
  if (format === "km") return `${number(n)} km`;
  if (format === "kg") return `${number(n)} kg`;
  if (format === "hours") return `${decimal(n)} h`;
  if (format === "minutes") return `${number(n)} min`;
  if (format === "score") return `${decimal(n)} / 5`;
  return number(n);
}

function group(rows, keyFn, valFn = () => 1) {
  const out = new Map();
  for (const r of rows) {
    const k = keyFn(r) || "Non renseigne";
    out.set(k, (out.get(k) || 0) + valFn(r));
  }
  return out;
}

function avgGroup(rows, keyFn, valFn) {
  const bucket = new Map();
  for (const r of rows) {
    const k = keyFn(r) || "Non renseigne";
    const v = bucket.get(k) || { t: 0, n: 0 };
    v.t += valFn(r);
    v.n += 1;
    bucket.set(k, v);
  }
  return new Map([...bucket.entries()].map(([k, v]) => [k, v.n ? v.t / v.n : 0]));
}

function topEntries(map, n = 8, desc = true) {
  return [...map.entries()].sort((a, b) => desc ? b[1] - a[1] : a[1] - b[1]).slice(0, n);
}

function idx(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(String(r[key]), r);
  return m;
}

function bandDelay(v) {
  if (v <= 0) return "En avance";
  if (v <= 1) return "0-1 jour";
  if (v <= 2) return "1-2 jours";
  return "> 2 jours";
}

function bandExperience(v) {
  if (v < 5) return "0-4 ans";
  if (v < 10) return "5-9 ans";
  if (v < 15) return "10-14 ans";
  return "15+ ans";
}

async function loadZipTables() {
  const response = await fetch(ZIP_PATH);
  if (!response.ok) throw new Error("ZIP non charge");
  const blob = await response.blob();
  const zip = await JSZip.loadAsync(blob);
  const tables = {};
  for (const [name, file] of Object.entries(tableFiles)) {
    const entry = zip.file(file);
    if (!entry) throw new Error(`table manquante: ${file}`);
    const text = await entry.async("string");
    tables[name] = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
  }
  return tables;
}

function buildModel(t) {
  const dDate = idx(t.dim_date, "sk_date");
  const dClient = idx(t.dim_client, "sk_client");
  const dProduct = idx(t.dim_product, "sk_product");
  const dOrder = idx(t.dim_order, "sk_order");
  const dSupplier = idx(t.dim_supplier, "sk_supplier");
  const dVehicle = idx(t.dim_vehicle, "sk_vehicle");
  const dDriver = idx(t.dim_driver, "sk_driver");
  const dRoute = idx(t.dim_route, "sk_route");
  const dCarrier = idx(t.dim_carrier, "sk_carrier");
  const dWarehouse = idx(t.dim_warehouse, "sk_warehouse");
  const dIncident = idx(t.dim_incident, "sk_incident");
  const dMode = idx(t.dim_transport_mode, "sk_transport_mode");

  const driverName = (d) => d ? `${d.first_name} ${d.last_name}` : "Non renseigne";

  const sales = t.fact_sales.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const c = dClient.get(String(r.sk_client));
    const p = dProduct.get(String(r.sk_product));
    const o = dOrder.get(String(r.sk_order));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      month: dt?.year_month,
      client: c?.client_name,
      product: p?.product_name,
      channel: o?.sales_channel,
      orderStatus: o?.order_status,
      revenue: num(r.revenue_amount),
      cost: num(r.cost_amount),
      margin: num(r.margin_amount),
      marginRate: num(r.margin_rate),
      marginBand: r.margin_band
    };
  });

  const achats = t.fact_purchase.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const s = dSupplier.get(String(r.sk_supplier));
    const p = dProduct.get(String(r.sk_product));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      supplier: s?.supplier_name,
      supplierStatus: s?.status,
      product: p?.product_name,
      amount: num(r.purchase_amount),
      plannedDelay: num(r.planned_delay_days),
      realDelay: num(r.real_delay_days),
      delayGap: num(r.delay_gap_days),
      delayClass: bandDelay(num(r.delay_gap_days))
    };
  });

  const stocks = t.fact_stock.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const p = dProduct.get(String(r.sk_product));
    const w = dWarehouse.get(String(r.sk_warehouse));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      product: p?.product_name,
      warehouse: w?.warehouse_name,
      warehouseType: w?.warehouse_type,
      value: num(r.stock_value_amount),
      theoretical: num(r.stock_theoretical),
      real: num(r.stock_real),
      safety: num(r.safety_stock),
      stockout: num(r.stockout_flag),
      status: r.stock_status
    };
  });

  const livraisons = t.fact_delivery.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const c = dClient.get(String(r.sk_client));
    const d = dDriver.get(String(r.sk_driver));
    const v = dVehicle.get(String(r.sk_vehicle));
    const route = dRoute.get(String(r.sk_route));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      month: dt?.year_month,
      client: c?.client_name,
      driver: driverName(d),
      vehicle: v?.vehicle_id,
      route: route?.route_code,
      delayCategory: r.delay_category,
      delayMinutes: num(r.delay_minutes),
      onTime: num(r.delivered_on_time_flag),
      serviceRate: num(r.service_rate)
    };
  });

  const transport = t.fact_transport.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const route = dRoute.get(String(r.sk_route));
    const v = dVehicle.get(String(r.sk_vehicle));
    const d = dDriver.get(String(r.sk_driver));
    const carrier = dCarrier.get(String(r.sk_carrier));
    const mode = dMode.get(String(r.sk_transport_mode));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      month: dt?.year_month,
      route: route?.route_code,
      routeLabel: route ? `${route.departure_city} -> ${route.arrival_city}` : "Non renseigne",
      vehicle: v?.vehicle_id,
      driver: driverName(d),
      carrier: carrier?.carrier_name,
      mode: mode?.transport_mode,
      distance: num(r.distance_km),
      duration: num(r.duration_hours),
      cost: num(r.transport_cost_amount),
      costPerKm: num(r.transport_cost_per_km),
      fillRate: num(r.fill_rate),
      fillBand: r.fill_rate_band,
      co2: num(r.co2_kg)
    };
  });

  const vehicules = t.fact_maintenance.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const v = dVehicle.get(String(r.sk_vehicle));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      vehicle: v?.vehicle_id,
      vehicleType: v?.vehicle_type,
      vehicleStatus: v?.status,
      maintenanceCost: num(r.maintenance_cost_amount),
      immobilization: num(r.immobilization_hours),
      breakdown: num(r.breakdown_flag),
      consumption: num(v?.avg_consumption_l_100km)
    };
  });

  const fuel = t.fact_fuel.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const v = dVehicle.get(String(r.sk_vehicle));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      vehicle: v?.vehicle_id,
      vehicleType: v?.vehicle_type,
      vehicleStatus: v?.status,
      fuelCost: num(r.fuel_cost_amount),
      liters: num(r.liters),
      consumption: num(r.consumption_l_100km)
    };
  });

  const presence = t.fact_driver_presence.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const d = dDriver.get(String(r.sk_driver));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      driver: driverName(d),
      status: r.attendance_status,
      workedHours: num(r.worked_hours),
      late: num(r.late_flag),
      absence: num(r.absence_flag),
      present: num(r.present_flag),
      experience: num(d?.experience_years),
      experienceBand: bandExperience(num(d?.experience_years))
    };
  });

  const incidents = t.fact_incident.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const i = dIncident.get(String(r.sk_incident));
    const d = dDriver.get(String(r.sk_driver));
    const v = dVehicle.get(String(r.sk_vehicle));
    const route = dRoute.get(String(r.sk_route));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      severity: r.severity_band,
      incidentType: i?.incident_type,
      category: i?.category,
      driver: driverName(d),
      vehicle: v?.vehicle_id,
      route: route?.route_code,
      cost: num(r.incident_cost_amount),
      severityScore: num(r.severity_score),
      resolution: num(r.resolution_hours),
      accident: num(r.accident_flag)
    };
  });

  const satisfaction = t.fact_customer_satisfaction.map((r) => {
    const dt = dDate.get(String(r.sk_date));
    const c = dClient.get(String(r.sk_client));
    return {
      country: dt?.country_code,
      year: String(dt?.year_num),
      client: c?.client_name,
      clientType: c?.client_type,
      sector: c?.sector_activity,
      score: num(r.satisfaction_score),
      band: r.satisfaction_band,
      complaint: num(r.complaint_flag),
      nps: r.nps_class,
      resolution: num(r.resolution_hours)
    };
  });

  return { sales, achats, stocks, livraisons, transport, vehicules, fuel, presence, incidents, satisfaction };
}

function activeSpecs(key) {
  return filterSpecs[key] || filterSpecs.executif;
}

function uniqueOptions(spec) {
  const [, , field, datasets] = spec;
  const vals = new Set();
  for (const name of datasets) {
    for (const row of model[name] || []) {
      const v = row[field];
      if (v !== undefined && v !== null && String(v).trim() !== "") vals.add(String(v));
    }
  }
  return ["ALL", ...[...vals].sort((a, b) => a.localeCompare(b, "fr"))];
}

function renderFilters(key) {
  const container = document.querySelector(".filters");
  container.innerHTML = activeSpecs(key)
    .map(([id, label]) => `<label class="filter-item">${label}<select id="filter-${id}" data-filter-id="${id}"></select></label>`)
    .join("");

  for (const spec of activeSpecs(key)) {
    const [id] = spec;
    const el = document.getElementById(`filter-${id}`);
    el.innerHTML = uniqueOptions(spec).map((v) => `<option value="${v}">${v === "ALL" ? "Tous" : v}</option>`).join("");
  }
}

function getFilters(key) {
  const out = {};
  for (const [id, , field] of activeSpecs(key)) {
    const el = document.getElementById(`filter-${id}`);
    out[field] = el ? el.value : "ALL";
  }
  return out;
}

function applyFilters(rows, filters) {
  return rows.filter((r) => {
    for (const [field, value] of Object.entries(filters)) {
      if (value !== "ALL" && r[field] !== undefined && r[field] !== value) return false;
    }
    return true;
  });
}

function destroyChart(id) {
  if (charts[id]) charts[id].destroy();
}

function stackTotal(chart, dataIndex, axisValueKey) {
  return chart.data.datasets.reduce((total, ds, idx) => {
    const meta = chart.getDatasetMeta(idx);
    if (meta.hidden) return total;
    const raw = ds.data[dataIndex];
    const value = typeof raw === "object" ? raw?.[axisValueKey] : raw;
    return total + (Number(value) || 0);
  }, 0);
}

const percentLabelPlugin = {
  id: "percentLabelPlugin",
  afterDatasetsDraw(chart) {
    if (!["pie", "doughnut"].includes(chart.config.type)) return;
    const dataset = chart.data.datasets[0];
    const values = dataset.data.map((x) => Number(x) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    if (!total) return;

    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 12px Manrope";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 4;

    meta.data.forEach((arc, index) => {
      const ratio = values[index] / total;
      if (ratio < 0.055) return;
      const pos = arc.tooltipPosition();
      ctx.fillText(`${(ratio * 100).toFixed(0)}%`, pos.x, pos.y);
    });
    ctx.restore();
  }
};

function commonOptions(type, options = {}) {
  const valueFormat = options.valueFormat || "number";
  const percentOfStack = Boolean(options.percentOfStack);
  const isCircular = ["pie", "doughnut"].includes(type);

  return {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { boxWidth: 12, font: { family: "Manrope" } } },
      tooltip: {
        mode: isCircular ? "nearest" : "index",
        intersect: isCircular,
        callbacks: {
          label(context) {
            const label = context.label || context.dataset.label || "Valeur";
            const raw = typeof context.raw === "object" ? context.parsed?.y : context.raw;
            const value = Number(raw) || 0;

            if (isCircular) {
              const values = context.dataset.data.map((x) => Number(x) || 0);
              const total = values.reduce((a, b) => a + b, 0);
              const share = total ? (value / total) * 100 : 0;
              return `${label}: ${formatChartValue(value, valueFormat)} (${share.toFixed(1)}%)`;
            }

            if (percentOfStack) {
              const axisValueKey = options.indexAxis === "y" ? "x" : "y";
              const total = stackTotal(context.chart, context.dataIndex, axisValueKey);
              const share = total ? (value / total) * 100 : 0;
              return `${context.dataset.label || label}: ${formatChartValue(value, valueFormat)} (${share.toFixed(1)}%)`;
            }

            if (type === "scatter" || type === "bubble") {
              const rawPoint = context.raw || {};
              if (rawPoint.label) {
                const total = context.dataset.data.reduce((a, p) => a + (Number(p.value) || 0), 0);
                const share = total ? ` (${((Number(rawPoint.value) || 0) / total * 100).toFixed(1)}%)` : "";
                return `${rawPoint.label}: ${formatChartValue(rawPoint.value, valueFormat)}${share}`;
              }
              return `${context.dataset.label || "Point"}: x=${decimal(context.raw.x)}, y=${decimal(context.raw.y)}`;
            }

            return `${context.dataset.label || label}: ${formatChartValue(value, valueFormat)}`;
          }
        }
      }
    },
    scales: options.scales || undefined,
    ...options
  };
}

function drawChart(canvasId, type, labels, datasets, options = {}) {
  destroyChart(canvasId);
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type,
    data: { labels, datasets },
    options: commonOptions(type, options),
    plugins: ["pie", "doughnut"].includes(type) ? [percentLabelPlugin] : []
  });
}

function aggregateGeo(rows, keyFn, latFn, lonFn, valueFn, labelFn) {
  const buckets = new Map();
  for (const row of rows) {
    const lat = Number(latFn(row));
    const lon = Number(lonFn(row));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = keyFn(row);
    const current = buckets.get(key) || { label: labelFn(row), country: row.country, lat, lon, value: 0, n: 0 };
    current.value += valueFn(row);
    current.lat = (current.lat * current.n + lat) / (current.n + 1);
    current.lon = (current.lon * current.n + lon) / (current.n + 1);
    current.n += 1;
    buckets.set(key, current);
  }
  return [...buckets.values()];
}

function drawGeoMap(canvasId, points, label, valueFormat = "number") {
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const data = points.map((p) => ({
    x: p.lon,
    y: p.lat,
    r: 5 + Math.sqrt(Math.max(p.value, 0) / maxValue) * 18,
    label: p.label,
    country: p.country,
    value: p.value
  }));

  drawChart(canvasId, "bubble", [], [{
    label,
    data,
    backgroundColor: "rgba(15,118,110,.45)",
    borderColor: palette.green,
    borderWidth: 1.5
  }], {
    valueFormat,
    plugins: {
      legend: { display: false },
      tooltip: commonOptions("bubble", { valueFormat }).plugins.tooltip
    },
    scales: {
      x: {
        min: -10,
        max: 16,
        grid: { color: "rgba(84,102,99,.12)" },
        ticks: { display: false },
        title: { display: true, text: "Ouest -> Est" }
      },
      y: {
        min: 35,
        max: 56,
        grid: { color: "rgba(84,102,99,.12)" },
        ticks: { display: false },
        title: { display: true, text: "Sud -> Nord" }
      }
    }
  });
}

function drawGauge(canvasId, value, target, label) {
  const ratio = Math.max(0, Math.min(value / target, 1));
  const color = ratio >= 0.95 ? palette.green2 : ratio >= 0.85 ? palette.amber : palette.red;
  destroyChart(canvasId);
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: "doughnut",
    data: {
      labels: [label, "Ecart"],
      datasets: [{ data: [ratio, 1 - ratio], backgroundColor: [color, "#e5e7eb"], borderWidth: 0 }]
    },
    options: {
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: () => `${label}: ${(value * 100).toFixed(1)}% / cible ${(target * 100).toFixed(0)}%` } }
      }
    },
    plugins: [{
      id: "centerText",
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = "700 26px Manrope";
        ctx.textAlign = "center";
        ctx.fillText(`${(value * 100).toFixed(1)}%`, (chartArea.left + chartArea.right) / 2, chartArea.bottom - 26);
        ctx.fillStyle = "#546663";
        ctx.font = "600 12px Manrope";
        ctx.fillText(label, (chartArea.left + chartArea.right) / 2, chartArea.bottom - 6);
        ctx.restore();
      }
    }]
  });
}

function kpiCard(label, value, status = "neutral") {
  return `<article class="panel kpi ${status}"><p>${label}</p><h2>${value}</h2></article>`;
}

function chartCard(id, title, description, wide = false) {
  return `<section class="panel chart-card ${wide ? "wide" : ""}"><div class="chart-head"><h3>${title}</h3><p>${description}</p></div><canvas id="${id}"></canvas></section>`;
}

function renderLayout(kpis, chartsSpec) {
  document.getElementById("kpiGrid").innerHTML = kpis.map((k) => kpiCard(k[0], k[1], k[2])).join("");
  document.getElementById("chartGrid").innerHTML = chartsSpec.map((c) => chartCard(c[0], c[1], c[2], c[3])).join("");
}

function stackedCountryCategory(canvasId, rows, categoryField, titleColors) {
  const countries = [...new Set(rows.map((x) => x.country || "NA"))].sort();
  const cats = [...new Set(rows.map((x) => x[categoryField] || "Non renseigne"))].sort();
  const colors = titleColors || [palette.green, palette.amber, palette.red, palette.blue, palette.purple, palette.slate];
  const datasets = cats.map((cat, i) => ({
    label: cat,
    data: countries.map((c) => rows.filter((r) => (r.country || "NA") === c && (r[categoryField] || "Non renseigne") === cat).length),
    backgroundColor: colors[i % colors.length]
  }));
  drawChart(canvasId, "bar", countries, datasets, { percentOfStack: true, scales: { x: { stacked: true }, y: { stacked: true } } });
}

function renderExecutif(filters) {
  const sales = applyFilters(model.sales, filters);
  const liv = applyFilters(model.livraisons, filters);
  const tr = applyFilters(model.transport, filters);
  const stock = applyFilters(model.stocks, filters);
  const sat = applyFilters(model.satisfaction, filters);
  const marginRate = avg(sales, (x) => x.marginRate);
  const onTime = avg(liv, (x) => x.onTime);
  const stockout = avg(stock, (x) => x.stockout);
  const satScore = avg(sat, (x) => x.score);

  renderLayout([
    ["CA total", euro(sum(sales, (x) => x.revenue)), "good"],
    ["Marge %", pct(marginRate), marginRate >= 0.25 ? "good" : marginRate >= 0.15 ? "warn" : "bad"],
    ["Service a temps", pct(onTime), onTime >= 0.92 ? "good" : onTime >= 0.85 ? "warn" : "bad"],
    ["Rupture stock", pct(stockout), stockout <= 0.05 ? "good" : stockout <= 0.12 ? "warn" : "bad"],
    ["Satisfaction", satScore.toFixed(2), satScore >= 4 ? "good" : satScore >= 3.5 ? "warn" : "bad"]
  ], [
    ["exGauge", "Jauge service livraison", "Couleur dynamique selon l'atteinte de la cible de ponctualite."],
    ["exRevenueMargin", "CA et marge par mois", "Lecture finance combinee: activite et rentabilite dans le temps.", true],
    ["exGeo", "Performance par pays", "Comparaison pays sur CA, cout transport et incidents."],
    ["exStack", "Retards empiles par pays", "Vue operationnelle des categories de retard par zone geographique."],
    ["exNps", "Mix NPS", "Structure de satisfaction: promoters, passives et detractors."]
  ]);

  drawGauge("exGauge", onTime, 0.95, "On time");
  const rev = group(sales, (x) => x.month, (x) => x.revenue);
  const mar = group(sales, (x) => x.month, (x) => x.margin);
  const months = [...new Set([...rev.keys(), ...mar.keys()])].sort();
  drawChart("exRevenueMargin", "line", months, [
    { label: "CA", data: months.map((m) => rev.get(m) || 0), borderColor: palette.green, backgroundColor: "rgba(15,118,110,.16)", fill: true, tension: 0.25 },
    { label: "Marge", data: months.map((m) => mar.get(m) || 0), borderColor: palette.orange, backgroundColor: "rgba(217,119,6,.12)", fill: true, tension: 0.25 }
  ]);
  const countries = [...new Set(sales.map((x) => x.country))].sort();
  const trCountry = group(tr, (x) => x.country, (x) => x.cost);
  drawChart("exGeo", "bar", countries, [
    { label: "CA", data: countries.map((c) => group(sales, (x) => x.country, (x) => x.revenue).get(c) || 0), backgroundColor: palette.green },
    { label: "Cout transport", data: countries.map((c) => trCountry.get(c) || 0), backgroundColor: palette.orange }
  ]);
  stackedCountryCategory("exStack", liv, "delayCategory");
  const nps = group(sat, (x) => x.nps);
  drawChart("exNps", "pie", [...nps.keys()], [{ data: [...nps.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }]);
}

function renderVentes(filters) {
  const s = applyFilters(model.sales, filters);
  renderLayout([
    ["CA", euro(sum(s, (x) => x.revenue)), "good"],
    ["Marge", euro(sum(s, (x) => x.margin)), "good"],
    ["Marge %", pct(avg(s, (x) => x.marginRate)), avg(s, (x) => x.marginRate) >= 0.25 ? "good" : "warn"],
    ["Lignes", String(s.length), "neutral"]
  ], [
    ["veTopClients", "Top clients CA", "Identifier les clients qui portent l'activite commerciale."],
    ["veProducts", "CA et marge par produit", "Comparer volume de vente et rentabilite par produit.", true],
    ["veChannel", "Canal de vente", "Repartition commerciale par canal."],
    ["veMargin", "Segments de marge", "Classification des lignes en high, medium, low ou loss."],
    ["veGeo", "CA par pays", "Vue geographique commerciale."]
  ]);
  const clients = topEntries(group(s, (x) => x.client, (x) => x.revenue), 8);
  drawChart("veTopClients", "bar", clients.map((x) => x[0]), [{ label: "CA", data: clients.map((x) => x[1]), backgroundColor: palette.green }], { indexAxis: "y" });
  const products = [...group(s, (x) => x.product).keys()].sort();
  drawChart("veProducts", "bar", products, [
    { label: "CA", data: products.map((p) => group(s, (x) => x.product, (x) => x.revenue).get(p) || 0), backgroundColor: palette.green },
    { label: "Marge", data: products.map((p) => group(s, (x) => x.product, (x) => x.margin).get(p) || 0), backgroundColor: palette.orange }
  ]);
  const channel = group(s, (x) => x.channel);
  drawChart("veChannel", "doughnut", [...channel.keys()], [{ data: [...channel.values()], backgroundColor: [palette.green, palette.blue, palette.orange, palette.purple] }]);
  const margin = group(s, (x) => x.marginBand);
  drawChart("veMargin", "bar", [...margin.keys()], [{ data: [...margin.values()], backgroundColor: [palette.red, palette.amber, palette.green, palette.green2] }]);
  const geo = group(s, (x) => x.country, (x) => x.revenue);
  drawChart("veGeo", "bar", [...geo.keys()], [{ label: "CA", data: [...geo.values()], backgroundColor: palette.blue }]);
}

function renderAchats(filters) {
  const a = applyFilters(model.achats, filters);
  const delayGap = avg(a, (x) => x.delayGap);
  renderLayout([
    ["Cout achats", euro(sum(a, (x) => x.amount)), "neutral"],
    ["Delai reel moyen", `${avg(a, (x) => x.realDelay).toFixed(1)} j`, "neutral"],
    ["Ecart delai", `${delayGap.toFixed(1)} j`, delayGap <= 0 ? "good" : delayGap <= 1 ? "warn" : "bad"],
    ["Fournisseurs", String(new Set(a.map((x) => x.supplier)).size), "neutral"]
  ], [
    ["acSupplier", "Cout par fournisseur", "Concentration des depenses par partenaire achat."],
    ["acDelayGauge", "Jauge respect delai", "Part des achats livres sans depassement du delai planifie."],
    ["acProduct", "Cout par produit", "Produits qui mobilisent le plus de budget achat."],
    ["acDelayClass", "Classification des delais", "IF/SWITCH metier: en avance, 0-1 jour, 1-2 jours, plus de 2 jours."],
    ["acCountry", "Achats par pays", "Lecture geographique du poids achat."]
  ]);
  const sup = topEntries(group(a, (x) => x.supplier, (x) => x.amount), 8);
  drawChart("acSupplier", "bar", sup.map((x) => x[0]), [{ data: sup.map((x) => x[1]), backgroundColor: palette.green }], { indexAxis: "y" });
  drawGauge("acDelayGauge", a.length ? a.filter((x) => x.delayGap <= 0).length / a.length : 0, 0.9, "Respect delai");
  const prod = group(a, (x) => x.product, (x) => x.amount);
  drawChart("acProduct", "bar", [...prod.keys()], [{ data: [...prod.values()], backgroundColor: palette.orange }]);
  const delay = group(a, (x) => x.delayClass);
  drawChart("acDelayClass", "doughnut", [...delay.keys()], [{ data: [...delay.values()], backgroundColor: [palette.green2, palette.amber, palette.orange, palette.red] }]);
  const geo = group(a, (x) => x.country, (x) => x.amount);
  drawChart("acCountry", "bar", [...geo.keys()], [{ data: [...geo.values()], backgroundColor: palette.blue }]);
}

function renderStocks(filters) {
  const s = applyFilters(model.stocks, filters);
  const stockout = avg(s, (x) => x.stockout);
  renderLayout([
    ["Valeur stock", euro(sum(s, (x) => x.value)), "neutral"],
    ["Rupture", pct(stockout), stockout <= 0.05 ? "good" : stockout <= 0.12 ? "warn" : "bad"],
    ["Ecart stock", compact(sum(s, (x) => x.real - x.theoretical)), "neutral"],
    ["Entrepots", String(new Set(s.map((x) => x.warehouse)).size), "neutral"]
  ], [
    ["stGauge", "Jauge disponibilite stock", "Couleur dynamique selon le niveau hors rupture."],
    ["stStatus", "Statut stock", "Repartition des stocks normaux, faibles ou critiques."],
    ["stWarehouse", "Valeur par entrepot", "Entrepots avec la plus forte valeur immobilisee.", true],
    ["stProduct", "Valeur par produit", "Produits qui concentrent le stock."],
    ["stGeo", "Ruptures par pays", "Nombre de ruptures par zone geographique."]
  ]);
  drawGauge("stGauge", 1 - stockout, 0.95, "Disponibilite");
  const status = group(s, (x) => x.status);
  drawChart("stStatus", "doughnut", [...status.keys()], [{ data: [...status.values()], backgroundColor: [palette.green2, palette.amber, palette.red, palette.blue] }]);
  const wh = topEntries(group(s, (x) => x.warehouse, (x) => x.value), 9);
  drawChart("stWarehouse", "bar", wh.map((x) => x[0]), [{ data: wh.map((x) => x[1]), backgroundColor: palette.green }], { indexAxis: "y" });
  const prod = group(s, (x) => x.product, (x) => x.value);
  drawChart("stProduct", "bar", [...prod.keys()], [{ data: [...prod.values()], backgroundColor: palette.orange }]);
  const geo = group(s, (x) => x.country, (x) => x.stockout);
  drawChart("stGeo", "bar", [...geo.keys()], [{ data: [...geo.values()], backgroundColor: palette.red }]);
}

function renderLivraisons(filters) {
  const l = applyFilters(model.livraisons, filters);
  const onTime = avg(l, (x) => x.onTime);
  renderLayout([
    ["Livraisons", String(l.length), "neutral"],
    ["A temps", pct(onTime), onTime >= 0.92 ? "good" : onTime >= 0.85 ? "warn" : "bad"],
    ["Service moyen", pct(avg(l, (x) => x.serviceRate)), "neutral"],
    ["Retard moyen", `${avg(l, (x) => x.delayMinutes).toFixed(0)} min`, "neutral"]
  ], [
    ["liGauge", "Jauge on time", "Suivi de la cible de ponctualite."],
    ["liStack", "Retards empiles par pays", "Diagramme empile pour comparer la composition des retards."],
    ["liTrend", "Service mensuel", "Evolution du niveau de service dans le temps.", true],
    ["liClients", "Clients les moins servis", "Clients avec le taux on time le plus faible."],
    ["liDrivers", "Performance chauffeurs", "Taux de ponctualite moyen par chauffeur."]
  ]);
  drawGauge("liGauge", onTime, 0.95, "On time");
  stackedCountryCategory("liStack", l, "delayCategory");
  const trend = avgGroup(l, (x) => x.month, (x) => x.serviceRate);
  const months = [...trend.keys()].sort();
  drawChart("liTrend", "line", months, [{ data: months.map((m) => trend.get(m) * 100), borderColor: palette.blue, backgroundColor: "rgba(14,165,233,.18)", fill: true, tension: 0.25 }]);
  const clients = topEntries(avgGroup(l, (x) => x.client, (x) => x.onTime), 8, false);
  drawChart("liClients", "bar", clients.map((x) => x[0]), [{ data: clients.map((x) => x[1] * 100), backgroundColor: palette.red }], { indexAxis: "y" });
  const drivers = topEntries(avgGroup(l, (x) => x.driver, (x) => x.onTime), 8);
  drawChart("liDrivers", "bar", drivers.map((x) => x[0]), [{ data: drivers.map((x) => x[1] * 100), backgroundColor: palette.green }], { indexAxis: "y" });
}

function renderTransport(filters) {
  const t = applyFilters(model.transport, filters);
  const fill = avg(t, (x) => x.fillRate);
  renderLayout([
    ["Cout transport", euro(sum(t, (x) => x.cost)), "neutral"],
    ["Distance", `${compact(sum(t, (x) => x.distance))} km`, "neutral"],
    ["Cout/km", (sum(t, (x) => x.cost) / Math.max(sum(t, (x) => x.distance), 1)).toFixed(2), "neutral"],
    ["Fill rate", pct(fill), fill >= 0.80 ? "good" : fill >= 0.65 ? "warn" : "bad"],
    ["CO2", `${compact(sum(t, (x) => x.co2))} kg`, "neutral"]
  ], [
    ["trGauge", "Jauge remplissage", "Mesure l'utilisation de capacite transport."],
    ["trScatter", "Cout/km vs distance", "Nuage de points pour detecter les trajets atypiques.", true],
    ["trCarrier", "Cout par transporteur", "Transporteurs les plus couteux."],
    ["trFill", "Segments de remplissage", "Classification du fill rate."],
    ["trCo2", "CO2 par pays", "Impact environnemental par pays."]
  ]);
  drawGauge("trGauge", fill, 0.85, "Fill rate");
  drawChart("trScatter", "scatter", [], [{ data: t.slice(0, 800).map((x) => ({ x: x.distance, y: x.costPerKm })), backgroundColor: "rgba(217,119,6,.65)" }], { scales: { x: { title: { display: true, text: "Distance km" } }, y: { title: { display: true, text: "Cout/km" } } } });
  const carrier = topEntries(group(t, (x) => x.carrier, (x) => x.cost), 8);
  drawChart("trCarrier", "bar", carrier.map((x) => x[0]), [{ data: carrier.map((x) => x[1]), backgroundColor: palette.green }], { indexAxis: "y" });
  const fillBand = group(t, (x) => x.fillBand);
  drawChart("trFill", "doughnut", [...fillBand.keys()], [{ data: [...fillBand.values()], backgroundColor: [palette.red, palette.amber, palette.green2] }]);
  const co2 = group(t, (x) => x.country, (x) => x.co2);
  drawChart("trCo2", "bar", [...co2.keys()], [{ data: [...co2.values()], backgroundColor: palette.slate }]);
}

function renderVehicules(filters) {
  const v = applyFilters(model.vehicules, filters);
  const fuel = applyFilters(model.fuel, filters);
  const breakdown = avg(v, (x) => x.breakdown);
  renderLayout([
    ["Maintenance", euro(sum(v, (x) => x.maintenanceCost)), "neutral"],
    ["Carburant", euro(sum(fuel, (x) => x.fuelCost)), "neutral"],
    ["Taux pannes", pct(breakdown), breakdown <= 0.05 ? "good" : breakdown <= 0.12 ? "warn" : "bad"],
    ["Immobilisation", `${compact(sum(v, (x) => x.immobilization))} h`, "neutral"]
  ], [
    ["vhGauge", "Jauge fiabilite flotte", "Part des lignes sans panne par rapport a la cible."],
    ["vhMaint", "Maintenance par vehicule", "Vehicules qui generent le plus de maintenance."],
    ["vhFuel", "Carburant par vehicule", "Comparaison des couts carburant."],
    ["vhType", "Cout par type vehicule", "Vue par typologie de flotte."],
    ["vhImmobilization", "Immobilisation par vehicule", "Disponibilite reduite par vehicule."]
  ]);
  drawGauge("vhGauge", 1 - breakdown, 0.95, "Fiabilite");
  const maint = topEntries(group(v, (x) => x.vehicle, (x) => x.maintenanceCost), 8);
  drawChart("vhMaint", "bar", maint.map((x) => x[0]), [{ data: maint.map((x) => x[1]), backgroundColor: palette.green }], { indexAxis: "y" });
  const fuelCost = topEntries(group(fuel, (x) => x.vehicle, (x) => x.fuelCost), 8);
  drawChart("vhFuel", "bar", fuelCost.map((x) => x[0]), [{ data: fuelCost.map((x) => x[1]), backgroundColor: palette.orange }]);
  const typeCost = group(v, (x) => x.vehicleType, (x) => x.maintenanceCost);
  drawChart("vhType", "doughnut", [...typeCost.keys()], [{ data: [...typeCost.values()], backgroundColor: [palette.green, palette.blue, palette.orange, palette.purple] }], { valueFormat: "currency" });
  const imm = topEntries(group(v, (x) => x.vehicle, (x) => x.immobilization), 8);
  drawChart("vhImmobilization", "bar", imm.map((x) => x[0]), [{ data: imm.map((x) => x[1]), backgroundColor: palette.red }], { indexAxis: "y" });
}

function renderRH(filters) {
  const r = applyFilters(model.presence, filters);
  const late = avg(r, (x) => x.late);
  const present = avg(r, (x) => x.present);
  renderLayout([
    ["Heures", compact(sum(r, (x) => x.workedHours)), "neutral"],
    ["Presence", pct(present), present >= 0.94 ? "good" : present >= 0.88 ? "warn" : "bad"],
    ["Retards", pct(late), late <= 0.05 ? "good" : late <= 0.12 ? "warn" : "bad"],
    ["Experience", `${avg(r, (x) => x.experience).toFixed(1)} ans`, "neutral"]
  ], [
    ["rhGauge", "Jauge presence", "Taux de presence par rapport a la cible RH."],
    ["rhStatus", "Statut presence", "Camembert des presences, retards et absences."],
    ["rhCountry", "Heures par pays", "Volume RH mobilise par pays."],
    ["rhDrivers", "Chauffeurs avec plus de retards", "Classement des chauffeurs a surveiller."],
    ["rhExperience", "Experience chauffeurs", "Distribution des chauffeurs par anciennete."]
  ]);
  drawGauge("rhGauge", present, 0.95, "Presence");
  const status = group(r, (x) => x.status);
  drawChart("rhStatus", "pie", [...status.keys()], [{ data: [...status.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }]);
  const hours = group(r, (x) => x.country, (x) => x.workedHours);
  drawChart("rhCountry", "bar", [...hours.keys()], [{ data: [...hours.values()], backgroundColor: palette.green }]);
  const lateDrivers = topEntries(avgGroup(r, (x) => x.driver, (x) => x.late), 8);
  drawChart("rhDrivers", "bar", lateDrivers.map((x) => x[0]), [{ data: lateDrivers.map((x) => x[1] * 100), backgroundColor: palette.red }], { indexAxis: "y" });
  const exp = group(r, (x) => x.experienceBand);
  drawChart("rhExperience", "bar", [...exp.keys()], [{ data: [...exp.values()], backgroundColor: palette.blue }]);
}

function renderIncidents(filters) {
  const i = applyFilters(model.incidents, filters);
  const accident = avg(i, (x) => x.accident);
  renderLayout([
    ["Incidents", String(i.length), "neutral"],
    ["Cout", euro(sum(i, (x) => x.cost)), "bad"],
    ["Resolution", `${avg(i, (x) => x.resolution).toFixed(1)} h`, "neutral"],
    ["Accidents", pct(accident), accident <= 0.04 ? "good" : accident <= 0.10 ? "warn" : "bad"]
  ], [
    ["inGauge", "Jauge risque accident", "Couleur dynamique selon la part d'evenements sans accident."],
    ["inSeverity", "Gravite incidents", "Repartition par niveau de gravite."],
    ["inStack", "Gravite empilee par pays", "Diagramme empile pour localiser le risque."],
    ["inCost", "Cout par type incident", "Types d'incidents les plus couteux."],
    ["inResolution", "Resolution par gravite", "Temps moyen de resolution par niveau."]
  ]);
  drawGauge("inGauge", 1 - accident, 0.95, "Sans accident");
  const sev = group(i, (x) => x.severity);
  drawChart("inSeverity", "doughnut", [...sev.keys()], [{ data: [...sev.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }]);
  stackedCountryCategory("inStack", i, "severity");
  const cost = topEntries(group(i, (x) => x.incidentType, (x) => x.cost), 8);
  drawChart("inCost", "bar", cost.map((x) => x[0]), [{ data: cost.map((x) => x[1]), backgroundColor: palette.red }], { indexAxis: "y" });
  const res = avgGroup(i, (x) => x.severity, (x) => x.resolution);
  drawChart("inResolution", "bar", [...res.keys()], [{ data: [...res.values()], backgroundColor: palette.blue }]);
}

function renderSatisfaction(filters) {
  const s = applyFilters(model.satisfaction, filters);
  const score = avg(s, (x) => x.score);
  const complaint = avg(s, (x) => x.complaint);
  const promoter = s.length ? s.filter((x) => x.nps === "Promoter").length / s.length : 0;
  renderLayout([
    ["Score moyen", score.toFixed(2), score >= 4 ? "good" : score >= 3.5 ? "warn" : "bad"],
    ["Reclamations", pct(complaint), complaint <= 0.05 ? "good" : complaint <= 0.12 ? "warn" : "bad"],
    ["Promoters", pct(promoter), promoter >= 0.50 ? "good" : promoter >= 0.35 ? "warn" : "bad"],
    ["Evaluations", String(s.length), "neutral"]
  ], [
    ["saGauge", "Jauge satisfaction", "Score client rapporte a une cible de 4/5."],
    ["saNps", "NPS mix", "Promoters, passives et detractors."],
    ["saBand", "Segments satisfaction", "Classification qualitative des notes."],
    ["saGeo", "Score par pays", "Comparaison geographique de l'experience client."],
    ["saComplaints", "Reclamations par client", "Clients avec les taux de reclamation les plus eleves."]
  ]);
  drawGauge("saGauge", score / 5, 0.8, "Score");
  const nps = group(s, (x) => x.nps);
  drawChart("saNps", "pie", [...nps.keys()], [{ data: [...nps.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }]);
  const band = group(s, (x) => x.band);
  drawChart("saBand", "doughnut", [...band.keys()], [{ data: [...band.values()], backgroundColor: [palette.red, palette.amber, palette.blue, palette.green2] }]);
  const geo = avgGroup(s, (x) => x.country, (x) => x.score);
  drawChart("saGeo", "bar", [...geo.keys()], [{ data: [...geo.values()], backgroundColor: palette.green }]);
  const complaints = topEntries(avgGroup(s, (x) => x.client, (x) => x.complaint), 8);
  drawChart("saComplaints", "bar", complaints.map((x) => x[0]), [{ data: complaints.map((x) => x[1] * 100), backgroundColor: palette.red }], { indexAxis: "y" });
}

function routeRender(filters, key) {
  const map = {
    executif: renderExecutif,
    ventes: renderVentes,
    achats: renderAchats,
    stocks: renderStocks,
    livraisons: renderLivraisons,
    transport: renderTransport,
    vehicules: renderVehicules,
    rh: renderRH,
    incidents: renderIncidents,
    satisfaction: renderSatisfaction
  };
  (map[key] || renderExecutif)(filters);
}

function setupNav(activeKey) {
  const select = document.getElementById("dashboardSelect");
  if (select) {
    select.innerHTML = Object.entries(dashboardCatalog)
      .map(([k, v]) => `<option value="dashboard-${k}.html" ${k === activeKey ? "selected" : ""}>${v}</option>`)
      .join("");
    select.addEventListener("change", (e) => { window.location.href = e.target.value; });
  }
}

async function init() {
  const key = document.body.dataset.dashboard || "executif";
  document.getElementById("dashboardTitle").textContent = dashboardCatalog[key] || dashboardCatalog.executif;
  const subtitle = document.getElementById("dashboardSubtitle");
  if (subtitle) subtitle.textContent = dashboardSubtitles[key] || dashboardSubtitles.executif;
  setupNav(key);

  const tables = await loadZipTables();
  model = buildModel(tables);
  renderFilters(key);

  const refresh = () => routeRender(getFilters(key), key);
  document.querySelectorAll("[data-filter-id]").forEach((el) => el.addEventListener("change", refresh));
  refresh();
}

init().catch((err) => {
  alert(`Erreur: ${err.message}. Lance le site via un serveur local.`);
});
