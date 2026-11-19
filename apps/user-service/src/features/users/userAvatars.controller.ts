import { FileInterceptor } from '@nestjs/platform-express';
import { UserAvatarsService } from './userAvatars.service';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Аватарки')
@ApiBearerAuth('JWT-auth')
@ApiUnauthorizedResponse({
  description: 'Access-токен отсутствует, недействителен или истёк',
})
@UseGuards(AuthGuard)
@Controller('profile/avatars')
export class UserAvatarsController {
  constructor(private readonly userAvatarsService: UserAvatarsService) {}

  @Delete(':avatarId')
  @ApiOperation({ summary: 'Мягкое удаление своей аватарки' })
  @ApiBadRequestResponse({
    description: 'ID аватарки должен быть целым числом',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'avatarId', type: Number, description: 'ID аватарки' })
  @ApiNoContentResponse({
    description: 'Аватарка мягко удалена; файл остаётся в бакете',
  })
  @ApiNotFoundResponse({
    description: 'Активная аватарка пользователя не найдена',
  })
  remove(
    @Param('avatarId', ParseIntPipe) avatarId: number,
    @CurrentUser('sub') actorId: number,
  ): Promise<void> {
    return this.userAvatarsService.remove(avatarId, actorId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Загрузка своей аватарки' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Изображение JPEG или PNG размером до 10 МБ',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Аватарка загружена',
    schema: {
      type: 'object',
      required: ['id', 'storageKey', 'mimeType', 'size', 'createdAt'],
      properties: {
        id: { type: 'integer', example: 1 },
        storageKey: { type: 'string', example: 'profiles/avatars/uuid' },
        mimeType: { type: 'string', example: 'image/png' },
        size: {
          type: 'integer',
          example: 102400,
          description: 'Размер в байтах',
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Файл отсутствует или не прошёл проверку формата и размера',
  })
  @ApiPayloadTooLargeResponse({ description: 'Файл превышает 10 МБ' })
  @ApiConflictResponse({ description: 'Уже загружено пять активных аватарок' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png)$/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: Express.Multer.File,
    @CurrentUser('sub') actorId: number,
  ) {
    return this.userAvatarsService.upload(file, actorId);
  }

  @ApiOperation({
    summary: 'Получение своих активных аватарок',
  })
  @ApiOkResponse({
    description:
      'Аватарки от новых к старым; если аватарок нет — пустой массив',
  })
  @Get()
  getAvatars(@CurrentUser('sub') actorId: number) {
    return this.userAvatarsService.getUserAvatars(actorId);
  }
}
