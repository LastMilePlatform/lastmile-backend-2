import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

export const SKIP_SIGNING_KEY = 'skipSigning';

const REPLAY_WINDOW_MS = 5 * 60 * 1000;
const SECRET = process.env.REQUEST_SIGNING_SECRET ?? '';

@Injectable()
export class RequestSigningGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Guard only applies to HTTP contexts
    if (context.getType() !== 'http') return true;

    // Skip if no secret is configured (development without signing)
    if (!SECRET) return true;

    // Skip via @SkipSigning() decorator
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SIGNING_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Skip CORS preflight
    if (request.method === 'OPTIONS') return true;

    const signature = request.headers['x-signature'];
    const timestamp = request.headers['x-timestamp'];

    if (
      !signature ||
      !timestamp ||
      Array.isArray(signature) ||
      Array.isArray(timestamp)
    ) {
      throw new UnauthorizedException('Missing request signature');
    }

    // Replay attack prevention
    const reqTime = Number(timestamp);
    if (Number.isNaN(reqTime) || Math.abs(Date.now() - reqTime) > REPLAY_WINDOW_MS) {
      throw new UnauthorizedException('Request signature expired');
    }

    // Normalize path: strip /api/v1 prefix so it matches the frontend path
    const rawPath: string = request.path;
    const pathname = rawPath.startsWith('/api/v1')
      ? rawPath.slice('/api/v1'.length) || '/'
      : rawPath;

    const method = request.method.toUpperCase();
    const body = request.body as unknown;
    const bodyStr =
      body != null &&
      typeof body === 'object' &&
      Object.keys(body as object).length > 0
        ? JSON.stringify(body)
        : '';

    const message = [method, pathname, timestamp, bodyStr].join('\n');
    const expected = createHmac('sha256', SECRET).update(message).digest('hex');

    let valid: boolean;
    try {
      valid = timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      throw new UnauthorizedException('Invalid signature format');
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid request signature');
    }

    return true;
  }
}
