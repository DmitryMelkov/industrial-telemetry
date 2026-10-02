<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AlertStatus } from '@/api/alertsApi';
import PageHeader from '@/components/PageHeader.vue';
import { useSelectedSite } from '@/composables/useSelectedSite';
import { useAckAlertMutation } from '@/queries/useAckAlertMutation';
import { useAlertsQuery } from '@/queries/useAlertsQuery';

const statusFilter = ref<AlertStatus | ''>('');

const statusOptions: Array<{ title: string; value: AlertStatus | '' }> = [
  { title: 'Все', value: '' },
  { title: 'Open', value: 'open' },
  { title: 'Acked', value: 'acked' },
  { title: 'Resolved', value: 'resolved' },
];

const { selectedSiteId, selectedSite } = useSelectedSite();
const alertsQuery = useAlertsQuery(selectedSiteId, statusFilter);
const ackMutation = useAckAlertMutation();

const alerts = computed(() => {
  return alertsQuery.data.value ?? [];
});

const subtitle = computed(() => {
  if (!selectedSiteId.value) {
    return 'Выбери site в шапке';
  }

  if (alertsQuery.isPending.value) {
    return 'Загружаем alerts…';
  }

  if (selectedSite.value) {
    return `${selectedSite.value.code} — ${alerts.value.length} записей`;
  }

  return `Site ${selectedSiteId.value}`;
});

function formatTime(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function severityColor(severity: string) {
  if (severity === 'critical') {
    return 'error';
  }

  return 'warning';
}

function statusColor(status: string) {
  if (status === 'open') {
    return 'error';
  }

  if (status === 'acked') {
    return 'warning';
  }

  return 'success';
}

function isAcking(id: string) {
  return ackMutation.isPending.value && ackMutation.variables.value === id;
}
</script>

<template>
  <section>
    <PageHeader title="Алерты" :subtitle="subtitle" />

    <v-select
      v-model="statusFilter"
      :items="statusOptions"
      class="mb-4"
      density="compact"
      hide-details
      item-title="title"
      item-value="value"
      label="Статус"
      max-width="220"
      variant="outlined"
    />

    <v-alert
      v-if="ackMutation.isError.value"
      class="mb-4"
      max-width="36rem"
      type="error"
      variant="tonal"
    >
      Не удалось подтвердить алерт.
    </v-alert>

    <v-alert
      v-if="alertsQuery.isError.value"
      class="mb-4"
      max-width="36rem"
      type="error"
      variant="tonal"
    >
      Не удалось загрузить alerts. Проверь BFF на :3000.
    </v-alert>

    <v-progress-linear
      v-if="alertsQuery.isPending.value"
      class="mb-4"
      color="primary"
      indeterminate
    />

    <v-alert
      v-else-if="selectedSiteId && !alerts.length && !alertsQuery.isError.value"
      max-width="36rem"
      type="info"
      variant="tonal"
    >
      Алертов нет.
    </v-alert>

    <v-card v-else-if="alerts.length" class="alerts-card" variant="outlined">
      <v-table class="alerts-table" density="comfortable">
        <thead>
          <tr>
            <th>Открыт</th>
            <th>Датчик</th>
            <th>Severity</th>
            <th>Статус</th>
            <th class="text-end">Значение</th>
            <th>Сообщение</th>
            <th class="text-end">Действие</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="alert in alerts" :key="alert.id">
            <td class="text-no-wrap">{{ formatTime(alert.openedAt) }}</td>
            <td class="font-weight-medium">{{ alert.sensor?.code ?? alert.sensorId }}</td>
            <td>
              <v-chip :color="severityColor(alert.severity)" size="small" variant="tonal">
                {{ alert.severity }}
              </v-chip>
            </td>
            <td>
              <v-chip :color="statusColor(alert.status)" size="small" variant="tonal">
                {{ alert.status }}
              </v-chip>
            </td>
            <td class="text-end font-weight-medium">{{ alert.value }}</td>
            <td>{{ alert.message }}</td>
            <td class="text-end">
              <v-btn
                v-if="alert.status === 'open'"
                :loading="isAcking(alert.id)"
                color="primary"
                size="small"
                variant="tonal"
                @click="ackMutation.mutate(alert.id)"
              >
                Ack
              </v-btn>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </section>
</template>

<style scoped>
.alerts-card {
  overflow: hidden;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

.alerts-table :deep(thead th) {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  color: rgb(var(--v-theme-primary)) !important;
  opacity: 1 !important;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.35) !important;
}

.alerts-table :deep(tbody tr:hover) {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>
