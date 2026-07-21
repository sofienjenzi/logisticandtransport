import { group, avg, sum, topEntries, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette } from '../lib/charts';

const T = 'dashboards.ventes';

export default {
  key: 'ventes',
  filters: filterSpecs.ventes,
  datasets: ['sales'],

  kpis(f, t) {
    const s = f.sales;
    const revenue = sum(s, (x) => x.revenue);
    const discountRate = revenue ? sum(s, (x) => x.discount) / revenue : 0;
    return [
      { label: t(`${T}.kpis.ca`), value: euro(revenue), status: 'good' },
      { label: t(`${T}.kpis.marge`), value: euro(sum(s, (x) => x.margin)), status: 'good' },
      { label: t(`${T}.kpis.margePct`), value: pct(avg(s, (x) => x.marginRate)), status: avg(s, (x) => x.marginRate) >= 0.25 ? 'good' : 'warn' },
      { label: t(`${T}.kpis.lignes`), value: String(s.length), status: 'neutral' },
      { label: t(`${T}.kpis.tauxRemise`), value: pct(discountRate), status: discountRate <= 0.05 ? 'good' : discountRate <= 0.10 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.scoreCredit`), value: avg(s, (x) => x.creditScore).toFixed(0), status: 'neutral' },
    ];
  },

  charts(f, t) {
    const s = f.sales;
    const clients = topEntries(group(s, (x) => x.client, (x) => x.revenue), 8);
    const products = [...group(s, (x) => x.product).keys()].sort();
    const prodRev = group(s, (x) => x.product, (x) => x.revenue);
    const prodMar = group(s, (x) => x.product, (x) => x.margin);
    const channel = group(s, (x) => x.channel);
    const margin = group(s, (x) => x.marginBand);
    const geo = group(s, (x) => x.country, (x) => x.revenue);
    const segment = group(s, (x) => x.clientSegment, (x) => x.revenue);
    const loyalty = group(s, (x) => x.clientLoyalty, (x) => x.revenue);

    return [
      { id: 'veTopClients', kind: 'chart', title: t(`${T}.charts.veTopClients.title`), description: t(`${T}.charts.veTopClients.description`),
        type: 'bar', labels: clients.map((x) => x[0]), datasets: [{ label: t(`${T}.charts.veTopClients.ca`), data: clients.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'veProducts', kind: 'chart', title: t(`${T}.charts.veProducts.title`), description: t(`${T}.charts.veProducts.description`), wide: true,
        type: 'bar', labels: products, datasets: [
          { label: t(`${T}.charts.veProducts.ca`), data: products.map((p) => prodRev.get(p) || 0), backgroundColor: palette.green },
          { label: t(`${T}.charts.veProducts.marge`), data: products.map((p) => prodMar.get(p) || 0), backgroundColor: palette.orange },
        ] },
      { id: 'veChannel', kind: 'chart', title: t(`${T}.charts.veChannel.title`), description: t(`${T}.charts.veChannel.description`),
        type: 'doughnut', labels: [...channel.keys()], datasets: [{ data: [...channel.values()], backgroundColor: [palette.green, palette.blue, palette.orange, palette.purple] }] },
      { id: 'veMargin', kind: 'chart', title: t(`${T}.charts.veMargin.title`), description: t(`${T}.charts.veMargin.description`),
        type: 'bar', labels: [...margin.keys()], datasets: [{ data: [...margin.values()], backgroundColor: [palette.red, palette.amber, palette.green, palette.green2] }] },
      { id: 'veGeo', kind: 'chart', title: t(`${T}.charts.veGeo.title`), description: t(`${T}.charts.veGeo.description`),
        type: 'bar', labels: [...geo.keys()], datasets: [{ label: t(`${T}.charts.veGeo.ca`), data: [...geo.values()], backgroundColor: palette.blue }] },
      { id: 'veSegment', kind: 'chart', title: t(`${T}.charts.veSegment.title`), description: t(`${T}.charts.veSegment.description`),
        type: 'doughnut', labels: [...segment.keys()], datasets: [{ data: [...segment.values()], backgroundColor: [palette.green, palette.blue, palette.amber] }], options: { valueFormat: 'currency' } },
      { id: 'veLoyalty', kind: 'chart', title: t(`${T}.charts.veLoyalty.title`), description: t(`${T}.charts.veLoyalty.description`),
        type: 'doughnut', labels: [...loyalty.keys()], datasets: [{ data: [...loyalty.values()], backgroundColor: [palette.amber, palette.slate, palette.green2] }], options: { valueFormat: 'currency' } },
    ];
  },
};
