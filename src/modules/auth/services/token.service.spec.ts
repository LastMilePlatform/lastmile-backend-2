import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

const TEST_SECRET = 'test-secret'; // NOSONAR — not a real credential, used only in unit tests

const b64url = (data: object | Buffer) =>
  (Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data))).toString('base64url');

const hmacSig = (secret: string, message: string) =>
  b64url(createHmac('sha256', secret).update(message).digest());

const makeService = (secret = TEST_SECRET) => {
  const configService = {
    get: jest.fn().mockReturnValue(secret),
  } as unknown as ConfigService;
  return new TokenService(configService);
};

describe('TokenService', () => {
  describe('generate & verify round-trip', () => {
    it('returns a valid token and verifies it', () => {
      const svc = makeService();
      const token = svc.generate({ userId: 42, role: 'volunteer' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
      const payload = svc.verify(token);
      expect(payload.userId).toBe(42);
      expect(payload.role).toBe('volunteer');
    });

    it('uses fallback secret when config returns undefined', () => {
      const configService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const svc = new TokenService(configService);
      const token = svc.generate({ userId: 1, role: 'donor' });
      const payload = svc.verify(token);
      expect(payload.userId).toBe(1);
    });
  });

  describe('verify', () => {
    it('throws on token with wrong number of parts', () => {
      const svc = makeService();
      expect(() => svc.verify('bad.token')).toThrow(UnauthorizedException);
    });

    it('throws on invalid signature', () => {
      const svc = makeService('secret-a');
      const token = svc.generate({ userId: 1, role: 'organizer' });
      const svc2 = makeService('secret-b');
      expect(() => svc2.verify(token)).toThrow(UnauthorizedException);
    });

    it('throws when userId is not a valid integer', () => {
      const svc = makeService();
      const header = b64url({ alg: 'HS256', typ: 'JWT' });
      const body = b64url({ sub: 'not-a-number', role: 'donor', exp: Math.floor(Date.now() / 1000) + 3600 });
      const sig = hmacSig(TEST_SECRET, `${header}.${body}`);
      expect(() => svc.verify(`${header}.${body}.${sig}`)).toThrow(UnauthorizedException);
    });

    it('throws when token is expired', () => {
      const svc = makeService();
      const header = b64url({ alg: 'HS256', typ: 'JWT' });
      const body = b64url({ sub: 1, role: 'donor', exp: Math.floor(Date.now() / 1000) - 1 });
      const sig = hmacSig(TEST_SECRET, `${header}.${body}`);
      expect(() => svc.verify(`${header}.${body}.${sig}`)).toThrow(UnauthorizedException);
    });

    it('throws on invalid base64 payload', () => {
      const svc = makeService();
      const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const badBody = '!!!invalid!!!';
      const sig = hmacSig(TEST_SECRET, `${header}.${badBody}`);
      expect(() => svc.verify(`${header}.${badBody}.${sig}`)).toThrow(UnauthorizedException);
    });

    it('defaults role to donor when not a string', () => {
      const svc = makeService();
      const header = b64url({ alg: 'HS256', typ: 'JWT' });
      const body = b64url({ sub: 5, role: 123 });
      const sig = hmacSig(TEST_SECRET, `${header}.${body}`);
      const result = svc.verify(`${header}.${body}.${sig}`);
      expect(result.role).toBe('donor');
    });

    it('trims whitespace from raw token', () => {
      const svc = makeService();
      const token = svc.generate({ userId: 7, role: 'volunteer' });
      const payload = svc.verify(`  ${token}  `);
      expect(payload.userId).toBe(7);
    });
  });
});
