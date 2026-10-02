<script setup lang="ts">
import { isAxiosError } from 'axios';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('operator@telemetry.local');
const password = ref('password123');
const showPassword = ref(false);
const error = ref('');
const pending = ref(false);

async function onSubmit() {
  error.value = '';
  pending.value = true;
  try {
    await authStore.login(email.value.trim(), password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/overview';
    await router.replace(redirect);
  } catch (err: unknown) {
    if (isAxiosError(err) && err.response?.status === 401) {
      error.value = 'Неверный email или пароль';
    } else {
      error.value = 'Не удалось войти. Проверьте, что BFF запущен на :3000';
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="login">
    <v-card class="login-card" max-width="26rem" width="100%" variant="outlined">
      <v-card-text class="pa-6">
        <div class="brand">
          <span class="mark bg-primary">IT</span>
          <div>
            <div class="text-h6 font-weight-bold">Telemetry Viewer</div>
            <div class="text-body-2 text-medium-emphasis">Вход в мониторинг</div>
          </div>
        </div>

        <v-alert v-if="error" class="mb-4" type="error" variant="tonal" density="comfortable">
          {{ error }}
        </v-alert>

        <v-form @submit.prevent="onSubmit">
          <v-text-field
            v-model="email"
            autocomplete="username"
            class="mb-2"
            label="Email"
            type="email"
          />
          <v-text-field
            v-model="password"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            class="mb-4"
            label="Пароль"
            @click:append-inner="showPassword = !showPassword"
          />
          <v-btn :loading="pending" block color="primary" size="large" type="submit">Войти</v-btn>
        </v-form>

        <p class="text-caption text-medium-emphasis mt-4 mb-0">
          operator@telemetry.local / password123
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.login {
  min-height: calc(100svh - 8rem);
  display: grid;
  place-items: center;
}

.login-card {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.mark {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 700;
}
</style>
