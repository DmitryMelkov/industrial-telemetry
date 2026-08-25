import { NestFactory } from '@nestjs/core';
import { AlertConsumerModule } from './alert-consumer.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AlertConsumerModule);
  app.enableShutdownHooks();
}
void bootstrap();
