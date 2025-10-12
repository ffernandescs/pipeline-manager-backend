export interface PipelineStep {
  name: string;
  command: string;
  type?: 'shell' | 'docker';
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface PipelineConfig {
  name: string;
  projectId: string;
  steps: PipelineStep[];
}

// Exemplo de pipeline para Node.js CI/CD
export const pipelineConfig: PipelineConfig = {
  name: 'NodeJS-CI-CD',
  projectId: '123456', // id do projeto salvo no frontend
  steps: [
    {
      name: 'Clone Repositório',
      command: 'git clone https://github.com/meu-repo.git ./repo',
      type: 'shell',
      enabled: true,
    },
    {
      name: 'Instalar Dependências',
      command: 'npm install',
      type: 'shell',
      env: { NODE_ENV: 'development' },
      enabled: true,
    },
    {
      name: 'Rodar Testes',
      command: 'npm test',
      type: 'shell',
      enabled: true,
    },
    {
      name: 'Build',
      command: 'npm run build',
      type: 'shell',
      enabled: true,
    },
    {
      name: 'Deploy Docker',
      command:
        'docker build -t meu-app ./repo && docker run -d -p 3000:3000 meu-app',
      type: 'docker',
      enabled: true,
    },
  ],
};
