import {
  BadRequestException,
  HttpStatus,
  Injectable,
  ParseIntPipe,
} from '@nestjs/common';

@Injectable()
export class ParseIdPipe extends ParseIntPipe {
  constructor() {
    super({
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: () =>
        new BadRequestException('ID пользователя должен быть числом'),
    });
  }
}
