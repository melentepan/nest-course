import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { HttpExceptionFilter } from './httpException.filter';

@Module({
  imports: [ClsModule],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class HttpErrorsModule {}
