import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PipelineStep } from 'pipeline.config';

@Injectable()
export class ProjectsService {
  private prisma = new PrismaClient();

  async createProject(data: {
    name: string;
    repositoryUrl: string;
    branch: string;
  }) {
    return this.prisma.project.create({ data });
  }

  async getProject(projectId: string) {
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: { pipelines: true },
    });
  }

  async savePipeline(projectId: string, name: string, steps: PipelineStep[]) {
    return this.prisma.pipelineConfig.upsert({
      where: { projectId },
      update: { config: steps as any, name },
      create: { projectId, name, config: steps as any },
    });
  }
}
