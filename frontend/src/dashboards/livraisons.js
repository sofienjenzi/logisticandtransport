import { avg, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { pct } from '../lib/format';
import { palette, stackedCountryCategory } from '../lib/charts';

const DAY_TYPE_ORDER = ['Semaine', 'Weekend', 'Ferie'];

const T = 'dashboards.livraisons';

export default {
  key: 'livraisons',
  filters: filterSpecs.livraisons,
  datasets: ['livraisons'],

  kpis(f, t) {
    const l = f.livraisons;
    const onTime = avg(l, (x) => x.onTime);
    return [
      { label: t(`${T}.kpis.livraisons`), value: String(l.length), status: 'neutral' },
      { label: t(`${T}.kpis.aTemps`), value: pct(onTime), status: onTime >= 0.92 ? 'good' : onTime >= 0.85 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.serviceMoyen`), value: pct(avg(l, (x) => x.serviceRate)), status: 'neutral' },
      { label: t(`${T}.kpis.retardMoyen`), value: `${avg(l, (x) => x.delayMinutes).toFixed(0)} min`, status: 'neutral' },
    ];
  },

  charts(f, t) {
    const l = f.livraisons;
    const onTime = avg(l, (x) => x.onTime);
    const trend = avgGroup(l, (x) => x.month, (x) => x.serviceRate);
    const months = [...trend.keys()].sort();
    const clients = topEntries(avgGroup(l, (x) => x.client, (x) => x.onTime), 8, false);
    const drivers = topEntries(avgGroup(l, (x) => x.driver, (x) => x.onTime), 8);
    const dayGroup = avgGroup(l, (x) => x.dayType, (x) => x.onTime);
    const dayKeys = DAY_TYPE_ORDER.filter((k) => dayGroup.has(k));

    return [
      { id: 'liGauge', kind: 'gauge', title: t(`${T}.charts.liGauge.title`), description: t(`${T}.charts.liGauge.description`), value: onTime, target: 0.95, label: t(`${T}.charts.liGauge.label`) },
      { id: 'liStack', kind: 'chart', title: t(`${T}.charts.liStack.title`), description: t(`${T}.charts.liStack.description`),
        ...stackedCountryCategory(l, 'delayCategory') },
      { id: 'liTrend', kind: 'chart', title: t(`${T}.charts.liTrend.title`), description: t(`${T}.charts.liTrend.description`), wide: true,
        type: 'line', labels: months, datasets: [{ data: months.map((m) => trend.get(m) * 100), borderColor: palette.blue, backgroundColor: 'rgba(14,165,233,.18)', fill: true, tension: 0.25 }] },
      { id: 'liClients', kind: 'chart', title: t(`${T}.charts.liClients.title`), description: t(`${T}.charts.liClients.description`),
        type: 'bar', labels: clients.map((x) => x[0]), datasets: [{ data: clients.map((x) => x[1] * 100), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'liDrivers', kind: 'chart', title: t(`${T}.charts.liDrivers.title`), description: t(`${T}.charts.liDrivers.description`),
        type: 'bar', labels: drivers.map((x) => x[0]), datasets: [{ data: drivers.map((x) => x[1] * 100), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'liDayType', kind: 'chart', title: t(`${T}.charts.liDayType.title`), description: t(`${T}.charts.liDayType.description`),
        type: 'bar', labels: dayKeys, datasets: [{ data: dayKeys.map((k) => dayGroup.get(k) * 100), backgroundColor: [palette.green, palette.amber, palette.red] }] },
    ];
  },
};
