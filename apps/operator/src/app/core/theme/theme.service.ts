import { Injectable, signal } from '@angular/core';
import { AppTheme, persistTheme } from './theme.utils';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>(
    (document.documentElement.getAttribute('data-theme') as AppTheme) ?? 'light',
  );

  toggle = (): void => {
    const next: AppTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    persistTheme(next);
  };
}
