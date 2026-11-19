import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AvatarCleanupService } from './avatarCleanup.service';

@Injectable()
export class AvatarCleanupScheduler implements OnModuleInit {
  private readonly logger = new Logger(AvatarCleanupScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly avatarCleanupService: AvatarCleanupService,
  ) {}

  onModuleInit(): void {
    const cron = this.configService.getOrThrow<string>('avatarCleanup.cron');
    const timezone = this.configService.getOrThrow<string>(
      'avatarCleanup.timezone',
    );

    const job = new CronJob(
      cron,
      () => {
        void this.enqueueCleanup();
      },
      null,
      false,
      timezone,
    );

    this.schedulerRegistry.addCronJob('avatar-cleanup', job);
    job.start();

    this.logger.log(
      `Расписание чистки аватарок подключено: cron=${cron}, timezone=${timezone}`,
    );
  }

  private async enqueueCleanup(): Promise<void> {
    try {
      const minute = Math.floor(Date.now() / 60000);
      const jobId = `avatar-cleanup-${minute}`;

      const result = await this.avatarCleanupService.enqueueCleanup(jobId);

      this.logger.log(
        `Задача чистки добавлена по расписанию: jobId=${result.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        'Не удалось добавить задачу чистки по расписанию',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
