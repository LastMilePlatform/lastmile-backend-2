import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipSigning } from './guards/skip-signing.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @SkipSigning()
  getHealthCheck(): { status: 'ok'; service: 'lastmile-backend' } {
    return this.appService.getHealthCheck();
  }
}
