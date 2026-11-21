import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Registry } from 'prom-client';

@Injectable()
export class MetricsService implements OnApplicationShutdown {
  private readonly registry = new Registry();
  private readonly connections = new Set<string>();
  private readonly activeConnections = new Gauge({
    name: 'notification_websocket_connections',
    help: 'Number of active authenticated Socket.IO connections',
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.activeConnections.set(0);
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  addConnection(id: string): void {
    this.connections.add(id);
    this.activeConnections.set(this.connections.size);
  }

  removeConnection(id: string): void {
    this.connections.delete(id);
    this.activeConnections.set(this.connections.size);
  }

  onApplicationShutdown(): void {
    this.connections.clear();
    this.registry.clear();
  }
}
