<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import SensorCard from '@/components/SensorCard.vue';
import { useSelectedSite } from '@/composables/useSelectedSite';
import { useOverviewQuery } from '@/queries/useOverviewQuery';
import { realtimeConnected } from '@/realtime/useSiteRealtime';

const { selectedSiteId, selectedSite } = useSelectedSite();
const overviewQuery = useOverviewQuery(selectedSiteId);

const sensors = computed(() => {
  return overviewQuery.data.value?.sensors ?? [];
});

const openAlerts = computed(() => {
  return overviewQuery.data.value?.openAlerts ?? 0;
});

const subtitle = computed(() => {
  if (!selectedSiteId.value) {
    return 'Выбери site в шапке';
  }

  if (overviewQuery.isPending.value) {
    return 'Загружаем overview…';
  }

  if (selectedSite.value) {
    return `${selectedSite.value.code} — ${selectedSite.value.name}`;
  }

  return `Site ${selectedSiteId.value}`;
});

const statusChip = computed(() => {
  if (overviewQuery.isPending.value) {
    return { label: 'loading', color: 'info' as const };
  }

  if (overviewQuery.isError.value) {
    return { label: 'error', color: 'error' as const };
  }

  return { label: 'overview', color: 'success' as const };
});

const liveChip = computed(() => {
  if (!selectedSiteId.value) {
    return { label: 'ws off', color: 'secondary' as const };
  }

  if (realtimeConnected.value) {
    return { label: 'live', color: 'success' as const };
  }

  return { label: 'ws…', color: 'warning' as const };
});
</script>

<template>
  <section>
    <PageHeader title="Обзор" :subtitle="subtitle">
      <v-chip :color="statusChip.color" size="small" variant="tonal">
        {{ statusChip.label }}
      </v-chip>
      <v-chip :color="liveChip.color" size="small" variant="tonal">
        {{ liveChip.label }}
      </v-chip>
    </PageHeader>

    <v-alert
      v-if="overviewQuery.isError.value"
      class="mb-4"
      max-width="36rem"
      type="error"
      variant="tonal"
    >
      Не удалось загрузить overview. Проверь BFF и generator (live values).
    </v-alert>

    <div v-if="selectedSiteId" class="d-flex flex-wrap ga-3 mb-6">
      <v-chip color="primary" variant="tonal">Датчиков: {{ sensors.length }}</v-chip>
      <v-chip :color="openAlerts > 0 ? 'error' : 'success'" variant="tonal">
        Open alerts: {{ openAlerts }}
      </v-chip>
    </div>

    <v-progress-linear
      v-if="overviewQuery.isPending.value"
      class="mb-4"
      color="primary"
      indeterminate
    />

    <v-alert
      v-else-if="selectedSiteId && !sensors.length && !overviewQuery.isError.value"
      max-width="36rem"
      type="info"
      variant="tonal"
    >
      У этого site пока нет датчиков.
    </v-alert>

    <v-row v-else dense>
      <v-col v-for="sensor in sensors" :key="sensor.id" cols="12" sm="6" md="4" lg="3">
        <SensorCard :sensor="sensor" />
      </v-col>
    </v-row>
  </section>
</template>
