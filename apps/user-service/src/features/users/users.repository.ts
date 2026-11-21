import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DatabaseError } from 'pg';
import { Brackets, QueryFailedError, Repository } from 'typeorm';

import { CreateUserDto } from './dto/createUser.dto';
import { PaginationQueryDto } from './dto/paginationQuery.dto';
import { User } from './entities/user.entity';
import { UserUniqueConflictError } from './errors/user.errors';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}

  create(data: CreateUserDto): Promise<User> {
    return this.save(this.repository.create(data));
  }

  async save(user: User): Promise<User> {
    try {
      return await this.repository.save(user);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  findActiveByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<User | null> {
    return this.repository.findOne({ where: [{ email }, { username }] });
  }

  findPage(dto: PaginationQueryDto): Promise<[User[], number]> {
    const qb = this.repository.createQueryBuilder('user');

    if (dto.search) {
      const searchPattern = `%${dto.search}%`;
      qb.andWhere(
        new Brackets((bracket) => {
          bracket
            .where('user.username ILIKE :search', { search: searchPattern })
            .orWhere('user.email ILIKE :search', { search: searchPattern });
        }),
      );
    }

    return qb
      .orderBy('user.createdAt', dto.order)
      .skip(dto.offset)
      .take(dto.limit)
      .getManyAndCount();
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  findByIdIncludingDeleted(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id }, withDeleted: true });
  }

  async softRemove(user: User): Promise<void> {
    await this.repository.softRemove(user);
  }

  async restore(id: number): Promise<void> {
    try {
      await this.repository.restore(id);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  findByLogin(login: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :login OR user.username = :login', { login })
      .getOne();
  }

  findByIdWithRefreshToken(id: number): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.hashedRefreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  findActiveUsers(minAge: number, maxAge: number): Promise<User[]> {
    return this.repository
      .createQueryBuilder('u')
      .leftJoinAndSelect(
        'u.avatars',
        'avatar',
        `avatar.id = (
        SELECT latest.id
        FROM user_avatars latest
        WHERE latest.user_id = u.id
          AND latest.deleted_at IS NULL
        ORDER BY latest.created_at DESC, latest.id DESC
        LIMIT 1
      )`,
      )
      .where('u.age >= :minAge', { minAge })
      .andWhere('u.age <= :maxAge', { maxAge })
      .andWhere('LENGTH(TRIM(u.description)) > 0')
      .andWhere(
        `(
        SELECT COUNT(*)
        FROM user_avatars active_avatar
        WHERE active_avatar.user_id = u.id
          AND active_avatar.deleted_at IS NULL
      ) > 2`,
      )
      .getMany();
  }

  async setRefreshToken(id: number, hashedToken: string | null): Promise<void> {
    await this.repository.update(id, { hashedRefreshToken: hashedToken });
  }

  private handleDatabaseError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const driverError: unknown = error.driverError;

      if (
        driverError instanceof DatabaseError &&
        driverError.code === '23505'
      ) {
        throw new UserUniqueConflictError();
      }
    }

    throw error;
  }
}
