import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, compact, pct } from '../lib/format';
import { palette } from '../lib/charts';

const DIFF_ORDER = ['Low', 'Medium', 'High'];

const T = 'dashboards.transport';

export default {
  key: 'transport',
  filters: filterSpecs.transport,
  datasets: ['transport'],

  kpis(f, t) {
    const tr = f.transport;
    const fill = avg(tr, (x) => x.fillRate);
    const durationGap = avg(tr, (x) => x.durationGap);
    return [
      { label: t(`${T}.kpis.coutTransport`), value: euro(sum(tr, (x) => x.cost)), status: 'neutral' },
      { label: t(`${T}.kpis.distance`), value: `${compact(sum(tr, (x) => x.distance))} km`, status: 'neutral' },
      { label: t(`${T}.kpis.coutKm`), value: (sum(tr, (x) => x.cost) / Math.max(sum(tr, (x) => x.distance), 1)).toFixed(2), status: 'neutral' },
      { label: t(`${T}.kpis.fillRate`), value: pct(fill), status: fill >= 0.80 ? 'good' : fill >= 0.65 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.co2`), value: `${compact(sum(tr, (x) => x.co2))} kg`, status: 'neutral' },
      { label: t(`${T}.kpis.ecartDuree`), value: `${durationGap.toFixed(1)} h`, status: durationGap <= 0 ? 'good' : durationGap <= 0.5 ? 'warn' : 'bad' },
    ];
  },

  charts(f, t) {
    const tr = f.transport;
    const fill = avg(tr, (x) => x.fillRate);
    const carrier = topEntries(group(tr, (x) => x.carrier, (x) => x.cost), 8);
    const fillBand = group(tr, (x) => x.fillBand);
    const co2 = group(tr, (x) => x.country, (x) => x.co2);
    const diffGroup = avgGroup(tr, (x) => x.difficulty, (x) => x.costPerKm);
    const diffKeys = DIFF_ORDER.filter((k) => diffGroup.has(k));

    return [
      { id: 'trGauge', kind: 'gauge', title: t(`${T}.charts.trGauge.title`), description: t(`${T}.charts.trGauge.description`), value: fill, target: 0.85, label: t(`${T}.charts.trGauge.label`) },
      { id: 'trScatter', kind: 'chart', title: t(`${T}.charts.trScatter.title`), description: t(`${T}.charts.trScatter.description`), wide: true,
        type: 'scatter', labels: [], datasets: [{ data: tr.slice(0, 800).map((x) => ({ x: x.distance, y: x.costPerKm })), backgroundColor: 'rgba(217,119,6,.65)' }],
        options: { scales: { x: { title: { display: true, text: t(`${T}.charts.trScatter.axisDistance`) } }, y: { title: { display: true, text: t(`${T}.charts.trScatter.axisCost`) } } } } },
      { id: 'trCarrier', kind: 'chart', title: t(`${T}.charts.trCarrier.title`), description: t(`${T}.charts.trCarrier.description`),
        type: 'bar', labels: carrier.map((x) => x[0]), datasets: [{ data: carrier.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'trFill', kind: 'chart', title: t(`${T}.charts.trFill.title`), description: t(`${T}.charts.trFill.description`),
        type: 'doughnut', labels: [...fillBand.keys()], datasets: [{ data: [...fillBand.values()], backgroundColor: [palette.red, palette.amber, palette.green2] }] },
      { id: 'trCo2', kind: 'chart', title: t(`${T}.charts.trCo2.title`), description: t(`${T}.charts.trCo2.description`),
        type: 'bar', labels: [...co2.keys()], datasets: [{ data: [...co2.values()], backgroundColor: palette.slate }] },
      { id: 'trDifficulty', kind: 'chart', title: t(`${T}.charts.trDifficulty.title`), description: t(`${T}.charts.trDifficulty.description`),
        type: 'bar', labels: diffKeys, datasets: [{ data: diffKeys.map((k) => diffGroup.get(k)), backgroundColor: [palette.green2, palette.amber, palette.red] }] },
    ];
  },
};
