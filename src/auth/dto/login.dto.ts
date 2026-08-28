import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ToLowerCase } from '../../common/decorators/to-lower-case.decorator';
import { Trim } from '../../common/decorators/trim.decorator';

export class LoginDto {
  @ApiProperty({
    example: 'stepan_dev',
    description: 'Логин или email пользователя',
  })
  @ToLowerCase()
  @Trim()
  @IsString({ message: 'Логин должен быть строкой' })
  @IsNotEmpty({ message: 'Логин или email обязательны' })
  login: string;

  @ApiProperty({ example: 'Qwerty1234', minLength: 6 })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль не менее 6 символов' })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;
}
