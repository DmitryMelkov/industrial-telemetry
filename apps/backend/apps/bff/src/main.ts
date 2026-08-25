import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import type { Server } from 'node:http';
import { AppModule } from './app.module';
import { RealtimeGateway } from './realtime.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200,http://localhost:5173').split(','),
    credentials: true,
  });
  const port = Number(process.env.BFF_PORT ?? 3000);
  await app.listen(port);
  app.get(RealtimeGateway).attach(app.getHttpServer() as Server);
  console.log(`bff listening on :${port}`);
}
void bootstrap();
