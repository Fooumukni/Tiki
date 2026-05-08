import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { RequestWithUser } from '../../auth/request-with-user.interface';

export const CurrentUser = createParamDecorator((_metadata: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});
