import { Logger, OnModuleInit } from '@nestjs/common';
import { ShutdownService } from '@app/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { CLS_ID, ClsService } from 'nestjs-cls';
import type { Job, Queue } from 'bull';
import type { CleanupResult } from './interfaces/cleanupResult.interface';
import { AvatarCleanupService } from './avatarCleanup.service';

@Processor('avatar-cleanup')
export class AvatarCleanupProcessor implements OnModuleInit {
  private readonly logger = new Logger(AvatarCleanupProcessor.name);

  constructor(
    private readonly avatarCleanupService: AvatarCleanupService,
    private readonly cls: ClsService,
    private readonly shutdown: ShutdownService,
    @InjectQueue('avatar-cleanup') private readonly queue: Queue,
  ) {}

  onModuleInit(): void {
    this.shutdown.registerStopHandler(() => this.queue.pause(true, true));
  }

  @Process('cleanup')
  async handleCleanup(job: Job): Promise<CleanupResult> {
    const release = this.shutdown.beginWork();
    if (!release) throw new Error('Приложение останавливается');
    try {
      return await this.cls.run(async () => {
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
    } finally {
      release();
    }
  }
}
