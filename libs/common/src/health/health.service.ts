import { Inject, Injectable } from '@nestjs/common';

import { ShutdownService } from '../lifecycle/shutdown.service';
import type {
  DependencyChecks,
  ReadinessResponse,
} from './interfaces/health.interface';

export const HEALTH_CHECKS = 'HEALTH_CHECKS';
const HEALTH_CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  private pending?: Promise<Record<string, 'up' | 'down'>>;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly shutdown: ShutdownService,
    @Inject(HEALTH_CHECKS) private readonly checks: DependencyChecks,
  ) {}

  async ready(): Promise<ReadinessResponse> {
    if (!this.shutdown.isReady) {
      return { status: 'not_ready', dependencies: {} };
    }
    this.pending ??= this.checkDependencies().finally(() => {
      this.pending = undefined;
    });
    const dependencies = await this.pending;
    const ready =
      this.shutdown.isReady &&
      Object.values(dependencies).every((status) => status === 'up');
    return { status: ready ? 'ready' : 'not_ready', dependencies };
  }

  private getCheck(
    name: string,
    check: () => Promise<unknown>,
  ): Promise<unknown> {
    const existing = this.inFlight.get(name);
    if (existing) {
      return existing;
    }
    const operation = Promise.resolve().then(check);
    this.inFlight.set(name, operation);
    const clear = (): void => {
      this.inFlight.delete(name);
    };
    void operation.then(clear, clear);
    return operation;
  }

  private async checkDependencies(): Promise<Record<string, 'up' | 'down'>> {
    const entries = await Promise.all(
      Object.entries(this.checks).map(async ([name, check]) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            this.getCheck(name, check),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Health check timeout')),
                HEALTH_CHECK_TIMEOUT_MS,
              );
            }),
          ]);
          return [name, 'up'] as const;
        } catch {
          return [name, 'down'] as const;
        } finally {
          clearTimeout(timer);
        }
      }),
    );
    return Object.fromEntries(entries);
  }
}
