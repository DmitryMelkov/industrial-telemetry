import { Module } from '@nestjs/common';
import { CommonModule } from '@it/common';
import { PrismaModule } from '@it/prisma';
import { HealthController } from './health.controller';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [HealthController, MonitoringController],
  providers: [MonitoringService],
})
export class CoreApiModule {}
