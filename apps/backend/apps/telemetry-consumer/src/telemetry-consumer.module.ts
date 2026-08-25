import { Module } from '@nestjs/common';
import { CommonModule } from '@it/common';
import { TelemetryConsumerService } from './telemetry-consumer.service';

@Module({
  imports: [CommonModule],
  providers: [TelemetryConsumerService],
})
export class TelemetryConsumerModule {}
