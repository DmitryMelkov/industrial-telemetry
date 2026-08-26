import { DestroyRef, computed, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, finalize } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { RealtimeEvent, RealtimeService } from '../../core/realtime/realtime.service';
import { SelectedSiteService } from '../../core/site/selected-site.service';
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
  private readonly selectedSiteService = inject(SelectedSiteService);
  private readonly selectedSiteId = signal('');
  private readonly alertsState = signal<AlertItem[]>([]);
  private siteWatchEnabled = false;
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

        this.applySite(siteId);
      });
  }

  readonly initialize = (): void => {
    this.selectedSiteService.ensureLoaded();
    this.siteWatchEnabled = true;
    const siteId = this.selectedSiteService.siteId();
    if (siteId) {
      this.applySite(siteId);
    }
  };

  private applySite = (siteId: string): void => {
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
    const siteId = this.selectedSiteId() || this.selectedSiteService.siteId();
    if (!siteId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.alertsApiService
      .listAlerts(
        buildAlertsListQuery({
          siteId,
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
          if (this.selectedSiteId() !== siteId) {
            return;
          }

          this.alertsState.set(alerts.map((alert) => this.normalizeAlert(alert)));
          this.pendingLiveCount.set(0);
        },
        error: () => {
          if (this.selectedSiteId() !== siteId) {
            return;
          }

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
