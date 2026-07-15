import JSZip from 'jszip';
import Papa from 'papaparse';

const DATA_VERSION = 'realistic-20260701-2115';
const ZIP_PATH = `/data/logistics_exports.zip?v=${DATA_VERSION}`;

const tableFiles = {
  dim_date: 'dim_date.csv',
  dim_client: 'dim_client.csv',
  dim_product: 'dim_product.csv',
  dim_order: 'dim_order.csv',
  dim_supplier: 'dim_supplier.csv',
  dim_vehicle: 'dim_vehicle.csv',
  dim_driver: 'dim_driver.csv',
  dim_route: 'dim_route.csv',
  dim_carrier: 'dim_carrier.csv',
  dim_warehouse: 'dim_warehouse.csv',
  dim_incident: 'dim_incident.csv',
  dim_transport_mode: 'dim_transport_mode.csv',
  dim_employee: 'dim_employee.csv',
  fact_sales: 'fact_sales.csv',
  fact_purchase: 'fact_purchase.csv',
  fact_delivery: 'fact_delivery.csv',
  fact_transport: 'fact_transport.csv',
  fact_stock: 'fact_stock.csv',
  fact_driver_presence: 'fact_driver_presence.csv',
  fact_incident: 'fact_incident.csv',
  fact_maintenance: 'fact_maintenance.csv',
  fact_fuel: 'fact_fuel.csv',
  fact_customer_satisfaction: 'fact_customer_satisfaction.csv',
};

export const dashboardCatalog = {
  executif: 'Dashboard Executif',
  ventes: 'Dashboard Ventes',
  achats: 'Dashboard Achats',
  stocks: 'Dashboard Stocks',
  livraisons: 'Dashboard Livraisons',
  transport: 'Dashboard Transport',
  vehicules: 'Dashboard Vehicules',
  rh: 'Dashboard RH Chauffeurs',
  incidents: 'Dashboard Incidents',
  satisfaction: 'Dashboard Satisfaction',
};

export const dashboardSubtitles = {
  executif: "Pilotage global avec alertes finance, service, stock, transport et experience client.",
  ventes: "Analyse commerciale par client, produit, canal, pays et niveau de marge.",
  achats: "Controle des fournisseurs, couts d'approvisionnement et delais reels vs planifies.",
  stocks: "Risque de rupture, valeur immobilisee, entrepots et statuts de stock.",
  livraisons: "Ponctualite, categories de retard, chauffeurs, vehicules et clients servis.",
  transport: "Couts, distance, remplissage, transporteurs, routes et impact CO2.",
  vehicules: "Flotte, maintenance, carburant, pannes, immobilisation et efficacite vehicule.",
  rh: "Presence chauffeurs, retards, heures travaillees, experience et disponibilite.",
  incidents: "Risque operationnel par gravite, type d'incident, pays, route et vehicule.",
  satisfaction: "NPS, reclamations, satisfaction par pays, client et segment de note.",
};

