import { http } from '@shared/api/http';
import type { CreateUserPayload, ManagedUser, UpdateUserPayload } from '../model/managed-user';

export const usersApi = {
  list: async (): Promise<ManagedUser[]> => {
    const { data } = await http.get<ManagedUser[]>('/users');
    return data;
  },

  create: async (payload: CreateUserPayload): Promise<ManagedUser> => {
    const { data } = await http.post<ManagedUser>('/users', payload);
    return data;
  },

  update: async (id: string, payload: UpdateUserPayload): Promise<ManagedUser> => {
    const { data } = await http.patch<ManagedUser>(`/users/${id}`, payload);
    return data;
  },
};
