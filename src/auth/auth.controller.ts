import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../features/users/users.service';
import { AuthGuard } from './guards/auth.guard';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RegisterConflictResponseDto } from './dto/register-conflict-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по логину или email и паролю' })
  @ApiOkResponse({ type: AuthTokensDto, description: 'Новая пара JWT-токенов' })
  @ApiUnauthorizedResponse({ description: 'Неверный логин или пароль' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiCreatedResponse({
    type: AuthTokensDto,
    description: 'Пользователь создан, выдана пара JWT-токенов',
  })
  @ApiConflictResponse({
    type: RegisterConflictResponseDto,
    description: 'Пользователь с таким логином или email уже зарегистрирован',
  })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access- и refresh-токенов' })
  @ApiOkResponse({ type: AuthTokensDto, description: 'Новая пара JWT-токенов' })
  @ApiUnauthorizedResponse({
    description: 'Refresh-токен недействителен, истёк или сессия завершена',
  })
  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы и отзыв refresh-токена' })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Access-токен отсутствует, недействителен или истёк',
  })
  @Post('logout')
  async logout(@CurrentUser('sub') userId: number) {
    return this.usersService.logout(userId);
  }
}
