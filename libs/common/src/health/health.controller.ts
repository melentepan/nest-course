import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ShutdownService } from '../lifecycle/shutdown.service';
import type {
  DependencyChecks,
  LivenessResponse,
  ReadinessResponse,
} from './interfaces/health.interface';

export const HEALTH_CHECKS = 'HEALTH_CHECKS';

@Controller('health')
export class HealthController {
  private pending?: Promise<Record<string, 'up' | 'down'>>;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly shutdown: ShutdownService,
    @Inject(HEALTH_CHECKS) private readonly checks: DependencyChecks,
  ) {}

  @Get('live')
  live(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessResponse> {
    if (!this.shutdown.isReady) {
      response.status(503);
      return { status: 'not_ready', dependencies: {} };
    }
    this.pending ??= this.checkDependencies().finally(() => {
      this.pending = undefined;
    });
    const dependencies = await this.pending;
    const ready =
      this.shutdown.isReady &&
      Object.values(dependencies).every((status) => status === 'up');
    response.status(ready ? 200 : 503);
    return { status: ready ? 'ready' : 'not_ready', dependencies };
  }

  private getCheck(
    name: string,
    check: () => Promise<unknown>,
  ): Promise<unknown> {
    const existing = this.inFlight.get(name);
    if (existing) return existing;
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
                2000,
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
