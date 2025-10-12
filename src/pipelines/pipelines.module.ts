import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { PipelinesGateway } from './pipelines.gateway';

@Module({
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelinesGateway], // 👈 ADICIONE AQUI
  exports: [PipelinesService, PipelinesGateway], // 👈 exporta se quiser usar fora do módulo
})
export class PipelinesModule {}
