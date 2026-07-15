import { group, avg, sum, topEntries, avgGroup, filterSpecs } from '../lib/model';
import { euro, pct } from '../lib/format';
import { palette } from '../lib/charts';

export default {
  key: 'achats',
  title: 'Dashboard Achats',
  subtitle: "Controle des fournisseurs, couts d'approvisionnement et delais reels vs planifies.",
  filters: filterSpecs.achats,
  datasets: ['achats'],

  kpis(f) {
    const a = f.achats;
    const delayGap = avg(a, (x) => x.delayGap);
    const reliability = avg(a, (x) => x.supplierReliability);
    return [
      { label: 'Cout achats', value: euro(sum(a, (x) => x.amount)), status: 'neutral' },
      { label: 'Delai reel moyen', value: `${avg(a, (x) => x.realDelay).toFixed(1)} j`, status: 'neutral' },
      { label: 'Ecart delai', value: `${delayGap.toFixed(1)} j`, status: delayGap <= 0 ? 'good' : delayGap <= 1 ? 'warn' : 'bad' },
      { label: 'Fournisseurs', value: String(new Set(a.map((x) => x.supplier)).size), status: 'neutral' },
      { label: 'Fiabilite fournisseur', value: `${reliability.toFixed(1)} / 100`, status: reliability >= 90 ? 'good' : reliability >= 80 ? 'warn' : 'bad' },
      { label: 'Taux OTD fournisseur', value: pct(avg(a, (x) => x.supplierOtd)), status: 'neutral' },
    ];
  },

  charts(f) {
    const a = f.achats;
    const sup = topEntries(group(a, (x) => x.supplier, (x) => x.amount), 8);
    const prod = group(a, (x) => x.product, (x) => x.amount);
    const delay = group(a, (x) => x.delayClass);
    const geo = group(a, (x) => x.country, (x) => x.amount);
    const rel = topEntries(avgGroup(a, (x) => x.supplier, (x) => x.supplierReliability), 12);

    return [
      { id: 'acSupplier', kind: 'chart', title: 'Cout par fournisseur', description: "Concentration des depenses par partenaire achat.",
        type: 'bar', labels: sup.map((x) => x[0]), datasets: [{ data: sup.map((x) => x[1]), backgroundColor: palette.green }], options: { indexAxis: 'y' } },
      { id: 'acDelayGauge', kind: 'gauge', title: 'Jauge respect delai', description: 'Part des achats livres sans depassement du delai planifie.',
        value: a.length ? a.filter((x) => x.delayGap <= 0).length / a.length : 0, target: 0.9, label: 'Respect delai' },
      { id: 'acProduct', kind: 'chart', title: 'Cout par produit', description: 'Produits qui mobilisent le plus de budget achat.',
        type: 'bar', labels: [...prod.keys()], datasets: [{ data: [...prod.values()], backgroundColor: palette.orange }] },
      { id: 'acDelayClass', kind: 'chart', title: 'Classification des delais', description: 'IF/SWITCH metier: en avance, 0-1 jour, 1-2 jours, plus de 2 jours.',
        type: 'doughnut', labels: [...delay.keys()], datasets: [{ data: [...delay.values()], backgroundColor: [palette.green2, palette.amber, palette.orange, palette.red] }] },
      { id: 'acCountry', kind: 'chart', title: 'Achats par pays', description: 'Lecture geographique du poids achat.',
        type: 'bar', labels: [...geo.keys()], datasets: [{ data: [...geo.values()], backgroundColor: palette.blue }] },
      { id: 'acReliability', kind: 'chart', title: 'Fiabilite par fournisseur', description: 'Score de fiabilite (0-100) issu de la fiche fournisseur.', wide: true,
        type: 'bar', labels: rel.map((x) => x[0]), datasets: [{ data: rel.map((x) => x[1]), backgroundColor: palette.purple }], options: { indexAxis: 'y' } },
    ];
  },
};
