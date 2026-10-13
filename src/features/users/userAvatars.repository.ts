import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, MoreThan, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserAvatar } from './entities/userAvatar.entity';

import type { CreateUserAvatarData } from './interfaces/createUserAvatarData.interface';

@Injectable()
export class UserAvatarsRepository {
  constructor(
    @InjectRepository(UserAvatar)
    private readonly repository: Repository<UserAvatar>,
    private readonly dataSource: DataSource,
  ) {}

  findExpiredAvatars(
    cutoff: Date,
    afterId: number,
    limit: number = 100,
  ): Promise<UserAvatar[]> {
    return this.repository.find({
      withDeleted: true,
      where: {
        deletedAt: LessThan(cutoff),
        id: MoreThan(afterId),
      },
      order: {
        id: 'ASC',
      },
      take: limit,
    });
  }

  async deleteExpiredAvatar(id: number, cutoff: Date): Promise<boolean> {
    const result = await this.repository.delete({
      id,
      deletedAt: LessThan(cutoff),
    });

    return result.affected === 1;
  }

  findUserAvatars(userId: number): Promise<UserAvatar[]> {
    return this.repository.find({
      where: {
        user: { id: userId },
      },
      order: {
        createdAt: 'desc',
        id: 'desc',
      },
    });
  }

  async softDeleteByIdAndUserId(
    avatarId: number,
    userId: number,
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .softDelete()
      .where('id = :avatarId', { avatarId })
      .andWhere('user_id = :userId', { userId })
      .andWhere('deleted_at IS NULL')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  countByUserId(userId: number): Promise<number> {
    return this.repository.count({
      where: {
        user: { id: userId },
      },
    });
  }

  create(data: CreateUserAvatarData): UserAvatar {
    return this.repository.create({
      storageKey: data.storageKey,
      mimeType: data.mimeType,
      size: data.size,
      user: { id: data.userId },
    });
  }

  saveWithActiveLimit(data: CreateUserAvatarData): Promise<UserAvatar> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id: data.userId })
        .getOne();

      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }

      const repository = manager.getRepository(UserAvatar);
      const count = await repository.count({
        where: { user: { id: data.userId } },
      });
      if (count >= 5) {
        throw new ConflictException('Можно загрузить максимум пять аватарок');
      }

      return repository.save(
        repository.create({
          storageKey: data.storageKey,
          mimeType: data.mimeType,
          size: data.size,
          user: { id: data.userId },
        }),
      );
    });
  }

  save(avatar: UserAvatar): Promise<UserAvatar> {
    return this.repository.save(avatar);
  }
}
