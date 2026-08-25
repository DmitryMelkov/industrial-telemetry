import {
  clampAlertListLimit,
  clampAlertListOffset,
  decideAlertGate,
  emptyAlertGatePending,
  parseAlertSeverity,
  parseAlertStatus,
  parseEnvSeconds,
  parseIsoDate,
  type AlertGatePending,
} from './alerts';

const t0 = Date.parse('2026-08-25T12:00:00.000Z');
const debounceMs = 20_000;
const hysteresisMs = 20_000;

const decide = (
  violated: boolean,
  hasActiveAlert: boolean,
  nowMs: number,
  pending: AlertGatePending = emptyAlertGatePending(),
  openDebounceMs = debounceMs,
  resolveHysteresisMs = hysteresisMs,
) =>
  decideAlertGate({
    violated,
    hasActiveAlert,
    nowMs,
    pending,
    openDebounceMs,
    resolveHysteresisMs,
  });

describe('alert anti-flap', () => {
  it('does not open a second alert while one is already open/acked', () => {
    expect(decide(true, true, t0)).toEqual({
      action: 'none',
      pending: emptyAlertGatePending(),
    });
    expect(decide(true, true, t0 + 60_000)).toEqual({
      action: 'none',
      pending: emptyAlertGatePending(),
    });
  });

  it('does not open until the violation holds for the debounce window', () => {
    const started = decide(true, false, t0);
    expect(started).toEqual({
      action: 'none',
      pending: { pendingOpenSinceMs: t0, pendingResolveSinceMs: null },
    });

    expect(decide(true, false, t0 + 19_999, started.pending)).toEqual({
      action: 'none',
      pending: { pendingOpenSinceMs: t0, pendingResolveSinceMs: null },
    });
  });

  it('opens after a continuous violation of N seconds', () => {
    const started = decide(true, false, t0);
    expect(decide(true, false, t0 + debounceMs, started.pending)).toEqual({
      action: 'open',
      pending: emptyAlertGatePending(),
    });
  });

  it('resets debounce when the value returns to normal before open', () => {
    const started = decide(true, false, t0);
    const cleared = decide(false, false, t0 + 5_000, started.pending);
    expect(cleared).toEqual({ action: 'none', pending: emptyAlertGatePending() });

    const restarted = decide(true, false, t0 + 6_000, cleared.pending);
    expect(restarted.action).toBe('none');
    expect(restarted.pending.pendingOpenSinceMs).toBe(t0 + 6_000);
    expect(decide(true, false, t0 + 6_000 + 19_999, restarted.pending).action).toBe('none');
  });

  it('does not resolve until normal holds for the hysteresis window', () => {
    const started = decide(false, true, t0);
    expect(started).toEqual({
      action: 'none',
      pending: { pendingOpenSinceMs: null, pendingResolveSinceMs: t0 },
    });

    expect(decide(false, true, t0 + 19_999, started.pending).action).toBe('none');
  });

  it('resolves after M seconds of continuous normal', () => {
    const started = decide(false, true, t0);
    expect(decide(false, true, t0 + hysteresisMs, started.pending)).toEqual({
      action: 'resolve',
      pending: emptyAlertGatePending(),
    });
  });

  it('does not flap open/resolve when the value chatters around the threshold', () => {
    const opened = decide(true, false, t0 + debounceMs, {
      pendingOpenSinceMs: t0,
      pendingResolveSinceMs: null,
    });
    expect(opened.action).toBe('open');

    const briefNormal = decide(false, true, t0 + debounceMs + 1_000);
    expect(briefNormal.action).toBe('none');

    const backOver = decide(true, true, t0 + debounceMs + 2_000, briefNormal.pending);
    expect(backOver).toEqual({ action: 'none', pending: emptyAlertGatePending() });

    expect(decide(false, true, t0 + debounceMs + 3_000, backOver.pending).action).toBe('none');
  });

  it('opens immediately when debounce is 0', () => {
    expect(decide(true, false, t0, emptyAlertGatePending(), 0, hysteresisMs).action).toBe('open');
  });

  it('does not resolve when there is no active alert', () => {
    expect(decide(false, false, t0)).toEqual({
      action: 'none',
      pending: emptyAlertGatePending(),
    });
  });
});

describe('alert journal query helpers', () => {
  it('parses known status and severity', () => {
    expect(parseAlertStatus('open')).toBe('open');
    expect(parseAlertStatus('acked')).toBe('acked');
    expect(parseAlertStatus('nope')).toBeUndefined();
    expect(parseAlertSeverity('critical')).toBe('critical');
    expect(parseAlertSeverity('info')).toBeUndefined();
  });

  it('clamps list pagination', () => {
    expect(clampAlertListLimit(undefined)).toBe(100);
    expect(clampAlertListLimit(0)).toBe(1);
    expect(clampAlertListLimit(900)).toBe(500);
    expect(clampAlertListOffset(undefined)).toBe(0);
    expect(clampAlertListOffset(-3)).toBe(0);
    expect(clampAlertListOffset(12.9)).toBe(12);
  });

  it('parses env seconds with a fallback', () => {
    expect(parseEnvSeconds(undefined, 20)).toBe(20);
    expect(parseEnvSeconds('15', 20)).toBe(15);
    expect(parseEnvSeconds('0', 20)).toBe(0);
    expect(parseEnvSeconds('-1', 20)).toBe(20);
    expect(parseEnvSeconds('nope', 20)).toBe(20);
  });

  it('parses ISO openedAt bounds', () => {
    expect(parseIsoDate('2026-08-25T12:00:00.000Z')?.toISOString()).toBe(
      '2026-08-25T12:00:00.000Z',
    );
    expect(parseIsoDate('not-a-date')).toBeUndefined();
    expect(parseIsoDate('')).toBeUndefined();
  });
});
