import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PipelineStep } from 'pipeline.config';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async createProject(
    @Body() body: { name: string; repositoryUrl: string; branch: string },
  ) {
    const project = await this.projectsService.createProject(body);
    return project;
  }

  @Get(':id')
  async getProject(@Param('id') projectId: string) {
    const project = await this.projectsService.getProject(projectId);
    return project;
  }

  @Post(':projectId/pipeline')
  async savePipeline(
    @Param('projectId') projectId: string,
    @Body() body: { name: string; steps: PipelineStep[] },
  ) {
    const pipeline = await this.projectsService.savePipeline(
      projectId,
      body.name,
      body.steps,
    );
    return { success: true, pipeline };
  }
}
