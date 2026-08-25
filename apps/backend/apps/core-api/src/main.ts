import { NestFactory } from '@nestjs/core';
import { CoreApiModule } from './core-api.module';

async function bootstrap() {
  const app = await NestFactory.create(CoreApiModule);
  const port = Number(process.env.CORE_API_PORT ?? 3001);
  await app.listen(port);
  console.log(`core-api listening on :${port}`);
}
void bootstrap();
