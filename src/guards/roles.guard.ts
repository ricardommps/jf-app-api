import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { LoginPayload } from '../dtos/loginPayload.dto';
import { UserType } from '../utils/user-type.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { authorization } = request.headers;

    if (!authorization) {
      return false;
    }

    const token = authorization.replace('Bearer ', '');

    const loginPayload: LoginPayload | undefined = await this.jwtService
      .verifyAsync(token, { secret: process.env.JWT_SECRET })
      .catch(() => undefined);

    if (!loginPayload) {
      return false;
    }

    // 🔥 AQUI ESTÁ O PONTO-CHAVE
    request.user = loginPayload;

    return requiredRoles.some((role) => role === loginPayload.typeUser);
  }
}
