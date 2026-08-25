import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { createClient, type RedisClientType } from 'redis';
import { PrismaService } from '@it/prisma';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: 'operator' | 'admin';
}

export interface BffRequest extends Request {
  cookies: Record<string, string>;
}

export const SESSION_COOKIE_NAME = 'it_session';

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly redisClient: RedisClientType;
  private readonly sessionTtlSeconds = 60 * 60 * 8;

  constructor(private readonly prisma: PrismaService) {
    this.redisClient = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });
  }

  async onModuleInit(): Promise<void> {
    await this.redisClient.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit();
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user === null || !(await bcrypt.compare(password, user.passwordHash))) {
      return Promise.reject(new UnauthorizedException('Неверный email или пароль'));
    }

    const sessionToken = randomBytes(32).toString('hex');
    const authUser: AuthUser = { id: user.id, email: user.email, role: user.role };
    await this.redisClient.setEx(
      this.sessionKey(sessionToken),
      this.sessionTtlSeconds,
      JSON.stringify(authUser),
    );

    return { sessionToken, user: authUser };
  }

  async getUser(sessionToken?: string): Promise<AuthUser> {
    const token = await this.extractToken(sessionToken);
    const rawUser = await this.redisClient.get(this.sessionKey(token));
    if (rawUser === null) {
      return Promise.reject(new UnauthorizedException('Сессия недействительна или истекла'));
    }

    await this.redisClient.expire(this.sessionKey(token), this.sessionTtlSeconds);
    return JSON.parse(rawUser) as AuthUser;
  }

  async logout(sessionToken?: string): Promise<void> {
    const token = await this.extractToken(sessionToken);
    await this.redisClient.del(this.sessionKey(token));
  }

  async requireAdmin(user: AuthUser): Promise<void> {
    if (user.role !== 'admin') {
      return Promise.reject(new ForbiddenException('Требуется роль admin'));
    }
  }

  private async extractToken(sessionToken?: string): Promise<string> {
    if (!sessionToken) {
      return Promise.reject(new UnauthorizedException('Требуется активная сессия'));
    }
    return sessionToken;
  }

  private sessionKey(token: string): string {
    return `session:${token}`;
  }
}
