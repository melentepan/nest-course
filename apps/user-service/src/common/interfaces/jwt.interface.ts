import type { Request } from 'express';

import type { AccessTokenClaims } from '@app/common';

export interface JwtPayload {
  sub: number;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenClaims;
}
