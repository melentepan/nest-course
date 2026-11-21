import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { BalanceRepository } from './balance.repository';
import { TransferMoneyDto } from './dto/transferMoney.dto';
import {
  BalanceLimitExceededError,
  InsufficientBalanceError,
  TransferUserNotFoundError,
} from './errors/balance.errors';
import type { ResetBalancesResult } from './interfaces/resetBalancesResult.interface';
import type { TransferResult } from './interfaces/transferResult.interface';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(private readonly balanceRepository: BalanceRepository) {}

  async resetAllBalances(actorId: number): Promise<ResetBalancesResult> {
    const affectedUsers = await this.balanceRepository.resetAllBalances();

    this.logger.log(
      `Администратор ${actorId} обнулил балансы пользователей: затронуто=${affectedUsers}`,
    );

    return { affectedUsers };
  }

  async transfer(
    senderId: number,
    dto: TransferMoneyDto,
  ): Promise<TransferResult> {
    this.logger.debug(
      `Начало перевода ${dto.amount} USD от пользователя ${senderId} пользователю ${dto.recipientId}`,
    );
    if (senderId === dto.recipientId) {
      this.logger.warn(
        `Перевод отклонён: пользователь ${senderId} указал самого себя получателем`,
      );
      throw new BadRequestException('Нельзя переводить деньги самому себе');
    }

    const result = await this.balanceRepository
      .transfer(senderId, dto)
      .catch((error: unknown) => {
        const transferDescription = `Перевод ${dto.amount} USD от пользователя ${senderId} пользователю ${dto.recipientId}`;

        if (error instanceof TransferUserNotFoundError) {
          this.logger.warn(`${transferDescription} отклонён: ${error.message}`);
          throw new NotFoundException(error.message);
        }

        if (
          error instanceof InsufficientBalanceError ||
          error instanceof BalanceLimitExceededError
        ) {
          this.logger.warn(`${transferDescription} отклонён: ${error.message}`);
          throw new ConflictException(error.message);
        }

        this.logger.error(
          `${transferDescription} завершился ошибкой`,
          error instanceof Error ? error.stack : undefined,
        );

        throw error;
      });

    const { eventId, ...response } = result;
    this.logger.log({
      msg: 'Перевод завершён',
      eventId,
      fromUserId: senderId,
      toUserId: dto.recipientId,
      amount: dto.amount,
    });
    return response;
  }
}
