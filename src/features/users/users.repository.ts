import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DatabaseError } from 'pg';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { User } from './entities/user.entity';

export class UserUniqueConflictError extends Error {}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}

  async create(data: CreateUserDto) {
    return this.save(this.repository.create(data));
  }

  async save(user: User) {
    try {
      return await this.repository.save(user);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  findActiveByEmailOrUsername(email: string, username: string) {
    return this.repository.findOne({ where: [{ email }, { username }] });
  }

  findPage(dto: PaginationQueryDto) {
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

  findById(id: number) {
    return this.repository.findOneBy({ id });
  }

  findByIdIncludingDeleted(id: number) {
    return this.repository.findOne({ where: { id }, withDeleted: true });
  }

  async softRemove(user: User) {
    await this.repository.softRemove(user);
  }

  async restore(id: number) {
    try {
      await this.repository.restore(id);
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  findByLogin(login: string) {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :login OR user.username = :login', { login })
      .getOne();
  }

  findByIdWithRefreshToken(id: number) {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.hashedRefreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async setRefreshToken(id: number, hashedToken: string | null) {
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
