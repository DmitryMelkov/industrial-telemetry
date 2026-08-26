import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { DEMO_SITE_ID } from '../../core/config/demo-site';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { createSelectedSiteServiceMock } from '../../core/site/selected-site.service.mock';
import { SelectedSiteService } from '../../core/site/selected-site.service';
import {
  AlertItem,
  RealtimeAlertPayload,
  RealtimeTelemetryPayload,
} from '../../shared/types/api.types';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertsApiService: {
    listAlerts: ReturnType<typeof vi.fn>;
    ackAlert: ReturnType<typeof vi.fn>;
  };
  let realtimeEvents$: Subject<
    | { type: 'telemetry'; payload: RealtimeTelemetryPayload }
    | { type: 'alert'; payload: RealtimeAlertPayload }
  >;

  const openAlert: AlertItem = {
    id: 'alert-1',
    sensorId: 'sensor-1',
    severity: 'critical',
    status: 'open',
    message: 'T-101 above maximum',
    value: 95.2,
    openedAt: '2026-08-24T08:00:00.000Z',
    resolvedAt: null,
    sensor: {
      id: 'sensor-1',
      code: 'T-101',
      name: 'Oven temperature',
      metric: 'temperature',
      unit: 'C',
    },
  };

  beforeEach(() => {
    alertsApiService = {
      listAlerts: vi.fn().mockReturnValue(of([])),
      ackAlert: vi.fn(),
    };
    realtimeEvents$ = new Subject();
    const selectedSite = createSelectedSiteServiceMock();

    TestBed.configureTestingModule({
      providers: [
        AlertsService,
        { provide: AlertsApiService, useValue: alertsApiService },
        {
          provide: RealtimeService,
          useValue: {
            connect: vi.fn(),
            disconnect: vi.fn(),
            events$: realtimeEvents$,
          },
        },
        { provide: SelectedSiteService, useValue: selectedSite.mock },
      ],
    });

    service = TestBed.inject(AlertsService);
  });

  it('should load journal after initialize', () => {
    alertsApiService.listAlerts.mockReturnValue(of([openAlert]));

    service.initialize();

    expect(alertsApiService.listAlerts).toHaveBeenCalledWith({ siteId: DEMO_SITE_ID });
    expect(service.errorMessage()).toBe('');
    expect(service.hasAlerts()).toBe(true);
    expect(service.alerts()[0]?.message).toBe('T-101 above maximum');
  });

  it('should expose error state when list fails', () => {
    alertsApiService.listAlerts.mockReturnValue(throwError(() => new Error('boom')));

    service.initialize();

    expect(service.isLoading()).toBe(false);
    expect(service.errorMessage()).toContain('Не удалось загрузить журнал алертов');
  });

  it('should ack alert and keep the row when status filter is all', () => {
    alertsApiService.listAlerts.mockReturnValue(of([openAlert]));
    alertsApiService.ackAlert.mockReturnValue(
      of({
        ...openAlert,
        status: 'acked',
      }),
    );

    service.initialize();
    service.ackAlert('alert-1');

    expect(alertsApiService.ackAlert).toHaveBeenCalledWith('alert-1');
    expect(service.alerts()[0]?.status).toBe('acked');
  });

  it('should remove acked row when status filter is open', () => {
    alertsApiService.listAlerts.mockReturnValue(of([openAlert]));
    alertsApiService.ackAlert.mockReturnValue(of({ ...openAlert, status: 'acked' }));

    service.initialize();
    service.setStatusFilter('open');
    service.ackAlert('alert-1');

    expect(service.alerts()).toEqual([]);
  });

  it('should pass severity and period filters to the API', () => {
    alertsApiService.listAlerts.mockReturnValue(of([]));
    service.initialize();

    service.setSeverityFilter('critical');
    expect(alertsApiService.listAlerts).toHaveBeenLastCalledWith({
      siteId: DEMO_SITE_ID,
      severity: 'critical',
    });

    service.setPeriodFilter('1h');
    const lastQuery = alertsApiService.listAlerts.mock.lastCall?.[0] as {
      from?: string;
      to?: string;
      severity?: string;
    };
    expect(lastQuery.severity).toBe('critical');
    expect(lastQuery.from).toEqual(expect.any(String));
    expect(lastQuery.to).toEqual(expect.any(String));
  });

  it('should not insert realtime alerts into the journal', () => {
    alertsApiService.listAlerts.mockReturnValue(of([]));

    service.initialize();
    realtimeEvents$.next({
      type: 'alert',
      payload: {
        id: 'alert-2',
        sensorId: 'sensor-2',
        siteId: DEMO_SITE_ID,
        severity: 'warning',
        status: 'open',
        message: 'P-201 above maximum',
        value: 6.1,
        openedAt: '2026-08-24T08:10:00.000Z',
      },
    });

    expect(service.hasAlerts()).toBe(false);
    expect(service.pendingLiveCount()).toBe(1);
  });

  it('should update an already listed alert from realtime', () => {
    alertsApiService.listAlerts.mockReturnValue(of([openAlert]));

    service.initialize();
    realtimeEvents$.next({
      type: 'alert',
      payload: {
        id: 'alert-1',
        sensorId: 'sensor-1',
        siteId: DEMO_SITE_ID,
        severity: 'critical',
        status: 'resolved',
        message: 'T-101 above maximum',
        value: 72,
        openedAt: '2026-08-24T08:00:00.000Z',
      },
    });

    expect(service.alerts()[0]?.status).toBe('resolved');
    expect(service.pendingLiveCount()).toBe(0);
  });
});
