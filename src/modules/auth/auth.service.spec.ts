import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const makeQb = (result: unknown) => ({
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(result),
});

const validGoogleInfo = {
  sub: 'google-sub-123',
  email: 'google@example.com',
  email_verified: true,
  name: 'Google User',
};

describe('AuthService', () => {
  const mockTokenService = { generate: jest.fn().mockReturnValue('tok') };
  const mockMetricsService = { sessionsStarted: { inc: jest.fn() } };

  const makeService = (qbResult: unknown) => {
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb(qbResult)),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };
    return new AuthService(repo as any, mockTokenService as any, mockMetricsService as any);
  };

  const makeServiceWithRepo = (repoOverrides: Record<string, jest.Mock>) => {
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb(null)),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      ...repoOverrides,
    };
    return new AuthService(repo as any, mockTokenService as any, mockMetricsService as any);
  };

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  describe('login', () => {
    it('returns accessToken and user on valid credentials', async () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        role: 'volunteer',
        password: 'pass',
      };
      const svc = makeService(user);
      const result = await svc.login({ email: 'a@b.com', password: 'pass' });
      expect(result.accessToken).toBe('tok');
      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe('a@b.com');
      expect(result.user.role).toBe('volunteer');
    });

    it('throws UnauthorizedException when user not found', async () => {
      const svc = makeService(null);
      await expect(
        svc.login({ email: 'x@x.com', password: 'p' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        role: 'donor',
        password: 'correct',
      };
      const svc = makeService(user);
      await expect(
        svc.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    it('throws UnauthorizedException when the google token request fails', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as any);
      const svc = makeServiceWithRepo({});
      await expect(svc.loginWithGoogle('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when email is not verified', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ...validGoogleInfo, email_verified: false }),
      } as any);
      const svc = makeServiceWithRepo({});
      await expect(svc.loginWithGoogle('tok')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when email is missing', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ...validGoogleInfo, email: undefined }),
      } as any);
      const svc = makeServiceWithRepo({});
      await expect(svc.loginWithGoogle('tok')).rejects.toThrow(UnauthorizedException);
    });

    it('returns accessToken when existing user already has googleId', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(validGoogleInfo),
      } as any);
      const existingUser = {
        id: 5,
        email: 'google@example.com',
        role: 'donor',
        googleId: 'google-sub-123',
      };
      const svc = makeServiceWithRepo({
        findOne: jest.fn().mockResolvedValue(existingUser),
      });
      const result: any = await svc.loginWithGoogle('tok');
      expect(result.accessToken).toBe('tok');
      expect(result.user).toEqual(
        expect.objectContaining({ id: 5, email: 'google@example.com' }),
      );
    });

    it('updates googleId and returns token when existing user has no googleId', async () => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(validGoogleInfo),
      } as any);
      const existingUser = {
        id: 6,
        email: 'google@example.com',
        role: 'volunteer',
        googleId: undefined as string | undefined,
      };
      const saveMock = jest.fn().mockResolvedValue(existingUser);
      const svc = makeServiceWithRepo({
        findOne: jest.fn().mockResolvedValue(existingUser),
        save: saveMock,
      });
      const result: any = await svc.loginWithGoogle('tok');
      expect(existingUser.googleId).toBe('google-sub-123');
      expect(saveMock).toHaveBeenCalled();
      expect(result.accessToken).toBe('tok');
    });
  });
});
