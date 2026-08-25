import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { TelemetryGeneratorModule } from './telemetry-generator.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TelemetryGeneratorModule);
  app.enableShutdownHooks();
}

void bootstrap();
