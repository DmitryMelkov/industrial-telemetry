import { http } from './http';
import type { AuthUser } from '@/stores/auth.store';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: AuthUser;
};

/** Тонкий слой над REST — как authApi в React Admin */
export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout');
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get<AuthUser>('/auth/me');
    return data;
  },
};
