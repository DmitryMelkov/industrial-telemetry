<script setup lang="ts">
import type { SensorStatus } from '@/api/sitesApi';

const props = defineProps<{
  status: SensorStatus;
}>();

const colorMap: Record<SensorStatus, string> = {
  ok: 'success',
  warning: 'warning',
  critical: 'error',
  unknown: 'secondary',
};

const labels: Record<SensorStatus, string> = {
  ok: 'Ok',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'Unknown',
};
</script>

<template>
  <v-chip :color="colorMap[props.status]" size="small" variant="tonal" label>
    {{ labels[props.status] }}
  </v-chip>
</template>
