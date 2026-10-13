import { Transform, TransformFnParams } from 'class-transformer';

export function ToLowerCase(): PropertyDecorator {
  return Transform((params: TransformFnParams) => {
    const value = params.value as unknown;
    return typeof value === 'string' ? value.toLowerCase() : value;
  });
}
