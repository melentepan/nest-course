import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessTokenService, InvalidAccessTokenError } from '@app/common';
import type { NotificationRequest } from '../interfaces/notificationRequest.interface';

@Injectable()
export class NotificationAuthGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<NotificationRequest>();
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Access-токен не передан');
    try {
      request.user = await this.accessTokenService.verify(match[1]);
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
}
