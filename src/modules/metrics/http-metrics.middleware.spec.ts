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

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('calls next() and records metrics when response finishes with 2xx', () => {
    const next = jest.fn();
    let finishCb: () => void;
    const mockRes = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
      statusCode: 200,
    };
    const mockReq = { path: '/api/v1/products', method: 'GET' };

    middleware.use(mockReq as any, mockRes as any, next);

    expect(next).toHaveBeenCalled();

    finishCb!();

    expect(mockMetricsService.httpDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', route: '/api/v1/products', status: '200' }),
      expect.any(Number),
    );
    expect(mockMetricsService.httpRequests.inc).toHaveBeenCalled();
    expect(mockMetricsService.httpErrors.inc).not.toHaveBeenCalled();
  });

  it('records error metrics for 4xx responses', () => {
    const next = jest.fn();
    let finishCb: () => void;
    const mockRes = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
      statusCode: 404,
    };
    const mockReq = { path: '/api/v1/auctions/99', method: 'GET' };

    middleware.use(mockReq as any, mockRes as any, next);
    finishCb!();

    expect(mockMetricsService.httpErrors.inc).toHaveBeenCalledWith({ status: '404' });
  });

  it('records error metrics for 5xx responses', () => {
    const next = jest.fn();
    let finishCb: () => void;
    const mockRes = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
      statusCode: 500,
    };
    const mockReq = { path: '/api/v1/auctions', method: 'POST' };

    middleware.use(mockReq as any, mockRes as any, next);
    finishCb!();

    expect(mockMetricsService.httpErrors.inc).toHaveBeenCalledWith({ status: '500' });
  });

  it('normalizes numeric path segments to :id', () => {
    const next = jest.fn();
    let finishCb: () => void;
    const mockRes = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCb = cb;
      }),
      statusCode: 200,
    };
    const mockReq = { path: '/api/v1/auctions/123/bids/456', method: 'GET' };

    middleware.use(mockReq as any, mockRes as any, next);
    finishCb!();

    expect(mockMetricsService.httpDuration.observe).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/api/v1/auctions/:id/bids/:id' }),
      expect.any(Number),
    );
  });
});
