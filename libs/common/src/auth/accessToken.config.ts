import { registerAs } from '@nestjs/config';

export const accessTokenConfig = registerAs('jwtAccess', () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET не задан');
  }

  return {
    secret,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  };
});
