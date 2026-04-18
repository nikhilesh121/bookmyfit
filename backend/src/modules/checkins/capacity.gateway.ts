import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/capacity' })
export class CapacityGateway {
  @WebSocketServer() server: Server;

  broadcastCapacity(gymId: string, count: number, capacity: number) {
    this.server.emit(`gym:${gymId}:capacity`, {
      gymId,
      currentCount: count,
      capacity,
      pct: Math.round((count / capacity) * 100),
    });
  }

  @SubscribeMessage('subscribe_gym')
  handleSubscribe(@MessageBody() data: { gymId: string }) {
    return { event: 'subscribed', gymId: data.gymId };
  }
}
