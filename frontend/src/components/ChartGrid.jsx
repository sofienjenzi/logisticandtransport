import ChartCard from './ChartCard.jsx';
import ChartCanvas from './ChartCanvas.jsx';
import GaugeCard from './GaugeCard.jsx';

export default function ChartGrid({ charts }) {
  return (
    <section className="grid">
      {charts.map((c) =>
        c.kind === 'gauge' ? (
          <GaugeCard key={c.id} title={c.title} description={c.description} value={c.value} target={c.target} label={c.label} />
        ) : (
          <ChartCard key={c.id} title={c.title} description={c.description} wide={c.wide}>
            <ChartCanvas type={c.type} labels={c.labels} datasets={c.datasets} options={c.options} />
          </ChartCard>
        )
      )}
    </section>
  );
}
