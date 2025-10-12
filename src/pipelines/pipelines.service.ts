import { Injectable } from '@nestjs/common';
import { PrismaClient, Step } from '@prisma/client';
import { spawn } from 'child_process';
import { join } from 'path';
import os from 'os';
import fs from 'fs-extra';
import { PipelinesGateway } from './pipelines.gateway';
import { Queue, Worker, Job } from 'bullmq';

@Injectable()
export class PipelinesService {
  private prisma = new PrismaClient();
  private globalPipelineId!: string;
  private pipelineQueue: Queue;
  private worker: Worker;
  private runningProcesses = new Map<string, ReturnType<typeof spawn>>();
  private abortedPipelines = new Set<string>();
  private lastSnapshot: string | null = null;

  constructor(private readonly gateway: PipelinesGateway) {
    this.pipelineQueue = new Queue('pipelines', {
      connection: { host: 'localhost', port: 6379 },
    });

    this.worker = new Worker(
      'pipelines',
      async (job: Job) => {
        const { name, pipelineId } = job.data;
        if (!pipelineId) return;

        try {
          await this.runPipeline(name, pipelineId);
        } catch (err) {
          console.error(`Erro pipeline ${pipelineId}:`, err);
          await this.updatePipelineStatus(pipelineId, 'failed');
        }
      },
      { connection: { host: 'localhost', port: 6379 }, concurrency: 1 },
    );

    this.worker.on('completed', (job) =>
      console.log(`Job ${job.id} concluído`),
    );
    this.worker.on('failed', (job, err) =>
      console.error(`Job ${job?.id} falhou:`, err),
    );

    this.startPipelineMonitor();

    process.on('SIGINT', async () => {
      console.log('Pipeline interrompida pelo usuário (SIGINT)');
      await this.cleanupTmpDirs();
      process.exit(1);
    });

    process.on('SIGTERM', async () => {
      console.log('Pipeline interrompida pelo sistema (SIGTERM)');
      await this.cleanupTmpDirs();
      process.exit(1);
    });
  }

  private async startPipelineMonitor() {
    console.log('🛰️ Iniciando monitor de pipelines...');

    const interval = 3000; // a cada 3 segundos

    setInterval(async () => {
      try {
        const allPipelines = await this.prisma.pipeline.findMany({
          include: { steps: true },
          orderBy: { createdAt: 'desc' },
        });

        const newSnapshot = JSON.stringify(allPipelines);

        if (this.lastSnapshot !== newSnapshot) {
          this.lastSnapshot = newSnapshot;
          this.gateway.server.emit('pipelines:update', allPipelines);
          console.log('🔁 Pipelines atualizadas (mudança detectada)');
        }
      } catch (err) {
        console.error('Erro no monitor de pipelines:', err);
      }
    }, interval);
  }

