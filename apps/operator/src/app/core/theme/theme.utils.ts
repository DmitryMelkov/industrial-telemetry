export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'it-theme';

const readInitialTheme = (): AppTheme => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Apply before Angular bootstrap to avoid theme flash. */
export const initTheme = (): AppTheme => {
  const theme = readInitialTheme();
  document.documentElement.setAttribute('data-theme', theme);
  return theme;
};

export const persistTheme = (theme: AppTheme): void => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
};
