import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  const mockMetricsService = {
    contentType: jest.fn().mockReturnValue('text/plain; version=0.0.4'),
    getMetrics: jest.fn().mockResolvedValue('# HELP sessions_started_total\n# TYPE sessions_started_total counter\n'),
  };

  let controller: MetricsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MetricsController(mockMetricsService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMetrics sets Content-Type header and ends response with metrics', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    await controller.getMetrics(mockRes as any);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; version=0.0.4',
    );
    expect(mockRes.end).toHaveBeenCalledWith(
      '# HELP sessions_started_total\n# TYPE sessions_started_total counter\n',
    );
  });
});
