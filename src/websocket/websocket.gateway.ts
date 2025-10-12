import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class WebsocketGateway {
  @WebSocketServer()
  server!: Server; // diz que será atribuído pelo NestJS

  sendLog(pipelineId: string, message: string) {
    this.server.emit(`pipeline-${pipelineId}`, { message });
  }

  sendStatus(pipelineId: string, status: string) {
    this.server.emit(`pipeline-${pipelineId}-status`, { status });
  }
}
