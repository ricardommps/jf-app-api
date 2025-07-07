import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { authorizantionTologinPayload } from '../utils/base-64-converter';

export const UserId = createParamDecorator((_, ctx: ExecutionContext) => {
  const { authorization } = ctx.switchToHttp().getRequest().headers;
  const loginPayload = authorizantionTologinPayload(authorization);
  return loginPayload?.userId;
});

export const UserMe = createParamDecorator((_, ctx: ExecutionContext) => {
  const { authorization } = ctx.switchToHttp().getRequest().headers;
  const loginPayload = authorizantionTologinPayload(authorization);
  return loginPayload;
});
