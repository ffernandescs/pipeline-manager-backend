import { Injectable } from '@nestjs/common';
import { PipelinesService } from '../pipelines/pipelines.service';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class GithubService {
  constructor(private pipelinesService: PipelinesService) {}

  // ID fixo da pipeline global
  private readonly pipelineId = 'pipeline-global-id'; // substitua por qualquer string ou ID real do DB

  // github.service.ts
  async handleWebhook(req: Request, signature: string): Promise<boolean> {
    const SECRET = 'mysecret123';
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest =
      'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (digest !== signature) {
      console.warn('Assinatura inválida, webhook rejeitado!');
      return false;
    }

    const body = req.body;
    const commitName = body.head_commit?.message || 'Commit sem nome';
    const repo = body.repository?.full_name;
    const name = body.repository?.name;
    const ref = body.ref;
    const branch = ref.replace('refs/heads/', '');
    console.log(body, 'body');
    if (!repo) {
      console.warn('Repositório não encontrado no payload do webhook');
      return false;
    }

    // 🔹 Cria a pipeline com status "queued"
    const pipelineId = await this.pipelinesService.createPipeline(
      commitName,
      name,
      repo,
      branch,
    );

    // 🔹 Apenas enfileira — não executa diretamente
    await this.pipelinesService.enqueuePipeline(name, pipelineId);

    console.log(`📦 Pipeline enfileirada: ${name} (${pipelineId})`);

    return true;
  }
}
