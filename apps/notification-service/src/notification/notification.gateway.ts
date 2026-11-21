import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import {
  AccessTokenService,
  InvalidAccessTokenError,
  ShutdownService,
} from '@app/common';

import { MetricsService } from '../providers/metrics/metrics.service';
import type {
  HelloAcknowledgement,
  NotificationPayload,
  NotificationServer,
  NotificationSocket,
} from './interfaces/notificationEvents.interface';

@WebSocketGateway()
export class NotificationGateway
  implements
    OnGatewayInit<NotificationServer>,
    OnGatewayConnection<NotificationSocket>,
    OnGatewayDisconnect<NotificationSocket>
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  private server: NotificationServer;

  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly shutdown: ShutdownService,
    private readonly metrics: MetricsService,
  ) {}

  afterInit(server: NotificationServer): void {
    server.use((client, next) => {
      void this.authenticate(client).then(
        () => next(),
        (error: unknown) => {
          if (error instanceof InvalidAccessTokenError) {
            next(new Error('Недействительный или отсутствующий access-токен'));
            return;
          }

          this.logger.error('Ошибка проверки токена Socket.IO');
          next(new Error('Не удалось проверить авторизацию'));
        },
      );
    });
  }

  @SubscribeMessage('hello')
  handleHello(@MessageBody() payload: unknown): HelloAcknowledgement {
    if (this.shutdown.isDraining) {
      return { ok: false, error: 'Приложение останавливается' };
    }
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload) ||
      !('name' in payload) ||
      typeof payload.name !== 'string' ||
      payload.name.trim().length === 0
    ) {
      return { ok: false, error: 'Имя должно быть непустой строкой' };
    }

    return { ok: true, message: `Привет, ${payload.name.trim()}!` };
  }

  async handleConnection(client: NotificationSocket): Promise<void> {
    if (this.shutdown.isDraining) {
      client.disconnect(true);
      return;
    }
    try {
      await client.join(this.getUserRoom(client.data.userId));
    } catch {
      this.logger.error(
        `Не удалось подключить клиента к комнате: ${client.id}`,
      );
      client.disconnect(true);
      return;
    }

    if (!client.connected || this.shutdown.isDraining) {
      client.disconnect(true);
      return;
    }
    this.metrics.addConnection(client.id);

    this.logger.log(
      `Клиент подключился: ${client.id}, пользователь: ${client.data.userId}`,
    );

    client.emit('welcome', {
      message: 'Подключение к Notification Service установлено',
    });
  }

  handleDisconnect(client: NotificationSocket): void {
    this.metrics.removeConnection(client.id);
    this.logger.log(`Клиент отключился: ${client.id}`);
  }

  sendNotification(userId: number, payload: NotificationPayload): void {
    this.server.to(this.getUserRoom(userId)).emit('notification', payload);
  }

  private async authenticate(client: NotificationSocket): Promise<void> {
    if (this.shutdown.isDraining) {
      throw new Error('Приложение останавливается');
    }
    const token: unknown = client.handshake.auth.token;
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new InvalidAccessTokenError('Access-токен не передан');
    }

    const claims = await this.accessTokenService.verify(token);
    if (this.shutdown.isDraining) {
      throw new Error('Приложение останавливается');
    }
    client.data.userId = claims.sub;
  }

  private getUserRoom(userId: number): string {
    return `user:${userId}`;
  }
}
