import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { JwtService } from '@nestjs/jwt';
import type { Model } from 'mongoose';
import { ConnectionStates, createConnection } from 'mongoose';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { DataSource } from 'typeorm';

import type { TransferCompletedEvent } from '@app/common';
import { AccessTokenService, ShutdownService } from '@app/common';

import { BalanceRepository } from '../../user-service/src/features/users/balance.repository';
import { User } from '../../user-service/src/features/users/entities/user.entity';
import { UserAvatar } from '../../user-service/src/features/users/entities/userAvatar.entity';
import {
  BalanceLimitExceededError,
  InsufficientBalanceError,
} from '../../user-service/src/features/users/errors/balance.errors';
import { CreateUsersAndAvatars1795175000000 } from '../../user-service/src/providers/databases/postgresql/migrations/1795175000000-createUsersAndAvatars';
import { CreateTransferOutbox1795176000000 } from '../../user-service/src/providers/outbox/migrations/1795176000000-createTransferOutbox';
import { OutboxRepository } from '../../user-service/src/providers/outbox/outbox.repository';
import type {
  ClientToServerEvents,
  NotificationServer,
  ServerToClientEvents,
} from '../src/notification/interfaces/notificationEvents.interface';
import { NotificationGateway } from '../src/notification/notification.gateway';
import { NotificationRepository } from '../src/notification/notification.repository';
import { NotificationService } from '../src/notification/notification.service';
import { RejectedTransfersRepository } from '../src/notification/rejectedTransfers.repository';
import {
  RejectedTransfer,
  RejectedTransferSchema,
} from '../src/notification/schemas/rejectedTransfer.schema';
import {
  TransferNotification,
  TransferNotificationSchema,
} from '../src/notification/schemas/transferNotification.schema';
import { MetricsService } from '../src/providers/metrics/metrics.service';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

