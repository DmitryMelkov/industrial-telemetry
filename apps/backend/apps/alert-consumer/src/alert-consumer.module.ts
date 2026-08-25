import { Module } from '@nestjs/common';
import { CommonModule } from '@it/common';
import { PrismaModule } from '@it/prisma';
import { AlertConsumerService } from './alert-consumer.service';

@Module({
  imports: [CommonModule, PrismaModule],
  providers: [AlertConsumerService],
})
export class AlertConsumerModule {}
