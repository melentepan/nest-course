import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_TOKEN_OPTIONS } from './accessToken.constants';
import type { AccessTokenOptions } from './interfaces/accessTokenOptions.interface';
import type { AccessTokenClaims } from './interfaces/accessTokenClaims.interface';
import { InvalidAccessTokenError } from './errors/invalidAccessToken.error';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(ACCESS_TOKEN_OPTIONS) private readonly options: AccessTokenOptions,
  ) {
    if (typeof options.secret !== 'string' || !options.secret.trim()) {
      throw new Error('Секрет проверки access-токена не задан');
    }
  }

  async verify(token: string): Promise<AccessTokenClaims> {
    let payload: unknown;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.options.secret,
        algorithms: ['HS256'],
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(
          error.name,
        )
      ) {
        throw new InvalidAccessTokenError(
          'Недействительный или истекший access-токен',
        );
      }
      throw error;
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'number' ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0 ||
      !('email' in payload) ||
      typeof payload.email !== 'string' ||
      !('username' in payload) ||
      typeof payload.username !== 'string' ||
      !('exp' in payload) ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      ('iat' in payload &&
        (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)))
    ) {
      throw new InvalidAccessTokenError('Некорректные данные access-токена');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
      exp: payload.exp,
      ...('iat' in payload && typeof payload.iat === 'number'
        ? { iat: payload.iat }
        : {}),
    };
  }
}
