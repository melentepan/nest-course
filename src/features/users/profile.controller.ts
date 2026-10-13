import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/userResponse.dto';

@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Получение профиля текущего пользователя',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Access-токен отсутствует, недействителен или истёк',
  })
  @Get('my')
  getMyProfile(@CurrentUser('sub') userId: number) {
    return this.usersService.getProfile(userId);
  }
}
