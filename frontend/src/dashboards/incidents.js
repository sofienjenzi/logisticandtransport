import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette, stackedCountryCategory } from '../lib/charts';

export default {
  key: 'incidents',
  title: 'Dashboard Incidents',
  subtitle: "Risque operationnel par gravite, type d'incident, pays, route et vehicule.",
  filters: filterSpecs.incidents,
  datasets: ['incidents'],

  kpis(f) {
    const i = f.incidents;
    const accident = avg(i, (x) => x.accident);
    return [
      { label: 'Incidents', value: String(i.length), status: 'neutral' },
      { label: 'Cout', value: euro(sum(i, (x) => x.cost)), status: 'bad' },
      { label: 'Resolution', value: `${avg(i, (x) => x.resolution).toFixed(1)} h`, status: 'neutral' },
      { label: 'Accidents', value: pct(accident), status: accident <= 0.04 ? 'good' : accident <= 0.10 ? 'warn' : 'bad' },
    ];
  },

  charts(f) {
    const i = f.incidents;
    const accident = avg(i, (x) => x.accident);
    const sev = group(i, (x) => x.severity);
    const cost = topEntries(group(i, (x) => x.incidentType, (x) => x.cost), 8);
    const res = avgGroup(i, (x) => x.severity, (x) => x.resolution);
    const cause = topEntries(group(i, (x) => x.mainCause, (x) => x.cost), 8);

    return [
      { id: 'inGauge', kind: 'gauge', title: 'Jauge risque accident', description: "Couleur dynamique selon la part d'evenements sans accident.", value: 1 - accident, target: 0.95, label: 'Sans accident' },
      { id: 'inSeverity', kind: 'chart', title: 'Gravite incidents', description: 'Repartition par niveau de gravite.',
        type: 'doughnut', labels: [...sev.keys()], datasets: [{ data: [...sev.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }] },
      { id: 'inStack', kind: 'chart', title: 'Gravite empilee par pays', description: 'Diagramme empile pour localiser le risque.',
        ...stackedCountryCategory(i, 'severity') },
      { id: 'inCost', kind: 'chart', title: 'Cout par type incident', description: 'Types d\'incidents les plus couteux.',
        type: 'bar', labels: cost.map((x) => x[0]), datasets: [{ data: cost.map((x) => x[1]), backgroundColor: palette.red }], options: { indexAxis: 'y' } },
      { id: 'inResolution', kind: 'chart', title: 'Resolution par gravite', description: 'Temps moyen de resolution par niveau.',
        type: 'bar', labels: [...res.keys()], datasets: [{ data: [...res.values()], backgroundColor: palette.blue }] },
      { id: 'inCause', kind: 'chart', title: 'Cause principale (Pareto)', description: 'Causes racines qui pesent le plus sur le cout des incidents.',
        type: 'bar', labels: cause.map((x) => x[0]), datasets: [{ data: cause.map((x) => x[1]), backgroundColor: palette.orange }], options: { indexAxis: 'y' } },
    ];
  },
};
