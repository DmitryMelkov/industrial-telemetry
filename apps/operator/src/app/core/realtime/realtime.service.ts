import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { RealtimeAlertPayload, RealtimeTelemetryPayload } from '../../shared/types/api.types';

export type RealtimeEvent =
  | { type: 'telemetry'; payload: RealtimeTelemetryPayload }
  | { type: 'alert'; payload: RealtimeAlertPayload };

type RealtimeServerMessage =
  { type: 'connected' } | { type: 'subscribed'; siteId: string } | RealtimeEvent;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly eventsSubject = new Subject<RealtimeEvent>();
  private socket: WebSocket | null = null;
  private subscribedSiteId: string | null = null;
  private socketGeneration = 0;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly events$: Observable<RealtimeEvent> = this.eventsSubject.asObservable();

  readonly connect = (siteId: string): void => {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (
      this.socket !== null &&
      this.subscribedSiteId === siteId &&
      (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.intentionalClose = false;
    this.clearReconnectTimer();
    this.subscribedSiteId = siteId;
    this.openSocket(siteId);
  };

  readonly disconnect = (): void => {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.subscribedSiteId = null;
    this.reconnectAttempt = 0;
    this.closeCurrentSocket();
  };

  private openSocket(siteId: string): void {
    this.closeCurrentSocket();

    const generation = ++this.socketGeneration;
    const socket = new WebSocket(this.getSocketUrl());
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.socket !== socket || this.socketGeneration !== generation) {
        return;
      }

      this.reconnectAttempt = 0;
    });

    socket.addEventListener('message', (event) => {
      if (this.socket !== socket || this.socketGeneration !== generation) {
        return;
      }

      this.handleMessage(event.data, siteId);
    });

    socket.addEventListener('close', () => {
      // Stale close from a replaced socket must not clear the active one.
      if (this.socket !== socket || this.socketGeneration !== generation) {
        return;
      }

      this.socket = null;

      if (!this.intentionalClose && this.subscribedSiteId === siteId) {
        this.scheduleReconnect(siteId);
      }
    });
  }

  private closeCurrentSocket(): void {
    if (this.socket === null) {
      return;
    }

    const socket = this.socket;
    this.socket = null;
    this.socketGeneration += 1;
    socket.close();
  }

  private scheduleReconnect(siteId: string): void {
    this.clearReconnectTimer();

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalClose || this.subscribedSiteId !== siteId) {
        return;
      }

      this.openSocket(siteId);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleMessage(rawMessage: unknown, siteId: string): void {
    if (typeof rawMessage !== 'string') {
      return;
    }

    let message: RealtimeServerMessage;
    try {
      message = JSON.parse(rawMessage) as RealtimeServerMessage;
    } catch {
      return;
    }

    if (message.type === 'connected') {
      this.socket?.send(JSON.stringify({ type: 'subscribe', siteId }));
      return;
    }

    if (message.type === 'subscribed') {
      return;
    }

    this.eventsSubject.next(message);
  }

  private getSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
}
