import { group, avg, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { pct } from '../lib/format';
import { palette } from '../lib/charts';

const T = 'dashboards.satisfaction';

export default {
  key: 'satisfaction',
  filters: filterSpecs.satisfaction,
  datasets: ['satisfaction'],

  kpis(f, t) {
    const s = f.satisfaction;
    const score = avg(s, (x) => x.score);
    const complaint = avg(s, (x) => x.complaint);
    const promoter = s.length ? s.filter((x) => x.nps === 'Promoter').length / s.length : 0;
    return [
      { label: t(`${T}.kpis.scoreMoyen`), value: score.toFixed(2), status: score >= 4 ? 'good' : score >= 3.5 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.reclamations`), value: pct(complaint), status: complaint <= 0.05 ? 'good' : complaint <= 0.12 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.promoters`), value: pct(promoter), status: promoter >= 0.50 ? 'good' : promoter >= 0.35 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.evaluations`), value: String(s.length), status: 'neutral' },
    ];
  },

  charts(f, t) {
    const s = f.satisfaction;
    const score = avg(s, (x) => x.score);
    const nps = group(s, (x) => x.nps);
    const band = group(s, (x) => x.band);
    const geo = avgGroup(s, (x) => x.country, (x) => x.score);
    const complaints = topEntries(avgGroup(s, (x) => x.client, (x) => x.complaint), 8);

    return [
      { id: 'saGauge', kind: 'gauge', title: t(`${T}.charts.saGauge.title`), description: t(`${T}.charts.saGauge.description`), value: score / 5, target: 0.8, label: t(`${T}.charts.saGauge.label`) },
      { id: 'saNps', kind: 'chart', title: t(`${T}.charts.saNps.title`), description: t(`${T}.charts.saNps.description`),
        type: 'pie', labels: [...nps.keys()], datasets: [{ data: [...nps.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }] },
      { id: 'saBand', kind: 'chart', title: t(`${T}.charts.saBand.title`), description: t(`${T}.charts.saBand.description`),
        type: 'doughnut', labels: [...band.keys()], datasets: [{ data: [...band.values()], backgroundColor: [palette.red, palette.amber, palette.blue, palette.green2] }] },
      { id: 'saGeo', kind: 'chart', title: t(`${T}.charts.saGeo.title`), description: t(`${T}.charts.saGeo.description`),
        type: 'bar', labels: [...geo.keys()], datasets: [{ data: [...geo.values()], backgroundColor: palette.green }] },
      { id: 'saComplaints', kind: 'chart', title: t(`${T}.charts.saComplaints.title`), description: t(`${T}.charts.saComplaints.description`),
        type: 'bar', labels: complaints.map((x) => x[0]), datasets: [{ data: complaints.map((x) => x[1] * 100), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
    ];
  },
};
