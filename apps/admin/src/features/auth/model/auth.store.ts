import { makeAutoObservable, runInAction } from 'mobx';
import { authApi, type AuthUser } from '@entities/user';

export type AuthStatus = 'idle' | 'loading' | 'ready';

export class AuthStore {
  user: AuthUser | null = null;
  status: AuthStatus = 'idle';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  setUser(user: AuthUser | null): void {
    this.user = user;
  }

  clear(): void {
    this.user = null;
  }

  async bootstrap(): Promise<void> {
    this.status = 'loading';
    try {
      const user = await authApi.me();
      runInAction(() => {
        this.user = user;
      });
    } catch {
      runInAction(() => {
        this.user = null;
      });
    } finally {
      runInAction(() => {
        this.status = 'ready';
      });
    }
  }
}

export const authStore = new AuthStore();
