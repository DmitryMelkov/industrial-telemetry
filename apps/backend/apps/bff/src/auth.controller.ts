import { Body, Controller, Get, HttpCode, Post, Req, Res, type Request } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, SESSION_COOKIE_NAME, type BffRequest } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body.email ?? '', body.password ?? '');
    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
    });
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: BffRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(request.cookies?.[SESSION_COOKIE_NAME]);
    response.clearCookie(SESSION_COOKIE_NAME);
  }

  @Get('me')
  me(@Req() request: BffRequest) {
    return this.auth.getUser(request.cookies?.[SESSION_COOKIE_NAME]);
  }
}
