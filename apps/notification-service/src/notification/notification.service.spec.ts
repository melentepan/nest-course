import { randomUUID } from 'node:crypto';

import { Test } from '@nestjs/testing';

import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { RejectedTransfersRepository } from './rejectedTransfers.repository';

describe('NotificationService', () => {
  const saveTransfer = jest.fn<Promise<void>, [unknown]>();
  const sendNotification = jest.fn();
  let service: NotificationService;
  const event = {
    eventId: randomUUID(),
    fromUserId: 1,
    toUserId: 2,
    amount: '20.51',
    occurredAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: { saveTransfer } },
        { provide: NotificationGateway, useValue: { sendNotification } },
        { provide: RejectedTransfersRepository, useValue: { save: jest.fn() } },
      ],
    }).compile();
    service = module.get(NotificationService);
  });

  it('дожидается истории и отправляет событие обоим участникам', async () => {
    let finish!: () => void;
    saveTransfer.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const processing = service.handleTransfer(event);
    expect(sendNotification).not.toHaveBeenCalled();
    finish();
    await processing;
    expect(saveTransfer).toHaveBeenCalledWith(event);
    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(sendNotification).toHaveBeenCalledWith(1, event);
    expect(sendNotification).toHaveBeenCalledWith(2, event);
  });

  it('не отправляет уведомления при ошибке сохранения истории', async () => {
    saveTransfer.mockRejectedValue(new Error('MongoDB offline'));
    await expect(service.handleTransfer(event)).rejects.toThrow(
      'MongoDB offline',
    );
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
