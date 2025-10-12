import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Configurações corretas para BullMQ
const connection = new IORedis({
  host: 'localhost', // ou IP do Redis
  port: 6379,
  maxRetriesPerRequest: null, // ⚠ isso é obrigatório para BullMQ
});

// Fila de pipelines
export const pipelineQueue = new Queue('pipelines', { connection });

// Worker para processar jobs
export const pipelineWorker = new Worker(
  'pipelines',
  async (job) => {
    console.log('Executando pipeline:', job.data.pipelineId);
    // Aqui você chama PipelineProcessor.runStep(...)
  },
  { connection },
);
