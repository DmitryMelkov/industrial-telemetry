import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import AlertsPage from '@/pages/AlertsPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import NotFoundPage from '@/pages/NotFoundPage.vue';
import OverviewPage from '@/pages/OverviewPage.vue';

/**
 * meta.public — страница без логина (только /login).
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/overview' },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: 'Login', public: true },
    },
    {
      path: '/overview',
      name: 'overview',
      component: OverviewPage,
      meta: { title: 'Overview' },
    },
    {
      path: '/alerts',
      name: 'alerts',
      component: AlertsPage,
      meta: { title: 'Alerts' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
      meta: { title: 'Not found' },
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (auth.status === 'idle') {
    await auth.bootstrap();
  }

  const isPublic = to.meta.public === true;

  if (!isPublic && !auth.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'overview' };
  }

  return true;
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Viewer';
  document.title = `${title} · Telemetry Viewer`;
});
