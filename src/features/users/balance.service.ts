import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BalanceRepository } from './balance.repository';
import { TransferMoneyDto } from './dto/transferMoney.dto';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(private readonly balanceRepository: BalanceRepository) {}

  async transfer(senderId: number, dto: TransferMoneyDto) {
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

        if (
          error instanceof NotFoundException ||
          error instanceof ConflictException
        ) {
          this.logger.warn(`${transferDescription} отклонён: ${error.message}`);
        } else {
          this.logger.error(
            `${transferDescription} завершился ошибкой`,
            error instanceof Error ? error.stack : undefined,
          );
        }

        throw error;
      });

    this.logger.log(
      `Перевод ${dto.amount} USD от пользователя ${senderId} пользователю ${dto.recipientId} завершён`,
    );
    return result;
  }
}
