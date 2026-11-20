import type { JobId } from 'bull';

export interface EnqueueCleanupResult {
  jobId: JobId;
  status: 'queued';
}
