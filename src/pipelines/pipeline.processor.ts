import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PipelinesService } from './pipelines.service';

@Processor('pipelines')
export class PipelinesProcessor {
  constructor(private readonly pipelinesService: PipelinesService) {}

  // método chamado manualmente pelo Worker
  async processJob(job: Job<{ name: string; pipelineId?: string }>) {
    const { name, pipelineId } = job.data;
    await this.pipelinesService.runPipeline(name, pipelineId);
  }
}
