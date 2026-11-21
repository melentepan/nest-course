import { PaginationMetaDto } from '../dto/paginatedUsersResponse.dto';
import { CachedUserProfile } from './cachedUserProfile.interface';

export interface CachedUsersPage {
  data: CachedUserProfile[];
  meta: PaginationMetaDto;
}
