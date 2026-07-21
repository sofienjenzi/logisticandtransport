import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette, stackedCountryCategory } from '../lib/charts';

const T = 'dashboards.incidents';

export default {
  key: 'incidents',
  filters: filterSpecs.incidents,
  datasets: ['incidents'],

  kpis(f, t) {
    const i = f.incidents;
    const accident = avg(i, (x) => x.accident);
    return [
      { label: t(`${T}.kpis.incidents`), value: String(i.length), status: 'neutral' },
      { label: t(`${T}.kpis.cout`), value: euro(sum(i, (x) => x.cost)), status: 'bad' },
      { label: t(`${T}.kpis.resolution`), value: `${avg(i, (x) => x.resolution).toFixed(1)} h`, status: 'neutral' },
      { label: t(`${T}.kpis.accidents`), value: pct(accident), status: accident <= 0.04 ? 'good' : accident <= 0.10 ? 'warn' : 'bad' },
    ];
  },

  charts(f, t) {
    const i = f.incidents;
    const accident = avg(i, (x) => x.accident);
    const sev = group(i, (x) => x.severity);
    const cost = topEntries(group(i, (x) => x.incidentType, (x) => x.cost), 8);
    const res = avgGroup(i, (x) => x.severity, (x) => x.resolution);
    const cause = topEntries(group(i, (x) => x.mainCause, (x) => x.cost), 8);

    return [
      { id: 'inGauge', kind: 'gauge', title: t(`${T}.charts.inGauge.title`), description: t(`${T}.charts.inGauge.description`), value: 1 - accident, target: 0.95, label: t(`${T}.charts.inGauge.label`) },
      { id: 'inSeverity', kind: 'chart', title: t(`${T}.charts.inSeverity.title`), description: t(`${T}.charts.inSeverity.description`),
        type: 'doughnut', labels: [...sev.keys()], datasets: [{ data: [...sev.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }] },
      { id: 'inStack', kind: 'chart', title: t(`${T}.charts.inStack.title`), description: t(`${T}.charts.inStack.description`),
        ...stackedCountryCategory(i, 'severity') },
      { id: 'inCost', kind: 'chart', title: t(`${T}.charts.inCost.title`), description: t(`${T}.charts.inCost.description`),
        type: 'bar', labels: cost.map((x) => x[0]), datasets: [{ data: cost.map((x) => x[1]), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'inResolution', kind: 'chart', title: t(`${T}.charts.inResolution.title`), description: t(`${T}.charts.inResolution.description`),
        type: 'bar', labels: [...res.keys()], datasets: [{ data: [...res.values()], backgroundColor: palette.blue }] },
      { id: 'inCause', kind: 'chart', title: t(`${T}.charts.inCause.title`), description: t(`${T}.charts.inCause.description`),
        type: 'bar', labels: cause.map((x) => x[0]), datasets: [{ data: cause.map((x) => x[1]), backgroundColor: palette.orange }], options: { indexAxis: 'y' } },
    ];
  },
};
