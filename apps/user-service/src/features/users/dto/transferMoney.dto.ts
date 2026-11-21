import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Min } from 'class-validator';

export class TransferMoneyDto {
  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  recipientId: number;

  @ApiProperty({
    example: '20.51',
    description:
      'Положительная сумма USD строкой, максимум два знака после точки',
  })
  @IsString()
  @Matches(/^(?!0+(?:\.0{1,2})?$)(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  amount: string;
}
