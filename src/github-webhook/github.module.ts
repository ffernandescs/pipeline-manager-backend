import { Module } from '@nestjs/common';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  imports: [PipelinesModule],
  controllers: [GithubController],
  providers: [GithubService],
})
export class GithubModule {}
