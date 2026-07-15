import { avg, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { pct } from '../lib/format';
import { palette, stackedCountryCategory } from '../lib/charts';

const DAY_TYPE_ORDER = ['Semaine', 'Weekend', 'Ferie'];

export default {
  key: 'livraisons',
  title: 'Dashboard Livraisons',
  subtitle: 'Ponctualite, categories de retard, chauffeurs, vehicules et clients servis.',
  filters: filterSpecs.livraisons,
  datasets: ['livraisons'],

  kpis(f) {
    const l = f.livraisons;
    const onTime = avg(l, (x) => x.onTime);
    return [
      { label: 'Livraisons', value: String(l.length), status: 'neutral' },
      { label: 'A temps', value: pct(onTime), status: onTime >= 0.92 ? 'good' : onTime >= 0.85 ? 'warn' : 'bad' },
      { label: 'Service moyen', value: pct(avg(l, (x) => x.serviceRate)), status: 'neutral' },
      { label: 'Retard moyen', value: `${avg(l, (x) => x.delayMinutes).toFixed(0)} min`, status: 'neutral' },
    ];
  },

  charts(f) {
    const l = f.livraisons;
    const onTime = avg(l, (x) => x.onTime);
    const trend = avgGroup(l, (x) => x.month, (x) => x.serviceRate);
    const months = [...trend.keys()].sort();
    const clients = topEntries(avgGroup(l, (x) => x.client, (x) => x.onTime), 8, false);
    const drivers = topEntries(avgGroup(l, (x) => x.driver, (x) => x.onTime), 8);
    const dayGroup = avgGroup(l, (x) => x.dayType, (x) => x.onTime);
    const dayKeys = DAY_TYPE_ORDER.filter((k) => dayGroup.has(k));

    return [
      { id: 'liGauge', kind: 'gauge', title: 'Jauge on time', description: 'Suivi de la cible de ponctualite.', value: onTime, target: 0.95, label: 'On time' },
      { id: 'liStack', kind: 'chart', title: 'Retards empiles par pays', description: 'Diagramme empile pour comparer la composition des retards.',
        ...stackedCountryCategory(l, 'delayCategory') },
      { id: 'liTrend', kind: 'chart', title: 'Service mensuel', description: 'Evolution du niveau de service dans le temps.', wide: true,
        type: 'line', labels: months, datasets: [{ data: months.map((m) => trend.get(m) * 100), borderColor: palette.blue, backgroundColor: 'rgba(14,165,233,.18)', fill: true, tension: 0.25 }] },
      { id: 'liClients', kind: 'chart', title: 'Clients les moins servis', description: 'Clients avec le taux on time le plus faible.',
        type: 'bar', labels: clients.map((x) => x[0]), datasets: [{ data: clients.map((x) => x[1] * 100), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'liDrivers', kind: 'chart', title: 'Performance chauffeurs', description: 'Taux de ponctualite moyen par chauffeur.',
        type: 'bar', labels: drivers.map((x) => x[0]), datasets: [{ data: drivers.map((x) => x[1] * 100), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'liDayType', kind: 'chart', title: 'Ponctualite semaine vs weekend vs ferie', description: 'Impact du type de jour sur le respect des delais.',
        type: 'bar', labels: dayKeys, datasets: [{ data: dayKeys.map((k) => dayGroup.get(k) * 100), backgroundColor: [palette.green, palette.amber, palette.red] }] },
    ];
  },
};
