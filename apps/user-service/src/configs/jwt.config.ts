import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET не задан');
  }

  return {
    refresh: {
      secret: refreshSecret,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  };
});
