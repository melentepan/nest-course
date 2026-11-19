export interface AccessTokenClaims {
  sub: number;
  email: string;
  username: string;
  exp: number;
  iat?: number;
}
