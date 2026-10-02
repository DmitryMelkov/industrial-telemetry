<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <v-alert variant="tonal" color="secondary" max-width="36rem">
    <div v-if="title" class="text-subtitle-2 mb-1">{{ title }}</div>
    <div class="text-body-2">
      <slot />
    </div>
  </v-alert>
</template>

<style scoped>
:deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.9em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.06);
}
</style>
