import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AdminGuard } from '../../auth/guards/admin.guard';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { AvatarCleanupService } from './avatarCleanup.service';
import type { EnqueueCleanupResult } from './interfaces/enqueueCleanupResult.interface';

@ApiTags('Чистка аватарок')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard, AdminGuard)
@Controller('avatar-cleanup')
export class AvatarCleanupController {
  constructor(private readonly avatarCleanupService: AvatarCleanupService) {}

  @Post()
  @ApiUnauthorizedResponse({
    description: 'Требуется действующий access-токен',
  })
  @ApiForbiddenResponse({ description: 'Доступно только администратору' })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Поставить задачу чистки аватарок в очередь',
  })
  @ApiAcceptedResponse({
    description: 'Задача принята в очередь',
    schema: {
      example: {
        jobId: '1',
        status: 'queued',
      },
    },
  })
  enqueueCleanup(): Promise<EnqueueCleanupResult> {
    return this.avatarCleanupService.enqueueCleanup();
  }
}
