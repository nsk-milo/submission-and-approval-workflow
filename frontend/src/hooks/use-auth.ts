'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { clearSession, getStoredUser, homePathForRole, persistSession } from '@/lib/auth';
import type { AuthUser } from '@/types';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const login = useCallback(
    async (email: string, password: string, redirectTo?: string) => {
      const { accessToken, user: authedUser } = await authService.login(email, password);
      persistSession(accessToken, authedUser);
      setUser(authedUser);
      router.replace(redirectTo || homePathForRole(authedUser.role));
      return authedUser;
    },
    [router],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    router.replace('/login');
  }, [router]);

  return { user, login, logout };
}
