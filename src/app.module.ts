import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PipelinesModule } from './pipelines/pipelines.module';
import { GithubModule } from './github-webhook/github.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [PipelinesModule, GithubModule, ProjectsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
