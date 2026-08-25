import { Chart } from 'chart.js';

export interface ChartThemeColors {
  text: string;
  border: string;
  surface: string;
  warning: string;
  critical: string;
}

const readCss = (css: CSSStyleDeclaration, name: string, fallback: string): string => {
  const value = css.getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};

export const readChartThemeColors = (
  root: HTMLElement = document.documentElement,
): ChartThemeColors => {
  const css = getComputedStyle(root);
  return {
    text: readCss(css, '--it-color-text', '#333333'),
    border: readCss(css, '--it-color-border', 'rgba(156, 163, 175, 0.24)'),
    surface: readCss(css, '--it-color-surface', '#ffffff'),
    warning: readCss(css, '--it-color-warning', '#faad14'),
    critical: readCss(css, '--it-color-error', '#ff4d4f'),
  };
};

interface ScaleColorOptions {
  ticks?: { color?: unknown };
  grid?: { color?: unknown };
}

const isScaleColorOptions = (value: unknown): value is ScaleColorOptions =>
  typeof value === 'object' && value !== null;

const applyScaleColors = (scale: unknown, colors: ChartThemeColors): void => {
  if (!isScaleColorOptions(scale)) {
    return;
  }

  if (scale.ticks !== undefined) {
    scale.ticks.color = colors.text;
  }
  if (scale.grid !== undefined) {
    scale.grid.color = colors.border;
  }
};

export const applyChartTheme = (
  chart: Chart<'line'>,
  colors: ChartThemeColors = readChartThemeColors(),
): void => {
  const scales = chart.options.scales;
  if (scales !== undefined) {
    applyScaleColors(scales['x'], colors);
    applyScaleColors(scales['y'], colors);
  }

  applyScaleColors(chart.scales['x']?.options, colors);
  applyScaleColors(chart.scales['y']?.options, colors);

  const tooltip = chart.options.plugins?.tooltip;
  if (tooltip !== undefined) {
    tooltip.backgroundColor = colors.surface;
    tooltip.titleColor = colors.text;
    tooltip.bodyColor = colors.text;
    tooltip.borderColor = colors.border;
  }

  for (const dataset of chart.data.datasets) {
    if (dataset.isThreshold !== true) {
      continue;
    }

    const label = dataset.label ?? '';
    dataset.borderColor = label.includes('critical') ? colors.critical : colors.warning;
  }
};
