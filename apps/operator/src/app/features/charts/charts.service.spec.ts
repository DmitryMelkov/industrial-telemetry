import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HistoryApiService } from '../../core/api/history-api.service';
import { OverviewApiService } from '../../core/api/overview-api.service';
import { SensorsApiService } from '../../core/api/sensors-api.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import {
  RealtimeAlertPayload,
  RealtimeTelemetryPayload,
  SensorDetailResponse,
  SensorHistoryResponse,
  SiteOverviewResponse,
} from '../../shared/types/api.types';
import { HISTORY_LIMIT } from './charts-range';
import { ChartsService } from './charts.service';

describe('ChartsService', () => {
  const NOW = Date.parse('2026-08-24T08:00:00.000Z');

  let service: ChartsService;
  let overviewApiService: { getOverview: ReturnType<typeof vi.fn> };
  let historyApiService: { getHistory: ReturnType<typeof vi.fn> };
  let sensorsApiService: { getSensor: ReturnType<typeof vi.fn> };
  let realtimeEvents$: Subject<
    | { type: 'telemetry'; payload: RealtimeTelemetryPayload }
    | { type: 'alert'; payload: RealtimeAlertPayload }
  >;

  const overviewResponse: SiteOverviewResponse = {
    siteId: '11111111-1111-1111-1111-111111111111',
    openAlerts: 0,
    sensors: [
      {
        id: 'sensor-1',
        code: 'T-101',
        metric: 'temperature',
        status: 'ok',
        ts: '2026-08-24T07:00:00.000Z',
        unit: 'C',
        value: 72,
      },
    ],
  };

  const historyResponse: SensorHistoryResponse = {
    sensor: {
      id: 'sensor-1',
      code: 'T-101',
      name: 'Oven temperature',
      metric: 'temperature',
      unit: 'C',
    },
    points: [
      {
        sensorId: 'sensor-1',
        siteId: overviewResponse.siteId,
        metric: 'temperature',
        ts: '2026-08-24T07:00:00.000Z',
        unit: 'C',
        value: 70,
      },
    ],
  };

  const sensorDetail: SensorDetailResponse = {
    id: 'sensor-1',
    code: 'T-101',
    name: 'Oven temperature',
    metric: 'temperature',
    unit: 'C',
    thresholds: [
      {
        id: 'th-1',
        sensorId: 'sensor-1',
        minValue: '60.0000',
        maxValue: '90.0000',
        severity: 'warning',
      },
      {
        id: 'th-2',
        sensorId: 'sensor-1',
        minValue: '50.0000',
        maxValue: '100.0000',
        severity: 'critical',
      },
    ],
  };

  const telemetryEvent = (
    value: number,
    ts: string,
  ): { type: 'telemetry'; payload: RealtimeTelemetryPayload } => ({
    type: 'telemetry',
    payload: {
      sensorId: 'sensor-1',
      siteId: overviewResponse.siteId,
      value,
      unit: 'C',
      metric: 'temperature',
      ts,
    },
  });

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    overviewApiService = { getOverview: vi.fn() };
    historyApiService = { getHistory: vi.fn() };
    sensorsApiService = { getSensor: vi.fn() };
    realtimeEvents$ = new Subject();

    TestBed.configureTestingModule({
      providers: [
        ChartsService,
        { provide: OverviewApiService, useValue: overviewApiService },
        { provide: HistoryApiService, useValue: historyApiService },
        { provide: SensorsApiService, useValue: sensorsApiService },
        {
          provide: RealtimeService,
          useValue: {
            connect: vi.fn(),
            disconnect: vi.fn(),
            events$: realtimeEvents$,
          },
        },
      ],
    });

    overviewApiService.getOverview.mockReturnValue(of(overviewResponse));
    historyApiService.getHistory.mockReturnValue(of(historyResponse));
    sensorsApiService.getSensor.mockReturnValue(of(sensorDetail));
    service = TestBed.inject(ChartsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load history after initialize', () => {
    service.initialize();

    expect(service.errorMessage()).toBe('');
    expect(service.hasSeries()).toBe(true);
    expect(service.series()[0]?.code).toBe('T-101');
  });

  it('should request 1h history window on initialize', () => {
    service.initialize();

    expect(historyApiService.getHistory).toHaveBeenCalledWith('sensor-1', {
      from: '2026-08-24T07:00:00.000Z',
      to: '2026-08-24T08:00:00.000Z',
      limit: HISTORY_LIMIT,
    });
  });

  it('should load primary sensor thresholds', () => {
    service.initialize();

    expect(sensorsApiService.getSensor).toHaveBeenCalledWith('sensor-1');
    expect(service.primaryThresholds()).toEqual([
      { severity: 'warning', minValue: 60, maxValue: 90 },
      { severity: 'critical', minValue: 50, maxValue: 100 },
    ]);
  });

  it('should expose error state when overview fails', () => {
    overviewApiService.getOverview.mockReturnValue(throwError(() => new Error('boom')));

    service.initialize();

    expect(service.isLoading()).toBe(false);
    expect(service.errorMessage()).toContain('Не удалось загрузить список датчиков');
  });

  it('should snap live 6h points into the current minute bucket', () => {
    service.initialize();
    service.setRangePreset('6h');

    realtimeEvents$.next(telemetryEvent(10, '2026-08-24T07:00:10.000Z'));
    realtimeEvents$.next(telemetryEvent(20, '2026-08-24T07:00:40.000Z'));

    const points = service.series()[0]?.points ?? [];
    const bucketX = Date.parse('2026-08-24T07:00:00.000Z');
    expect(points.filter((point) => point.x === bucketX)).toHaveLength(1);
    expect(points.find((point) => point.x === bucketX)?.y).toBe(20);
  });

  it('should reload history when range preset changes', () => {
    service.initialize();
    historyApiService.getHistory.mockClear();

    service.setRangePreset('6h');

    expect(historyApiService.getHistory).toHaveBeenCalledWith('sensor-1', {
      from: '2026-08-24T02:00:00.000Z',
      to: '2026-08-24T08:00:00.000Z',
      limit: HISTORY_LIMIT,
    });
  });

  it('should reject custom range when from is not before to', () => {
    service.initialize();
    historyApiService.getHistory.mockClear();

    const applied = service.applyCustomRange(
      '2026-08-24T08:00:00.000Z',
      '2026-08-24T07:00:00.000Z',
    );

    expect(applied).toBe(false);
    expect(service.customRangeError()).toContain('Начало периода');
    expect(historyApiService.getHistory).not.toHaveBeenCalled();
  });

  it('should not append live points for custom range with to in the past', () => {
    service.initialize();
    service.applyCustomRange('2026-08-24T06:00:00.000Z', '2026-08-24T07:00:00.000Z');

    realtimeEvents$.next(telemetryEvent(99, '2026-08-24T07:50:00.000Z'));

    expect(service.liveAppendEnabled()).toBe(false);
    expect(service.series()[0]?.points.at(-1)?.y).toBe(70);
  });

  it('should surface partial history failures without dropping successful series', () => {
    overviewApiService.getOverview.mockReturnValue(
      of({
        ...overviewResponse,
        sensors: [
          ...overviewResponse.sensors,
          {
            id: 'sensor-2',
            code: 'P-201',
            metric: 'pressure',
            status: 'ok',
            ts: '2026-08-24T07:00:00.000Z',
            unit: 'bar',
            value: 2.1,
          },
        ],
      }),
    );
    historyApiService.getHistory.mockImplementation((sensorId: string) => {
      if (sensorId === 'sensor-1') {
        return of(historyResponse);
      }

      return throwError(() => new Error('history failed'));
    });

    service.initialize();
    service.toggleSensor('sensor-2');

    expect(service.hasSeries()).toBe(true);
    expect(service.series()[0]?.code).toBe('T-101');
    expect(service.errorMessage()).toContain('P-201');
  });
});
