import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class ShutdownService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(ShutdownService.name);
  private draining = false;
  private started = false;
  private active = 0;
  private resolveIdle?: () => void;
  private readonly stopHandlers: Array<() => Promise<void>> = [];
  private stoppingWork: Promise<void> = Promise.resolve();
  private readonly signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  get isDraining(): boolean {
    return this.draining;
  }

  get isReady(): boolean {
    return this.started && !this.draining;
  }

  markStarted(): void {
    this.started = true;
  }

  onModuleInit(): void {
    for (const signal of this.signals) {
      process.prependListener(signal, this.onSignal);
    }
  }

  registerStopHandler(handler: () => Promise<void>): void {
    this.stopHandlers.push(handler);
  }

  startDraining(): void {
    if (this.draining) {
      return;
    }
    this.draining = true;
    this.stoppingWork = Promise.all(
      this.stopHandlers.map(async (stop) => {
        try {
          await stop();
        } catch (error: unknown) {
          this.logger.error(
            'Не удалось остановить источник задач',
            error instanceof Error ? error.stack : undefined,
          );
        }
      }),
    ).then(() => undefined);
    this.logger.log(`Начата остановка: активных операций=${this.active}`);
  }

  beginWork(): (() => void) | null {
    if (this.draining) {
      return null;
    }
    this.active++;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.active--;
      if (this.active === 0) {
        this.resolveIdle?.();
      }
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.startDraining();
    await this.stoppingWork;
    // Оставляем время балансировщику увидеть readiness=503.
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    if (this.active > 0) {
      await new Promise<void>((resolve) => {
        this.resolveIdle = resolve;
      });
    }
    this.resolveIdle = undefined;
    this.logger.log('Активные операции завершены');
  }

  onApplicationShutdown(): void {
    for (const signal of this.signals) {
      process.removeListener(signal, this.onSignal);
    }
  }

  private readonly onSignal = (): void => this.startDraining();
}
