import type { UserResponseDto } from '../dto/userResponse.dto';

export type CachedUserProfile = Omit<
  UserResponseDto,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};
