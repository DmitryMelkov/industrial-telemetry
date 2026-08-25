import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@it/prisma';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'core-api', db: 'up' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'core-api',
        db: 'down',
      });
    }
  }
}
