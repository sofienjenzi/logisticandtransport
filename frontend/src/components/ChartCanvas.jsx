import { Chart } from 'react-chartjs-2';
import { commonOptions, percentLabelPlugin } from '../lib/charts';
import { useTheme } from '../lib/theme';

export default function ChartCanvas({ type, labels, datasets, options = {} }) {
  const theme = useTheme();
  return (
    <Chart
      type={type}
      data={{ labels, datasets }}
      options={commonOptions(type, options, theme)}
      plugins={['pie', 'doughnut'].includes(type) ? [percentLabelPlugin] : []}
    />
  );
}
