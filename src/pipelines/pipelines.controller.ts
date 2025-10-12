import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { PipelinesService } from './pipelines.service';

@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}
  @Get('GetAll')
  async getAllPipelines() {
    const pipelines = await this.pipelinesService.getAllPipelines();
    return pipelines;
  }

  @Get(':pipelineId/logs')
  async getPipelineLogs(@Param('pipelineId') pipelineId: string) {
    const logs = await this.pipelinesService.getPipelineLogs(pipelineId);

    return logs;
  }

  @Get(':pipelineId')
  async getPipelineById(@Param('pipelineId') pipelineId: string) {
    const pipeline = await this.pipelinesService.getPipelineById(pipelineId);
    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${pipelineId} não encontrada`);
    }
    return pipeline;
  }

  @Post(':id/abort')
  async abortPipeline(@Param('id') id: string) {
    return this.pipelinesService.abortPipeline(id);
  }

  @Post('restart/:id')
  async restartPipeline(@Param('id') id: string) {
    return this.pipelinesService.restartPipeline(id);
  }
}
