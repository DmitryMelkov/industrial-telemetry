import { Module } from '@nestjs/common';
import { CommonModule } from '@it/common';
import { PrismaModule } from '@it/prisma';
import { KafkaProducerService } from './kafka-producer.service';
import { SensorCatalogService } from './sensor-catalog.service';
import { TelemetryGeneratorService } from './telemetry-generator.service';

@Module({
  imports: [CommonModule, PrismaModule],
  providers: [KafkaProducerService, SensorCatalogService, TelemetryGeneratorService],
})
export class TelemetryGeneratorModule {}
