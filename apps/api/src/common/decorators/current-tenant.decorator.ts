import type { ApplicationRequest } from '../types/http-request';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<ApplicationRequest>();
  return request.tenant;
});
