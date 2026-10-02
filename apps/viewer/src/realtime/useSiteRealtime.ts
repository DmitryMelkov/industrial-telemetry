import { useQueryClient } from '@tanstack/vue-query';
import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { SiteOverview } from '@/api/sitesApi';
import { alertKeys } from '@/queries/useAlertsQuery';
import { overviewKeys } from '@/queries/useOverviewQuery';

type TelemetryPayload = {
  sensorId: string;
  siteId: string;
  value: number;
  unit: string;
  metric: string;
  ts: string;
};

type AlertStatus = 'open' | 'acked' | 'resolved';

type AlertPayload = {
  id: string;
  siteId: string;
  status: AlertStatus;
};

/** Общее состояние сокета: подписка живёт в AppShell, чип live читает тот же ref. */
export const realtimeConnected = ref(false);

type ServerMessage =
  | { type: 'connected' }
  | { type: 'subscribed'; siteId: string }
  | { type: 'telemetry'; payload: TelemetryPayload }
  | { type: 'alert'; payload: AlertPayload };

/**
 * Live-канал BFF. REST (Vue Query) даёт снимок, WS дописывает значения в тот же cache.
 */
export function useSiteRealtime(siteId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  const alertStatusById = new Map<string, AlertStatus>();
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByUs = false;

  function socketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  function patchTelemetry(payload: TelemetryPayload) {
    queryClient.setQueryData<SiteOverview>(overviewKeys.bySite(payload.siteId), (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sensors: current.sensors.map((sensor) => {
          if (sensor.id !== payload.sensorId) {
            return sensor;
          }

          return {
            ...sensor,
            metric: payload.metric,
            unit: payload.unit,
            value: payload.value,
            ts: payload.ts,
            status: sensor.status === 'unknown' ? 'ok' : sensor.status,
          };
        }),
      };
    });
  }

  function patchOpenAlerts(payload: AlertPayload) {
    queryClient.setQueryData<SiteOverview>(overviewKeys.bySite(payload.siteId), (current) => {
      if (!current) {
        return current;
      }

      const previous = alertStatusById.get(payload.id);
      alertStatusById.set(payload.id, payload.status);
      const wasOpen = previous === 'open';
      const isOpen = payload.status === 'open';
      let openAlerts = current.openAlerts;

      if (!wasOpen && isOpen) {
        openAlerts += 1;
      }

      if (wasOpen && !isOpen) {
        openAlerts = Math.max(0, openAlerts - 1);
      }

      return {
        ...current,
        openAlerts,
      };
    });
  }

  function handleMessage(raw: unknown, id: string) {
    if (typeof raw !== 'string') {
      return;
    }

    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }

    if (message.type === 'connected') {
      socket?.send(JSON.stringify({ type: 'subscribe', siteId: id }));
      return;
    }

    if (message.type === 'telemetry' && message.payload.siteId === id) {
      patchTelemetry(message.payload);
      return;
    }

    if (message.type === 'alert' && message.payload.siteId === id) {
      patchOpenAlerts(message.payload);
      void queryClient.invalidateQueries({ queryKey: alertKeys.all });
    }
  }

  function connect(id: string) {
    closedByUs = false;
    const next = new WebSocket(socketUrl());
    socket = next;

    next.addEventListener('open', () => {
      if (socket !== next) {
        return;
      }
      realtimeConnected.value = true;
    });

    next.addEventListener('message', (event) => {
      if (socket !== next) {
        return;
      }
      handleMessage(event.data, id);
    });

    next.addEventListener('close', () => {
      if (socket !== next) {
        return;
      }
      socket = null;
      realtimeConnected.value = false;
      if (!closedByUs) {
        reconnectTimer = setTimeout(() => {
          connect(id);
        }, 2000);
      }
    });
  }

  function disconnect() {
    closedByUs = true;
    realtimeConnected.value = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
  }

  watch(
    () => toValue(siteId),
    (id) => {
      disconnect();
      if (!id) {
        return;
      }
      connect(id);
    },
    { immediate: true },
  );

  onScopeDispose(disconnect);

  return { connected: realtimeConnected };
}
