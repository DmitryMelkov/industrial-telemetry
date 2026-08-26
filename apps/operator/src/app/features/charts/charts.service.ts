import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map } from 'rxjs/operators';
import { HistoryApiService } from '../../core/api/history-api.service';
import { OverviewApiService } from '../../core/api/overview-api.service';
import { SensorsApiService } from '../../core/api/sensors-api.service';
import { RealtimeEvent, RealtimeService } from '../../core/realtime/realtime.service';
import { SelectedSiteService } from '../../core/site/selected-site.service';
import {
  OverviewSensor,
  SensorHistoryPoint,
  SensorHistoryResponse,
} from '../../shared/types/api.types';
import {
  ChartRangePreset,
  ChartThreshold,
  DEFAULT_CHART_RANGE,
  formatChartWindowCaption,
  floorToBucket,
  HISTORY_LIMIT,
  HistoryWindow,
  isLiveWindow,
  PRESET_DURATION_MS,
  resolveHistoryBucketMs,
  resolvePresetWindow,
  toChartThresholds,
} from './charts-range';

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeriesData {
  sensorId: string;
  code: string;
  unit: string;
  points: ChartPoint[];
}

export type { ChartRangePreset, ChartThreshold, HistoryWindow };

type HistoryLoadResult =
  { sensorId: string; ok: true; response: SensorHistoryResponse } | { sensorId: string; ok: false };

const MAX_SELECTED_SENSORS = 4;
const CUSTOM_RANGE_ERROR = 'Начало периода должно быть раньше конца.';

