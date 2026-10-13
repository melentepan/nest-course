import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({
    description: 'Короткоживущий JWT для доступа к защищённым маршрутам',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT для обновления пары токенов',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}
