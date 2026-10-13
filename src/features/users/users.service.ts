import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from './dto/paginationQuery.dto';
import { UsersRepository, UserUniqueConflictError } from './users.repository';
import { UserRole } from '../../common/enums/userRole.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserResponseDto } from './dto/userResponse.dto';
import type { Cache } from 'cache-manager';
import { User } from './entities/user.entity';

import type { CachedUserProfile } from './interfaces/cachedUserProfile.interface';
import { CachedUsersPage } from './interfaces/cachedUsersPage.interface';
import { PaginatedUsersResponseDto } from './dto/paginatedUsersResponse.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  getActiveUsers(minAge: number, maxAge: number) {
    if (
      !Number.isSafeInteger(minAge) ||
      !Number.isSafeInteger(maxAge) ||
      minAge < 0 ||
      maxAge < 0 ||
      minAge > maxAge
    ) {
      throw new BadRequestException(
        'Границы возраста должны быть неотрицательными целыми числами; minAge не должен превышать maxAge',
      );
    }

    return this.usersRepository.findActiveUsers(minAge, maxAge);
  }

  async create(createUserDto: CreateUserDto) {
    await this.isExist(createUserDto);

    const hashedPass = await bcrypt.hash(createUserDto.password, 10);

    try {
      const user = await this.usersRepository.create({
        ...createUserDto,
        password: hashedPass,
      });
      this.logger.log(`Пользователь ${user.id} создан`);
      return user;
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
    }
  }

  async isExist(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findActiveByEmailOrUsername(
      createUserDto.email,
      createUserDto.username,
    );
    if (existingUser) {
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException(
          'Пользователь с таким логином или email уже зарегистрирован',
        );
      }
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException(
          'Пользователь с таким логином или email уже зарегистрирован',
        );
      }
    }
  }

  async findAll(dto: PaginationQueryDto) {
    const cacheKey = `users:list:${JSON.stringify({
      page: dto.page,
      limit: dto.limit,
      search: dto.search ?? '',
      order: dto.order,
    })}`;

    const cachedData = await this.cacheManager.get<CachedUsersPage>(cacheKey);

    if (cachedData != null) {
      this.logger.debug(
        `Список пользователей получен из Redis (cache hit): page=${dto.page}, limit=${dto.limit}`,
      );
      return {
        data: cachedData.data.map((user) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        })),
        meta: cachedData.meta,
      };
    }

    this.logger.debug(
      `Список пользователей отсутствует в кэше (cache miss): page=${dto.page}, limit=${dto.limit}`,
    );
    const [data, totalItems] = await this.usersRepository.findPage(dto);
    const totalPages = Math.ceil(totalItems / dto.limit) || 1;
    this.logger.debug(
      `Список пользователей получен из PostgreSQL: page=${dto.page}, limit=${dto.limit}`,
    );

    const result: PaginatedUsersResponseDto = {
      data: data.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        age: user.age,
        description: user.description,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      meta: {
        page: dto.page,
        limit: dto.limit,
        totalItems,
        totalPages,
        hasNextPage: dto.page < totalPages,
        hasPreviousPage: dto.page > 1,
      },
    };

    await this.cacheManager.set<CachedUsersPage>(
      cacheKey,
      {
        data: result.data.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
        meta: result.meta,
      },
      30000,
    );

    this.logger.debug(
      `Список пользователей сохранён в Redis на 30 секунд: page=${dto.page}, limit=${dto.limit}`,
    );
    return result;
  }

  async getProfile(id: number): Promise<UserResponseDto> {
    const cacheKey = `users:${id}`;
    const cachedUser = await this.cacheManager.get<CachedUserProfile>(cacheKey);

    if (cachedUser != null) {
      this.logger.debug(`Профиль ${id} получен из Redis (cache hit)`);
      return {
        ...cachedUser,
        createdAt: new Date(cachedUser.createdAt),
        updatedAt: new Date(cachedUser.updatedAt),
      };
    }

    this.logger.debug(`Профиль ${id} отсутствует в кэше (cache miss)`);
    const user = await this.findOne(id);
    const profile: UserResponseDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      age: user.age,
      description: user.description,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    await this.cacheManager.set<CachedUserProfile>(
      cacheKey,
      {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      30000,
    );

    this.logger.debug(`Профиль ${id} сохранён в Redis на 30 секунд`);
    return profile;
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    this.logger.debug(`Пользователь ${id} получен из PostgreSQL`);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, actorId: number) {
    await this.assertOwnerOrAdmin(id, actorId);

    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);

    try {
      const updatedUser = await this.usersRepository.save(user);
      this.logger.log(`Пользователь ${id} изменён пользователем ${actorId}`);
      return updatedUser;
    } catch (error: unknown) {
      this.handleUniqueConflict(error);
    }
  }

  async remove(id: number, actorId: number) {
    await this.assertOwnerOrAdmin(id, actorId);

    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
    this.logger.log(`Пользователь ${id} удалён пользователем ${actorId}`);
  }

  async restore(id: number, actorId: number) {
    await this.assertAdmin(actorId);

    const user = await this.usersRepository.findByIdIncludingDeleted(id);

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.deletedAt) {
      throw new ConflictException('Пользователь не был удален');
    }

    const activeConflict =
      await this.usersRepository.findActiveByEmailOrUsername(
        user.email,
        user.username,
      );

    if (activeConflict) {
      throw new ConflictException(
        'Невозможно восстановить: email или логин уже заняты другим пользователем',
      );
    }

    try {
      await this.usersRepository.restore(id);
    } catch (error: unknown) {
      if (error instanceof UserUniqueConflictError) {
        throw new ConflictException(
          'Невозможно восстановить: email или логин уже заняты другим пользователем',
        );
      }

      throw error;
    }

    this.logger.log(`Пользователь ${id} восстановлен пользователем ${actorId}`);
    return this.findOne(id);
  }

  findByLogin(login: string) {
    return this.usersRepository.findByLogin(login);
  }

  findByIdWithRefreshToken(id: number) {
    return this.usersRepository.findByIdWithRefreshToken(id);
  }

  updateRefreshToken(id: number, hashedToken: string): Promise<void> {
    return this.usersRepository.setRefreshToken(id, hashedToken);
  }

  async logout(userId: number) {
    await this.usersRepository.setRefreshToken(userId, null);
    this.logger.log(`Пользователь ${userId} вышел из системы`);
    return { message: 'Успешный выход из системы' };
  }

  private async assertOwnerOrAdmin(id: number, actorId: number) {
    const actor = await this.usersRepository.findById(actorId);

    if (!actor || (actor.id !== id && actor.role !== UserRole.ADMIN)) {
      throw new ForbiddenException('Нет доступа к этому аккаунту');
    }
  }

  private async assertAdmin(actorId: number) {
    const actor = await this.usersRepository.findById(actorId);

    if (actor?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно только администратору');
    }
  }

  private handleUniqueConflict(error: unknown): never {
    if (error instanceof UserUniqueConflictError) {
      throw new ConflictException(
        'Пользователь с таким логином или email уже зарегистрирован',
      );
    }

    throw error;
  }
}