  async restartPipeline(pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { steps: true },
    });

    if (!pipeline) throw new Error('Pipeline não encontrada');

    // 🔹 Limpa logs antigos da pipeline
    await this.prisma.log.deleteMany({ where: { pipelineId } });

    // 🔹 Reseta os steps para estado inicial
    await Promise.all(
      pipeline.steps.map((step) =>
        this.prisma.step.update({
          where: { id: step.id },
          data: {
            status: 'pending',
          },
        }),
      ),
    );

    // 🔹 Atualiza a pipeline para status "processing"
    const updated = await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        status: 'processing',
        updatedAt: new Date(),
      },
      include: { steps: true },
    });

    // 🔹 Notifica via WebSocket que ela foi reiniciada
    this.gateway.server.emit('pipeline:update', updated);

    // 🔹 Enfileira novamente a pipeline
    await this.enqueuePipeline(updated.name, updated.id);

    await this.addLog(
      pipelineId,
      'Pipeline reiniciada e enfileirada para execução',
    );
    return updated;
  }
  private async cleanupTmpDirs() {
    const baseTmpDir = join(os.homedir(), 'Documents', 'pipelines');
    if (await fs.pathExists(baseTmpDir)) {
      await this.removeDir(baseTmpDir);
      console.log('Todos os diretórios temporários foram removidos.');
    }
  }

  async getAllPipelines() {
    return this.prisma.pipeline.findMany({
      include: { steps: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  public getGlobalPipelineId(): string {
    if (!this.globalPipelineId)
      throw new Error('Pipeline global não inicializada');
    return this.globalPipelineId;
  }

  // ======= Função auxiliar para remover diretórios com retry =======
  private async removeDir(path: string, retries = 3, delayMs = 100) {
    for (let i = 0; i < retries; i++) {
      try {
        await fs.remove(path);
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  // ======= Criar pipeline =======
  async createPipeline(
    commitName: string,
    name: string,
    repo: string,
    branch: string,
  ): Promise<string> {
    const now = new Date();
    const baseTmpDir = join(os.homedir(), 'Documents', 'pipelines');
    await fs.mkdirp(baseTmpDir);

    const tmpDir = join(
      baseTmpDir,
      `pipeline_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    );
    await fs.mkdirp(tmpDir);

    const yarnCacheDir = join(tmpDir, '.yarn_cache');
    await fs.mkdirp(yarnCacheDir);

    const pipeline = await this.prisma.pipeline.create({
      data: {
        name: commitName,
        createdAt: now,
        updatedAt: now,
        status: 'queued',
        steps: {
          create: [
            {
              name: 'Verificar repositório',
              command: 'echo check repo',
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Clonar repositório',
              command: `git clone https://github.com/${repo}.git .`,
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Checkout main',
              command: `git checkout ${branch}`,
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Set up Node.js',
              command: 'echo "Setup Node.js v23.1.0"',
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Reset Yarn registry para padrão',
              command: 'yarn config set registry https://registry.yarnpkg.com',
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Yarn install com retry',
              command:
                os.platform() === 'win32'
                  ? `set YARN_CACHE_FOLDER=${yarnCacheDir} && yarn install --network-timeout 100000`
                  : `YARN_CACHE_FOLDER=${yarnCacheDir} yarn install --network-timeout 100000`,
              type: 'shell',
              enabled: true,
            },

            {
              name: 'Force yarn registry para Verdaccio',
              command:
                'yarn config set registry http://registry.design-system.shop/',
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Show affected projects',
              command:
                'yarn nx show projects --affected --base=origin/main --head=HEAD',
              type: 'shell',
              enabled: true,
            },

            {
              name: 'Test affected packages',
              command:
                'yarn nx affected --target=test --parallel=1 --base=origin/main --head=HEAD --verbose --updateSnapshot --exclude=plugins',
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Build affected packages',
              command:
                'yarn nx affected --target=build --parallel=1 --base=origin/main --head=HEAD --verbose --exclude=plugins',
              type: 'shell',
              enabled: true,
            },
            {
              name: 'Release packages',
              command: 'yarn nx release --yes --verbose',
              type: 'shell',
              enabled: true,
            },
          ],
        },
      },
      include: { steps: true },
    });

    return pipeline.id;
  }

  async enqueuePipeline(name: string, pipelineId: string) {
    await this.pipelineQueue.add(
      'run',
      { name, pipelineId },
      { removeOnComplete: true, removeOnFail: false },
    );
  }

  // ======= Executar pipeline =======
  async runPipeline(name: string, pipelineId: string) {
    await this.updatePipelineStatus(pipelineId, 'processing');

    const baseTmpDir = join(os.homedir(), 'Documents', 'pipelines');
    const tmpDir = join(baseTmpDir, pipelineId);
    const yarnCacheDir = join(tmpDir, '.yarn_cache');
    await fs.mkdirp(tmpDir);

    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { steps: true },
    });

    const steps: Step[] = Array.isArray(pipeline?.steps) ? pipeline.steps : [];

    try {
      await this.addLog(pipelineId, 'Pipeline iniciada');

      for (const step of steps) {
        try {
          await this.prisma.step.update({
            where: { id: step.id },
            data: { status: 'running' },
          });
          await this.addLog(
            pipelineId,
            `Executando step: ${step.name}`,
            step.id,
          );

          await this.execStep(step.command, tmpDir, pipelineId, step.id);

          await this.prisma.step.update({
            where: { id: step.id },
            data: { status: 'done' },
          });
          await this.addLog(
            pipelineId,
            `Step concluído: ${step.name}`,
            step.id,
          );
        } catch (error) {
          await this.prisma.step.update({
            where: { id: step.id },
            data: { status: 'error' },
          });
          await this.addLog(
            pipelineId,
            `Step falhou: ${step.name} - ${(error as Error).message}`,
            step.id,
          );

          if (!this.abortedPipelines.has(pipelineId)) {
            await this.updatePipelineStatus(pipelineId, 'failed');
          }

          return; // interrompe pipeline
        }
      }

      await this.updatePipelineStatus(pipelineId, 'successful');
      await this.addLog(pipelineId, 'Pipeline concluída');
    } finally {
      // Remove cache do Yarn e tmpDir
      if (await fs.pathExists(tmpDir)) {
        if (await fs.pathExists(yarnCacheDir))
          await this.removeDir(yarnCacheDir);
        await this.removeDir(tmpDir);
      }
    }
  }

  // ======= Executar step =======
  private execStep(
    command: string,
    cwd: string,
    pipelineId: string,
    stepId?: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const shell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash';
      const args =
        os.platform() === 'win32' ? ['/c', command] : ['-c', command];
      const child = spawn(shell, args, { cwd });
      this.runningProcesses.set(pipelineId, child);

      child.stdout.on(
        'data',
        async (data) => await this.addLog(pipelineId, data.toString(), stepId),
      );
      child.stderr.on(
        'data',
        async (data) => await this.addLog(pipelineId, data.toString(), stepId),
      );
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        this.runningProcesses.delete(pipelineId);
        code === 0
          ? resolve()
          : reject(new Error(`Step falhou com código ${code}`));
      });
    });
  }

  // ======= Abort pipeline =======

  async abortPipeline(pipelineId: string) {
    const running = this.runningProcesses.get(pipelineId);
    if (running) {
      // mata o processo filho, mas não espera bloqueante
      running.kill('SIGTERM');
      this.runningProcesses.delete(pipelineId);
    }

    this.abortedPipelines.add(pipelineId); // marca como abortada

    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { steps: { include: { logs: true } } },
    });

    if (!pipeline) throw new Error('Pipeline não encontrada');

    // Atualiza steps sem travar o fluxo da rota
    pipeline.steps.forEach((step) => {
      if (step.status === 'running') {
        this.prisma.step
          .update({
            where: { id: step.id },
            data: { status: 'error' },
          })
          .catch(console.error);
      } else if (step.status === 'pending') {
        this.prisma.step
          .update({
            where: { id: step.id },
            data: { enabled: false },
          })
          .catch(console.error);
      }
    });

    // Atualiza status da pipeline
    this.prisma.pipeline
      .update({
        where: { id: pipelineId },
        data: { status: 'aborted', updatedAt: new Date() },
      })
      .catch(console.error);

    // Log fire-and-forget
    this.prisma.log
      .create({
        data: { pipelineId, message: 'Pipeline abortada manualmente' },
      })
      .catch(console.error);
    this.gateway.server.emit('pipeline:log', {
      pipelineId,
      message: 'Pipeline abortada manualmente',
    });

    // Atualiza lista geral de pipelines em background
    this.prisma.pipeline
      .findMany({ orderBy: { createdAt: 'desc' } })
      .then((all) => this.gateway.server.emit('pipelines:update', all))
      .catch(console.error);

    // Limpeza de tmp e yarn cache em background
    const baseTmpDir = join(os.homedir(), 'Documents', 'pipelines');
    const tmpDir = join(baseTmpDir, pipelineId);
    const yarnCacheDir = join(tmpDir, '.yarn_cache');

    setImmediate(async () => {
      try {
        if (await fs.pathExists(yarnCacheDir))
          await this.removeDir(yarnCacheDir);
        if (await fs.pathExists(tmpDir)) await this.removeDir(tmpDir);
      } catch (err) {
        console.error('Erro ao limpar tmp/cache da pipeline:', err);
      }
    });

    await this.updatePipelineStatus(pipelineId, 'aborted');

    await this.addLog(pipelineId, 'Pipeline abortada manualmente');
    const all = await this.prisma.pipeline.findMany({
      orderBy: { createdAt: 'desc' },
    });
    this.gateway.server.emit('pipelines:update', all);

    // Retorna rapidamente a pipeline
    return this.getPipelineById(pipelineId);
  }

  // ======= Atualizar status pipeline =======
  async updatePipelineStatus(
    pipelineId: string,
    status: 'successful' | 'failed' | 'aborted' | 'processing',
  ) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      console.warn(`Pipeline ${pipelineId} não encontrada. Ignorando update.`);
      return null;
    }

    const updated = await this.prisma.pipeline.update({
      where: { id: pipelineId },
      data: { status },
      include: { steps: true },
    });

    const all = await this.prisma.pipeline.findMany({
      orderBy: { createdAt: 'desc' },
    });
    this.gateway.server.emit('pipelines:update', all);

    return updated;
  }

  async addLog(pipelineId: string, message: string, stepId?: string) {
    this.prisma.log
      .create({ data: { pipelineId, stepId, message } })
      .catch(console.error);
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { steps: { include: { logs: true } }, logs: true },
    });
    this.gateway.server.emit('pipeline:log', pipeline);
  }

  async getPipelineLogs(pipelineId: string) {
    return this.prisma.log.findMany({
      where: { pipelineId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPipelineById(pipelineId: string) {
    return this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { steps: { include: { logs: true } }, logs: true },
    });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
