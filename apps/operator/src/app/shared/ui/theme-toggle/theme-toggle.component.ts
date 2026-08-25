import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../../core/theme/theme.service';

export type ThemeToggleVariant = 'header' | 'toolbar';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  readonly variant = input<ThemeToggleVariant>('header');
  readonly themeService = inject(ThemeService);
  readonly isAnimating = signal(false);

  toggle = (): void => {
    this.isAnimating.set(true);
    this.themeService.toggle();
    window.setTimeout(() => this.isAnimating.set(false), 600);
  };
}
