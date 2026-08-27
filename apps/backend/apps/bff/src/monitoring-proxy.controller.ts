import { All, Controller, Param, Query, Req, Res, type Request } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, SESSION_COOKIE_NAME, type BffRequest } from './auth.service';

@Controller()
export class MonitoringProxyController {
  private readonly coreApiUrl = process.env.CORE_API_URL ?? 'http://localhost:3001';

  constructor(private readonly auth: AuthService) {}

  @All([
    'sites',
    'sites/:id',
    'sites/:siteId/lines',
    'sites/:siteId/overview',
    'lines/:id',
    'sensors',
    'sensors/:id',
    'sensors/:id/history',
    'sensors/:id/thresholds',
    'alerts',
    'alerts/:id/ack',
    'users',
    'users/:id',
  ])
  async proxy(
    @Req() request: BffRequest,
    @Res() response: Response,
    @Param() params: Record<string, string> = {},
    @Query() query: Record<string, string> = {},
  ) {
    const user = await this.auth.getUser(request.cookies?.[SESSION_COOKIE_NAME]);
    const requestPath = request.url.split('?')[0].replace(/^\/api/, '');
    if (this.requiresAdmin(request.method, requestPath)) {
      await this.auth.requireAdmin(user);
    }
    const path = this.buildPath(requestPath, params);
    const queryString = new URLSearchParams(query).toString();
    const upstreamResponse = await fetch(
      `${this.coreApiUrl}${path}${queryString ? `?${queryString}` : ''}`,
      {
        method: request.method,
        headers: { 'content-type': 'application/json' },
        ...(request.method !== 'GET' && request.method !== 'HEAD'
          ? { body: JSON.stringify(request.body as unknown) }
          : {}),
      },
    );
    const body = await upstreamResponse.text();
    response
      .status(upstreamResponse.status)
      .type(upstreamResponse.headers.get('content-type') ?? 'application/json')
      .send(body);
  }

  private buildPath(path: string, params: Record<string, string>): string {
    return Object.entries(params).reduce(
      (currentPath, [key, value]) => currentPath.replace(`:${key}`, encodeURIComponent(value)),
      path,
    );
  }

  private requiresAdmin(method: string, path: string): boolean {
    if (path === '/users' || path.startsWith('/users/')) {
      return true;
    }
    if (method === 'POST' && path === '/sensors') {
      return true;
    }
    if ((method === 'PATCH' || method === 'PUT') && path.startsWith('/sensors/')) {
      return true;
    }
    if (method === 'POST' && path === '/sites') {
      return true;
    }
    if (method === 'PATCH' && /^\/sites\/[^/]+$/.test(path)) {
      return true;
    }
    if (method === 'POST' && /^\/sites\/[^/]+\/lines$/.test(path)) {
      return true;
    }
    if (method === 'PATCH' && path.startsWith('/lines/')) {
      return true;
    }
    return false;
  }
}
