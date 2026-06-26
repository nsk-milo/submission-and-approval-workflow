import { NextRequest, NextResponse } from 'next/server';

const TOKEN_COOKIE = 'pacra_token';
const ROLE_COOKIE = 'pacra_role';

/**
 * Edge route protection. The JWT and role are stored in cookies at login so the
 * middleware (which cannot read localStorage) can gate access:
 *   - unauthenticated users hitting a protected area  -> /login
 *   - an APPLICANT visiting /reviewer/*               -> /applicant
 *   - a REVIEWER visiting /applicant/*                -> /reviewer
 *   - authenticated users hitting /login              -> their home dashboard
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value;

  const isApplicantArea = pathname.startsWith('/applicant');
  const isReviewerArea = pathname.startsWith('/reviewer');
  const isLogin = pathname === '/login';

  // Already authenticated users should skip the login page.
  if (isLogin && token && role) {
    return NextResponse.redirect(new URL(homeFor(role), req.url));
  }

  if (isApplicantArea || isReviewerArea) {
    if (!token || !role) {
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (isReviewerArea && role !== 'REVIEWER') {
      return NextResponse.redirect(new URL('/applicant', req.url));
    }
    if (isApplicantArea && role !== 'APPLICANT') {
      return NextResponse.redirect(new URL('/reviewer', req.url));
    }
  }

  return NextResponse.next();
}

function homeFor(role: string): string {
  return role === 'REVIEWER' ? '/reviewer' : '/applicant';
}

export const config = {
  matcher: ['/login', '/applicant/:path*', '/reviewer/:path*'],
};
