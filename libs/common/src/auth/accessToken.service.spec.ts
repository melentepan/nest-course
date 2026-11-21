import { JwtService } from '@nestjs/jwt';

import { AccessTokenService } from './accessToken.service';
import { InvalidAccessTokenError } from './errors/invalidAccessToken.error';

describe('AccessTokenService', () => {
  const jwt = new JwtService();
  const secret = 'test-access-secret';
  const service = new AccessTokenService(jwt, { secret });
  const claims = { sub: 1, email: 'user@example.test', username: 'user' };

  it('принимает подписанный access-токен', async () => {
    const token = jwt.sign(claims, { secret, expiresIn: '5m' });
    await expect(service.verify(token)).resolves.toMatchObject(claims);
  });

  it.each([
    [
      'неверная подпись',
      () => jwt.sign(claims, { secret: 'wrong', expiresIn: '5m' }),
    ],
    ['истёкший токен', () => jwt.sign(claims, { secret, expiresIn: -1 })],
    [
      'неверные claims',
      () => jwt.sign({ ...claims, sub: '1' }, { secret, expiresIn: '5m' }),
    ],
    ['нет срока действия', () => jwt.sign(claims, { secret })],
    ['повреждённый токен', () => 'invalid'],
  ])('отклоняет: %s', async (_name, createToken) => {
    await expect(service.verify(createToken())).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });
});
