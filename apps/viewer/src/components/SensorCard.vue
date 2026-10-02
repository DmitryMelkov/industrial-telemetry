<script setup lang="ts">
import { computed } from 'vue';
import type { OverviewSensor } from '@/api/sitesApi';
import StatusBadge from './StatusBadge.vue';

const props = defineProps<{
  sensor: OverviewSensor;
}>();

const valueLabel = computed(() => {
  if (props.sensor.value === null) {
    return '—';
  }

  return `${props.sensor.value} ${props.sensor.unit}`;
});

const updatedLabel = computed(() => {
  if (!props.sensor.ts) {
    return 'нет данных';
  }

  return new Date(props.sensor.ts).toLocaleString();
});
</script>

<template>
  <v-card class="sensor-card" :data-status="sensor.status" variant="outlined">
    <v-card-text class="d-flex flex-column ga-3">
      <div class="d-flex align-center justify-space-between ga-2">
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ sensor.code }}</div>
          <div class="text-caption text-medium-emphasis text-uppercase">
            {{ sensor.metric }}
          </div>
        </div>
        <StatusBadge :status="sensor.status" />
      </div>

      <div class="text-h5 font-weight-medium">{{ valueLabel }}</div>

      <div class="text-caption text-medium-emphasis">Обновлено: {{ updatedLabel }}</div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.sensor-card {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  border-left-width: 4px;
}

.sensor-card[data-status='ok'] {
  border-left-color: rgb(var(--v-theme-success));
}

.sensor-card[data-status='warning'] {
  border-left-color: rgb(var(--v-theme-warning));
}

.sensor-card[data-status='critical'] {
  border-left-color: rgb(var(--v-theme-error));
}

.sensor-card[data-status='unknown'] {
  border-left-color: rgb(var(--v-theme-neutral));
}
</style>
