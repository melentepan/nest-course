import type { Request } from 'express';

import type { AccessTokenClaims } from '@app/common';

export interface NotificationRequest extends Request {
  user: AccessTokenClaims;
}
