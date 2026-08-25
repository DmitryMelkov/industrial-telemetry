import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { DEMO_SITE_ID } from '../../core/config/demo-site';
import { RealtimeEvent, RealtimeService } from '../../core/realtime/realtime.service';
import {
  AlertItem,
  AlertSeverity,
  AlertStatus,
  RealtimeAlertPayload,
} from '../../shared/types/api.types';
import {
  AlertsPeriodFilter,
  AlertsSeverityFilter,
  AlertsStatusFilter,
  buildAlertsListQuery,
  matchesAlertFilters,
} from './alerts-query';

export type { AlertsPeriodFilter, AlertsSeverityFilter, AlertsStatusFilter };

@Injectable()
export class AlertsService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertsApiService = inject(AlertsApiService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly selectedSiteId = signal(DEMO_SITE_ID);
  private readonly alertsState = signal<AlertItem[]>([]);
  readonly statusFilter = signal<AlertsStatusFilter>('all');
  readonly severityFilter = signal<AlertsSeverityFilter>('all');
  readonly periodFilter = signal<AlertsPeriodFilter>('all');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly ackingAlertId = signal<string | null>(null);
  readonly pendingLiveCount = signal(0);
  readonly alerts = this.alertsState.asReadonly();
  readonly hasAlerts = computed(() => this.alertsState().length > 0);

  constructor() {
    this.realtimeService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.applyRealtimeEvent(event));
  }

  readonly initialize = (siteId = DEMO_SITE_ID): void => {
    this.selectedSiteId.set(siteId);
    this.realtimeService.connect(siteId);
    this.loadAlerts();
  };

  readonly setStatusFilter = (status: AlertsStatusFilter): void => {
    if (this.statusFilter() === status) {
      return;
    }

    this.statusFilter.set(status);
    this.loadAlerts();
  };

  readonly setSeverityFilter = (severity: AlertsSeverityFilter): void => {
    if (this.severityFilter() === severity) {
      return;
    }

    this.severityFilter.set(severity);
    this.loadAlerts();
  };

  readonly setPeriodFilter = (period: AlertsPeriodFilter): void => {
    if (this.periodFilter() === period) {
      return;
    }

    this.periodFilter.set(period);
    this.loadAlerts();
  };

  readonly loadAlerts = (): void => {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.alertsApiService
      .listAlerts(
        buildAlertsListQuery({
          siteId: this.selectedSiteId(),
          status: this.statusFilter(),
          severity: this.severityFilter(),
          period: this.periodFilter(),
        }),
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (alerts) => {
          this.alertsState.set(alerts.map((alert) => this.normalizeAlert(alert)));
          this.pendingLiveCount.set(0);
        },
        error: () => {
          this.alertsState.set([]);
          this.errorMessage.set('Не удалось загрузить журнал алертов. Попробуйте обновить.');
        },
      });
  };

  readonly ackAlert = (alertId: string): void => {
    if (this.ackingAlertId() !== null) {
      return;
    }

    this.ackingAlertId.set(alertId);
    this.alertsApiService
      .ackAlert(alertId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ackingAlertId.set(null)),
      )
      .subscribe({
        next: (alert) => this.upsertListedAlert(this.normalizeAlert(alert)),
        error: () => {
          this.errorMessage.set('Не удалось подтвердить алерт. Повторите попытку.');
        },
      });
  };

  readonly statusLabel = (status: AlertStatus): string => {
    if (status === 'acked') {
      return 'Подтверждён';
    }

    if (status === 'resolved') {
      return 'Снят';
    }

    return 'Открыт';
  };

  readonly severityLabel = (severity: AlertSeverity): string =>
    severity === 'critical' ? 'Критично' : 'Предупреждение';

  private applyRealtimeEvent(event: RealtimeEvent): void {
    if (event.type !== 'alert' || event.payload.siteId !== this.selectedSiteId()) {
      return;
    }

    const nextAlert = this.fromRealtimePayload(event.payload);
    const alreadyListed = this.alertsState().some((item) => item.id === nextAlert.id);
    if (alreadyListed) {
      this.upsertListedAlert(nextAlert);
      return;
    }

    this.pendingLiveCount.update((count) => count + 1);
  }

  private upsertListedAlert(alert: AlertItem): void {
    const matchesFilter = matchesAlertFilters(alert, this.statusFilter(), this.severityFilter());

    this.alertsState.update((alerts) => {
      const withoutCurrent = alerts.filter((item) => item.id !== alert.id);
      if (!matchesFilter) {
        return withoutCurrent;
      }

      return [alert, ...withoutCurrent].sort(
        (left, right) => Date.parse(right.openedAt) - Date.parse(left.openedAt),
      );
    });
  }

  private fromRealtimePayload(payload: RealtimeAlertPayload): AlertItem {
    return this.normalizeAlert({
      id: payload.id,
      sensorId: payload.sensorId,
      severity: payload.severity,
      status: payload.status,
      message: payload.message,
      value: payload.value,
      openedAt: payload.openedAt,
      resolvedAt: payload.status === 'resolved' ? payload.openedAt : null,
      siteId: payload.siteId,
    });
  }

  private normalizeAlert(alert: AlertItem): AlertItem {
    return {
      ...alert,
      value: Number(alert.value),
      openedAt: String(alert.openedAt),
      resolvedAt:
        alert.resolvedAt === null || alert.resolvedAt === undefined
          ? null
          : String(alert.resolvedAt),
    };
  }
}
