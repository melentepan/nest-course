import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UsersRepository, UserUniqueConflictError } from './users.repository';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

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
    const [data, totalItems] = await this.usersRepository.findPage(dto);
    const totalPages = Math.ceil(totalItems / dto.limit) || 1;
    this.logger.debug(
      `Получена страница пользователей: page=${dto.page}, limit=${dto.limit}`,
    );

    return {
      data,
      meta: {
        page: dto.page,
        limit: dto.limit,
        totalItems,
        totalPages,
        hasNextPage: dto.page < totalPages,
        hasPreviousPage: dto.page > 1,
      },
    };
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    this.logger.debug(`Получен пользователь ${id}`);
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

  async updateRefreshToken(id: number, hashedToken: string) {
    await this.usersRepository.setRefreshToken(id, hashedToken);
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
