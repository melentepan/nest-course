import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { AccessTokenService, InvalidAccessTokenError } from '@app/common';

import { AuthenticatedRequest } from '../../common/interfaces/jwt.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Токен авторизации не предоставлен');
    }

    try {
      request.user = await this.accessTokenService.verify(token);
    } catch (error: unknown) {
      if (error instanceof InvalidAccessTokenError) {
        throw new UnauthorizedException(
          'Недействительный или истекший access-токен',
        );
      }
      throw error;
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
