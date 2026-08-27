import type { UserRole } from '../model/types';

export interface ManagedUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: UserRole;
}
