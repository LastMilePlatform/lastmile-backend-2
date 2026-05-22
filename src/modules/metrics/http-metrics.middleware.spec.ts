import { HttpMetricsMiddleware } from './http-metrics.middleware';

describe('HttpMetricsMiddleware', () => {
  const mockMetricsService = {
    httpDuration: { observe: jest.fn() },
    httpRequests: { inc: jest.fn() },
    httpErrors: { inc: jest.fn() },
  };

  let middleware: HttpMetricsMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new HttpMetricsMiddleware(mockMetricsService as any);
  });

  function makeRequest(path: string, method: string, statusCode: number) {
    let finishCb!: () => void;
    const mockRes = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
      statusCode,
    };
    const mockReq = { path, method };
    const next = jest.fn();
    middleware.use(mockReq as any, mockRes as any, next);
    return { next, triggerFinish: () => finishCb() };
  }

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('calls next() and records duration and request count for 2xx', () => {
    const { next, triggerFinish } = makeRequest('/api/v1/products', 'GET', 200);
    expect(next).toHaveBeenCalled();
    triggerFinish();
    expect(mockMetricsService.httpDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', route: '/api/v1/products', status: '200' }),
      expect.any(Number),
    );
    expect(mockMetricsService.httpRequests.inc).toHaveBeenCalled();
    expect(mockMetricsService.httpErrors.inc).not.toHaveBeenCalled();
  });

  it('records error metrics for 4xx responses', () => {
    const { triggerFinish } = makeRequest('/api/v1/auctions/99', 'GET', 404);
    triggerFinish();
    expect(mockMetricsService.httpErrors.inc).toHaveBeenCalledWith({ status: '404' });
  });

  it('records error metrics for 5xx responses', () => {
    const { triggerFinish } = makeRequest('/api/v1/auctions', 'POST', 500);
    triggerFinish();
    expect(mockMetricsService.httpErrors.inc).toHaveBeenCalledWith({ status: '500' });
  });

  it('normalizes numeric path segments to :id', () => {
    const { triggerFinish } = makeRequest('/api/v1/auctions/123/bids/456', 'GET', 200);
    triggerFinish();
    expect(mockMetricsService.httpDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/api/v1/auctions/:id/bids/:id' }),
      expect.any(Number),
    );
  });
});