export const filterSpecs = {
  executif: [
    ['country', 'Pays', 'country', ['sales', 'livraisons', 'transport', 'stocks', 'satisfaction']],
    ['year', 'Annee', 'year', ['sales', 'livraisons', 'transport', 'stocks', 'satisfaction']],
    ['marginBand', 'Segment marge', 'marginBand', ['sales']],
    ['nps', 'Classe NPS', 'nps', ['satisfaction']],
  ],
  ventes: [
    ['country', 'Pays', 'country', ['sales']],
    ['year', 'Annee', 'year', ['sales']],
    ['client', 'Client', 'client', ['sales']],
    ['product', 'Produit', 'product', ['sales']],
    ['channel', 'Canal', 'channel', ['sales']],
    ['marginBand', 'Segment marge', 'marginBand', ['sales']],
  ],
  achats: [
    ['country', 'Pays', 'country', ['achats']],
    ['year', 'Annee', 'year', ['achats']],
    ['supplier', 'Fournisseur', 'supplier', ['achats']],
    ['product', 'Produit', 'product', ['achats']],
    ['delayClass', 'Etat delai', 'delayClass', ['achats']],
  ],
  stocks: [
    ['country', 'Pays', 'country', ['stocks']],
    ['year', 'Annee', 'year', ['stocks']],
    ['warehouse', 'Entrepot', 'warehouse', ['stocks']],
    ['product', 'Produit', 'product', ['stocks']],
    ['status', 'Statut stock', 'status', ['stocks']],
  ],
  livraisons: [
    ['country', 'Pays', 'country', ['livraisons']],
    ['year', 'Annee', 'year', ['livraisons']],
    ['client', 'Client', 'client', ['livraisons']],
    ['driver', 'Chauffeur', 'driver', ['livraisons']],
    ['vehicle', 'Vehicule', 'vehicle', ['livraisons']],
    ['delayCategory', 'Categorie retard', 'delayCategory', ['livraisons']],
  ],
  transport: [
    ['country', 'Pays', 'country', ['transport']],
    ['year', 'Annee', 'year', ['transport']],
    ['route', 'Route', 'route', ['transport']],
    ['carrier', 'Transporteur', 'carrier', ['transport']],
    ['mode', 'Mode', 'mode', ['transport']],
    ['fillBand', 'Remplissage', 'fillBand', ['transport']],
  ],
  vehicules: [
    ['country', 'Pays', 'country', ['vehicules', 'fuel']],
    ['year', 'Annee', 'year', ['vehicules', 'fuel']],
    ['vehicle', 'Vehicule', 'vehicle', ['vehicules', 'fuel']],
    ['vehicleType', 'Type vehicule', 'vehicleType', ['vehicules', 'fuel']],
    ['vehicleStatus', 'Statut vehicule', 'vehicleStatus', ['vehicules', 'fuel']],
  ],
  rh: [
    ['country', 'Pays', 'country', ['presence']],
    ['year', 'Annee', 'year', ['presence']],
    ['driver', 'Chauffeur', 'driver', ['presence']],
    ['status', 'Statut presence', 'status', ['presence']],
    ['experienceBand', 'Experience', 'experienceBand', ['presence']],
  ],
  incidents: [
    ['country', 'Pays', 'country', ['incidents']],
    ['year', 'Annee', 'year', ['incidents']],
    ['severity', 'Gravite', 'severity', ['incidents']],
    ['incidentType', 'Type incident', 'incidentType', ['incidents']],
    ['route', 'Route', 'route', ['incidents']],
    ['vehicle', 'Vehicule', 'vehicle', ['incidents']],
  ],
  satisfaction: [
    ['country', 'Pays', 'country', ['satisfaction']],
    ['year', 'Annee', 'year', ['satisfaction']],
    ['client', 'Client', 'client', ['satisfaction']],
    ['nps', 'Classe NPS', 'nps', ['satisfaction']],
    ['band', 'Segment satisfaction', 'band', ['satisfaction']],
  ],
};

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function sum(arr, fn) {
  return arr.reduce((a, x) => a + fn(x), 0);
}

export function avg(arr, fn) {
  return arr.length ? sum(arr, fn) / arr.length : 0;
}

export function group(rows, keyFn, valFn = () => 1) {
  const out = new Map();
  for (const r of rows) {
    const k = keyFn(r) || 'Non renseigne';
    out.set(k, (out.get(k) || 0) + valFn(r));
  }
  return out;
}

export function avgGroup(rows, keyFn, valFn) {
  const bucket = new Map();
  for (const r of rows) {
    const k = keyFn(r) || 'Non renseigne';
    const v = bucket.get(k) || { t: 0, n: 0 };
    v.t += valFn(r);
    v.n += 1;
    bucket.set(k, v);
  }
  return new Map([...bucket.entries()].map(([k, v]) => [k, v.n ? v.t / v.n : 0]));
}

export function topEntries(map, n = 8, desc = true) {
  return [...map.entries()].sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1])).slice(0, n);
}

function idx(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(String(r[key]), r);
  return m;
}

function bandDelay(v) {
  if (v <= 0) return 'En avance';
  if (v <= 1) return '0-1 jour';
  if (v <= 2) return '1-2 jours';
  return '> 2 jours';
}

function bandExperience(v) {
  if (v < 5) return '0-4 ans';
  if (v < 10) return '5-9 ans';
  if (v < 15) return '10-14 ans';
  return '15+ ans';
}

export async function loadZipTables() {
  const response = await fetch(ZIP_PATH);
  if (!response.ok) throw new Error('ZIP non charge');
  const blob = await response.blob();
  const zip = await JSZip.loadAsync(blob);
  const tables = {};
  for (const [name, file] of Object.entries(tableFiles)) {
    const entry = zip.file(file);
    if (!entry) throw new Error(`table manquante: ${file}`);
    const text = await entry.async('string');
    tables[name] = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
  }
  return tables;
}

