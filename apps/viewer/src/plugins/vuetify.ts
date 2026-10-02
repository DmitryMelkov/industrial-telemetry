import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';

/**
 * Та же схема, что у Admin (MUI theme): primary, фон, surface, статусы.
 * Цвет Viewer — бирюза, не синий Admin/Operator.
 */
export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#0F766E',
          secondary: '#475569',
          background: '#F3F6F5',
          surface: '#FFFFFF',
          error: '#DC2626',
          warning: '#D97706',
          success: '#15803D',
          info: '#0E7490',
          neutral: '#94A3B8',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      rounded: 'lg',
      style: 'text-transform: none; letter-spacing: 0; font-weight: 600;',
    },
    VCard: {
      rounded: 'lg',
      elevation: 0,
    },
    VChip: {
      rounded: 'lg',
    },
    VTextField: {
      density: 'comfortable',
      variant: 'outlined',
    },
    VSelect: {
      density: 'comfortable',
      variant: 'outlined',
    },
  },
});
