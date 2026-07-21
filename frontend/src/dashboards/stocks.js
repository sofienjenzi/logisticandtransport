import { group, avg, sum, topEntries, filterSpecs } from '../lib/model';
import { euro, pct, compact } from '../lib/format';
import { palette } from '../lib/charts';

const SHELF_ORDER = ['0-150 j', '151-250 j', '> 250 j'];

const T = 'dashboards.stocks';

export default {
  key: 'stocks',
  filters: filterSpecs.stocks,
  datasets: ['stocks'],

  kpis(f, t) {
    const s = f.stocks;
    const stockout = avg(s, (x) => x.stockout);
    const perishableValue = sum(s.filter((x) => x.shelfLifeDays > 0 && x.shelfLifeDays <= 150), (x) => x.value);
    return [
      { label: t(`${T}.kpis.valeurStock`), value: euro(sum(s, (x) => x.value)), status: 'neutral' },
      { label: t(`${T}.kpis.rupture`), value: pct(stockout), status: stockout <= 0.05 ? 'good' : stockout <= 0.12 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.ecartStock`), value: compact(sum(s, (x) => x.real - x.theoretical)), status: 'neutral' },
      { label: t(`${T}.kpis.entrepots`), value: String(new Set(s.map((x) => x.warehouse)).size), status: 'neutral' },
      { label: t(`${T}.kpis.valeurCourteDuree`), value: euro(perishableValue), status: 'warn' },
    ];
  },

  charts(f, t) {
    const s = f.stocks;
    const stockout = avg(s, (x) => x.stockout);
    const status = group(s, (x) => x.status);
    const wh = topEntries(group(s, (x) => x.warehouse, (x) => x.value), 9);
    const prod = group(s, (x) => x.product, (x) => x.value);
    const geo = group(s, (x) => x.country, (x) => x.stockout);
    const shelf = group(s, (x) => x.shelfBand, (x) => x.value);
    const shelfKeys = SHELF_ORDER.filter((k) => shelf.has(k));

    return [
      { id: 'stGauge', kind: 'gauge', title: t(`${T}.charts.stGauge.title`), description: t(`${T}.charts.stGauge.description`),
        value: 1 - stockout, target: 0.95, label: t(`${T}.charts.stGauge.label`) },
      { id: 'stStatus', kind: 'chart', title: t(`${T}.charts.stStatus.title`), description: t(`${T}.charts.stStatus.description`),
        type: 'doughnut', labels: [...status.keys()], datasets: [{ data: [...status.values()], backgroundColor: [palette.green2, palette.amber, palette.red, palette.blue] }] },
      { id: 'stWarehouse', kind: 'chart', title: t(`${T}.charts.stWarehouse.title`), description: t(`${T}.charts.stWarehouse.description`), wide: true,
        type: 'bar', labels: wh.map((x) => x[0]), datasets: [{ data: wh.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'stProduct', kind: 'chart', title: t(`${T}.charts.stProduct.title`), description: t(`${T}.charts.stProduct.description`),
        type: 'bar', labels: [...prod.keys()], datasets: [{ data: [...prod.values()], backgroundColor: palette.orange }] },
      { id: 'stGeo', kind: 'chart', title: t(`${T}.charts.stGeo.title`), description: t(`${T}.charts.stGeo.description`),
        type: 'bar', labels: [...geo.keys()], datasets: [{ data: [...geo.values()], backgroundColor: palette.red }] },
      { id: 'stShelfLife', kind: 'chart', title: t(`${T}.charts.stShelfLife.title`), description: t(`${T}.charts.stShelfLife.description`),
        type: 'bar', labels: shelfKeys, datasets: [{ data: shelfKeys.map((k) => shelf.get(k)), backgroundColor: [palette.red, palette.amber, palette.green2] }], options: { valueFormat: 'currency' } },
    ];
  },
};
