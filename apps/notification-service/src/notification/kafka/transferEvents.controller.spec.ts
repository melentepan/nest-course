import { Logger } from '@nestjs/common';
import { KafkaContext, KafkaRetriableException } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import { ShutdownService } from '@app/common';

import { NotificationService } from '../notification.service';
import { TransferEventsController } from './transferEvents.controller';

describe('TransferEventsController: карантин и offset', () => {
  const quarantine = jest.fn<Promise<void>, [unknown]>();
  const handleTransfer = jest.fn<Promise<void>, [unknown]>();
  const commitOffsets = jest.fn<Promise<void>, [unknown]>();
  const release = jest.fn();
  let controller: TransferEventsController;
  const context = {
    getTopic: () => 'transfer.completed',
    getPartition: () => 0,
    getMessage: () => ({ offset: '9007199254740993' }),
    getConsumer: () => ({ commitOffsets }),
  } as unknown as KafkaContext;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      controllers: [TransferEventsController],
      providers: [
        {
          provide: NotificationService,
          useValue: { quarantine, handleTransfer },
        },
        { provide: ShutdownService, useValue: { beginWork: () => release } },
      ],
    }).compile();
    controller = module.get(TransferEventsController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('ждёт сохранения карантина перед подтверждением следующего offset', async () => {
    let finish!: () => void;
    quarantine.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const processing = controller.handle({ invalid: true }, context);
    expect(commitOffsets).not.toHaveBeenCalled();
    finish();
    await processing;
    expect(quarantine).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'transfer.completed',
        partition: 0,
        offset: '9007199254740993',
        payloadJson: '{"invalid":true}',
      }),
    );
    expect(commitOffsets).toHaveBeenCalledWith([
      {
        topic: 'transfer.completed',
        partition: 0,
        offset: '9007199254740994',
      },
    ]);
    expect(handleTransfer).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('не подтверждает offset при ошибке сохранения', async () => {
    quarantine.mockRejectedValue(new Error('MongoDB offline'));
    await expect(controller.handle({}, context)).rejects.toBeInstanceOf(
      KafkaRetriableException,
    );
    expect(commitOffsets).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('разрешает повтор при ошибке подтверждения offset', async () => {
    quarantine.mockResolvedValue(undefined);
    commitOffsets.mockRejectedValue(new Error('Kafka offline'));
    await expect(controller.handle({}, context)).rejects.toBeInstanceOf(
      KafkaRetriableException,
    );
    expect(quarantine).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
