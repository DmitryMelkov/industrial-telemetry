import {
  HISTORY_BUCKET_1H_MS,
  HISTORY_BUCKET_1M_MS,
  HISTORY_BUCKET_5M_MS,
  HISTORY_BUCKET_15M_MS,
  mapHistoryBucket,
  parseHistoryInterval,
  resolveHistoryBucketMs,
} from './history-downsample';

describe('history-downsample', () => {
  const to = '2026-08-25T12:00:00.000Z';
  const toMs = Date.parse(to);

  it('parses known intervals and falls back to auto', () => {
    expect(parseHistoryInterval('1m')).toBe('1m');
    expect(parseHistoryInterval('raw')).toBe('raw');
    expect(parseHistoryInterval('nope')).toBe('auto');
    expect(parseHistoryInterval(undefined)).toBe('auto');
  });

  it('keeps windows up to 2h as raw', () => {
    expect(resolveHistoryBucketMs(new Date(toMs - 60 * 60 * 1000).toISOString(), to)).toBeNull();
    expect(
      resolveHistoryBucketMs(new Date(toMs - 2 * 60 * 60 * 1000).toISOString(), to),
    ).toBeNull();
  });

  it('selects 1m / 5m / 15m / 1h by duration', () => {
    expect(resolveHistoryBucketMs(new Date(toMs - 6 * 60 * 60 * 1000).toISOString(), to)).toBe(
      HISTORY_BUCKET_1M_MS,
    );
    expect(resolveHistoryBucketMs(new Date(toMs - 24 * 60 * 60 * 1000).toISOString(), to)).toBe(
      HISTORY_BUCKET_5M_MS,
    );
    expect(resolveHistoryBucketMs(new Date(toMs - 3 * 24 * 60 * 60 * 1000).toISOString(), to)).toBe(
      HISTORY_BUCKET_15M_MS,
    );
    expect(
      resolveHistoryBucketMs(new Date(toMs - 10 * 24 * 60 * 60 * 1000).toISOString(), to),
    ).toBe(HISTORY_BUCKET_1H_MS);
  });

  it('does not bucket the whole collection without from/to', () => {
    expect(resolveHistoryBucketMs(undefined, to, '1m')).toBeNull();
    expect(resolveHistoryBucketMs()).toBeNull();
  });

  it('honors explicit interval when from/to are present', () => {
    expect(resolveHistoryBucketMs(new Date(toMs - 60 * 60 * 1000).toISOString(), to, '5m')).toBe(
      HISTORY_BUCKET_5M_MS,
    );
    expect(
      resolveHistoryBucketMs(new Date(toMs - 24 * 60 * 60 * 1000).toISOString(), to, 'raw'),
    ).toBeNull();
  });

  it('maps bucket row to ISO point', () => {
    expect(
      mapHistoryBucket({
        _id: toMs,
        value: 72.4,
        unit: 'C',
        metric: 'temperature',
        sensorId: 'sensor-1',
        siteId: 'site-1',
      }),
    ).toEqual({
      sensorId: 'sensor-1',
      siteId: 'site-1',
      value: 72.4,
      unit: 'C',
      metric: 'temperature',
      ts: to,
    });
  });
});
