import { Chart } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { gaugeState, gaugeCenterTextPlugin, chartTheme } from '../lib/charts';
import { useTheme } from '../lib/theme';
import ChartCard from './ChartCard.jsx';

export default function GaugeCard({ title, description, value, target, label }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { ratio, color } = gaugeState(value, target);
  const { gaugeTrack } = chartTheme(theme);

  return (
    <ChartCard title={title} description={description}>
      <Chart
        type="doughnut"
        data={{
          labels: [label, t('common.gap')],
          datasets: [{ data: [ratio, 1 - ratio], backgroundColor: [color, gaugeTrack], borderWidth: 0 }],
        }}
        options={{
          maintainAspectRatio: false,
          rotation: -90,
          circumference: 180,
          cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: () => `${label}: ${(value * 100).toFixed(1)}% / ${t('common.target')} ${(target * 100).toFixed(0)}%` } },
          },
        }}
        plugins={[gaugeCenterTextPlugin(value, label, color, theme)]}
      />
    </ChartCard>
  );
}
