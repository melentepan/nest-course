import { registerAs } from '@nestjs/config';

export const avatarCleanupConfig = registerAs('avatarCleanup', () => ({
  retentionMs: Number(process.env.AVATAR_CLEANUP_RETENTION_MS ?? 604800000),
  cron: process.env.AVATAR_CLEANUP_CRON ?? '0 0 3 * * *',
  timezone: process.env.AVATAR_CLEANUP_TIMEZONE ?? 'Europe/Moscow',
}));
