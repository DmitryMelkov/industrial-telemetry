import { CssBaseline } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, type ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { authStore } from '@features/auth';
import { themeStore } from '@features/theme';
import { createAppTheme } from '@shared/theme/createAppTheme';
import { CenterSpinner } from '@shared/ui/CenterSpinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ThemeBridge = observer(function ThemeBridge({ children }: { children: ReactNode }) {
  const mode = themeStore.mode;
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <StyledThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </StyledThemeProvider>
    </MuiThemeProvider>
  );
});

const AuthBootstrap = observer(function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  if (authStore.status !== 'ready') {
    return <CenterSpinner />;
  }

  return children;
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBridge>
        <AuthBootstrap>{children}</AuthBootstrap>
      </ThemeBridge>
    </QueryClientProvider>
  );
}
