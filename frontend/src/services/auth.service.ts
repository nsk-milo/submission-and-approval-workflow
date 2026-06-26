import { api } from '@/lib/api';
import type { LoginResponse } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },
};
