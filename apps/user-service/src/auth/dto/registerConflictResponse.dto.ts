import { ApiProperty } from '@nestjs/swagger';

export class RegisterConflictResponseDto {
  @ApiProperty({
    example: 'Пользователь с таким логином или email уже зарегистрирован',
  })
  message: string;

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: 409 })
  statusCode: number;
}
