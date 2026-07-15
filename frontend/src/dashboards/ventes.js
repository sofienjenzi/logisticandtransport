import { group, avg, sum, topEntries, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette } from '../lib/charts';

export default {
  key: 'ventes',
  title: 'Dashboard Ventes',
  subtitle: 'Analyse commerciale par client, produit, canal, pays et niveau de marge.',
  filters: filterSpecs.ventes,
  datasets: ['sales'],

  kpis(f) {
    const s = f.sales;
    const revenue = sum(s, (x) => x.revenue);
    const discountRate = revenue ? sum(s, (x) => x.discount) / revenue : 0;
    return [
      { label: 'CA', value: euro(revenue), status: 'good' },
      { label: 'Marge', value: euro(sum(s, (x) => x.margin)), status: 'good' },
      { label: 'Marge %', value: pct(avg(s, (x) => x.marginRate)), status: avg(s, (x) => x.marginRate) >= 0.25 ? 'good' : 'warn' },
      { label: 'Lignes', value: String(s.length), status: 'neutral' },
      { label: 'Taux remise', value: pct(discountRate), status: discountRate <= 0.05 ? 'good' : discountRate <= 0.10 ? 'warn' : 'bad' },
      { label: 'Score credit moyen', value: avg(s, (x) => x.creditScore).toFixed(0), status: 'neutral' },
    ];
  },

  charts(f) {
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
      { id: 'veTopClients', kind: 'chart', title: 'Top clients CA', description: "Identifier les clients qui portent l'activite commerciale.",
        type: 'bar', labels: clients.map((x) => x[0]), datasets: [{ label: 'CA', data: clients.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'veProducts', kind: 'chart', title: 'CA et marge par produit', description: 'Comparer volume de vente et rentabilite par produit.', wide: true,
        type: 'bar', labels: products, datasets: [
          { label: 'CA', data: products.map((p) => prodRev.get(p) || 0), backgroundColor: palette.green },
          { label: 'Marge', data: products.map((p) => prodMar.get(p) || 0), backgroundColor: palette.orange },
        ] },
      { id: 'veChannel', kind: 'chart', title: 'Canal de vente', description: 'Repartition commerciale par canal.',
        type: 'doughnut', labels: [...channel.keys()], datasets: [{ data: [...channel.values()], backgroundColor: [palette.green, palette.blue, palette.orange, palette.purple] }] },
      { id: 'veMargin', kind: 'chart', title: 'Segments de marge', description: 'Classification des lignes en high, medium, low ou loss.',
        type: 'bar', labels: [...margin.keys()], datasets: [{ data: [...margin.values()], backgroundColor: [palette.red, palette.amber, palette.green, palette.green2] }] },
      { id: 'veGeo', kind: 'chart', title: 'CA par pays', description: 'Vue geographique commerciale.',
        type: 'bar', labels: [...geo.keys()], datasets: [{ label: 'CA', data: [...geo.values()], backgroundColor: palette.blue }] },
      { id: 'veSegment', kind: 'chart', title: 'CA par segment client', description: 'Poids commercial des segments Key, Growth, Standard.',
        type: 'doughnut', labels: [...segment.keys()], datasets: [{ data: [...segment.values()], backgroundColor: [palette.green, palette.blue, palette.amber] }], options: { valueFormat: 'currency' } },
      { id: 'veLoyalty', kind: 'chart', title: 'CA par fidelite', description: 'Repartition du CA selon le niveau de fidelite client.',
        type: 'doughnut', labels: [...loyalty.keys()], datasets: [{ data: [...loyalty.values()], backgroundColor: [palette.amber, palette.slate, palette.green2] }], options: { valueFormat: 'currency' } },
    ];
  },
};
