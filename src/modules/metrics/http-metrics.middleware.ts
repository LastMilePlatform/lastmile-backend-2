import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const route = this.normalizeRoute(req.path);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const status = res.statusCode.toString();
      const labels = { method: req.method, route, status };

      this.metricsService.httpDuration.observe(labels, duration);
      this.metricsService.httpRequests.inc(labels);

      if (res.statusCode >= 400) {
        this.metricsService.httpErrors.inc({ status });
      }
    });

    next();
  }

  private normalizeRoute(path: string): string {
    // Replace numeric IDs to group routes (e.g. /api/v1/auctions/123 -> /api/v1/auctions/:id)
    return path.replace(/\/\d+/g, '/:id');
  }
}
