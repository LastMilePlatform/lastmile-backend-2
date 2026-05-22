import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController(new AppService());
  });

  it('getHealthCheck returns status ok', () => {
    expect(controller.getHealthCheck()).toEqual({
      status: 'ok',
      service: 'lastmile-backend',
    });
  });
});
