import { Module } from '@nestjs/common';
import { CommonModule } from '@it/common';
import { PrismaModule } from '@it/prisma';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MonitoringProxyController } from './monitoring-proxy.controller';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [HealthController, AuthController, MonitoringProxyController],
  providers: [AuthService, RealtimeGateway],
})
export class AppModule {}
