import {
  applyCalendarDate,
  applyClockTime,
  formatChartWindowCaption,
  fromDateOrNull,
  HISTORY_LIMIT,
  isLiveWindow,
  resolveChartXRange,
  resolveHistoryBucketMs,
  resolvePresetWindow,
  toChartThresholds,
  toDateOrNull,
} from './charts-range';

describe('charts-range', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  it('should resolve preset from/to relative to now', () => {
    expect(resolvePresetWindow('1h', now)).toEqual({
      from: '2026-08-25T11:00:00.000Z',
      to: '2026-08-25T12:00:00.000Z',
    });
    expect(resolvePresetWindow('6h', now)).toEqual({
      from: '2026-08-25T06:00:00.000Z',
      to: '2026-08-25T12:00:00.000Z',
    });
    expect(resolvePresetWindow('24h', now)).toEqual({
      from: '2026-08-24T12:00:00.000Z',
      to: '2026-08-25T12:00:00.000Z',
    });
  });

  it('should treat presets as live windows and past custom as historical', () => {
    expect(isLiveWindow('1h', null, now)).toBe(true);
    expect(isLiveWindow('custom', '2026-08-25T12:00:00.000Z', now)).toBe(true);
    expect(isLiveWindow('custom', '2026-08-25T11:00:00.000Z', now)).toBe(false);
  });

  it('should coerce decimal threshold strings from API', () => {
    expect(
      toChartThresholds([
        {
          id: 'th-1',
          sensorId: 'sensor-1',
          minValue: '60.0000',
          maxValue: '90.0000',
          severity: 'warning',
        },
      ]),
    ).toEqual([{ severity: 'warning', minValue: 60, maxValue: 90 }]);
  });

  it('should keep history limit below backend max and cover 1h at 1Hz', () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(3600);
    expect(HISTORY_LIMIT).toBeLessThanOrEqual(5000);
  });

  it('should pick raw vs minute/5min buckets by window duration', () => {
    const now = Date.parse('2026-08-25T12:00:00.000Z');
    expect(resolveHistoryBucketMs(now - 60 * 60 * 1000, now)).toBeNull();
    expect(resolveHistoryBucketMs(now - 6 * 60 * 60 * 1000, now)).toBe(60 * 1000);
    expect(resolveHistoryBucketMs(now - 24 * 60 * 60 * 1000, now)).toBe(5 * 60 * 1000);
  });

  it('should bind chart X axis to the selected window, not data extent', () => {
    const now = Date.parse('2026-08-25T12:00:00.000Z');
    const hour = resolveChartXRange(now - 60 * 60 * 1000, now, false, now);
    const day = resolveChartXRange(now - 24 * 60 * 60 * 1000, now, false, now);

    expect(hour).toEqual({ min: now - 60 * 60 * 1000, max: now });
    expect(day).toEqual({ min: now - 24 * 60 * 60 * 1000, max: now });
    expect((day?.max ?? 0) - (day?.min ?? 0)).toBeGreaterThan((hour?.max ?? 0) - (hour?.min ?? 0));
  });

  it('should slide live axis to now while keeping window duration', () => {
    const from = Date.parse('2026-08-25T11:00:00.000Z');
    const to = Date.parse('2026-08-25T12:00:00.000Z');
    const now = Date.parse('2026-08-25T12:10:00.000Z');

    expect(resolveChartXRange(from, to, true, now)).toEqual({
      min: Date.parse('2026-08-25T11:10:00.000Z'),
      max: now,
    });
  });

  it('should format caption with point count', () => {
    expect(
      formatChartWindowCaption('2026-08-25T11:00:00.000Z', '2026-08-25T12:00:00.000Z', 3600),
    ).toContain('3600 точек');
  });

  it('should keep time when calendar date changes', () => {
    const current = new Date(2026, 7, 24, 16, 4, 0);
    const picked = new Date(2026, 7, 20, 0, 0, 0);
    const merged = applyCalendarDate(picked, current);

    expect(merged?.getFullYear()).toBe(2026);
    expect(merged?.getMonth()).toBe(7);
    expect(merged?.getDate()).toBe(20);
    expect(merged?.getHours()).toBe(16);
    expect(merged?.getMinutes()).toBe(4);
  });

  it('should keep date when clock time changes', () => {
    const current = new Date(2026, 7, 24, 16, 4, 0);
    const picked = new Date(2026, 0, 1, 19, 30, 0);
    const merged = applyClockTime(picked, current);

    expect(merged?.getDate()).toBe(24);
    expect(merged?.getHours()).toBe(19);
    expect(merged?.getMinutes()).toBe(30);
  });

  it('should round-trip ISO through Date helpers', () => {
    const iso = '2026-08-24T12:00:00.000Z';
    expect(fromDateOrNull(toDateOrNull(iso))).toBe(iso);
  });
});
