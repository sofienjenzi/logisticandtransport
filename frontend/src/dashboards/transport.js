import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, compact, pct } from '../lib/format';
import { palette } from '../lib/charts';

const DIFF_ORDER = ['Low', 'Medium', 'High'];

export default {
  key: 'transport',
  title: 'Dashboard Transport',
  subtitle: 'Couts, distance, remplissage, transporteurs, routes et impact CO2.',
  filters: filterSpecs.transport,
  datasets: ['transport'],

  kpis(f) {
    const t = f.transport;
    const fill = avg(t, (x) => x.fillRate);
    const durationGap = avg(t, (x) => x.durationGap);
    return [
      { label: 'Cout transport', value: euro(sum(t, (x) => x.cost)), status: 'neutral' },
      { label: 'Distance', value: `${compact(sum(t, (x) => x.distance))} km`, status: 'neutral' },
      { label: 'Cout/km', value: (sum(t, (x) => x.cost) / Math.max(sum(t, (x) => x.distance), 1)).toFixed(2), status: 'neutral' },
      { label: 'Fill rate', value: pct(fill), status: fill >= 0.80 ? 'good' : fill >= 0.65 ? 'warn' : 'bad' },
      { label: 'CO2', value: `${compact(sum(t, (x) => x.co2))} kg`, status: 'neutral' },
      { label: 'Ecart duree vs planifie', value: `${durationGap.toFixed(1)} h`, status: durationGap <= 0 ? 'good' : durationGap <= 0.5 ? 'warn' : 'bad' },
    ];
  },

  charts(f) {
    const t = f.transport;
    const fill = avg(t, (x) => x.fillRate);
    const carrier = topEntries(group(t, (x) => x.carrier, (x) => x.cost), 8);
    const fillBand = group(t, (x) => x.fillBand);
    const co2 = group(t, (x) => x.country, (x) => x.co2);
    const diffGroup = avgGroup(t, (x) => x.difficulty, (x) => x.costPerKm);
    const diffKeys = DIFF_ORDER.filter((k) => diffGroup.has(k));

    return [
      { id: 'trGauge', kind: 'gauge', title: 'Jauge remplissage', description: "Mesure l'utilisation de capacite transport.", value: fill, target: 0.85, label: 'Fill rate' },
      { id: 'trScatter', kind: 'chart', title: 'Cout/km vs distance', description: 'Nuage de points pour detecter les trajets atypiques.', wide: true,
        type: 'scatter', labels: [], datasets: [{ data: t.slice(0, 800).map((x) => ({ x: x.distance, y: x.costPerKm })), backgroundColor: 'rgba(217,119,6,.65)' }],
        options: { scales: { x: { title: { display: true, text: 'Distance km' } }, y: { title: { display: true, text: 'Cout/km' } } } } },
      { id: 'trCarrier', kind: 'chart', title: 'Cout par transporteur', description: 'Transporteurs les plus couteux.',
        type: 'bar', labels: carrier.map((x) => x[0]), datasets: [{ data: carrier.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'trFill', kind: 'chart', title: 'Segments de remplissage', description: 'Classification du fill rate.',
        type: 'doughnut', labels: [...fillBand.keys()], datasets: [{ data: [...fillBand.values()], backgroundColor: [palette.red, palette.amber, palette.green2] }] },
      { id: 'trCo2', kind: 'chart', title: 'CO2 par pays', description: 'Impact environnemental par pays.',
        type: 'bar', labels: [...co2.keys()], datasets: [{ data: [...co2.values()], backgroundColor: palette.slate }] },
      { id: 'trDifficulty', kind: 'chart', title: 'Cout/km par difficulte route', description: 'Surcout lie aux routes classees Low/Medium/High.',
        type: 'bar', labels: diffKeys, datasets: [{ data: diffKeys.map((k) => diffGroup.get(k)), backgroundColor: [palette.green2, palette.amber, palette.red] }] },
    ];
  },
};
