import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  PieController,
  ScatterController,
  BubbleController,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { decimal, formatChartValue } from './format';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  BarController, LineController, DoughnutController, PieController, ScatterController, BubbleController,
  Filler, Tooltip, Legend
);

export const palette = {
  green: '#0f766e',
  green2: '#22c55e',
  blue: '#0ea5e9',
  orange: '#d97706',
  amber: '#f59e0b',
  red: '#dc2626',
  slate: '#475569',
  purple: '#7c3aed',
};

/** Chart.js renders to canvas, so it can't read CSS custom properties directly —
 * these are the same tones as tokens.css, kept in sync by hand for the two themes. */
const CHART_THEME = {
  light: { text: '#5c6d67', grid: 'rgba(23, 36, 31, 0.08)', gaugeTrack: '#e3e9e7', gaugeLabel: '#5c6d67' },
  dark: { text: '#9fb5af', grid: 'rgba(231, 241, 238, 0.1)', gaugeTrack: '#26362f', gaugeLabel: '#9fb5af' },
};

export function chartTheme(theme) {
  return CHART_THEME[theme] || CHART_THEME.light;
}

function stackTotal(chart, dataIndex, axisValueKey) {
  return chart.data.datasets.reduce((total, ds, i) => {
    const meta = chart.getDatasetMeta(i);
    if (meta.hidden) return total;
    const raw = ds.data[dataIndex];
    const value = typeof raw === 'object' ? raw?.[axisValueKey] : raw;
    return total + (Number(value) || 0);
  }, 0);
}

export const percentLabelPlugin = {
  id: 'percentLabelPlugin',
  afterDatasetsDraw(chart) {
    if (!['pie', 'doughnut'].includes(chart.config.type)) return;
    const dataset = chart.data.datasets[0];
    const values = dataset.data.map((x) => Number(x) || 0);
    const total = values.reduce((a, b) => a + b, 0);
    if (!total) return;

    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 12px Inter';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 4;

    meta.data.forEach((arc, index) => {
      const ratio = values[index] / total;
      if (ratio < 0.055) return;
      const pos = arc.tooltipPosition();
      ctx.fillText(`${(ratio * 100).toFixed(0)}%`, pos.x, pos.y);
    });
    ctx.restore();
  },
};

export function commonOptions(type, options = {}, theme = 'light') {
  const valueFormat = options.valueFormat || 'number';
  const percentOfStack = Boolean(options.percentOfStack);
  const isCircular = ['pie', 'doughnut'].includes(type);
  const { text, grid } = chartTheme(theme);

  const scales = options.scales
    ? Object.fromEntries(Object.entries(options.scales).map(([axis, scale]) => [
        axis,
        { ticks: { color: text }, grid: { color: grid }, ...scale },
      ]))
    : !isCircular
      ? { x: { ticks: { color: text }, grid: { color: grid } }, y: { ticks: { color: text }, grid: { color: grid } } }
      : undefined;

  return {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { boxWidth: 12, color: text, font: { family: 'Inter' } } },
      tooltip: {
        mode: isCircular ? 'nearest' : 'index',
        intersect: isCircular,
        callbacks: {
          label(context) {
            const label = context.label || context.dataset.label || 'Valeur';
            const raw = typeof context.raw === 'object' ? context.parsed?.y : context.raw;
            const value = Number(raw) || 0;

            if (isCircular) {
              const values = context.dataset.data.map((x) => Number(x) || 0);
              const total = values.reduce((a, b) => a + b, 0);
              const share = total ? (value / total) * 100 : 0;
              return `${label}: ${formatChartValue(value, valueFormat)} (${share.toFixed(1)}%)`;
            }

            if (percentOfStack) {
              const axisValueKey = options.indexAxis === 'y' ? 'x' : 'y';
              const total = stackTotal(context.chart, context.dataIndex, axisValueKey);
              const share = total ? (value / total) * 100 : 0;
              return `${context.dataset.label || label}: ${formatChartValue(value, valueFormat)} (${share.toFixed(1)}%)`;
            }

            if (type === 'scatter' || type === 'bubble') {
              const rawPoint = context.raw || {};
              if (rawPoint.label) {
                const total = context.dataset.data.reduce((a, p) => a + (Number(p.value) || 0), 0);
                const share = total ? ` (${((Number(rawPoint.value) || 0) / total * 100).toFixed(1)}%)` : '';
                return `${rawPoint.label}: ${formatChartValue(rawPoint.value, valueFormat)}${share}`;
              }
              return `${context.dataset.label || 'Point'}: x=${decimal(context.raw.x)}, y=${decimal(context.raw.y)}`;
            }

            return `${context.dataset.label || label}: ${formatChartValue(value, valueFormat)}`;
          },
        },
      },
    },
    ...options,
    scales,
  };
}

/** Builds a {type, labels, datasets} spec for a stacked bar chart of category counts per country. */
export function stackedCountryCategory(rows, categoryField, titleColors) {
  const countries = [...new Set(rows.map((x) => x.country || 'NA'))].sort();
  const cats = [...new Set(rows.map((x) => x[categoryField] || 'Non renseigne'))].sort();
  const colors = titleColors || [palette.green, palette.amber, palette.red, palette.blue, palette.purple, palette.slate];
  const datasets = cats.map((cat, i) => ({
    label: cat,
    data: countries.map((c) => rows.filter((r) => (r.country || 'NA') === c && (r[categoryField] || 'Non renseigne') === cat).length),
    backgroundColor: colors[i % colors.length],
  }));
  return {
    type: 'bar',
    labels: countries,
    datasets,
    options: { percentOfStack: true, scales: { x: { stacked: true }, y: { stacked: true } } },
  };
}

/** Gauge color + ratio, shared by GaugeCard and the center-text plugin. */
export function gaugeState(value, target) {
  const ratio = Math.max(0, Math.min(value / target, 1));
  const color = ratio >= 0.95 ? palette.green2 : ratio >= 0.85 ? palette.amber : palette.red;
  return { ratio, color };
}

export function gaugeCenterTextPlugin(value, label, color, theme = 'light') {
  const { gaugeLabel } = chartTheme(theme);
  return {
    id: 'centerText',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '700 26px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${(value * 100).toFixed(1)}%`, (chartArea.left + chartArea.right) / 2, chartArea.bottom - 26);
      ctx.fillStyle = gaugeLabel;
      ctx.font = '600 12px Inter';
      ctx.fillText(label, (chartArea.left + chartArea.right) / 2, chartArea.bottom - 6);
      ctx.restore();
    },
  };
}
