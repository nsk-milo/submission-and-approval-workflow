import Cookies from 'js-cookie';
import type { AuthUser } from '@/types';

// Cookie names are also referenced by middleware.ts for route protection.
export const TOKEN_COOKIE = 'pacra_token';
export const ROLE_COOKIE = 'pacra_role';
const USER_KEY = 'pacra_user';

const COOKIE_OPTS: Cookies.CookieAttributes = {
  sameSite: 'lax',
  path: '/',
  expires: 1, // days
};

export function persistSession(token: string, user: AuthUser) {
  Cookies.set(TOKEN_COOKIE, token, COOKIE_OPTS);
  Cookies.set(ROLE_COOKIE, user.role, COOKIE_OPTS);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearSession() {
  Cookies.remove(TOKEN_COOKIE, { path: '/' });
  Cookies.remove(ROLE_COOKIE, { path: '/' });
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_KEY);
  }
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function homePathForRole(role: string): string {
  return role === 'REVIEWER' ? '/reviewer' : '/applicant';
}
