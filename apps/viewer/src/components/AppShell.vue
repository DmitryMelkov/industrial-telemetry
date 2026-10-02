<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import SitePicker from '@/components/SitePicker.vue';
import { useSelectedSite } from '@/composables/useSelectedSite';
import { useSiteRealtime } from '@/realtime/useSiteRealtime';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const { isAuthenticated, displayName } = storeToRefs(authStore);
const { selectedSiteId } = useSelectedSite();
const router = useRouter();

useSiteRealtime(
  computed(() => {
    if (!isAuthenticated.value) {
      return '';
    }

    return selectedSiteId.value;
  }),
);

async function onLogout() {
  await authStore.logout();
  await router.push({ name: 'login' });
}
</script>

<template>
  <v-app>
    <v-app-bar class="shell-bar" color="surface" height="64" flat border>
      <div class="brand">
        <span class="mark bg-primary">IT</span>
        <span>
          <span class="name">Telemetry Viewer</span>
          <span class="hint text-medium-emphasis">мониторинг</span>
        </span>
      </div>

      <template #append>
        <div class="bar-actions">
          <SitePicker v-if="isAuthenticated" />
          <v-chip size="small" variant="tonal" :color="isAuthenticated ? 'primary' : 'secondary'">
            {{ displayName }}
          </v-chip>
          <v-btn v-if="isAuthenticated" size="small" variant="text" @click="onLogout">Выйти</v-btn>
        </div>

        <v-btn v-if="isAuthenticated" class="nav-btn" to="/overview" variant="text" color="primary">
          Обзор
        </v-btn>
        <v-btn v-if="isAuthenticated" class="nav-btn" to="/alerts" variant="text" color="primary">
          Алерты
        </v-btn>
        <v-btn v-else class="nav-btn" to="/login" variant="text" color="primary">Вход</v-btn>
        <slot name="navExtra" />
      </template>
    </v-app-bar>

    <v-main class="shell-main">
      <v-container class="py-6" fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.shell-bar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 0.5rem;
}

.mark {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.name {
  display: block;
  font-weight: 650;
  line-height: 1.1;
}

.hint {
  display: block;
  font-size: 0.75rem;
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 0.5rem;
}

.nav-btn.router-link-active {
  background: rgba(var(--v-theme-primary), 0.12);
}
</style>
