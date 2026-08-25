import { type Chart, type ChartType, type Plugin } from 'chart.js';
import { ChartThreshold } from './charts-range';

export type ThresholdZoneKind = 'warning' | 'critical';

export interface ThresholdZone {
  kind: ThresholdZoneKind;
  yMax: number;
  yMin: number;
}

export const THRESHOLD_ZONE_ALPHA: Record<ThresholdZoneKind, number> = {
  warning: 0.12,
  critical: 0.22,
};

const CRITICAL_HATCH_STEP_PX = 7;

/** Зоны и линии порогов только при ровно одном выбранном датчике. */
export const resolveVisibleThresholds = (
  seriesCount: number,
  thresholds: ChartThreshold[],
): ChartThreshold[] => (seriesCount === 1 ? thresholds : []);

const isOutsideThreshold = (threshold: ChartThreshold, y: number): boolean => {
  if (threshold.minValue !== null && y < threshold.minValue) {
    return true;
  }
  if (threshold.maxValue !== null && y > threshold.maxValue) {
    return true;
  }
  return false;
};

const pickThreshold = (
  thresholds: ChartThreshold[],
  severity: ChartThreshold['severity'],
): ChartThreshold | undefined => thresholds.find((item) => item.severity === severity);

const zoneKindAt = (
  y: number,
  warning: ChartThreshold | undefined,
  critical: ChartThreshold | undefined,
): ThresholdZoneKind | null => {
  if (critical !== undefined && isOutsideThreshold(critical, y)) {
    return 'critical';
  }
  if (warning !== undefined && isOutsideThreshold(warning, y)) {
    return 'warning';
  }
  return null;
};

/**
 * Горизонтальные интервалы заливки по порогам primary.
 * Critical побеждает warning. Коридор между warning min/max не заливается.
 * Одна граница — зона «наружу» до края scale.
 */
export const resolveThresholdZones = (
  thresholds: ChartThreshold[],
  scaleMin: number,
  scaleMax: number,
): ThresholdZone[] => {
  if (
    thresholds.length === 0 ||
    !Number.isFinite(scaleMin) ||
    !Number.isFinite(scaleMax) ||
    scaleMin >= scaleMax
  ) {
    return [];
  }

  const warning = pickThreshold(thresholds, 'warning');
  const critical = pickThreshold(thresholds, 'critical');
  if (warning === undefined && critical === undefined) {
    return [];
  }

  const cuts = new Set<number>([scaleMin, scaleMax]);
  for (const threshold of [warning, critical]) {
    if (threshold?.minValue !== null && threshold?.minValue !== undefined) {
      cuts.add(threshold.minValue);
    }
    if (threshold?.maxValue !== null && threshold?.maxValue !== undefined) {
      cuts.add(threshold.maxValue);
    }
  }

  const ys = [...cuts].filter((y) => y >= scaleMin && y <= scaleMax).sort((a, b) => a - b);

  const zones: ThresholdZone[] = [];
  for (let i = 0; i < ys.length - 1; i += 1) {
    const yMin = ys[i];
    const yMax = ys[i + 1];
    if (yMin === undefined || yMax === undefined || yMax - yMin < Number.EPSILON) {
      continue;
    }

    const kind = zoneKindAt((yMin + yMax) / 2, warning, critical);
    if (kind === null) {
      continue;
    }

    const last = zones[zones.length - 1];
    if (last !== undefined && last.kind === kind && last.yMax === yMin) {
      last.yMax = yMax;
    } else {
      zones.push({ kind, yMin, yMax });
    }
  }

  return zones;
};

export const colorWithAlpha = (color: string, alpha: number): string => {
  const hex = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (hex?.[1] !== undefined) {
    const n = Number.parseInt(hex[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  if (rgb?.[1] !== undefined && rgb[2] !== undefined && rgb[3] !== undefined) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }

  return color;
};

const readCssColor = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};

const fillZones = (chart: Chart<'line'>, thresholds: ChartThreshold[]): void => {
  const yScale = chart.scales['y'];
  const { chartArea, ctx } = chart;
  if (yScale === undefined || chartArea === undefined || thresholds.length === 0) {
    return;
  }

  const zones = resolveThresholdZones(thresholds, yScale.min, yScale.max);
  if (zones.length === 0) {
    return;
  }

  const warningFill = colorWithAlpha(
    readCssColor('--it-color-warning', '#faad14'),
    THRESHOLD_ZONE_ALPHA.warning,
  );
  const criticalFill = colorWithAlpha(
    readCssColor('--it-color-error', '#ff4d4f'),
    THRESHOLD_ZONE_ALPHA.critical,
  );
  const criticalHatch = colorWithAlpha(readCssColor('--it-color-error', '#ff4d4f'), 0.35);

  ctx.save();
  ctx.beginPath();
  ctx.rect(
    chartArea.left,
    chartArea.top,
    chartArea.right - chartArea.left,
    chartArea.bottom - chartArea.top,
  );
  ctx.clip();

  for (const zone of zones) {
    const a = yScale.getPixelForValue(zone.yMax);
    const b = yScale.getPixelForValue(zone.yMin);
    const top = Math.min(a, b);
    const bottom = Math.max(a, b);
    if (bottom <= top) {
      continue;
    }

    const width = chartArea.right - chartArea.left;
    const height = bottom - top;
    ctx.fillStyle = zone.kind === 'critical' ? criticalFill : warningFill;
    ctx.fillRect(chartArea.left, top, width, height);
    if (zone.kind === 'critical') {
      hatchRect(ctx, chartArea.left, top, width, height, criticalHatch);
    }
  }

  ctx.restore();
};

const hatchRect = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  stroke: string,
): void => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  const right = left + width;
  const bottom = top + height;
  for (let x = left - height; x < right; x += CRITICAL_HATCH_STEP_PX) {
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x + height, top);
    ctx.stroke();
  }
  ctx.restore();
};

declare module 'chart.js' {
  // Параметры TType/TData обязательны для augmentation Chart.js, в теле не используются.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface PluginOptionsByType<TType extends ChartType> {
    thresholdZones?: {
      thresholds: ChartThreshold[];
    };
  }

  interface ChartDatasetProperties<TType extends ChartType, TData> {
    isThreshold?: boolean;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export const thresholdZonesPlugin: Plugin<'line', { thresholds: ChartThreshold[] }> = {
  id: 'thresholdZones',
  defaults: {
    thresholds: [],
  },
  beforeDatasetsDraw: (chart, _args, options) => {
    const thresholds = options.thresholds;
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
      return;
    }

    fillZones(chart, thresholds);
  },
};
