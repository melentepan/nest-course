import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { TransferMoneyDto } from './dto/transferMoney.dto';
import {
  BalanceLimitExceededError,
  InsufficientBalanceError,
  TransferUserNotFoundError,
} from './errors/balance.errors';

@Injectable()
export class BalanceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async resetAllBalances(): Promise<number> {
    const result = await this.dataSource
      .getRepository(User)
      .createQueryBuilder()
      .update(User)
      .set({ balance: '0.00' })
      .execute();

    return result.affected ?? 0;
  }

  transfer(senderId: number, dto: TransferMoneyDto) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const ids = [senderId, dto.recipientId].sort((a, b) => a - b);

      for (const id of ids) {
        const user = await repository
          .createQueryBuilder('user')
          .setLock('pessimistic_write')
          .where('user.id = :id', { id })
          .getOne();
        if (!user) {
          throw new TransferUserNotFoundError(
            'Отправитель или получатель не найден',
          );
        }
      }

      const debit = await repository
        .createQueryBuilder()
        .update(User)
        .set({ balance: () => 'balance - CAST(:amount AS numeric)' })
        .where('id = :senderId', { senderId })
        .andWhere('balance >= CAST(:amount AS numeric)')
        .setParameter('amount', dto.amount)
        .execute();
      if (debit.affected !== 1) {
        throw new InsufficientBalanceError('Недостаточно средств');
      }

      const credit = await repository
        .createQueryBuilder()
        .update(User)
        .set({ balance: () => 'balance + CAST(:amount AS numeric)' })
        .where('id = :recipientId', { recipientId: dto.recipientId })
        .andWhere('balance + CAST(:amount AS numeric) <= 9999999999.99')
        .setParameter('amount', dto.amount)
        .execute();
      if (credit.affected !== 1) {
        throw new BalanceLimitExceededError(
          'Превышен максимальный баланс получателя',
        );
      }

      const sender = await repository
        .createQueryBuilder('user')
        .addSelect('user.balance')
        .where('user.id = :senderId', { senderId })
        .getOneOrFail();
      return {
        recipientId: dto.recipientId,
        amount: dto.amount,
        balance: sender.balance,
      };
    });
  }
}
