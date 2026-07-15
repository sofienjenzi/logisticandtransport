import { group, avg, sum, topEntries, filterSpecs } from '../lib/model';
import { euro, pct, compact } from '../lib/format';
import { palette } from '../lib/charts';

const SHELF_ORDER = ['0-150 j', '151-250 j', '> 250 j'];

export default {
  key: 'stocks',
  title: 'Dashboard Stocks',
  subtitle: 'Risque de rupture, valeur immobilisee, entrepots et statuts de stock.',
  filters: filterSpecs.stocks,
  datasets: ['stocks'],

  kpis(f) {
    const s = f.stocks;
    const stockout = avg(s, (x) => x.stockout);
    const perishableValue = sum(s.filter((x) => x.shelfLifeDays > 0 && x.shelfLifeDays <= 150), (x) => x.value);
    return [
      { label: 'Valeur stock', value: euro(sum(s, (x) => x.value)), status: 'neutral' },
      { label: 'Rupture', value: pct(stockout), status: stockout <= 0.05 ? 'good' : stockout <= 0.12 ? 'warn' : 'bad' },
      { label: 'Ecart stock', value: compact(sum(s, (x) => x.real - x.theoretical)), status: 'neutral' },
      { label: 'Entrepots', value: String(new Set(s.map((x) => x.warehouse)).size), status: 'neutral' },
      { label: 'Valeur courte duree de vie (<=150j)', value: euro(perishableValue), status: 'warn' },
    ];
  },

  charts(f) {
    const s = f.stocks;
    const stockout = avg(s, (x) => x.stockout);
    const status = group(s, (x) => x.status);
    const wh = topEntries(group(s, (x) => x.warehouse, (x) => x.value), 9);
    const prod = group(s, (x) => x.product, (x) => x.value);
    const geo = group(s, (x) => x.country, (x) => x.stockout);
    const shelf = group(s, (x) => x.shelfBand, (x) => x.value);
    const shelfKeys = SHELF_ORDER.filter((k) => shelf.has(k));

    return [
      { id: 'stGauge', kind: 'gauge', title: 'Jauge disponibilite stock', description: 'Couleur dynamique selon le niveau hors rupture.',
        value: 1 - stockout, target: 0.95, label: 'Disponibilite' },
      { id: 'stStatus', kind: 'chart', title: 'Statut stock', description: 'Repartition des stocks normaux, faibles ou critiques.',
        type: 'doughnut', labels: [...status.keys()], datasets: [{ data: [...status.values()], backgroundColor: [palette.green2, palette.amber, palette.red, palette.blue] }] },
      { id: 'stWarehouse', kind: 'chart', title: 'Valeur par entrepot', description: 'Entrepots avec la plus forte valeur immobilisee.', wide: true,
        type: 'bar', labels: wh.map((x) => x[0]), datasets: [{ data: wh.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'stProduct', kind: 'chart', title: 'Valeur par produit', description: 'Produits qui concentrent le stock.',
        type: 'bar', labels: [...prod.keys()], datasets: [{ data: [...prod.values()], backgroundColor: palette.orange }] },
      { id: 'stGeo', kind: 'chart', title: 'Ruptures par pays', description: 'Nombre de ruptures par zone geographique.',
        type: 'bar', labels: [...geo.keys()], datasets: [{ data: [...geo.values()], backgroundColor: palette.red }] },
      { id: 'stShelfLife', kind: 'chart', title: 'Valeur par duree de vie', description: 'Exposition au risque de peremption par tranche de shelf-life.',
        type: 'bar', labels: shelfKeys, datasets: [{ data: shelfKeys.map((k) => shelf.get(k)), backgroundColor: [palette.red, palette.amber, palette.green2] }], options: { valueFormat: 'currency' } },
    ];
  },
};
