import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { Server } from 'node:http';
import { REDIS_CHANNELS } from '@it/common';
import { AuthService, SESSION_COOKIE_NAME } from './auth.service';

interface RealtimeMessage {
  type: 'telemetry' | 'alert';
  payload: Record<string, unknown>;
}

interface SubscribeMessage {
  type: 'subscribe';
  siteId: string;
}

interface ClientState {
  socket: WebSocket;
  siteIds: Set<string>;
}

@Injectable()
export class RealtimeGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly redisSubscriber: RedisClientType;
  private readonly clients = new Set<ClientState>();
  private websocketServer: WebSocketServer | null = null;

  constructor(private readonly auth: AuthService) {
    this.redisSubscriber = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }).duplicate();
  }

  async onModuleInit(): Promise<void> {
    this.redisSubscriber.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis realtime error: ${message}`);
    });
    await this.redisSubscriber.connect();
    await this.redisSubscriber.subscribe(REDIS_CHANNELS.TELEMETRY_UPDATES, (message) => {
      this.broadcast('telemetry', message);
    });
    await this.redisSubscriber.subscribe(REDIS_CHANNELS.ALERTS_UPDATES, (message) => {
      this.broadcast('alert', message);
    });
  }

  attach(server: Server): void {
    this.websocketServer = new WebSocketServer({ server, path: '/ws' });
    this.websocketServer.on('connection', (socket, request) => {
      void this.handleConnection(socket, request.headers.cookie);
    });
    this.logger.log('WebSocket gateway listening on /ws');
  }

  async onModuleDestroy(): Promise<void> {
    for (const client of this.clients) {
      client.socket.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.websocketServer?.close();
    await this.redisSubscriber.quit();
  }

  private async handleConnection(socket: WebSocket, cookieHeader?: string): Promise<void> {
    try {
      await this.auth.getUser(this.getCookie(cookieHeader, SESSION_COOKIE_NAME));
    } catch {
      socket.close(1008, 'Authentication required');
      return;
    }

    const client: ClientState = { socket, siteIds: new Set() };
    this.clients.add(client);
    socket.on('message', (rawMessage) => {
      this.handleClientMessage(client, this.rawDataToString(rawMessage));
    });
    socket.on('close', () => {
      this.clients.delete(client);
    });
    socket.send(JSON.stringify({ type: 'connected' }));
  }

  private handleClientMessage(client: ClientState, rawMessage: string): void {
    let message: SubscribeMessage;
    try {
      message = JSON.parse(rawMessage) as SubscribeMessage;
    } catch {
      return;
    }

    if (message.type !== 'subscribe' || typeof message.siteId !== 'string') {
      return;
    }

    client.siteIds.add(message.siteId);
    client.socket.send(JSON.stringify({ type: 'subscribed', siteId: message.siteId }));
  }

  private broadcast(type: RealtimeMessage['type'], rawPayload: string): void {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      this.logger.warn(`пропущено некорректное Redis realtime-событие: ${type}`);
      return;
    }

    const siteId = typeof payload.siteId === 'string' ? payload.siteId : undefined;
    const message = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      if (siteId !== undefined && !client.siteIds.has(siteId)) {
        continue;
      }
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  }

  private getCookie(cookieHeader: string | undefined, name: string): string | undefined {
    return cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .map((part) => part.split('='))
      .find(([key]) => key === name)?.[1];
  }

  private rawDataToString(rawData: RawData): string {
    if (Buffer.isBuffer(rawData)) {
      return rawData.toString('utf8');
    }
    if (rawData instanceof ArrayBuffer) {
      return Buffer.from(rawData).toString('utf8');
    }
    return Buffer.concat(rawData).toString('utf8');
  }
}
