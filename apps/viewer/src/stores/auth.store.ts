import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '@/api/authApi';

export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'operator';
};

/** idle → loading → ready: пока не ready, guards ждут cookie-сессию */
export type AuthStatus = 'idle' | 'loading' | 'ready';

/**
 * Auth store: client session поверх httpOnly cookie.
 * bootstrap ≈ «при старте спроси /auth/me» (как в Admin MobX authStore).
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const status = ref<AuthStatus>('idle');

  /** Один inflight bootstrap — App и router могут вызвать параллельно */
  let bootstrapPromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => user.value !== null);
  const displayName = computed(() => user.value?.email ?? 'Гость');

  function setSession(next: AuthUser) {
    user.value = next;
  }

  function clearSession() {
    user.value = null;
  }

  async function bootstrap() {
    if (status.value === 'ready') {
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    status.value = 'loading';
    bootstrapPromise = (async () => {
      try {
        const me = await authApi.me();
        user.value = me;
      } catch {
        user.value = null;
      } finally {
        status.value = 'ready';
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  }

  async function login(email: string, password: string) {
    const { user: next } = await authApi.login({ email, password });
    setSession(next);
    status.value = 'ready';
    return next;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      /* cookie могли уже сбросить на сервере */
    } finally {
      clearSession();
    }
  }

  return {
    user,
    status,
    isAuthenticated,
    displayName,
    setSession,
    clearSession,
    bootstrap,
    login,
    logout,
  };
});
