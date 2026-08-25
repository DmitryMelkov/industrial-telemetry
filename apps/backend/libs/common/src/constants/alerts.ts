/** Anti-flap for alert-consumer and journal query helpers. No extra alerts DB. */

export const DEFAULT_ALERT_OPEN_DEBOUNCE_SECONDS = 20;
export const DEFAULT_ALERT_RESOLVE_HYSTERESIS_SECONDS = 20;

export const ALERT_LIST_DEFAULT_LIMIT = 100;
export const ALERT_LIST_MAX_LIMIT = 500;

export const ALERT_STATUSES = ['open', 'acked', 'resolved'] as const;
export type AlertStatusFilter = (typeof ALERT_STATUSES)[number];

export const ALERT_SEVERITIES = ['warning', 'critical'] as const;
export type AlertSeverityFilter = (typeof ALERT_SEVERITIES)[number];

export type AlertGateAction = 'none' | 'open' | 'resolve';

export interface AlertGatePending {
  pendingOpenSinceMs: number | null;
  pendingResolveSinceMs: number | null;
}

export const emptyAlertGatePending = (): AlertGatePending => ({
  pendingOpenSinceMs: null,
  pendingResolveSinceMs: null,
});

export const isAlertGateIdle = (pending: AlertGatePending): boolean =>
  pending.pendingOpenSinceMs === null && pending.pendingResolveSinceMs === null;

export const parseEnvSeconds = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return value;
};

export const parseAlertStatus = (value?: string): AlertStatusFilter | undefined => {
  if (value === 'open' || value === 'acked' || value === 'resolved') {
    return value;
  }

  return undefined;
};

export const parseAlertSeverity = (value?: string): AlertSeverityFilter | undefined => {
  if (value === 'warning' || value === 'critical') {
    return value;
  }

  return undefined;
};

export const clampAlertListLimit = (limit?: number): number => {
  if (limit === undefined || !Number.isFinite(limit)) {
    return ALERT_LIST_DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), ALERT_LIST_MAX_LIMIT);
};

export const clampAlertListOffset = (offset?: number): number => {
  if (offset === undefined || !Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return Math.trunc(offset);
};

export const parseIsoDate = (value?: string): Date | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    return undefined;
  }

  return new Date(ms);
};

/**
 * Debounce before open, hysteresis before resolve, never a second open
 * while `(sensorId, severity)` already has open/acked.
 */
export const decideAlertGate = (input: {
  violated: boolean;
  hasActiveAlert: boolean;
  nowMs: number;
  pending: AlertGatePending;
  openDebounceMs: number;
  resolveHysteresisMs: number;
}): { action: AlertGateAction; pending: AlertGatePending } => {
  if (input.violated) {
    if (input.hasActiveAlert) {
      return { action: 'none', pending: emptyAlertGatePending() };
    }

    const pendingOpenSinceMs = input.pending.pendingOpenSinceMs ?? input.nowMs;
    if (input.nowMs - pendingOpenSinceMs >= input.openDebounceMs) {
      return { action: 'open', pending: emptyAlertGatePending() };
    }

    return {
      action: 'none',
      pending: { pendingOpenSinceMs, pendingResolveSinceMs: null },
    };
  }

  if (!input.hasActiveAlert) {
    return { action: 'none', pending: emptyAlertGatePending() };
  }

  const pendingResolveSinceMs = input.pending.pendingResolveSinceMs ?? input.nowMs;
  if (input.nowMs - pendingResolveSinceMs >= input.resolveHysteresisMs) {
    return { action: 'resolve', pending: emptyAlertGatePending() };
  }

  return {
    action: 'none',
    pending: { pendingOpenSinceMs: null, pendingResolveSinceMs },
  };
};
