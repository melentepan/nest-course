import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'stepan_dev' })
  username: string;

  @ApiProperty({ example: 'stepan@example.com' })
  email: string;

  @ApiProperty({ example: 21 })
  age: number;

  @ApiProperty({ example: 'NestJS developer' })
  description: string;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-28T12:30:00.000Z', format: 'date-time' })
  updatedAt: Date;
}
