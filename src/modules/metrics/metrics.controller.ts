import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';
import { SkipSigning } from '../../guards/skip-signing.decorator';

@SkipSigning()
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', this.metricsService.contentType());
    const metrics = await this.metricsService.getMetrics();
    res.end(metrics);
  }
}
