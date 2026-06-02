import { NextRequest } from 'next/server';
import { verifyToken } from './crypto';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AUDITOR' | 'VIEWER';
  permissions: string[];
  organizationId: string;
}

export function getCurrentUser(req: NextRequest): AuthUser | null {
  const cookie = req.cookies.get('veriaudit_session');
  if (!cookie) return null;
  return verifyToken(cookie.value) as AuthUser | null;
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.role === 'ADMIN' || user.permissions.includes('manage:all')) {
    return true;
  }
  return user.permissions.includes(permission);
}
