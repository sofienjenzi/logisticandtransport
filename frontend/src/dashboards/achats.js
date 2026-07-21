import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette } from '../lib/charts';

const T = 'dashboards.achats';

export default {
  key: 'achats',
  filters: filterSpecs.achats,
  datasets: ['achats'],

  kpis(f, t) {
    const a = f.achats;
    const delayGap = avg(a, (x) => x.delayGap);
    const reliability = avg(a, (x) => x.supplierReliability);
    return [
      { label: t(`${T}.kpis.coutAchats`), value: euro(sum(a, (x) => x.amount)), status: 'neutral' },
      { label: t(`${T}.kpis.delaiReelMoyen`), value: `${avg(a, (x) => x.realDelay).toFixed(1)} j`, status: 'neutral' },
      { label: t(`${T}.kpis.ecartDelai`), value: `${delayGap.toFixed(1)} j`, status: delayGap <= 0 ? 'good' : delayGap <= 1 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.fournisseurs`), value: String(new Set(a.map((x) => x.supplier)).size), status: 'neutral' },
      { label: t(`${T}.kpis.fiabiliteFournisseur`), value: `${reliability.toFixed(1)} / 100`, status: reliability >= 90 ? 'good' : reliability >= 80 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.tauxOtdFournisseur`), value: pct(avg(a, (x) => x.supplierOtd)), status: 'neutral' },
    ];
  },

  charts(f, t) {
    const a = f.achats;
    const sup = topEntries(group(a, (x) => x.supplier, (x) => x.amount), 8);
    const prod = group(a, (x) => x.product, (x) => x.amount);
    const delay = group(a, (x) => x.delayClass);
    const geo = group(a, (x) => x.country, (x) => x.amount);
    const rel = topEntries(avgGroup(a, (x) => x.supplier, (x) => x.supplierReliability), 12);

    return [
      { id: 'acSupplier', kind: 'chart', title: t(`${T}.charts.acSupplier.title`), description: t(`${T}.charts.acSupplier.description`),
        type: 'bar', labels: sup.map((x) => x[0]), datasets: [{ data: sup.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'acDelayGauge', kind: 'gauge', title: t(`${T}.charts.acDelayGauge.title`), description: t(`${T}.charts.acDelayGauge.description`),
        value: a.length ? a.filter((x) => x.delayGap <= 0).length / a.length : 0, target: 0.9, label: t(`${T}.charts.acDelayGauge.label`) },
      { id: 'acProduct', kind: 'chart', title: t(`${T}.charts.acProduct.title`), description: t(`${T}.charts.acProduct.description`),
        type: 'bar', labels: [...prod.keys()], datasets: [{ data: [...prod.values()], backgroundColor: palette.orange }] },
      { id: 'acDelayClass', kind: 'chart', title: t(`${T}.charts.acDelayClass.title`), description: t(`${T}.charts.acDelayClass.description`),
        type: 'doughnut', labels: [...delay.keys()], datasets: [{ data: [...delay.values()], backgroundColor: [palette.green2, palette.amber, palette.orange, palette.red] }] },
      { id: 'acCountry', kind: 'chart', title: t(`${T}.charts.acCountry.title`), description: t(`${T}.charts.acCountry.description`),
        type: 'bar', labels: [...geo.keys()], datasets: [{ data: [...geo.values()], backgroundColor: palette.blue }] },
      { id: 'acReliability', kind: 'chart', title: t(`${T}.charts.acReliability.title`), description: t(`${T}.charts.acReliability.description`), wide: true,
        type: 'bar', labels: rel.map((x) => x[0]), datasets: [{ data: rel.map((x) => x[1]), backgroundColor: palette.purple }], options: { indexAxis: 'y' } },
    ];
  },
};
