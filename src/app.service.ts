import { Injectable } from '@nestjs/common';
import { hostname } from 'os';

type HealthCheckResponse = {
  status: 'ok';
  service: 'lastmile-backend';
  hostname: string;
};

@Injectable()
export class AppService {
  getHealthCheck(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'lastmile-backend',
      hostname: hostname(),
    };
  }
}
