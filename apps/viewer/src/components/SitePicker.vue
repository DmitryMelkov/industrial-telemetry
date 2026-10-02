<script setup lang="ts">
import { computed, watch } from 'vue';
import { useSelectedSite } from '@/composables/useSelectedSite';

const { selectedSiteId, sitesQuery, selectSite } = useSelectedSite();

const sites = computed(() => sitesQuery.data.value ?? []);

watch(
  sites,
  (list) => {
    if (!list.length) return;
    const stillValid = list.some((site) => site.id === selectedSiteId.value);
    if (!stillValid) {
      selectSite(list[0].id);
    }
  },
  { immediate: true },
);
</script>

<template>
  <v-select
    v-model="selectedSiteId"
    :disabled="sitesQuery.isPending.value"
    :items="sites"
    :loading="sitesQuery.isPending.value"
    class="site-picker"
    density="compact"
    hide-details
    item-title="code"
    item-value="id"
    placeholder="Site"
    variant="outlined"
  />
</template>

<style scoped>
.site-picker {
  width: 7.5rem;
  max-width: 7.5rem;
  flex: 0 0 auto;
  font-size: 0.8125rem;
}

.site-picker :deep(.v-field) {
  --v-field-padding-start: 8px;
  --v-field-padding-end: 4px;
  min-height: 32px;
}

.site-picker :deep(.v-field__input) {
  min-height: 28px;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
