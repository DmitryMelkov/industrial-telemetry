import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import {
  AlertsPeriodFilter,
  AlertsService,
  AlertsSeverityFilter,
  AlertsStatusFilter,
} from './alerts.service';

@Component({
  selector: 'app-alerts',
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AlertsService],
})
export class AlertsComponent {
  readonly alertsService = inject(AlertsService);
  private readonly router = inject(Router);
  readonly displayedColumns = [
    'openedAt',
    'sensor',
    'severity',
    'message',
    'value',
    'status',
    'actions',
  ];
  readonly statusFilters: Array<{ id: AlertsStatusFilter; label: string }> = [
    { id: 'all', label: 'Все' },
    { id: 'open', label: 'Открытые' },
    { id: 'acked', label: 'Подтверждённые' },
    { id: 'resolved', label: 'Снятые' },
  ];
  readonly severityFilters: Array<{ id: AlertsSeverityFilter; label: string }> = [
    { id: 'all', label: 'Все' },
    { id: 'warning', label: 'Warning' },
    { id: 'critical', label: 'Critical' },
  ];
  readonly periodFilters: Array<{ id: AlertsPeriodFilter; label: string }> = [
    { id: 'all', label: 'Весь период' },
    { id: '1h', label: '1ч' },
    { id: '6h', label: '6ч' },
    { id: '24h', label: '24ч' },
  ];

  constructor() {
    this.alertsService.initialize();
  }

  onStatusChange = (event: MatButtonToggleChange): void => {
    this.alertsService.setStatusFilter(event.value as AlertsStatusFilter);
  };

  onSeverityChange = (event: MatButtonToggleChange): void => {
    this.alertsService.setSeverityFilter(event.value as AlertsSeverityFilter);
  };

  onPeriodChange = (event: MatButtonToggleChange): void => {
    this.alertsService.setPeriodFilter(event.value as AlertsPeriodFilter);
  };

  openChart = (sensorId: string): void => {
    void this.router.navigate(['/charts'], { queryParams: { sensorId } });
  };

  ackAlert = (event: Event, alertId: string): void => {
    event.stopPropagation();
    this.alertsService.ackAlert(alertId);
  };
}
