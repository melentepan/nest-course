import { randomUUID } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { IFileService } from '../../providers/files/files.adapter';
import { UserAvatar } from './entities/userAvatar.entity';
import {
  ActiveAvatarLimitError,
  AvatarUserNotFoundError,
} from './errors/userAvatar.errors';
import type { UploadAvatarResult } from './interfaces/uploadAvatarResult.interface';
import { UserAvatarsRepository } from './userAvatars.repository';

@Injectable()
export class UserAvatarsService {
  private readonly logger = new Logger(UserAvatarsService.name);

  constructor(
    private readonly fileService: IFileService,
    private readonly userAvatarsRepository: UserAvatarsRepository,
  ) {}

  getUserAvatars(userId: number): Promise<UserAvatar[]> {
    return this.userAvatarsRepository.findUserAvatars(userId);
  }

  async remove(avatarId: number, actorId: number): Promise<void> {
    const deleted = await this.userAvatarsRepository.softDeleteByIdAndUserId(
      avatarId,
      actorId,
    );

    if (!deleted) {
      throw new NotFoundException('Аватарка не найдена');
    }

    this.logger.log(
      `Аватарка ${avatarId} пользователя ${actorId} мягко удалена`,
    );
  }

  async upload(
    file: Express.Multer.File,
    actorId: number,
  ): Promise<UploadAvatarResult> {
    const count = await this.userAvatarsRepository.countByUserId(actorId);
    if (count >= 5) {
      throw new ConflictException('Можно загрузить максимум пять аватарок');
    }

    const { path } = await this.fileService.uploadFile({
      file,
      folder: 'profiles/avatars',
      name: randomUUID(),
    });

    try {
      const savedAvatar = await this.userAvatarsRepository.saveWithActiveLimit({
        storageKey: path,
        mimeType: file.mimetype,
        size: file.size,
        userId: actorId,
      });

      this.logger.log(
        `Аватарка ${savedAvatar.id} загружена пользователем ${actorId}`,
      );

      return {
        id: savedAvatar.id,
        storageKey: savedAvatar.storageKey,
        mimeType: savedAvatar.mimeType,
        size: savedAvatar.size,
        createdAt: savedAvatar.createdAt,
      };
    } catch (error: unknown) {
      try {
        await this.fileService.removeFile({ path });
      } catch (cleanupError) {
        this.logger.error(
          `Не удалось удалить файл после ошибки сохранения аватарки: ${path}`,
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }

      if (error instanceof AvatarUserNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof ActiveAvatarLimitError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }
}
