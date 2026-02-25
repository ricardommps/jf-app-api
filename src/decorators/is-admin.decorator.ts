import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IsAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return !!user && (user.typeUser === 3 || user.typeUser === 2);
  },
);
