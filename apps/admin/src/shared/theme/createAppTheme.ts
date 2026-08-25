import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const PRIMARY = '#1890ff';

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
    MuiTextField: {
      defaultProps: {
        size: 'small',
        fullWidth: true,
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
        default: mode === 'light' ? '#f5f7fa' : '#141414',
        paper: mode === 'light' ? '#ffffff' : '#1f1f1f',
      },
    },
  });
}
