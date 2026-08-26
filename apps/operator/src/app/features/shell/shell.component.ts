import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SelectedSiteService } from '../../core/site/selected-site.service';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ThemeToggleComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly authService = inject(AuthService);
  readonly selectedSiteService = inject(SelectedSiteService);
  private readonly router = inject(Router);

  constructor() {
    this.selectedSiteService.ensureLoaded();
  }

  onSiteChange = (siteId: string): void => {
    this.selectedSiteService.selectSite(siteId);
  };

  logout = (): void => {
    this.authService.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  };
}
