import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';
import { Trim } from '../../../common/decorators/trim.decorator';

export class CreateUserDto {
  @ApiProperty({
    example: 'stepan_dev',
    description: 'Уникальное имя пользователя',
  })
  @ToLowerCase()
  @Trim()
  @IsString({ message: 'Логин должен быть строкой' })
  @IsNotEmpty({ message: 'Логин обязателен для заполнения' })
  username: string;

  @ApiProperty({ example: 'stepan@test.com', description: 'Почта' })
  @ToLowerCase()
  @Trim()
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email обязателен для заполнения' })
  email: string;

  @ApiProperty({
    example: 'Qwerty1234',
    description: 'Пароль',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен для заполнения' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;

  @ApiProperty({
    example: 21,
    description: 'Возраст',
    minimum: 1,
  })
  @IsInt({ message: 'Возраст должен быть целым числом' })
  @Min(1, { message: 'Возраст должен быть больше 0' })
  age: number;

  @ApiProperty({
    example: 'React/Nest developer',
    description: 'О себе',
    maxLength: 1000,
  })
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(1000, { message: 'Описание не может превышать 1000 символов' })
  description: string;
}
