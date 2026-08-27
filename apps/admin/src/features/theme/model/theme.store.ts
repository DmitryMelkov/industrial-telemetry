import { makeAutoObservable } from 'mobx';
import type { ThemeMode } from '@shared/theme/createAppTheme';

const STORAGE_KEY = 'it-admin-theme';

function readInitialMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export class ThemeStore {
  mode: ThemeMode = readInitialMode();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }

  toggle(): void {
    this.setMode(this.mode === 'light' ? 'dark' : 'light');
  }
}

export const themeStore = new ThemeStore();
