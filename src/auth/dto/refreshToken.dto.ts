import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Действующий refresh-токен',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh токен должен быть строкой' })
  @IsNotEmpty({ message: 'Refresh токен обязателен' })
  refreshToken: string;
}
