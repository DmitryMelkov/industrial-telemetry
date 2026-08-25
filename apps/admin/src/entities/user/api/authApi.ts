import { http } from '@shared/api/http';
import type { AuthUser, LoginRequest, LoginResponse } from '../model/types';

export const authApi = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await http.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await http.post('/auth/logout');
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await http.get<AuthUser>('/auth/me');
    return data;
  },
};
