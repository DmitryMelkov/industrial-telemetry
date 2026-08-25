import { NestFactory } from '@nestjs/core';
import { TelemetryConsumerModule } from './telemetry-consumer.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TelemetryConsumerModule);
  app.enableShutdownHooks();
}
void bootstrap();
