import { createHmac } from 'node:crypto';

const TEST_SECRET = 'test-signing-secret'; // NOSONAR — not a real credential, unit tests only

function makeReflector(skip = false) {
  return { getAllAndOverride: jest.fn().mockReturnValue(skip) };
}

function makeContext(opts: {
  type?: string;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: unknown;
} = {}) {
  const req = {
    method: opts.method ?? 'GET',
    path: opts.path ?? '/users',
    headers: opts.headers ?? {},
    body: opts.body,
  };
  return {
    getType: () => opts.type ?? 'http',
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => req }),
  };
}

function sign(method: string, path: string, ts: string, body = '') {
  const msg = [method, path, ts, body].join('\n');
  return createHmac('sha256', TEST_SECRET).update(msg).digest('hex');
}

describe('RequestSigningGuard — no secret configured', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Guard: any;

  beforeAll(() => {
    delete process.env.REQUEST_SIGNING_SECRET;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ RequestSigningGuard: Guard } = require('./request-signing.guard'));
  });

  it('returns true for non-http context', () => {
    const guard = new Guard(makeReflector());
    expect(guard.canActivate(makeContext({ type: 'ws' }))).toBe(true);
  });

  it('returns true when no secret is configured', () => {
    const guard = new Guard(makeReflector());
    expect(guard.canActivate(makeContext())).toBe(true);
  });
});

describe('RequestSigningGuard — with secret', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Guard: any;

  beforeAll(() => {
    process.env.REQUEST_SIGNING_SECRET = TEST_SECRET;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ RequestSigningGuard: Guard } = require('./request-signing.guard'));
  });

  afterAll(() => {
    delete process.env.REQUEST_SIGNING_SECRET;
  });

  it('returns true when @SkipSigning() is applied', () => {
    const guard = new Guard(makeReflector(true));
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('returns true for OPTIONS preflight', () => {
    const guard = new Guard(makeReflector());
    expect(guard.canActivate(makeContext({ method: 'OPTIONS' }))).toBe(true);
  });

  it('throws when x-signature header is missing', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now());
    expect(() =>
      guard.canActivate(makeContext({ headers: { 'x-timestamp': ts } })),
    ).toThrow();
  });

  it('throws when x-timestamp header is missing', () => {
    const guard = new Guard(makeReflector());
    expect(() =>
      guard.canActivate(makeContext({ headers: { 'x-signature': 'aa' } })),
    ).toThrow();
  });

  it('throws when timestamp is expired', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now() - 10 * 60 * 1000);
    expect(() =>
      guard.canActivate(makeContext({ headers: { 'x-signature': 'aa', 'x-timestamp': ts } })),
    ).toThrow();
  });

  it('accepts a valid signature', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now());
    const sig = sign('GET', '/users', ts);
    expect(guard.canActivate(makeContext({ headers: { 'x-signature': sig, 'x-timestamp': ts } }))).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now());
    const wrongSig = 'a'.repeat(64);
    expect(() =>
      guard.canActivate(makeContext({ headers: { 'x-signature': wrongSig, 'x-timestamp': ts } })),
    ).toThrow();
  });

  it('throws on malformed signature hex (wrong length)', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now());
    expect(() =>
      guard.canActivate(makeContext({ headers: { 'x-signature': 'deadbeef', 'x-timestamp': ts } })),
    ).toThrow();
  });

  it('normalizes /api/v1 prefix from path before signing', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now());
    const sig = sign('GET', '/users', ts);
    expect(
      guard.canActivate(makeContext({ path: '/api/v1/users', headers: { 'x-signature': sig, 'x-timestamp': ts } })),
    ).toBe(true);
  });

  it('includes request body in signature', () => {
    const guard = new Guard(makeReflector());
    const ts = String(Date.now());
    const body = { email: 'a@b.com' };
    const sig = sign('POST', '/users', ts, JSON.stringify(body));
    expect(
      guard.canActivate(
        makeContext({ method: 'POST', path: '/users', headers: { 'x-signature': sig, 'x-timestamp': ts }, body }),
      ),
    ).toBe(true);
  });
});
