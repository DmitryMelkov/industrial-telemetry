import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
  type Plugin,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { ThemeService } from '../../../../core/theme/theme.service';
import { getChartSeriesColor } from '../../chart-colors';
import { applyChartTheme, readChartThemeColors } from '../../chart-theme';
import { resolveChartXRange } from '../../charts-range';
import { ChartSeriesData, ChartThreshold } from '../../charts.service';
import { resolveVisibleThresholds, thresholdZonesPlugin } from '../../threshold-zones';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Filler,
  Tooltip,
  zoomPlugin,
  thresholdZonesPlugin,
);

const hoverGuidePlugin: Plugin<'line'> = {
  id: 'hoverGuide',
  afterDraw: (chart) => {
    const { ctx, chartArea, tooltip } = chart;
    if (!tooltip?.opacity || tooltip.caretX == null || !chartArea) {
      return;
    }

    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--it-color-text-secondary')
      .trim();

    ctx.save();
    ctx.strokeStyle = color || 'rgba(156, 163, 175, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(tooltip.caretX, chartArea.top);
    ctx.lineTo(tooltip.caretX, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

Chart.register(hoverGuidePlugin);

@Component({
  selector: 'app-time-series-chart',
  templateUrl: './time-series-chart.component.html',
  styleUrl: './time-series-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--chart-height.px]': 'heightPx()',
  },
})
export class TimeSeriesChartComponent implements AfterViewInit {
  readonly series = input.required<ChartSeriesData[]>();
  readonly thresholds = input<ChartThreshold[]>([]);
  readonly fromMs = input<number | null>(null);
  readonly toMs = input<number | null>(null);
  readonly liveFollowNow = input(false);
  readonly compactMode = input(false);
  readonly heightPx = input(320);
  readonly zonesCaption = computed(() => {
    const series = this.series();
    if (series.length !== 1 || this.thresholds().length === 0) {
      return '';
    }

    return `Зоны порогов: ${series[0]?.code ?? ''}`;
  });
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly theme = inject(ThemeService).theme;
  private chart: Chart<'line'> | null = null;
  private lastWindowKey = '';

  constructor() {
    effect(() => {
      const series = this.series();
      const thresholds = this.thresholds();
      const fromMs = this.fromMs();
      const toMs = this.toMs();
      const liveFollowNow = this.liveFollowNow();
      this.theme();
      const chart = this.chart;
      if (chart === null) {
        return;
      }

      const visibleThresholds = resolveVisibleThresholds(series.length, thresholds);
      const windowKey = `${fromMs}:${toMs}`;
      const windowChanged = this.lastWindowKey !== windowKey;
      this.lastWindowKey = windowKey;
      const axisRange =
        resolveChartXRange(fromMs, toMs, liveFollowNow) ?? this.resolveFullRange(series);

      if (windowChanged) {
        chart.destroy();
        this.chart = new Chart(this.canvasRef().nativeElement, {
          type: 'line',
          data: this.buildData(series, visibleThresholds, axisRange),
          options: this.buildOptions(axisRange, visibleThresholds),
        });
        return;
      }

      const keepZoom = chart.isZoomedOrPanned();
      chart.data = this.buildData(series, visibleThresholds, axisRange);
      this.applyThresholdZones(chart, visibleThresholds);
      this.syncZoomLimits(chart, axisRange);
      if (!keepZoom) {
        this.applyXScale(chart, axisRange);
      }
      applyChartTheme(chart);
      chart.update('none');
    });

    this.destroyRef.onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    const series = this.series();
    const axisRange =
      resolveChartXRange(this.fromMs(), this.toMs(), this.liveFollowNow()) ??
      this.resolveFullRange(series);
    this.lastWindowKey = `${this.fromMs()}:${this.toMs()}`;
    const visibleThresholds = resolveVisibleThresholds(series.length, this.thresholds());
    this.chart = new Chart(canvas, {
      type: 'line',
      data: this.buildData(series, visibleThresholds, axisRange),
      options: this.buildOptions(axisRange, visibleThresholds),
    });
  }

  private buildData(
    series: ChartSeriesData[],
    thresholds: ChartThreshold[],
    axisRange: { min: number; max: number } | null,
  ): ChartConfiguration<'line'>['data'] {
    return {
      datasets: [
        ...this.buildThresholdDatasets(thresholds, axisRange ?? this.resolveFullRange(series)),
        ...this.buildSeriesDatasets(series),
      ],
    };
  }

  private buildSeriesDatasets(
    series: ChartSeriesData[],
  ): ChartConfiguration<'line'>['data']['datasets'] {
    return series.map((item, index) => {
      const color = getChartSeriesColor(index);
      return {
        label: `${item.code} · ${item.unit}`,
        data: item.points,
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: index === 0 ? 2 : 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0,
        fill: false,
        order: 1,
      };
    });
  }

  private buildThresholdDatasets(
    thresholds: ChartThreshold[],
    range: { min: number; max: number } | null,
  ): ChartConfiguration<'line'>['data']['datasets'] {
    if (range === null || thresholds.length === 0) {
      return [];
    }

    const colors = readChartThemeColors();

    return thresholds.flatMap((threshold) => {
      const color = threshold.severity === 'critical' ? colors.critical : colors.warning;
      const dash = threshold.severity === 'warning' ? [6, 4] : [];
      const width = threshold.severity === 'critical' ? 1.25 : 1;
      const bounds: Array<{ value: number; kind: 'min' | 'max' }> = [];
      if (threshold.minValue !== null) {
        bounds.push({ value: threshold.minValue, kind: 'min' });
      }
      if (threshold.maxValue !== null) {
        bounds.push({ value: threshold.maxValue, kind: 'max' });
      }

      return bounds.map((bound) => ({
        label: `${threshold.severity} ${bound.kind}`,
        data: [
          { x: range.min, y: bound.value },
          { x: range.max, y: bound.value },
        ],
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: width,
        borderDash: dash,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        tension: 0,
        fill: false,
        order: 0,
        isThreshold: true,
      }));
    });
  }

  private buildOptions(
    axisRange: { min: number; max: number } | null,
    thresholds: ChartThreshold[],
  ): ChartConfiguration<'line'>['options'] {
    const colors = readChartThemeColors();
    const compact = this.compactMode();

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      transitions: {
        active: { animation: { duration: 0 } },
        resize: { animation: { duration: 0 } },
      },
      layout: compact ? { padding: { top: 4, right: 4, bottom: 10, left: 4 } } : undefined,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
      onHover: (event, elements, chart) => {
        const target = event.native?.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const seriesHit = elements.some((element) => {
          const dataset = chart.data.datasets[element.datasetIndex];
          return dataset?.isThreshold !== true;
        });
        target.style.cursor = seriesHit ? 'pointer' : 'default';
      },
      onClick: (event) => {
        if (event.native instanceof MouseEvent && event.native.detail === 2) {
          this.chart?.resetZoom();
        }
      },
      plugins: {
        legend: { display: false },
        thresholdZones: { thresholds },
        tooltip: {
          backgroundColor: colors.surface,
          titleColor: colors.text,
          bodyColor: colors.text,
          borderColor: colors.border,
          borderWidth: 1,
          filter: (item) => item.dataset.isThreshold !== true,
          callbacks: {
            title: (items) => {
              const time = items[0]?.parsed.x;
              if (time == null) {
                return '';
              }

              return new Date(time).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
            },
            label: (context) => {
              const value = context.parsed.y;
              const label = context.dataset.label ?? '';
              if (value == null) {
                return label;
              }

              return `${label}: ${Number(value).toFixed(2)}`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: { enabled: true, speed: 0.25 },
            pinch: { enabled: true },
            mode: 'x',
          },
          pan: {
            enabled: true,
            mode: 'x',
          },
          limits: {
            x: {
              minRange: 1000 * 60,
              ...(axisRange !== null ? { min: axisRange.min, max: axisRange.max } : {}),
            },
            y: { minRange: 0.01 },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          display: true,
          min: axisRange?.min,
          max: axisRange?.max,
          time: {
            displayFormats: {
              second: 'dd.MM HH:mm:ss',
              minute: 'dd.MM HH:mm',
              hour: 'dd.MM HH:mm',
              day: 'dd.MM',
            },
            tooltipFormat: 'dd.MM.yyyy HH:mm:ss',
          },
          ticks: {
            color: colors.text,
            maxRotation: compact ? 30 : 45,
            minRotation: compact ? 0 : 45,
            maxTicksLimit: compact ? 8 : 10,
            autoSkip: true,
            padding: compact ? 2 : 4,
            font: compact ? { size: 10 } : undefined,
          },
          grid: {
            color: colors.border,
          },
        },
        y: {
          ticks: {
            color: colors.text,
            callback: (value) => {
              const num = Number(value);
              return Number.isFinite(num) ? num.toFixed(1) : String(value);
            },
          },
          grid: {
            color: colors.border,
          },
        },
      },
    };
  }

  private applyThresholdZones(chart: Chart<'line'>, thresholds: ChartThreshold[]): void {
    const plugins = chart.options.plugins;
    if (plugins === undefined) {
      return;
    }

    plugins.thresholdZones = { thresholds };
  }

  private applyXScale(chart: Chart<'line'>, axisRange: { min: number; max: number } | null): void {
    const xScale = chart.options.scales?.['x'];
    const liveScale = chart.scales['x'];
    if (xScale !== undefined) {
      xScale.min = axisRange === null ? undefined : axisRange.min;
      xScale.max = axisRange === null ? undefined : axisRange.max;
    }
    if (liveScale !== undefined) {
      liveScale.options.min = axisRange === null ? undefined : axisRange.min;
      liveScale.options.max = axisRange === null ? undefined : axisRange.max;
    }
  }

  private syncZoomLimits(
    chart: Chart<'line'>,
    axisRange: { min: number; max: number } | null,
  ): void {
    const zoom = chart.options.plugins?.zoom;
    if (zoom === undefined || zoom.limits === undefined) {
      return;
    }

    zoom.limits['x'] = {
      minRange: 1000 * 60,
      ...(axisRange !== null ? { min: axisRange.min, max: axisRange.max } : {}),
    };
  }

  private resolveFullRange(series: ChartSeriesData[]): { min: number; max: number } | null {
    const xs = series.flatMap((item) => item.points.map((point) => point.x));
    if (xs.length === 0) {
      return null;
    }

    return { min: Math.min(...xs), max: Math.max(...xs) };
  }
}
