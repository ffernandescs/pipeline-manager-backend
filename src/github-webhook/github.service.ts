import { Injectable } from '@nestjs/common';
import { PipelinesService } from '../pipelines/pipelines.service';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class GithubService {
  constructor(private readonly pipelinesService: PipelinesService) {}

  // Handle webhook GitHub
  async handleWebhook(req: Request, signature: string): Promise<boolean> {
    const SECRET = 'mysecret123'; // configure seu secret real
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest =
      'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (digest !== signature) {
      console.warn('Assinatura inválida, webhook rejeitado!');
      return false;
    }

    const body = req.body;
    const commitName =
      body.head_commit?.message ||
      body.pull_request?.title ||
      'Commit sem nome';
    const repoFullName = body.repository?.full_name;
    const repoName = body.repository?.name;
    const ref = body.ref || body.pull_request?.head?.ref;
    const branch = ref?.replace('refs/heads/', '') || 'main';

    if (!repoFullName || !repoName) {
      console.warn('Repositório não encontrado no payload do webhook');
      return false;
    }

    // 🔹 Cria pipeline real no DB (status "queued")
    const pipelineId = await this.pipelinesService.createPipeline(
      commitName,
      repoName,
      repoFullName,
      branch,
    );

    // 🔹 Enfileira a pipeline para execução pelo Worker
    await this.pipelinesService.enqueuePipeline(repoName, pipelineId);

    console.log(`📦 Pipeline enfileirada: ${repoName} (${pipelineId})`);
    return true;
  }
}
