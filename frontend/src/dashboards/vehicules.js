import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct, compact } from '../lib/format';
import { palette } from '../lib/charts';

export default {
  key: 'vehicules',
  title: 'Dashboard Vehicules',
  subtitle: 'Flotte, maintenance, carburant, pannes, immobilisation et efficacite vehicule.',
  filters: filterSpecs.vehicules,
  datasets: ['vehicules', 'fuel'],

  kpis(f) {
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
      { label: 'Maintenance', value: euro(sum(v, (x) => x.maintenanceCost)), status: 'neutral' },
      { label: 'Carburant', value: euro(sum(fuel, (x) => x.fuelCost)), status: 'neutral' },
      { label: 'Taux pannes', value: pct(breakdown), status: breakdown <= 0.05 ? 'good' : breakdown <= 0.12 ? 'warn' : 'bad' },
      { label: 'Immobilisation', value: `${compact(sum(v, (x) => x.immobilization))} h`, status: 'neutral' },
      { label: 'Age moyen flotte', value: `${fleetAge.toFixed(1)} ans`, status: 'neutral' },
      { label: 'Maintenance <=30j', value: String(dueSoon), status: dueSoon === 0 ? 'good' : dueSoon <= 3 ? 'warn' : 'bad' },
    ];
  },

  charts(f) {
    const v = f.vehicules;
    const fuel = f.fuel;
    const breakdown = avg(v, (x) => x.breakdown);
    const maint = topEntries(group(v, (x) => x.vehicle, (x) => x.maintenanceCost), 8);
    const fuelCost = topEntries(group(fuel, (x) => x.vehicle, (x) => x.fuelCost), 8);
    const typeCost = group(v, (x) => x.vehicleType, (x) => x.maintenanceCost);
    const imm = topEntries(group(v, (x) => x.vehicle, (x) => x.immobilization), 8);
    const odo = avgGroup(v, (x) => x.vehicleType, (x) => x.odometer);

    return [
      { id: 'vhGauge', kind: 'gauge', title: 'Jauge fiabilite flotte', description: 'Part des lignes sans panne par rapport a la cible.', value: 1 - breakdown, target: 0.95, label: 'Fiabilite' },
      { id: 'vhMaint', kind: 'chart', title: 'Maintenance par vehicule', description: 'Vehicules qui generent le plus de maintenance.',
        type: 'bar', labels: maint.map((x) => x[0]), datasets: [{ data: maint.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'vhFuel', kind: 'chart', title: 'Carburant par vehicule', description: 'Comparaison des couts carburant.',
        type: 'bar', labels: fuelCost.map((x) => x[0]), datasets: [{ data: fuelCost.map((x) => x[1]), backgroundColor: palette.orange }] },
      { id: 'vhType', kind: 'chart', title: 'Cout par type vehicule', description: 'Vue par typologie de flotte.',
        type: 'doughnut', labels: [...typeCost.keys()], datasets: [{ data: [...typeCost.values()], backgroundColor: [palette.green, palette.blue, palette.orange, palette.purple] }], options: { valueFormat: 'currency' } },
      { id: 'vhImmobilization', kind: 'chart', title: 'Immobilisation par vehicule', description: 'Disponibilite reduite par vehicule.',
        type: 'bar', labels: imm.map((x) => x[0]), datasets: [{ data: imm.map((x) => x[1]), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'vhOdometer', kind: 'chart', title: 'Kilometrage moyen par type', description: 'Usure de la flotte par typologie de vehicule.',
        type: 'bar', labels: [...odo.keys()], datasets: [{ data: [...odo.values()], backgroundColor: palette.slate }], options: { valueFormat: 'km' } },
    ];
  },
};
