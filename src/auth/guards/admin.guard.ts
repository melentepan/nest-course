import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/interfaces/jwt.interface';
import { UserRole } from '../../common/enums/userRole.enum';
import { UsersService } from '../../features/users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actorId = request.user?.sub;

    if (actorId == null) {
      throw new ForbiddenException('Доступно только администратору');
    }

    const user = await this.usersService
      .findOne(actorId)
      .catch((error: unknown) => {
        if (error instanceof NotFoundException) {
          throw new ForbiddenException('Доступно только администратору');
        }
        throw error;
      });

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Доступно только администратору');
    }

    return true;
  }
}
