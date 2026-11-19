import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret) {
    throw new Error('JWT_ACCESS_SECRET не задан');
  }

  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET не задан');
  }

  return {
    access: {
      secret: accessSecret,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    },
    refresh: {
      secret: refreshSecret,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
  };
});
