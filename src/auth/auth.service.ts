import { UsersService } from '../features/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../features/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../common/interfaces/jwt.interface';
import { createHash } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByLogin(loginDto.login);

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const tokens = await this.generateTokens(user);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    const tokens = await this.generateTokens(user);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow('jwt.access.secret'),
        expiresIn: this.configService.get('jwt.access.expiresIn', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refresh.secret'),
        expiresIn: this.configService.get('jwt.refresh.expiresIn', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(id: number, refreshToken: string) {
    const digest = this.getRefreshTokenDigest(refreshToken);
    const hashedToken = await bcrypt.hash(digest, 10);

    await this.usersService.updateRefreshToken(id, hashedToken);
  }

  async refreshTokens(refreshToken: string) {
    const secret = this.configService.getOrThrow<string>('jwt.refresh.secret');
    const invalidTokenMessage =
      'Недействительный или просроченный refresh-токен';

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret,
      });
    } catch {
      throw new UnauthorizedException(invalidTokenMessage);
    }

    if (!Number.isInteger(payload.sub)) {
      throw new UnauthorizedException(invalidTokenMessage);
    }

    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);

    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException(invalidTokenMessage);
    }

    const digest = this.getRefreshTokenDigest(refreshToken);

    const isTokenValid = await bcrypt.compare(digest, user.hashedRefreshToken);

    if (!isTokenValid) {
      throw new UnauthorizedException(invalidTokenMessage);
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private getRefreshTokenDigest(refreshToken: string): string {
    return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
  }
}
