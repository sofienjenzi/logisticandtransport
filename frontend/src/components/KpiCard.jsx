export default function KpiCard({ label, value, status = 'neutral' }) {
  return (
    <article className={`panel kpi ${status}`}>
      <p>{label}</p>
      <h2>{value}</h2>
    </article>
  );
}
