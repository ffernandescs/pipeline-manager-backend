import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PipelinesService } from './pipelines.service';
import { PipelinesGateway } from './pipelines.gateway';
import { PipelinesProcessor } from './pipeline.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'pipelines',
    }),
  ],
  providers: [
    PipelinesService,
    PipelinesProcessor, // O processor agora é apenas uma classe que exporta métodos manuais
    PipelinesGateway,
  ],
  exports: [PipelinesService],
})
export class PipelinesQueueModule {}
