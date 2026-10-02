import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { vuetify } from './plugins/vuetify';
import { router } from './router';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

/** QueryClient ≈ QueryClientProvider в React */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

app.use(pinia).use(router).use(vuetify).use(VueQueryPlugin, { queryClient }).mount('#app');
