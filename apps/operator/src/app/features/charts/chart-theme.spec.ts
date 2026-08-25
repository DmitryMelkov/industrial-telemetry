import { Chart } from 'chart.js';
import { applyChartTheme, ChartThemeColors, readChartThemeColors } from './chart-theme';

describe('readChartThemeColors', () => {
  it('should read CSS variables with fallbacks', () => {
    document.documentElement.style.setProperty('--it-color-text', '#111111');
    document.documentElement.style.setProperty('--it-color-border', '#cccccc');
    document.documentElement.style.setProperty('--it-color-surface', '#fafafa');
    document.documentElement.style.setProperty('--it-color-warning', '#faad14');
    document.documentElement.style.setProperty('--it-color-error', '#ff4d4f');

    expect(readChartThemeColors()).toEqual({
      text: '#111111',
      border: '#cccccc',
      surface: '#fafafa',
      warning: '#faad14',
      critical: '#ff4d4f',
    });
  });
});

describe('applyChartTheme', () => {
  const colors: ChartThemeColors = {
    text: '#111111',
    border: '#dddddd',
    surface: '#ffffff',
    warning: '#faad14',
    critical: '#ff4d4f',
  };

  it('should paint scales, tooltip and threshold lines without touching series', () => {
    const chart = {
      options: {
        scales: {
          x: { ticks: { color: 'old' }, grid: { color: 'old' } },
          y: { ticks: { color: 'old' }, grid: { color: 'old' } },
        },
        plugins: { tooltip: { backgroundColor: 'old', titleColor: 'old', bodyColor: 'old' } },
      },
      scales: {
        x: { options: { ticks: { color: 'old' }, grid: { color: 'old' } } },
        y: { options: { ticks: { color: 'old' }, grid: { color: 'old' } } },
      },
      data: {
        datasets: [
          { isThreshold: true, label: 'warning min', borderColor: 'old' },
          { isThreshold: true, label: 'critical max', borderColor: 'old' },
          { label: 'T-101 · C', borderColor: '#1E88E5' },
        ],
      },
    } as unknown as Chart<'line'>;

    applyChartTheme(chart, colors);

    expect(chart.options.scales?.['x']?.ticks?.color).toBe(colors.text);
    expect(chart.options.scales?.['y']?.ticks?.color).toBe(colors.text);
    expect(chart.options.scales?.['x']?.grid?.color).toBe(colors.border);
    expect(chart.options.scales?.['y']?.grid?.color).toBe(colors.border);

    const liveX = chart.scales['x']?.options as {
      ticks?: { color?: string };
      grid?: { color?: string };
    };
    const liveY = chart.scales['y']?.options as {
      ticks?: { color?: string };
      grid?: { color?: string };
    };
    expect(liveX.ticks?.color).toBe(colors.text);
    expect(liveY.grid?.color).toBe(colors.border);

    expect(chart.options.plugins?.tooltip?.backgroundColor).toBe(colors.surface);
    expect(chart.options.plugins?.tooltip?.titleColor).toBe(colors.text);
    expect(chart.options.plugins?.tooltip?.bodyColor).toBe(colors.text);
    expect(chart.options.plugins?.tooltip?.borderColor).toBe(colors.border);
    expect(chart.data.datasets[0]?.borderColor).toBe(colors.warning);
    expect(chart.data.datasets[1]?.borderColor).toBe(colors.critical);
    expect(chart.data.datasets[2]?.borderColor).toBe('#1E88E5');
  });
});
