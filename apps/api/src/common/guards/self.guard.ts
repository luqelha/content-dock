import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
@Injectable()
export class SelfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.params.id !== request.user?.userId)
      throw new ForbiddenException('You can only access your own account.');
    return true;
  }
}
