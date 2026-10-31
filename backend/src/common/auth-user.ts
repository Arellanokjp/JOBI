import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../auth/decorators/roles.decorator';

/** The object JwtStrategy.validate() attaches to `request.user`. */
export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
}

/** Usage: `handler(@CurrentUser() user: AuthUser)` */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);

export const isAdmin = (user: AuthUser) => user.role === 'ADMIN';
