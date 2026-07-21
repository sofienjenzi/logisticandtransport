import { group, avg, sum, applyFilters, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette, stackedCountryCategory } from '../lib/charts';

const T = 'dashboards.executif';

export default {
  key: 'executif',
  filters: filterSpecs.executif,
  datasets: ['sales', 'livraisons', 'transport', 'stocks', 'satisfaction', 'vehicules', 'fuel'],

  kpis(f, t) {
    const marginRate = avg(f.sales, (x) => x.marginRate);
    const onTime = avg(f.livraisons, (x) => x.onTime);
    const stockout = avg(f.stocks, (x) => x.stockout);
    const satScore = avg(f.satisfaction, (x) => x.score);
    const revenue = sum(f.sales, (x) => x.revenue);
    // Operational cost-to-serve: transport + fleet maintenance + fuel. Excludes purchase/COGS on purpose —
    // fact_purchase.amount is the same cost of goods already netted into margin_rate, not a logistics overhead.
    const logisticsCost = sum(f.transport, (x) => x.cost) + sum(f.vehicules, (x) => x.maintenanceCost) + sum(f.fuel, (x) => x.fuelCost);
    const logisticsCostRatio = revenue ? logisticsCost / revenue : 0;
    const co2Intensity = revenue ? (sum(f.transport, (x) => x.co2) / revenue) * 1000 : 0;

    return [
      { label: t(`${T}.kpis.ca`), value: euro(revenue), status: 'good' },
      { label: t(`${T}.kpis.marge`), value: pct(marginRate), status: marginRate >= 0.25 ? 'good' : marginRate >= 0.15 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.service`), value: pct(onTime), status: onTime >= 0.92 ? 'good' : onTime >= 0.85 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.rupture`), value: pct(stockout), status: stockout <= 0.05 ? 'good' : stockout <= 0.12 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.satisfaction`), value: satScore.toFixed(2), status: satScore >= 4 ? 'good' : satScore >= 3.5 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.coutLogistique`), value: pct(logisticsCostRatio), status: logisticsCostRatio <= 0.10 ? 'good' : logisticsCostRatio <= 0.15 ? 'warn' : 'bad' },
      { label: t(`${T}.kpis.co2Intensity`), value: `${co2Intensity.toFixed(1)} kg/k€`, status: 'neutral' },
    ];
  },

  charts(f, t) {
    const onTime = avg(f.livraisons, (x) => x.onTime);
    const rev = group(f.sales, (x) => x.month, (x) => x.revenue);
    const mar = group(f.sales, (x) => x.month, (x) => x.margin);
    const months = [...new Set([...rev.keys(), ...mar.keys()])].sort();
    const countries = [...new Set(f.sales.map((x) => x.country))].sort();
    const trCountry = group(f.transport, (x) => x.country, (x) => x.cost);
    const revByCountry = group(f.sales, (x) => x.country, (x) => x.revenue);
    const nps = group(f.satisfaction, (x) => x.nps);

    return [
      { id: 'exGauge', kind: 'gauge', title: t(`${T}.charts.exGauge.title`), description: t(`${T}.charts.exGauge.description`), value: onTime, target: 0.95, label: t(`${T}.charts.exGauge.label`) },
      {
        id: 'exRevenueMargin', kind: 'chart', title: t(`${T}.charts.exRevenueMargin.title`), description: t(`${T}.charts.exRevenueMargin.description`), wide: true,
        type: 'line', labels: months,
        datasets: [
          { label: t(`${T}.charts.exRevenueMargin.ca`), data: months.map((m) => rev.get(m) || 0), borderColor: palette.green, backgroundColor: 'rgba(15,118,110,.16)', fill: true, tension: 0.25 },
          { label: t(`${T}.charts.exRevenueMargin.marge`), data: months.map((m) => mar.get(m) || 0), borderColor: palette.orange, backgroundColor: 'rgba(217,119,6,.12)', fill: true, tension: 0.25 },
        ],
      },
      {
        id: 'exGeo', kind: 'chart', title: t(`${T}.charts.exGeo.title`), description: t(`${T}.charts.exGeo.description`),
        type: 'bar', labels: countries,
        datasets: [
          { label: t(`${T}.charts.exGeo.ca`), data: countries.map((c) => revByCountry.get(c) || 0), backgroundColor: palette.green },
          { label: t(`${T}.charts.exGeo.coutTransport`), data: countries.map((c) => trCountry.get(c) || 0), backgroundColor: palette.orange },
        ],
      },
      {
        id: 'exStack', kind: 'chart', title: t(`${T}.charts.exStack.title`), description: t(`${T}.charts.exStack.description`),
        ...stackedCountryCategory(f.livraisons, 'delayCategory'),
      },
      {
        id: 'exNps', kind: 'chart', title: t(`${T}.charts.exNps.title`), description: t(`${T}.charts.exNps.description`),
        type: 'pie', labels: [...nps.keys()], datasets: [{ data: [...nps.values()], backgroundColor: [palette.green2, palette.amber, palette.red] }],
      },
    ];
  },
};
