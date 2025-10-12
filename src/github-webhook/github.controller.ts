import { Controller, Post, Req, Res, Headers } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GithubService } from './github.service';

@Controller('github-webhook') // <- rota correta
export class GithubController {
  constructor(private githubService: GithubService) {}

  @Post()
  async handle(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const ok = await this.githubService.handleWebhook(req, signature);
    return res.status(ok ? 200 : 401).send(ok ? 'ok' : 'invalid signature');
  }
}
