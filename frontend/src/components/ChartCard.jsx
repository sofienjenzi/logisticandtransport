export default function ChartCard({ title, description, wide = false, children }) {
  return (
    <section className={`panel chart-card ${wide ? 'wide' : ''}`}>
      <div className="chart-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}
