import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bull';
import { UserAvatarsRepository } from '../users/userAvatars.repository';
import { IFileService } from '../../providers/files/files.adapter';

@Injectable()
export class AvatarCleanupService {
  private readonly logger = new Logger(AvatarCleanupService.name);

  constructor(
    @InjectQueue('avatar-cleanup')
    private readonly cleanupQueue: Queue,
    private readonly configService: ConfigService,
    private readonly userAvatarsRepository: UserAvatarsRepository,
    private readonly fileService: IFileService,
  ) {}

  async enqueueCleanup(jobId?: string) {
    const job = await this.cleanupQueue.add(
      'cleanup',
      {},
      {
        jobId,
        removeOnComplete: { age: 24 * 60 * 60 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    );

    return {
      jobId: job.id,
      status: 'queued',
    };
  }

  async cleanup() {
    const retentionMs = this.configService.getOrThrow<number>(
      'avatarCleanup.retentionMs',
    );

    if (!Number.isSafeInteger(retentionMs) || retentionMs <= 0) {
      throw new Error(
        'Срок хранения аватарок должен быть положительным целым числом',
      );
    }

    const cutoff = new Date(Date.now() - retentionMs);
    let afterId = 0;
    let processed = 0;
    let deleted = 0;
    let failed = 0;
    let skipped = 0;

    while (true) {
      const avatars = await this.userAvatarsRepository.findExpiredAvatars(
        cutoff,
        afterId,
        100,
      );

      if (avatars.length === 0) {
        break;
      }

      for (const avatar of avatars) {
        processed++;

        try {
          await this.fileService.removeFile({ path: avatar.storageKey });
          const removed = await this.userAvatarsRepository.deleteExpiredAvatar(
            avatar.id,
            cutoff,
          );

          if (removed) {
            deleted++;
          } else {
            skipped++;
          }
        } catch (error) {
          failed++;
          this.logger.error(
            `Ошибка чистки аватарки: avatarId=${avatar.id}, storageKey=${avatar.storageKey}`,
            error instanceof Error ? error.stack : String(error),
          );
        }

        afterId = avatar.id;
      }
    }

    const result = { processed, deleted, failed, skipped };
    const message = `Чистка аватарок завершена: просмотрено=${processed}, удалено=${deleted}, ошибок=${failed}, пропущено=${skipped}`;
    if (failed > 0) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }

    return result;
  }
}
