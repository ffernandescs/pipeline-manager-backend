import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Para validar webhooks GitHub
  app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  await app.listen(3001, '0.0.0.0');
  console.log('🚀 Servidor rodando em http://0.0.0.0:3001');
}

bootstrap();
