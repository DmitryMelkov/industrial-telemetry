import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [
    AsyncPipe,
    MatButtonModule,
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
  private readonly router = inject(Router);

  logout = (): void => {
    this.authService.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  };
}
