import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

import { HealthService } from './health.service';
import type {
  LivenessResponse,
  ReadinessResponse,
} from './interfaces/health.interface';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessResponse> {
    const result = await this.health.ready();
    response.status(result.status === 'ready' ? 200 : 503);
    return result;
  }
}
