import { group, avg, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { pct } from '../lib/format';
import { palette } from '../lib/charts';

export default {
  key: 'satisfaction',
  title: 'Dashboard Satisfaction',
  subtitle: 'NPS, reclamations, satisfaction par pays, client et segment de note.',
  filters: filterSpecs.satisfaction,
  datasets: ['satisfaction'],

  kpis(f) {
    const s = f.satisfaction;
    const score = avg(s, (x) => x.score);
    const complaint = avg(s, (x) => x.complaint);
    const promoter = s.length ? s.filter((x) => x.nps === 'Promoter').length / s.length : 0;
    return [
      { label: 'Score moyen', value: score.toFixed(2), status: score >= 4 ? 'good' : score >= 3.5 ? 'warn' : 'bad' },
      { label: 'Reclamations', value: pct(complaint), status: complaint <= 0.05 ? 'good' : complaint <= 0.12 ? 'warn' : 'bad' },
      { label: 'Promoters', value: pct(promoter), status: promoter >= 0.50 ? 'good' : promoter >= 0.35 ? 'warn' : 'bad' },
      { label: 'Evaluations', value: String(s.length), status: 'neutral' },
    ];
  },

  charts(f) {
    const s = f.satisfaction;
    const score = avg(s, (x) => x.score);
    const nps = group(s, (x) => x.nps);
    const band = group(s, (x) => x.band);
    const geo = avgGroup(s, (x) => x.country, (x) => x.score);
    const complaints = topEntries(avgGroup(s, (x) => x.client, (x) => x.complaint), 8);

    return [
      { id: 'saGauge', kind: 'gauge', title: 'Jauge satisfaction', description: 'Score client rapporte a une cible de 4/5.', value: score / 5, target: 0.8, label: 'Score' },
      { id: 'saNps', kind: 'chart', title: 'NPS mix', description: 'Promoters, passives et detractors.',
        type: 'pie', labels: [...nps.keys()], datasets: [{ data: [...nps.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }] },
      { id: 'saBand', kind: 'chart', title: 'Segments satisfaction', description: 'Classification qualitative des notes.',
        type: 'doughnut', labels: [...band.keys()], datasets: [{ data: [...band.values()], backgroundColor: [palette.red, palette.amber, palette.blue, palette.green2] }] },
      { id: 'saGeo', kind: 'chart', title: 'Score par pays', description: "Comparaison geographique de l'experience client.",
        type: 'bar', labels: [...geo.keys()], datasets: [{ data: [...geo.values()], backgroundColor: palette.green }] },
      { id: 'saComplaints', kind: 'chart', title: 'Reclamations par client', description: 'Clients avec les taux de reclamation les plus eleves.',
        type: 'bar', labels: complaints.map((x) => x[0]), datasets: [{ data: complaints.map((x) => x[1] * 100), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
    ];
  },
};
