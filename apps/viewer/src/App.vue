<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import AppShell from '@/components/AppShell.vue';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();
const { status } = storeToRefs(authStore);

onMounted(() => {
  void authStore.bootstrap();
});
</script>

<template>
  <v-app v-if="status !== 'ready'" class="boot">
    <v-progress-circular color="primary" indeterminate size="48" />
    <p class="text-body-2 text-medium-emphasis mt-3">Проверяем сессию…</p>
  </v-app>

  <AppShell v-else>
    <RouterView />
  </AppShell>
</template>

<style scoped>
.boot {
  min-height: 100svh;
  display: grid;
  place-content: center;
  justify-items: center;
}
</style>
