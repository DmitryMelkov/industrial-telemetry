import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RealtimeService } from './realtime.service';

type SocketListener = (event?: { data?: string }) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  readonly url: string;
  private readonly listeners = new Map<string, SocketListener[]>();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: SocketListener): void {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  send = vi.fn();

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }

  emit(type: string, event?: { data?: string }): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  markOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open');
  }
}

describe('RealtimeService', () => {
  let service: RealtimeService;
  let OriginalWebSocket: typeof WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    OriginalWebSocket = globalThis.WebSocket;
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [RealtimeService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    service = TestBed.inject(RealtimeService);
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
    vi.stubGlobal('WebSocket', OriginalWebSocket);
  });

  it('should not let a stale close clear the active socket', () => {
    service.connect('site-a');
    const first = MockWebSocket.instances[0];
    expect(first).toBeDefined();
    first?.markOpen();

    service.connect('site-b');
    const second = MockWebSocket.instances[1];
    expect(second).toBeDefined();
    second?.markOpen();

    first?.emit('close');

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(second?.readyState).toBe(MockWebSocket.OPEN);

    second?.emit('message', {
      data: JSON.stringify({ type: 'connected' }),
    });
    expect(second?.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', siteId: 'site-b' }),
    );
  });

  it('should reconnect after unexpected close', () => {
    service.connect('site-a');
    const first = MockWebSocket.instances[0];
    first?.markOpen();
    first?.emit('close');

    expect(MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);
    MockWebSocket.instances[1]?.markOpen();
  });

  it('should not reconnect after intentional disconnect', () => {
    service.connect('site-a');
    MockWebSocket.instances[0]?.markOpen();
    service.disconnect();

    vi.advanceTimersByTime(20_000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
