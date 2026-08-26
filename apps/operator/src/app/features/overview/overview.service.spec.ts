import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { OverviewApiService } from '../../core/api/overview-api.service';
import { DEMO_SITE_ID } from '../../core/config/demo-site';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { createSelectedSiteServiceMock } from '../../core/site/selected-site.service.mock';
import { SelectedSiteService } from '../../core/site/selected-site.service';
import {
  AlertItem,
  RealtimeAlertPayload,
  RealtimeTelemetryPayload,
  SiteOverviewResponse,
} from '../../shared/types/api.types';
import { OverviewService } from './overview.service';

describe('OverviewService', () => {
  let service: OverviewService;
  let overviewApiService: { getOverview: ReturnType<typeof vi.fn> };
  let alertsApiService: { listAlerts: ReturnType<typeof vi.fn> };
  let realtimeEvents$: Subject<
    | { type: 'telemetry'; payload: RealtimeTelemetryPayload }
    | { type: 'alert'; payload: RealtimeAlertPayload }
  >;
  let realtimeService: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    events$: Subject<
      | { type: 'telemetry'; payload: RealtimeTelemetryPayload }
      | { type: 'alert'; payload: RealtimeAlertPayload }
    >;
  };

  const overviewResponse: SiteOverviewResponse = {
    siteId: DEMO_SITE_ID,
    openAlerts: 2,
    sensors: [
      {
        id: 'sensor-1',
        code: 'T-101',
        metric: 'temperature',
        status: 'critical',
        ts: '2026-08-24T07:00:00.000Z',
        unit: 'C',
        value: 95.2,
      },
      {
        id: 'sensor-2',
        code: 'P-201',
        metric: 'pressure',
        status: 'ok',
        ts: null,
        unit: 'bar',
        value: null,
      },
    ],
  };

  const openAlertsResponse: AlertItem[] = [
    {
      id: 'alert-1',
      sensorId: 'sensor-1',
      siteId: overviewResponse.siteId,
      severity: 'critical',
      status: 'open',
      message: 'High temperature',
      value: 95.2,
      openedAt: '2026-08-24T07:00:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'alert-2',
      sensorId: 'sensor-1',
      siteId: overviewResponse.siteId,
      severity: 'warning',
      status: 'open',
      message: 'Warm',
      value: 80,
      openedAt: '2026-08-24T07:01:00.000Z',
      resolvedAt: null,
    },
  ];

  beforeEach(() => {
    overviewApiService = {
      getOverview: vi.fn().mockReturnValue(of(overviewResponse)),
    };
    alertsApiService = { listAlerts: vi.fn().mockReturnValue(of(openAlertsResponse)) };
    realtimeEvents$ = new Subject();
    realtimeService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      events$: realtimeEvents$,
    };
    const selectedSite = createSelectedSiteServiceMock();

    TestBed.configureTestingModule({
      providers: [
        OverviewService,
        { provide: OverviewApiService, useValue: overviewApiService },
        { provide: AlertsApiService, useValue: alertsApiService },
        { provide: RealtimeService, useValue: realtimeService },
        { provide: SelectedSiteService, useValue: selectedSite.mock },
      ],
    });

    service = TestBed.inject(OverviewService);
  });

  it('should expose summary after successful load', () => {
    overviewApiService.getOverview.mockReturnValue(of(overviewResponse));

    service.initialize();

    expect(service.errorMessage()).toBe('');
    expect(service.isLoading()).toBe(false);
    expect(service.hasSensors()).toBe(true);
    expect(service.overview()?.openAlerts).toBe(2);
    expect(realtimeService.connect).toHaveBeenCalledWith(DEMO_SITE_ID);
    expect(service.summary()).toEqual([
      { label: 'Всего датчиков', value: '2', tone: 'default' },
      { label: 'Передают данные', value: '1', tone: 'success' },
      { label: 'Нет сигнала', value: '1', tone: 'unknown' },
      { label: 'Открытые алерты', value: '2', tone: 'critical', route: '/alerts' },
      { label: 'Требуют внимания', value: '1', tone: 'critical' },
    ]);
    expect(service.statusCounts()).toEqual({
      online: 1,
      alarm: 1,
      noSignal: 1,
    });
  });

  it('should sort sensors by critical, warning, ok, then no signal', () => {
    overviewApiService.getOverview.mockReturnValue(
      of({
        ...overviewResponse,
        sensors: [
          {
            id: 'sensor-ok',
            code: 'OK-1',
            metric: 'pressure',
            status: 'ok',
            ts: '2026-08-24T07:00:00.000Z',
            unit: 'bar',
            value: 1.2,
          },
          {
            id: 'sensor-unknown',
            code: 'NS-1',
            metric: 'humidity',
            status: 'ok',
            ts: null,
            unit: '%',
            value: null,
          },
          {
            id: 'sensor-warning',
            code: 'W-1',
            metric: 'temperature',
            status: 'warning',
            ts: '2026-08-24T07:00:00.000Z',
            unit: 'C',
            value: 80,
          },
          {
            id: 'sensor-critical',
            code: 'C-1',
            metric: 'vibration',
            status: 'critical',
            ts: '2026-08-24T07:00:00.000Z',
            unit: 'mm/s',
            value: 12,
          },
        ],
      }),
    );

    service.initialize();

    expect(service.sensors().map((sensor) => sensor.id)).toEqual([
      'sensor-critical',
      'sensor-warning',
      'sensor-ok',
      'sensor-unknown',
    ]);
    expect(service.displayStatus(service.sensors()[3])).toBe('unknown');
  });

  it('should expose error state when request fails', () => {
    overviewApiService.getOverview.mockReturnValue(throwError(() => new Error('boom')));

    service.initialize();

    expect(service.isLoading()).toBe(false);
    expect(service.overview()).toBeNull();
    expect(service.errorMessage()).toContain('Не удалось загрузить обзор объекта');
  });

  it('should merge telemetry events into current overview', () => {
    overviewApiService.getOverview.mockReturnValue(of(overviewResponse));

    service.initialize();
    realtimeEvents$.next({
      type: 'telemetry',
      payload: {
        sensorId: 'sensor-2',
        siteId: '11111111-1111-1111-1111-111111111111',
        value: 12.4,
        unit: 'bar',
        metric: 'pressure',
        ts: '2026-08-24T08:15:00.000Z',
      },
    });

    expect(service.sensors()[1]).toMatchObject({
      id: 'sensor-2',
      metric: 'pressure',
      status: 'ok',
      ts: '2026-08-24T08:15:00.000Z',
      unit: 'bar',
      value: 12.4,
    });
    expect(service.summary()[1]).toEqual({
      label: 'Передают данные',
      value: '2',
      tone: 'success',
    });
  });

  it('should update openAlerts KPI from live alert events', () => {
    overviewApiService.getOverview.mockReturnValue(of(overviewResponse));

    service.initialize();
    expect(service.overview()?.openAlerts).toBe(2);

    realtimeEvents$.next({
      type: 'alert',
      payload: {
        id: 'alert-1',
        sensorId: 'sensor-1',
        siteId: overviewResponse.siteId,
        severity: 'critical',
        status: 'acked',
        message: 'High temperature',
        value: 95.2,
        openedAt: '2026-08-24T07:00:00.000Z',
      },
    });

    expect(service.overview()?.openAlerts).toBe(1);
    expect(service.summary()[3]).toEqual({
      label: 'Открытые алерты',
      value: '1',
      tone: 'critical',
      route: '/alerts',
    });

    realtimeEvents$.next({
      type: 'alert',
      payload: {
        id: 'alert-3',
        sensorId: 'sensor-2',
        siteId: overviewResponse.siteId,
        severity: 'warning',
        status: 'open',
        message: 'Pressure spike',
        value: 4.2,
        openedAt: '2026-08-24T08:20:00.000Z',
      },
    });

    expect(service.overview()?.openAlerts).toBe(2);
  });

  it('does not flip sensor card status from alert events', () => {
    overviewApiService.getOverview.mockReturnValue(of(overviewResponse));

    service.initialize();
    expect(service.sensors()[0]?.status).toBe('critical');

    realtimeEvents$.next({
      type: 'alert',
      payload: {
        id: 'alert-1',
        sensorId: 'sensor-1',
        siteId: overviewResponse.siteId,
        severity: 'warning',
        status: 'resolved',
        message: 'High temperature',
        value: 72,
        openedAt: '2026-08-24T07:00:00.000Z',
      },
    });

    expect(service.sensors()[0]?.status).toBe('critical');
    expect(service.overview()?.openAlerts).toBe(1);
  });
});
