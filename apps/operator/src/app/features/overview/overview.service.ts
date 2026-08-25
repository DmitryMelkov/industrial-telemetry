import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { OverviewApiService } from '../../core/api/overview-api.service';
import { DEMO_SITE_ID } from '../../core/config/demo-site';
import { RealtimeEvent, RealtimeService } from '../../core/realtime/realtime.service';
import {
  AlertStatus,
  OverviewSensor,
  SensorStatus,
  SiteOverviewResponse,
} from '../../shared/types/api.types';

export interface OverviewSummaryItem {
  label: string;
  value: string;
  tone: 'default' | 'success' | 'warning' | 'critical' | 'unknown';
  route?: string;
}

export interface OverviewStatusCounts {
  online: number;
  alarm: number;
  noSignal: number;
}

const SENSOR_STATUS_PRIORITY: Record<SensorStatus, number> = {
  critical: 0,
  warning: 1,
  ok: 2,
  unknown: 3,
};

@Injectable()
export class OverviewService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertsApiService = inject(AlertsApiService);
  private readonly overviewApiService = inject(OverviewApiService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly overviewState = signal<SiteOverviewResponse | null>(null);
  private readonly selectedSiteId = signal(DEMO_SITE_ID);
  private readonly alertStatusById = new Map<string, AlertStatus>();
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly overview = this.overviewState.asReadonly();
  readonly displayStatus = (sensor: OverviewSensor): SensorStatus => {
    if (sensor.value === null) {
      return 'unknown';
    }

    return sensor.status;
  };
  readonly sensors = computed(() => {
    const sensors = this.overviewState()?.sensors ?? [];

    return [...sensors].sort(
      (left, right) =>
        SENSOR_STATUS_PRIORITY[this.displayStatus(left)] -
        SENSOR_STATUS_PRIORITY[this.displayStatus(right)],
    );
  });
  readonly hasSensors = computed(() => this.sensors().length > 0);
  readonly siteId = computed(() => this.overviewState()?.siteId ?? this.selectedSiteId());
  readonly statusCounts = computed<OverviewStatusCounts>(() => {
    const sensors = this.sensors();

    return {
      online: sensors.filter((sensor) => sensor.value !== null).length,
      alarm: sensors.filter((sensor) => {
        const status = this.displayStatus(sensor);
        return status === 'warning' || status === 'critical';
      }).length,
      noSignal: sensors.filter((sensor) => sensor.value === null).length,
    };
  });
  readonly summary = computed<OverviewSummaryItem[]>(() => {
    const sensors = this.sensors();
    const { online, alarm, noSignal } = this.statusCounts();
    const openAlerts = this.overviewState()?.openAlerts ?? 0;
    const criticalSensors = sensors.filter(
      (sensor) => this.displayStatus(sensor) === 'critical',
    ).length;

    return [
      { label: 'Всего датчиков', value: String(sensors.length), tone: 'default' },
      {
        label: 'Передают данные',
        value: String(online),
        tone: online > 0 ? 'success' : 'default',
      },
      {
        label: 'Нет сигнала',
        value: String(noSignal),
        tone: noSignal > 0 ? 'unknown' : 'default',
      },
      {
        label: 'Открытые алерты',
        value: String(openAlerts),
        tone: openAlerts > 0 ? 'critical' : 'default',
        route: '/alerts',
      },
      {
        label: 'Требуют внимания',
        value: String(alarm),
        tone: criticalSensors > 0 ? 'critical' : alarm > 0 ? 'warning' : 'default',
      },
    ];
  });

  constructor() {
    this.realtimeService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.applyRealtimeEvent(event));
  }

  readonly initialize = (siteId = DEMO_SITE_ID): void => {
    this.selectedSiteId.set(siteId);
    this.loadOverview(siteId);
    this.realtimeService.connect(siteId);
  };

  readonly loadOverview = (siteId = DEMO_SITE_ID): void => {
    this.selectedSiteId.set(siteId);
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.alertStatusById.clear();

    this.overviewApiService
      .getOverview(siteId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (overview) => {
          this.overviewState.set(overview);
          this.seedOpenAlerts(siteId);
        },
        error: () => {
          this.overviewState.set(null);
          this.errorMessage.set('Не удалось загрузить обзор объекта. Попробуйте обновить данные.');
        },
      });
  };

  readonly statusLabel = (status: SensorStatus): string => {
    if (status === 'critical') {
      return 'Критично';
    }

    if (status === 'warning') {
      return 'Предупреждение';
    }

    if (status === 'unknown') {
      return 'Нет сигнала';
    }

    return 'Норма';
  };

  readonly metricLabel = (metric: string): string => {
    const labels: Record<string, string> = {
      humidity: 'Влажность',
      pressure: 'Давление',
      temperature: 'Температура',
      vibration: 'Вибрация',
    };

    return labels[metric] ?? metric;
  };

  readonly trackSensor = (_index: number, sensor: OverviewSensor): string => sensor.id;

  private seedOpenAlerts(siteId: string): void {
    this.alertsApiService
      .listAlerts({ siteId, status: 'open' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alerts) => {
          if (this.selectedSiteId() !== siteId) {
            return;
          }

          this.alertStatusById.clear();
          alerts.forEach((alert) => this.alertStatusById.set(alert.id, alert.status));
          this.overviewState.update((current) =>
            current === null ? null : { ...current, openAlerts: alerts.length },
          );
        },
        error: () => {
          // Keep REST openAlerts snapshot if the alerts list is unavailable.
        },
      });
  }

  private applyRealtimeEvent(event: RealtimeEvent): void {
    const overview = this.overviewState();
    if (overview === null || event.payload.siteId !== this.selectedSiteId()) {
      return;
    }

    if (event.type === 'telemetry') {
      this.overviewState.set({
        ...overview,
        sensors: overview.sensors.map((sensor) => {
          if (sensor.id !== event.payload.sensorId) {
            return sensor;
          }

          return {
            ...sensor,
            metric: event.payload.metric,
            status: sensor.status === 'unknown' ? 'ok' : sensor.status,
            ts: event.payload.ts,
            unit: event.payload.unit,
            value: event.payload.value,
          };
        }),
      });
      return;
    }

    this.overviewState.set({
      ...overview,
      openAlerts: this.resolveOpenAlertsCount(
        overview.openAlerts,
        event.payload.id,
        event.payload.status,
      ),
    });
  }

  private resolveOpenAlertsCount(
    currentOpenAlerts: number,
    alertId: string,
    status: AlertStatus,
  ): number {
    const previous = this.alertStatusById.get(alertId);
    this.alertStatusById.set(alertId, status);

    const wasOpen = previous === 'open';
    const isOpen = status === 'open';

    if (isOpen && !wasOpen) {
      return currentOpenAlerts + 1;
    }

    if (!isOpen && wasOpen) {
      return Math.max(0, currentOpenAlerts - 1);
    }

    if (!isOpen && previous === undefined) {
      return Math.max(0, currentOpenAlerts - 1);
    }

    return currentOpenAlerts;
  }
}