export function buildModel(t) {
  const dDate = idx(t.dim_date, 'sk_date');
  const dClient = idx(t.dim_client, 'sk_client');
  const dProduct = idx(t.dim_product, 'sk_product');
  const dOrder = idx(t.dim_order, 'sk_order');
  const dSupplier = idx(t.dim_supplier, 'sk_supplier');
  const dVehicle = idx(t.dim_vehicle, 'sk_vehicle');
  const dDriver = idx(t.dim_driver, 'sk_driver');
  const dRoute = idx(t.dim_route, 'sk_route');
  const dCarrier = idx(t.dim_carrier, 'sk_carrier');
  const dWarehouse = idx(t.dim_warehouse, 'sk_warehouse');
  const dIncident = idx(t.dim_incident, 'sk_incident');
  const dMode = idx(t.dim_transport_mode, 'sk_transport_mode');

  const dayType = (dt) => (num(dt?.is_holiday) ? 'Ferie' : num(dt?.is_weekend) ? 'Weekend' : 'Semaine');
  const shelfBand = (v) => {
    if (!Number.isFinite(v) || v <= 0) return 'Non renseigne';
    if (v <= 150) return '0-150 j';
    if (v <= 250) return '151-250 j';
    return '> 250 j';
  };

  const driverName = (d) => (d ? `${d.first_name} ${d.last_name}` : 'Non renseigne');

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
      marginBand: r.margin_band,
      discount: num(r.discount_amount),
      clientSegment: c?.segment,
      clientLoyalty: c?.loyalty_level,
      creditScore: num(c?.credit_score),
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
      delayClass: bandDelay(num(r.delay_gap_days)),
      supplierReliability: num(s?.reliability_score),
      supplierOtd: num(s?.on_time_delivery_rate),
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
      status: r.stock_status,
      shelfLifeDays: num(p?.shelf_life_days),
      shelfBand: shelfBand(num(p?.shelf_life_days)),
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
      serviceRate: num(r.service_rate),
      dayType: dayType(dt),
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
      routeLabel: route ? `${route.departure_city} -> ${route.arrival_city}` : 'Non renseigne',
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
      co2: num(r.co2_kg),
      difficulty: route?.difficulty_level,
      durationGap: num(r.duration_hours) - num(route?.planned_time_hours),
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
      consumption: num(v?.avg_consumption_l_100km),
      modelYear: num(v?.model_year),
      odometer: num(v?.odometer_km),
      nextMaintenanceDate: v?.next_maintenance_date,
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
      consumption: num(r.consumption_l_100km),
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
      experienceBand: bandExperience(num(d?.experience_years)),
      salary: num(d?.salary_monthly),
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
      mainCause: i?.main_cause,
      driver: driverName(d),
      vehicle: v?.vehicle_id,
      route: route?.route_code,
      cost: num(r.incident_cost_amount),
      severityScore: num(r.severity_score),
      resolution: num(r.resolution_hours),
      accident: num(r.accident_flag),
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
      resolution: num(r.resolution_hours),
    };
  });

  const employees = t.dim_employee.map((r) => ({
    country: r.country_code,
    department: r.department,
    role: r.role_name,
    status: r.status,
    salary: num(r.salary_monthly),
  }));

  return { sales, achats, stocks, livraisons, transport, vehicules, fuel, presence, incidents, satisfaction, employees };
}

export function applyFilters(rows, filters) {
  return rows.filter((r) => {
    for (const [field, value] of Object.entries(filters)) {
      if (value !== 'ALL' && r[field] !== undefined && r[field] !== value) return false;
    }
    return true;
  });
}

export function uniqueOptions(model, spec) {
  const [, , field, datasets] = spec;
  const vals = new Set();
  for (const name of datasets) {
    for (const row of model[name] || []) {
      const v = row[field];
      if (v !== undefined && v !== null && String(v).trim() !== '') vals.add(String(v));
    }
  }
  return ['ALL', ...[...vals].sort((a, b) => a.localeCompare(b, 'fr'))];
}

export function defaultFilters(specs) {
  return Object.fromEntries(specs.map(([, , field]) => [field, 'ALL']));
}
