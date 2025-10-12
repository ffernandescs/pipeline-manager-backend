import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' }, // libera acesso do Next
})
export class PipelinesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server; // 👈 o "!" indica que será inicializado pelo NestJS

  handleConnection(client: any) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: any) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // método para emitir atualizações
  sendPipelineUpdate(pipelineId: string, data: any) {
    this.server.emit(`pipeline:${pipelineId}`, data);
  }
}
