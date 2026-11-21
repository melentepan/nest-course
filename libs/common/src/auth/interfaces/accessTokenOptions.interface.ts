import type { ModuleMetadata } from '@nestjs/common';

export interface AccessTokenOptions {
  secret: string;
}

export interface AccessTokenAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: import('@nestjs/common').FactoryProvider['inject'];
  useFactory: (
    ...args: never[]
  ) => AccessTokenOptions | Promise<AccessTokenOptions>;
}
