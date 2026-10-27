export interface JobiRequestUser {
  sub?: string;
  id?: string;
  userId?: string;
  role?: string;
  role_name?: string;
  email?: string;
}

export function jobiUserId(user: JobiRequestUser | undefined): string | undefined {
  return user?.sub ?? user?.id ?? user?.userId;
}

export function jobiRole(user: JobiRequestUser | undefined): string {
  return String(user?.role ?? user?.role_name ?? '').toUpperCase();
}