@Injectable()
export class ChartsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly historyApiService = inject(HistoryApiService);
  private readonly overviewApiService = inject(OverviewApiService);
  private readonly sensorsApiService = inject(SensorsApiService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly selectedSiteService = inject(SelectedSiteService);
  private readonly selectedSiteId = signal('');
  private readonly selectedIds = signal<string[]>([]);
  private readonly seriesState = signal<Record<string, ChartSeriesData>>({});
  private readonly rangePresetState = signal<ChartRangePreset>(DEFAULT_CHART_RANGE);
  private readonly customFromState = signal<string | null>(null);
  private readonly customToState = signal<string | null>(null);
  private historyRequestId = 0;
  private thresholdsRequestId = 0;
  private preferredSensorId: string | null = null;
  private siteWatchEnabled = false;
  readonly sensors = signal<OverviewSensor[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly customRangeError = signal('');
  readonly primaryThresholds = signal<ChartThreshold[]>([]);
  readonly selectedSensorIds = this.selectedIds.asReadonly();
  readonly rangePreset = this.rangePresetState.asReadonly();
  readonly customFrom = this.customFromState.asReadonly();
  readonly customTo = this.customToState.asReadonly();
  readonly series = computed(() =>
    this.selectedIds()
      .map((sensorId) => this.seriesState()[sensorId])
      .filter((item): item is ChartSeriesData => item !== undefined),
  );
  readonly hasSeries = computed(() => this.series().some((item) => item.points.length > 0));
  readonly historyWindow = computed(() => this.resolveHistoryWindow());
  readonly axisFromMs = computed(() => {
    const ms = Date.parse(this.historyWindow().from);
    return Number.isFinite(ms) ? ms : null;
  });
  readonly axisToMs = computed(() => {
    const ms = Date.parse(this.historyWindow().to);
    return Number.isFinite(ms) ? ms : null;
  });
  readonly chartCaption = computed(() => {
    const window = this.historyWindow();
    const pointCount = this.series().reduce((sum, item) => sum + item.points.length, 0);
    return formatChartWindowCaption(window.from, window.to, pointCount);
  });
  /** Live append только для окон «до now»; custom с to в прошлом — нет. См. isLiveWindow / AGENTS.md. */
  readonly liveAppendEnabled = computed(() =>
    isLiveWindow(this.rangePresetState(), this.customToState()),
  );

  constructor() {
    this.realtimeService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.applyRealtimeEvent(event));

    toObservable(this.selectedSiteService.siteId)
      .pipe(
        filter((siteId): siteId is string => siteId.length > 0),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((siteId) => {
        if (!this.siteWatchEnabled || siteId === this.selectedSiteId()) {
          return;
        }

        this.reloadForSite(siteId);
      });
  }

  readonly initialize = (preferredSensorId?: string | null): void => {
    this.preferredSensorId = preferredSensorId ?? null;
    this.selectedSiteService.ensureLoaded();
    this.siteWatchEnabled = true;
    const siteId = this.selectedSiteService.siteId();
    if (siteId) {
      this.reloadForSite(siteId);
    }
  };

  private reloadForSite = (siteId: string): void => {
    this.selectedSiteId.set(siteId);
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.sensors.set([]);
    this.selectedIds.set([]);
    this.seriesState.set({});
    this.primaryThresholds.set([]);
    this.realtimeService.connect(siteId);

    const preferred = this.preferredSensorId;
    this.preferredSensorId = null;

    this.overviewApiService
      .getOverview(siteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          if (this.selectedSiteId() !== siteId) {
            return;
          }

          this.sensors.set(overview.sensors);
          const initialIds = this.resolveInitialIds(overview.sensors, preferred);
          this.selectedIds.set(initialIds);
          this.loadSeries(initialIds);
          this.loadPrimaryThresholds();
        },
        error: () => {
          if (this.selectedSiteId() !== siteId) {
            return;
          }

          this.isLoading.set(false);
          this.errorMessage.set('Не удалось загрузить список датчиков для графика.');
        },
      });
  };

  readonly isSelected = (sensorId: string): boolean => this.selectedIds().includes(sensorId);

  readonly isPrimary = (sensorId: string): boolean => this.selectedIds()[0] === sensorId;

  readonly seriesColorIndex = (sensorId: string): number => this.selectedIds().indexOf(sensorId);

  readonly canToggleSensor = (sensorId: string): boolean => {
    if (this.isSelected(sensorId)) {
      return this.selectedIds().length > 1;
    }

    return this.selectedIds().length < MAX_SELECTED_SENSORS;
  };

  readonly toggleSensor = (sensorId: string): void => {
    if (!this.canToggleSensor(sensorId)) {
      return;
    }

    if (this.isSelected(sensorId)) {
      const previousPrimary = this.selectedIds()[0];
      this.selectedIds.update((ids) => ids.filter((id) => id !== sensorId));
      this.seriesState.update((state) => {
        const next = { ...state };
        delete next[sensorId];
        return next;
      });
      if (this.selectedIds()[0] !== previousPrimary) {
        this.loadPrimaryThresholds();
      }
      return;
    }

    this.selectedIds.update((ids) => [...ids, sensorId]);
    this.loadSeries([sensorId], false);
  };

  readonly setRangePreset = (preset: ChartRangePreset): void => {
    if (preset === 'custom') {
      const window = this.resolveHistoryWindow();
      this.customFromState.set(window.from);
      this.customToState.set(window.to);
      this.rangePresetState.set('custom');
      this.customRangeError.set('');
      return;
    }

    if (preset === this.rangePresetState()) {
      return;
    }

    this.rangePresetState.set(preset);
    this.customRangeError.set('');
    this.loadSeries(this.selectedIds());
  };

  readonly applyCustomRange = (fromIso: string, toIso: string): boolean => {
    const fromMs = Date.parse(fromIso);
    const toMs = Date.parse(toIso);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
      this.customRangeError.set(CUSTOM_RANGE_ERROR);
      return false;
    }

    this.customRangeError.set('');
    this.rangePresetState.set('custom');
    this.customFromState.set(fromIso);
    this.customToState.set(toIso);
    this.loadSeries(this.selectedIds());
    return true;
  };

  readonly reload = (): void => {
    const siteId = this.selectedSiteId() || this.selectedSiteService.siteId();
    if (!siteId) {
      return;
    }

    this.preferredSensorId = this.selectedIds()[0] ?? null;
    this.reloadForSite(siteId);
  };

  private resolveInitialIds(
    sensors: OverviewSensor[],
    preferredSensorId?: string | null,
  ): string[] {
    if (preferredSensorId !== undefined && preferredSensorId !== null) {
      const preferred = sensors.find((sensor) => sensor.id === preferredSensorId);
      if (preferred !== undefined) {
        return [preferred.id];
      }
    }

    return sensors[0] === undefined ? [] : [sensors[0].id];
  }

  private resolveHistoryWindow(now = Date.now()): HistoryWindow {
    const preset = this.rangePresetState();
    if (preset === 'custom') {
      const from = this.customFromState();
      const to = this.customToState();
      if (from !== null && to !== null) {
        return { from, to };
      }

      return resolvePresetWindow(DEFAULT_CHART_RANGE, now);
    }

    return resolvePresetWindow(preset, now);
  }

  private loadSeries(sensorIds: string[], replace = true): void {
    if (sensorIds.length === 0) {
      this.isLoading.set(false);
      this.seriesState.set({});
      return;
    }

    const requestId = ++this.historyRequestId;
    const window = this.resolveHistoryWindow();
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin(
      sensorIds.map((sensorId) =>
        this.historyApiService
          .getHistory(sensorId, { from: window.from, to: window.to, limit: HISTORY_LIMIT })
          .pipe(
            map((response): HistoryLoadResult => ({
              sensorId,
              ok: true,
              response,
            })),
            catchError(() => of<HistoryLoadResult>({ sensorId, ok: false })),
          ),
      ),
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.historyRequestId) {
            this.isLoading.set(false);
          }
        }),
      )
      .subscribe((results) => {
        if (requestId !== this.historyRequestId) {
          return;
        }

        const failedIds = results.filter((item) => !item.ok).map((item) => item.sensorId);
        const okResults = results.filter(
          (item): item is Extract<HistoryLoadResult, { ok: true }> => item.ok,
        );

        if (okResults.length === 0) {
          const codes = failedIds
            .map((id) => this.sensors().find((sensor) => sensor.id === id)?.code ?? id)
            .join(', ');
          this.errorMessage.set(
            codes.length > 0
              ? `Не удалось загрузить историю: ${codes}`
              : 'Не удалось загрузить историю датчиков.',
          );
          return;
        }

        if (failedIds.length > 0) {
          const codes = failedIds
            .map((id) => this.sensors().find((sensor) => sensor.id === id)?.code ?? id)
            .join(', ');
          this.errorMessage.set(`Не удалось загрузить историю: ${codes}`);
        }

        this.seriesState.update((state) => {
          const next = replace ? {} : { ...state };
          okResults.forEach((item) => {
            const overviewSensor = this.sensors().find((sensor) => sensor.id === item.sensorId);
            next[item.sensorId] = {
              sensorId: item.sensorId,
              code: overviewSensor?.code ?? item.response.sensor?.code ?? item.sensorId,
              unit: overviewSensor?.unit ?? item.response.sensor?.unit ?? '',
              points: this.normalizePoints(item.response.points),
            };
          });
          return next;
        });
      });
  }

  private loadPrimaryThresholds(): void {
    const primaryId = this.selectedIds()[0];
    if (primaryId === undefined) {
      this.primaryThresholds.set([]);
      return;
    }

    const requestId = ++this.thresholdsRequestId;
    this.sensorsApiService
      .getSensor(primaryId)
      .pipe(
        catchError(() => of({ thresholds: [] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((sensor) => {
        if (requestId !== this.thresholdsRequestId) {
          return;
        }

        this.primaryThresholds.set(toChartThresholds(sensor.thresholds));
      });
  }

  private normalizePoints(points: SensorHistoryPoint[]): ChartPoint[] {
    return [...points]
      .map((point) => ({ x: Date.parse(point.ts), y: point.value }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .sort((left, right) => left.x - right.x)
      .slice(-HISTORY_LIMIT);
  }

  private applyRealtimeEvent(event: RealtimeEvent): void {
    if (event.type !== 'telemetry' || event.payload.siteId !== this.selectedSiteId()) {
      return;
    }

    if (!this.liveAppendEnabled()) {
      return;
    }

    const sensorId = event.payload.sensorId;
    if (!this.isSelected(sensorId)) {
      return;
    }

    const x = Date.parse(event.payload.ts);
    if (!Number.isFinite(x)) {
      return;
    }

    const window = this.resolveHistoryWindow();
    const fromMs = Date.parse(window.from);
    const toMs = Date.parse(window.to);
    if (Number.isFinite(fromMs) && x < fromMs) {
      return;
    }

    const bucketMs =
      Number.isFinite(fromMs) && Number.isFinite(toMs)
        ? resolveHistoryBucketMs(fromMs, toMs)
        : null;
    const pointX = bucketMs === null ? x : floorToBucket(x, bucketMs);

    this.seriesState.update((state) => {
      const current = state[sensorId];
      if (current === undefined) {
        return state;
      }

      const preset = this.rangePresetState();
      const windowStart = preset === 'custom' ? fromMs : Date.now() - PRESET_DURATION_MS[preset];
      const nextPoint = { x: pointX, y: event.payload.value };
      const existingIndex = current.points.findIndex((point) => point.x === pointX);
      const mergedPoints =
        existingIndex >= 0
          ? current.points.map((point, index) => (index === existingIndex ? nextPoint : point))
          : [...current.points, nextPoint];

      return {
        ...state,
        [sensorId]: {
          ...current,
          unit: event.payload.unit,
          points: mergedPoints
            .filter((point) => !Number.isFinite(windowStart) || point.x >= windowStart)
            .sort((left, right) => left.x - right.x)
            .slice(-HISTORY_LIMIT),
        },
      };
    });
  }
}
