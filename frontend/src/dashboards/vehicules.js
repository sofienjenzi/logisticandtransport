import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct, compact } from '../lib/format';
import { palette } from '../lib/charts';

const T = 'dashboards.vehicules';

export default {
  key: 'vehicules',
  filters: filterSpecs.vehicules,
  datasets: ['vehicules', 'fuel'],

  kpis(f, t) {
    const v = f.vehicules;
    const fuel = f.fuel;
    const breakdown = avg(v, (x) => x.breakdown);
    const fleet = new Map(v.map((x) => [x.vehicle, x]));
    const currentYear = new Date().getFullYear();
    const fleetAge = avg([...fleet.values()], (x) => currentYear - x.modelYear);
    const now = new Date();
    const dueSoon = [...fleet.values()].filter((x) => {
      const d = new Date(x.nextMaintenanceDate);
      return Number.isFinite(d.getTime()) && (d - now) / 86400000 <= 30;
    }).length;

    return [
      { label: t(`${T}.kpis.maintenance`), value: euro(sum(v, (x) => x.maintenanceCost)), status: 'neutral' },
      { label: t(`${T}.kpis.carburant`), value: euro(sum(fuel, (x) => x.fuelCost)), status: 'neutral' },
      { label: t(`${T}.kpis.tauxPannes`), value: pct(breakdown), status: breakdown <= 0.05 ? 'good' : breakdown <= 0.12 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.immobilisation`), value: `${compact(sum(v, (x) => x.immobilization))} h`, status: 'neutral' },
      { label: t(`${T}.kpis.ageMoyenFlotte`), value: `${fleetAge.toFixed(1)} ans`, status: 'neutral' },
      { label: t(`${T}.kpis.maintenanceSous30j`), value: String(dueSoon), status: dueSoon === 0 ? 'good' : dueSoon <= 3 ? 'warn' : 'bad' },
    ];
  },

  charts(f, t) {
    const v = f.vehicules;
    const fuel = f.fuel;
    const breakdown = avg(v, (x) => x.breakdown);
    const maint = topEntries(group(v, (x) => x.vehicle, (x) => x.maintenanceCost), 8);
    const fuelCost = topEntries(group(fuel, (x) => x.vehicle, (x) => x.fuelCost), 8);
    const typeCost = group(v, (x) => x.vehicleType, (x) => x.maintenanceCost);
    const imm = topEntries(group(v, (x) => x.vehicle, (x) => x.immobilization), 8);
    const odo = avgGroup(v, (x) => x.vehicleType, (x) => x.odometer);

    return [
      { id: 'vhGauge', kind: 'gauge', title: t(`${T}.charts.vhGauge.title`), description: t(`${T}.charts.vhGauge.description`), value: 1 - breakdown, target: 0.95, label: t(`${T}.charts.vhGauge.label`) },
      { id: 'vhMaint', kind: 'chart', title: t(`${T}.charts.vhMaint.title`), description: t(`${T}.charts.vhMaint.description`),
        type: 'bar', labels: maint.map((x) => x[0]), datasets: [{ data: maint.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'vhFuel', kind: 'chart', title: t(`${T}.charts.vhFuel.title`), description: t(`${T}.charts.vhFuel.description`),
        type: 'bar', labels: fuelCost.map((x) => x[0]), datasets: [{ data: fuelCost.map((x) => x[1]), backgroundColor: palette.orange }] },
      { id: 'vhType', kind: 'chart', title: t(`${T}.charts.vhType.title`), description: t(`${T}.charts.vhType.description`),
        type: 'doughnut', labels: [...typeCost.keys()], datasets: [{ data: [...typeCost.values()], backgroundColor: [palette.green, palette.blue, palette.orange, palette.purple] }], options: { valueFormat: 'currency' } },
      { id: 'vhImmobilization', kind: 'chart', title: t(`${T}.charts.vhImmobilization.title`), description: t(`${T}.charts.vhImmobilization.description`),
        type: 'bar', labels: imm.map((x) => x[0]), datasets: [{ data: imm.map((x) => x[1]), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'vhOdometer', kind: 'chart', title: t(`${T}.charts.vhOdometer.title`), description: t(`${T}.charts.vhOdometer.description`),
        type: 'bar', labels: [...odo.keys()], datasets: [{ data: [...odo.values()], backgroundColor: palette.slate }], options: { valueFormat: 'km' } },
    ];
  },
};
