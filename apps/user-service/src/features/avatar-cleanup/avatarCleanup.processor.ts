import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { CLS_ID, ClsService } from 'nestjs-cls';
import type { Job } from 'bull';
import { AvatarCleanupService } from './avatarCleanup.service';

@Processor('avatar-cleanup')
export class AvatarCleanupProcessor {
  private readonly logger = new Logger(AvatarCleanupProcessor.name);

  constructor(
    private readonly avatarCleanupService: AvatarCleanupService,
    private readonly cls: ClsService,
  ) {}

  @Process('cleanup')
  handleCleanup(job: Job) {
    return this.cls.run(async () => {
      this.cls.set(CLS_ID, `avatar-cleanup-job-${job.id}`);
      this.logger.log(`Начата чистка аватарок: jobId=${job.id}`);
      try {
        return await this.avatarCleanupService.cleanup();
      } catch (error) {
        this.logger.error(
          `Чистка аватарок завершилась ошибкой: jobId=${job.id}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw error;
      }
    });
  }
}
