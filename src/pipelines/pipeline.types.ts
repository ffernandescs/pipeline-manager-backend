export type StepStatus = 'pending' | 'done' | 'error';

export interface PipelineConfig {
  id?: string; // opcional, pois o Prisma vai gerar
  projectId: string;
  name: string;
  config: PipelineStep[]; // JSON com os steps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PipelineStep {
  name: string;
  type: 'shell' | string;
  command: string;
  enabled: boolean;
  status?: StepStatus; // novo
  logs?: PipelineLog[];
}

export interface PipelineLog {
  id: string;
  pipelineId: string;
  name?: string; // opcional, para associar log a step
  message: string;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  status: 'done' | 'error' | 'aborted' | string;
  createdAt: string;
  updatedAt: string;
  steps: PipelineStep[];
}
