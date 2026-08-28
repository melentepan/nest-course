import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { DatabaseError } from 'pg';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    await this.isExist(createUserDto);

    const hashedPass = await bcrypt.hash(createUserDto.password, 10);

    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPass,
    });

    return this.usersRepository.save(newUser);
  }

  async isExist(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });
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
    const qb = this.usersRepository.createQueryBuilder('user');

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

    qb.orderBy('user.createdAt', dto.order).skip(dto.offset).take(dto.limit);

    const [data, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / dto.limit) || 1;

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
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`Пользователь не найден`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);

    try {
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const driverError: unknown = error.driverError;

        if (
          driverError instanceof DatabaseError &&
          driverError.code === '23505'
        ) {
          throw new ConflictException(
            'Пользователь с таким логином или email уже зарегистрирован',
          );
        }
      }

      throw error;
    }
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.softRemove(user);
  }

  async restore(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (!user.deletedAt) {
      throw new ConflictException('Пользователь не был удален');
    }

    const activeConflict = await this.usersRepository.findOne({
      where: [{ email: user.email }, { username: user.username }],
    });

    if (activeConflict) {
      throw new ConflictException(
        'Невозможно восстановить: email или логин уже заняты другим пользователем',
      );
    }

    await this.usersRepository.restore(id);

    return this.findOne(id);
  }

  async findByLogin(login: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :login OR user.username = :login', { login })
      .getOne();
  }

  async findByIdWithRefreshToken(id: number) {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.hashedRefreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updateRefreshToken(id: number, hashedToken: string) {
    await this.usersRepository.update(id, { hashedRefreshToken: hashedToken });
  }

  async logout(userId: number) {
    await this.usersRepository.update(userId, { hashedRefreshToken: null });
    return { message: 'Успешный выход из системы' };
  }
}
