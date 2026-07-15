import KpiCard from './KpiCard.jsx';

export default function KpiGrid({ kpis }) {
  return (
    <section className="kpis">
      {kpis.map((k) => (
        <KpiCard key={k.label} label={k.label} value={k.value} status={k.status} />
      ))}
    </section>
  );
}
