<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-4">
    <div>
      <h2 class="text-h5 font-weight-bold mb-1">{{ title }}</h2>
      <p v-if="subtitle" class="text-body-2 text-medium-emphasis ma-0">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="d-flex align-center ga-2">
      <slot />
    </div>
  </div>
</template>
