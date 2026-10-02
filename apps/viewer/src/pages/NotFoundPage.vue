<script setup lang="ts">
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PlaceholderBox from '@/components/PlaceholderBox.vue';

const route = useRoute();
</script>

<template>
  <section>
    <PageHeader title="404" subtitle="Маршрут не найден" />
    <PlaceholderBox>
      <p class="ma-0">
        Путь: <code>{{ route.fullPath }}</code>
      </p>
    </PlaceholderBox>
    <v-btn class="mt-4" color="primary" to="/overview" variant="tonal">На обзор</v-btn>
  </section>
</template>
