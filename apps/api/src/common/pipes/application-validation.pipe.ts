import { ValidationPipe } from '@nestjs/common';
import * as validator from 'class-validator';
import * as transformer from 'class-transformer';

export function createApplicationValidationPipe() {
  // Resolve optional Nest peers from this workspace, even when npm hoists Nest.
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    validatorPackage: validator,
    transformerPackage: transformer,
  });
}
