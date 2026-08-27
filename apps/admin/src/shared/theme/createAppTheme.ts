import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

/** Alarta-aligned palette (see alarta.pl APP_COLORS / Operator tokens). */
const PRIMARY = '#1890ff';
const BG_LIGHT = '#f5f7fa';
const PAPER_LIGHT = '#ffffff';
const BG_DARK = '#0f1014';
const PAPER_DARK = '#1b1c22';

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        fullWidth: true,
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiInputLabel: {
      defaultProps: {
        size: 'small',
      },
    },
  },
};

export function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    ...baseOptions,
    palette: {
      mode,
      primary: {
        main: PRIMARY,
      },
      background: {
        default: mode === 'light' ? BG_LIGHT : BG_DARK,
        paper: mode === 'light' ? PAPER_LIGHT : PAPER_DARK,
      },
      ...(mode === 'dark'
        ? {
            divider: 'rgba(255, 255, 255, 0.12)',
            text: {
              primary: '#e8eaed',
              secondary: '#9ca3af',
            },
          }
        : {}),
    },
  });
}