describe('Переводы, Outbox и доставка в комнаты (PostgreSQL + MongoDB + Socket.IO)', () => {
  const namespace = `test_${randomUUID().replaceAll('-', '')}`;
  const database = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    schema: namespace,
    extra: { options: `-c search_path=${namespace}` },
    entities: [User, UserAvatar],
    synchronize: false,
    migrations: [
      CreateUsersAndAvatars1795175000000,
      CreateTransferOutbox1795176000000,
    ],
  });
  const mongo = createConnection();
  const http = createServer();
  const server: NotificationServer = new Server(http);
  const metrics = new MetricsService();
  const secret = 'integration-test-secret';
  const jwt = new JwtService();
  const gateway = new NotificationGateway(
    new AccessTokenService(jwt, { secret }),
    new ShutdownService(),
    metrics,
  );
  const clients: TestSocket[] = [];
  let service: NotificationService;
  let history: Model<TransferNotification>;
  let rejected: RejectedTransfersRepository;
  let balance: BalanceRepository;
  let outbox: OutboxRepository;
  let senderId: number;
  let recipientId: number;
  let outsiderId: number;
  let url: string;

  beforeAll(async () => {
    await database.initialize();
    await database.query(`CREATE SCHEMA "${namespace}"`);
    await database.runMigrations();
    await mongo.openUri(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
      { dbName: namespace, serverSelectionTimeoutMS: 5000 },
    );
    history = mongo.model(
      TransferNotification.name,
      TransferNotificationSchema,
    );
    const repository = new NotificationRepository(history);
    rejected = new RejectedTransfersRepository(
      mongo.model(RejectedTransfer.name, RejectedTransferSchema),
    );
    await Promise.all([repository.onModuleInit(), rejected.onModuleInit()]);
    Object.assign(gateway, { server });
    gateway.afterInit(server);
    server.on('connection', (client) => {
      void gateway.handleConnection(client);
      client.on('disconnect', () => gateway.handleDisconnect(client));
    });
    service = new NotificationService(gateway, repository, rejected);
    balance = new BalanceRepository(database);
    outbox = new OutboxRepository(database);
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await database.query(
      'TRUNCATE transfer_outbox, user_avatars, users RESTART IDENTITY CASCADE',
    );
    await history.deleteMany({});
    const users = await database.getRepository(User).save(
      ['sender', 'recipient', 'outsider'].map((username) => ({
        username,
        email: `${username}@example.test`,
        password: 'not-used',
        age: 25,
        description: '',
        balance: username === 'sender' ? '50.00' : '0.00',
      })),
    );
    [senderId, recipientId, outsiderId] = users.map((user) => user.id);
  });

  afterEach(() => {
    clients.splice(0).forEach((client) => client.disconnect());
  });

  afterAll(async () => {
    clients.forEach((client) => client.disconnect());
    await server.close();
    metrics.onApplicationShutdown();
    if (mongo.readyState === ConnectionStates.connected) {
      await mongo.dropDatabase();
    }
    await mongo.close();
    if (database.isInitialized) {
      await database.query(`DROP SCHEMA "${namespace}" CASCADE`);
      await database.destroy();
    }
  });

  function connect(userId: number): Promise<TestSocket> {
    const token = jwt.sign(
      { sub: userId, email: 'test@example.test', username: 'test' },
      { secret, expiresIn: '5m' },
    );
    return new Promise((resolve, reject) => {
      const client: TestSocket = io(url, {
        auth: { token },
        transports: ['polling'],
        reconnection: false,
        autoConnect: false,
      });
      clients.push(client);
      client.once('welcome', () => resolve(client));
      client.once('connect_error', reject);
      client.connect();
    });
  }

  function notification(client: TestSocket): Promise<unknown> {
    return new Promise((resolve) => client.once('notification', resolve));
  }

  async function balances(): Promise<string[]> {
    const users = await database
      .getRepository(User)
      .find({ select: { id: true, balance: true }, order: { id: 'ASC' } });
    return users.map((user) => user.balance);
  }

  it('доставляет перевод обоим устройствам отправителя и получателю, но не чужой комнате', async () => {
    const [a1, a2, b, c] = await Promise.all([
      connect(senderId),
      connect(senderId),
      connect(recipientId),
      connect(outsiderId),
    ]);
    const foreign = jest.fn();
    c.on('notification', foreign);
    const received = Promise.all([
      notification(a1),
      notification(a2),
      notification(b),
    ]);
    const result = await balance.transfer(senderId, {
      recipientId,
      amount: '20.51',
    });
    await outbox.processNext((row) => service.handleTransfer(row.payload));
    const payloads = await received;
    for (const payload of payloads) {
      expect(payload).toMatchObject({
        eventId: result.eventId,
        amount: '20.51',
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(foreign).not.toHaveBeenCalled();
    expect(await balances()).toEqual(['29.49', '20.51', '0.00']);
    expect(await history.countDocuments({ eventId: result.eventId })).toBe(1);
  });

  it('не создаёт событие при недостатке средств', async () => {
    await expect(
      balance.transfer(senderId, { recipientId, amount: '100.00' }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(await balances()).toEqual(['50.00', '0.00', '0.00']);
    const publish = jest.fn<Promise<void>, [unknown]>();
    expect(await outbox.processNext(publish)).toBeNull();
    expect(publish).not.toHaveBeenCalled();
  });

  it('откатывает списание при невозможности зачислить деньги', async () => {
    await database
      .getRepository(User)
      .update(recipientId, { balance: '9999999999.99' });
    await expect(
      balance.transfer(senderId, { recipientId, amount: '1.00' }),
    ).rejects.toBeInstanceOf(BalanceLimitExceededError);
    expect(await balances()).toEqual(['50.00', '9999999999.99', '0.00']);
    const publish = jest.fn<Promise<void>, [unknown]>();
    expect(await outbox.processNext(publish)).toBeNull();
    expect(publish).not.toHaveBeenCalled();
  });

  it('не позволяет двум переводам потратить один баланс дважды', async () => {
    const results = await Promise.allSettled([
      balance.transfer(senderId, { recipientId, amount: '40.00' }),
      balance.transfer(senderId, { recipientId, amount: '40.00' }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(await balances()).toEqual(['10.00', '40.00', '0.00']);
  });

  it('повтор события оставляет одну запись истории; изменённый payload с тем же ID отклоняется', async () => {
    const event: TransferCompletedEvent = {
      eventId: randomUUID(),
      fromUserId: senderId,
      toUserId: recipientId,
      amount: '1.00',
      occurredAt: new Date().toISOString(),
    };
    await service.handleTransfer(event);
    await service.handleTransfer(event);
    expect(await history.countDocuments({ eventId: event.eventId })).toBe(1);
    await expect(
      service.handleTransfer({ ...event, amount: '2.00' }),
    ).rejects.toThrow('Повторный eventId');
  });

  it('повторное помещение в карантин не создаёт второй документ', async () => {
    const input = {
      topic: 'transfer.completed',
      partition: 0,
      offset: '42',
      payloadJson: '{}',
      reason: 'invalid',
    };
    await rejected.save(input);
    await rejected.save(input);
    expect(
      await mongo
        .collection('rejected_transfers')
        .countDocuments({ topic: input.topic, offset: input.offset }),
    ).toBe(1);
  });

  it('отклоняет Socket.IO-подключение с неверным JWT', async () => {
    const client: TestSocket = io(url, {
      auth: { token: 'invalid' },
      reconnection: false,
      autoConnect: false,
    });
    clients.push(client);
    const rejectedConnection = new Promise<Error>((resolve) =>
      client.once('connect_error', resolve),
    );
    client.connect();
    expect((await rejectedConnection).message).toContain('access-токен');
    expect(client.connected).toBe(false);
  });
});
